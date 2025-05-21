import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import connectDB from '@/app/lib/db';
import Image from '@/app/models/Image';
import User from '@/app/models/User';
import mongoose from 'mongoose';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(req: Request) {
  try {
    // Get the token from the Authorization header
    const token = req.headers.get('Authorization')?.split(' ')[1];
    let userId = null;
    let user = null;

    if (token) {
      // If token exists, process as authenticated user
      // Verify the token
      const secret = new TextEncoder().encode(
        process.env.JWT_SECRET || 'your-secret-key'
      );
      
      const { payload } = await jwtVerify(token, secret);
      const googleId = payload.userId as string;

      // Connect to database
      await connectDB();

      // Find the user by Google ID to get their MongoDB _id
      user = await User.findOne({ googleId });
      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
      userId = user._id;
    } else {
      // If no token, allow upload but don't associate with a user
      console.log('Processing unauthenticated upload');
    }

    // Get the file from form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Only image files are allowed' },
        { status: 400 }
      );
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      );
    }

    // Convert file to buffer for S3 upload
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename for S3
    const filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const s3Key = `uploads/${filename}`;
    
    // Upload file to S3
    const uploadParams = {
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: s3Key,
      Body: buffer,
      ContentType: file.type,
    };

    await s3Client.send(new PutObjectCommand(uploadParams));

    // Construct the S3 public URL (adjust if using custom domain or private access)
    const s3Url = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;

    // Create image record in MongoDB (only for authenticated users)
    if(userId) {
      const image = await Image.create({
        userId: userId, // Use MongoDB _id instead of Google ID
        originalUrl: s3Url,
        transformedUrl: s3Url, // Initially set transformed URL to original S3 URL
        style: 'ghibli', // Set a default style
        status: 'processing',
        metadata: {
          originalSize: file.size,
          format: file.type.split('/')[1],
        },
      });
    }
     // Unauthenticated uploads are not tracked in the database

    // Return the S3 URL
    return NextResponse.json({
      url: s3Url,
      // imageId is not returned for unauthenticated uploads
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
} 
import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import connectDB from '@/app/lib/db';
import Image from '@/app/models/Image';
import User from '@/app/models/User';
import mongoose from 'mongoose';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/authOptions";

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(req: Request) {
  try {
    // Use getServerSession to get the user session
    const session = await getServerSession(authOptions);
    console.log('Server: upload route - session:', session);

    let userId = null;
    let user = null;
    let isAuthenticated = false;

    if (session?.user?.email) {
      isAuthenticated = true;
      await connectDB();
      // Find user by email from session to get their MongoDB _id
      user = await User.findOne({ email: session.user.email });

      if (!user) {
        // This case should ideally not happen if session exists and is valid
        // but handle defensively
        console.error('Server: User not found in DB for session email:', session.user.email);
        // Proceeding without userId for unauthenticated-like handling, or return error?
        // Given the current flow, we'll proceed without userId if DB user is not found
        // but log an error as it indicates a potential data inconsistency.
      } else {
        userId = user._id;
      }
    } else {
      // If no session, process as unauthenticated user
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
import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { jwtVerify } from 'jose';
import connectDB from '@/app/lib/db';
import Image from '@/app/models/Image';
import User from '@/app/models/User';
import mongoose from 'mongoose';

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

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create upload directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });

    // Generate unique filename
    const filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const filepath = path.join(uploadDir, filename);
    
    // Save file to disk
    await writeFile(filepath, buffer);

    // Create a temporary transformed URL (will be updated after actual transformation)
    const tempTransformedUrl = `/uploads/${filename}`;

    // Create image record in MongoDB (only for authenticated users)
    if(userId) {
      const image = await Image.create({
        userId: userId, // Use MongoDB _id instead of Google ID
        originalUrl: `/uploads/${filename}`,
        transformedUrl: tempTransformedUrl, // Provide a temporary URL
        style: 'ghibli', // Set a default style
        status: 'processing',
        metadata: {
          originalSize: file.size,
          format: file.type.split('/')[1],
        },
      });
    }
     // Unauthenticated uploads are not tracked in the database

    // Return the URL
    return NextResponse.json({
      url: `/uploads/${filename}`,
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
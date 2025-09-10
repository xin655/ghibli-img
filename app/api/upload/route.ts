import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/app/lib/db';
import Image from '@/app/models/Image';
import User from '@/app/models/User';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { withApiLogging, ApiLogger, UserActivityLogger, UserAction, PerformanceLogger } from '@/app/lib/logger';

// Initialize S3 Client (lazy initialization)
let s3Client: S3Client | null = null;

function getS3Client() {
  if (!s3Client) {
    const region = process.env.AWS_REGION;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    
    if (!region || !accessKeyId || !secretAccessKey) {
      throw new Error('AWS S3 configuration is missing');
    }
    
    s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }
  return s3Client;
}

export const POST = withApiLogging(async (req: Request) => {
  const requestId = req.headers.get('x-request-id') || 'unknown';
  
  try {
    // Check for JWT token in Authorization header
    const authHeader = req.headers.get('Authorization');
    let userId = null;
    let user = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { userId: string };
        
        await connectDB();
        user = await User.findById(decoded.userId);
        
        if (user) {
          userId = user._id;
        }
      } catch (error) {
        console.error('JWT verification failed:', error);
        // Continue as unauthenticated user
      }
    }

    // Get the file from form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      ApiLogger.logApiError(requestId, new Error('No file uploaded'));
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Only image files are allowed' },
        { status: 400 }
      );
    }

    // Validate file size based on user authentication
    const maxFileSize = userId ? 5 * 1024 * 1024 : 2 * 1024 * 1024; // 5MB for authenticated, 2MB for anonymous
    if (file.size > maxFileSize) {
      const maxSizeMB = maxFileSize / (1024 * 1024);
      return NextResponse.json(
        { error: `File size must be less than ${maxSizeMB}MB` },
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

    await PerformanceLogger.measurePerformance(
      's3_file_upload',
      async () => {
        return await getS3Client().send(new PutObjectCommand(uploadParams));
      },
      'file',
      { fileName: file.name, fileSize: file.size, s3Key }
    );

    // Construct the S3 public URL
    const s3Url = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;

    // Create image record in MongoDB (only for authenticated users)
    if (userId) {
      await Image.create({
        userId: userId,
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

    // Log successful file upload
    UserActivityLogger.logFileOperation(
      UserAction.UPLOAD_FILE,
      file.name,
      file.size,
      true,
      {
        requestId,
        userId: userId?.toString(),
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
        userAgent: req.headers.get('user-agent') || 'unknown'
      }
    );

    ApiLogger.logApiSuccess(requestId, 'File uploaded successfully', {
      fileName: file.name,
      fileSize: file.size,
      s3Url,
      userId: userId?.toString()
    });

    // Return the S3 URL
    return NextResponse.json({
      url: s3Url,
    });

  } catch (error) {
    console.error('Upload error:', error);
    ApiLogger.logApiError(requestId, error as Error, {
      fileName: (req as any).file?.name,
      fileSize: (req as any).file?.size
    });
    
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
});
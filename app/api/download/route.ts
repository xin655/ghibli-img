import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/app/lib/db';
import Image from '@/app/models/Image';
import User from '@/app/models/User';
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from 'stream';

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

// Helper function to convert stream to buffer
async function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

export async function GET() {
  return NextResponse.json({ message: 'Download API is working' });
}

export async function POST(request: Request) {
  try {
    // Check for JWT token in Authorization header
    const authHeader = request.headers.get('Authorization');
    let userId = null;
    let user = null;
    let isAuthenticated = false;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { userId: string };
        
        await connectDB();
        user = await User.findById(decoded.userId);
        
        if (user) {
          userId = user._id;
          isAuthenticated = true;
        }
      } catch (error) {
        console.error('JWT verification failed:', error);
        // Continue as unauthenticated user
      }
    }

    const { imageUrl } = await request.json();
    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Missing image URL' },
        { status: 400 }
      );
    }

    // Extract S3 Key from the S3 URL
    const url = new URL(imageUrl);
    const s3Key = url.pathname.substring(1); // Remove leading slash

    console.log('Server: Download - Received imageUrl:', imageUrl);
    console.log('Server: Download - Derived s3Key:', s3Key);

    // For authenticated users, verify the image belongs to them
    if (isAuthenticated && userId) {
      const image = await Image.findOne({
        $or: [
          { originalUrl: imageUrl, userId: userId },
          { transformedUrl: imageUrl, userId: userId }
        ]
      });

      if (!image) {
        return NextResponse.json(
          { error: 'Image not found or does not belong to user' },
          { status: 404 }
        );
      }
    }

    try {
      // Download image from S3
      const { Body, ContentType } = await getS3Client().send(new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME!,
        Key: s3Key,
      }));

      if (!Body) {
        throw new Error('Could not get image body from S3');
      }

      // Convert stream to buffer
      const imageBuffer = await streamToBuffer(Body as Readable);

      // Return the image as a downloadable response
      return new NextResponse(imageBuffer, {
        headers: {
          'Content-Type': ContentType || 'image/png',
          'Content-Disposition': `attachment; filename="${s3Key.split('/').pop() || 'image.png'}"`,
          'Content-Length': imageBuffer.length.toString(),
        },
      });

    } catch (s3Error) {
      console.error('Server: S3 download error:', s3Error);
      return NextResponse.json(
        { error: 'Failed to download image from storage' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Server: Download route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
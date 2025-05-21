import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getUserState } from '@/app/lib/userState';
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from 'stream';

// Initialize S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Helper function to convert stream to buffer (can reuse from transform route)
async function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

export async function GET(request: Request) {
  try {
    // Get the token from the Authorization header
    const token = request.headers.get('Authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify the token (optional for download, but good for security)
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || 'your-secret-key'
    );
    
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.userId as string;

    // Get the image URL from the query parameters
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');
    const style = searchParams.get('style');

    if (!imageUrl || !style) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Check user permissions (optional for download, based on your app logic)
    // For now, assuming if they have the URL and are logged in, they can download.
    // You might add logic here to check if the image belongs to the user.

    // Extract S3 Key from the S3 URL
    const url = new URL(imageUrl);
    // Assuming the URL format is like https://your-bucket-name.s3.your-region.amazonaws.com/uploads/filename
    const s3Key = url.pathname.substring(1); // Remove leading slash
    const filename = s3Key.split('/').pop() || 'download'; // Extract filename or default
    const fileExtension = filename.split('.').pop() || 'jpg'; // Extract extension or default

    let imageBuffer: Buffer;
    try {
      // Download image from S3
      const { Body } = await s3Client.send(new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME!,
        Key: s3Key,
      }));

      if (!Body) {
        throw new Error('Could not get image body from S3');
      }

      // Convert stream to buffer
      imageBuffer = await streamToBuffer(Body as Readable);

    } catch (s3Error) {
      console.error('Server: S3 download error in download route:', s3Error);
      return NextResponse.json(
        { error: 'Failed to download image from storage' },
        { status: 500 }
      );
    }
    
    // Determine Content-Type based on file extension (basic approach)
    let contentType = 'application/octet-stream';
    if (fileExtension === 'jpg' || fileExtension === 'jpeg') contentType = 'image/jpeg';
    if (fileExtension === 'png') contentType = 'image/png';
    if (fileExtension === 'gif') contentType = 'image/gif';
    if (fileExtension === 'webp') contentType = 'image/webp';

    // Set response headers
    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Content-Disposition', `attachment; filename="ghibli-${style}-${filename}"`);

    return new NextResponse(imageBuffer, {
      status: 200,
      headers,
    });

  } catch (error) {
    console.error('Server: Download route error:', error);
    return NextResponse.json(
      { error: 'Failed to process download request' },
      { status: 500 }
    );
  }
} 
// Server: Loading transform route file
console.log('Server: Loading transform route file');

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/authOptions';
import connectDB from '@/app/lib/db';
import Image from '@/app/models/Image';
import User, { IUserDocument } from '@/app/models/User';
import sharp from 'sharp';
import OpenAI from 'openai';
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from 'stream';
import { HydratedDocument } from 'mongoose';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Helper to map style to a simple DALL-E prompt for editing
function styleToPrompt(style: string, basePrompt: string): string {
    switch (style) {
        case 'ghibli':
            return `${basePrompt}, studio ghibli inspired digital art, soft colors, hand-drawn style`;
        case 'watercolor':
            return `${basePrompt}, painted in watercolor style, soft edges, flowing colors`;
        case 'comic':
            return `${basePrompt}, comic book style illustration, bold lines, vibrant colors`;
        case 'anime':
            return `${basePrompt}, anime style digital drawing, clean lines, expressive features`;
        default:
            return basePrompt;
    }
}

// Helper function to convert stream to buffer
async function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

// Test route to verify routing is working
export async function GET() {
  console.log('Server: Test GET route hit');
  return NextResponse.json({ message: 'Transform API is working' });
}

// Main transform route handler
export async function POST(request: Request) {
  console.log('Server: Entering transform route POST function');
  console.log('Server: NEXTAUTH_SECRET is set:', !!process.env.NEXTAUTH_SECRET);

  try {
    const session = await getServerSession(authOptions);
    console.log('Server: transform route - session:', session);

    let user: IUserDocument | null = null;
    let userId: string | null = null;
    let isAuthenticated = false;

    if (session?.user?.email) {
      isAuthenticated = true;
      await connectDB();
      // Find user by email from session
      user = await User.findOne({ email: session.user.email });

      if (!user) {
        // This case should ideally not happen if session exists and is valid
        return NextResponse.json(
          { error: 'User not found in database' },
          { status: 404 }
        );
      }

      // Check free trial limits for authenticated users
      if (!user.subscription || user.subscription.status === 'free') {
        if (user.usage.freeTrialsRemaining <= 0) {
            return NextResponse.json(
            { error: 'Free trial limit reached. Please subscribe.' },
              { status: 403 }
            );
          }
      }
      // If subscribed, allow transformation (you might add plan checks here if needed)
      userId = user._id.toString(); // Use MongoDB ObjectId as userId
    } else {
      // Handle unauthenticated users
      // Based on our previous decision, unauthenticated user free trial is handled on frontend.
      // If backend is reached without authentication, it means frontend check passed or was bypassed.
      // For simplicity and security, we require authentication for backend transform.
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get the image data from the request body
    const { imageUrl, style, prompt: basePrompt } = await request.json();
    if (!imageUrl || !style) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate style
    const validStyles = ['ghibli', 'watercolor', 'comic', 'anime'];
    if (!validStyles.includes(style)) {
      return NextResponse.json(
        { error: 'Invalid style' },
        { status: 400 }
      );
    }

    // Extract S3 Key and filename from the S3 URL
    const url = new URL(imageUrl);
    // Assuming the URL format is like https://your-bucket-name.s3.your-region.amazonaws.com/uploads/filename
    const s3Key = url.pathname.substring(1); // Remove leading slash
    const filename = s3Key.split('/').pop() || 'image.png'; // Extract filename

    console.log('Server: Transform - Received imageUrl:', imageUrl);
    console.log('Server: Transform - Derived s3Key:', s3Key);

    // Find the original image in database (only if user is authenticated)
    let originalImage = null;
    if(isAuthenticated && userId) {
       originalImage = await Image.findOne({
        originalUrl: imageUrl,
        userId: userId,
      });

      if (!originalImage) {
        // If authenticated but image not found in DB, it might be an invalid URL
        return NextResponse.json(
          { error: 'Image not found or does not belong to user' },
          { status: 404 }
        );
      }
    }

    let imageBuffer: Buffer;
    let imageMetadata: sharp.Metadata; // Add variable to store image metadata
    try {
      console.log('Server: Transform - Attempting to download from S3 with key:', s3Key);
      // Download image from S3
      const { Body } = await s3Client.send(new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME!,
        Key: s3Key,
      }));

      if (!Body) {
        throw new Error('Could not get image body from S3');
      }

      // Convert stream to buffer for OpenAI
      imageBuffer = await streamToBuffer(Body as Readable);

      // Get image metadata (including dimensions) using sharp
      imageMetadata = await sharp(imageBuffer).metadata();

    } catch (s3Error) {
      console.error('Server: S3 download error details:', s3Error);
      console.error('Server: S3 download error:', (s3Error as Error).message);
      return NextResponse.json(
        { error: 'Failed to download image from storage' },
        { status: 500 }
      );
    }

    try {
        // Generate DALL-E prompt based on style
        const dallEPrompt = styleToPrompt(style, basePrompt || 'a beautiful image');

        // Generate a full white mask with the same dimensions as the original image
        if (!imageMetadata || !imageMetadata.width || !imageMetadata.height) {
            throw new Error('Could not get image dimensions for mask generation');
        }
        const maskBuffer = await sharp({
            create: {
                width: imageMetadata.width,
                height: imageMetadata.height,
                channels: 4, // RGBA
                background: { r: 255, g: 255, b: 255, alpha: 1 }
            }
        }).png().toBuffer();

        // Create File objects for image and mask
        const imageFile = new File([imageBuffer], filename, { type: imageMetadata.format ? `image/${imageMetadata.format}` : 'image/png' });
        const maskFile = new File([maskBuffer], 'mask.png', { type: 'image/png' });

        // Use images.edit API
        const variationResponse = await openai.images.edit({
            model: "gpt-image-1", // Use the specified model
            image: imageFile,
            mask: maskFile,
            prompt: dallEPrompt, // Use the style-based prompt
            n: 1,
            size: "1024x1024", // Adjust size as needed, ensure it's compatible with gpt-image-1
        });

        // **SAFE ACCESS:** Check if data and b64_json exist
        const image_base64 = variationResponse.data?.[0]?.b64_json;

        if (!image_base64) {
            throw new Error('No valid image data received from DALL-E');
        }

        // Get the transformed image data
        const image_base64_bytes = Buffer.from(image_base64, 'base64'); // Renamed to avoid conflict

        // Generate unique filename for transformed image in S3
        const transformedFileName = `transformed_${Date.now()}.png`;
        const transformedS3Key = `uploads/${transformedFileName}`;
        
        // Upload transformed image to S3
        const transformedUploadParams = {
          Bucket: process.env.S3_BUCKET_NAME!,
          Key: transformedS3Key,
          Body: image_base64_bytes, // Use renamed variable
          ContentType: 'image/png', // DALL-E outputs PNG
        };

        await s3Client.send(new PutObjectCommand(transformedUploadParams));

        // Construct the transformed S3 public URL
        const transformedS3Url = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${transformedS3Key}`;

        // Update image record in database and increment count (only for authenticated users)
        if(isAuthenticated && user && originalImage && userId) { 
            originalImage.transformedUrl = transformedS3Url;
            originalImage.style = style;
            originalImage.status = 'completed';
            // Update image metadata (optional)
            // originalImage.metadata.transformedSize = image_base64_bytes.length; // Use renamed variable
            // Add width/height if you process the image with sharp after DALL-E
            await originalImage.save();

            // Use non-null assertion as userId is guaranteed to be a string here
            // Increment usage for authenticated users after successful transformation
            if(isAuthenticated && user) {
                if (user.subscription.status === 'free') {
                    user.usage.freeTrialsRemaining -= 1;
                }
                user.usage.totalTransformations += 1;
                await user.save();
            }
        }

        // Return the transformed image URL
        return NextResponse.json({ 
            transformedImageUrl: transformedS3Url
        });

    } catch (apiError: any) {
        console.error('Server: DALL-E API Error:', apiError);
        const errorMessage = apiError.response?.data?.error?.message || 'Failed to transform image using DALL-E';
        return NextResponse.json(
            { error: errorMessage },
            { status: apiError.response?.status || 500 }
        );
    }

  } catch (error) {
    console.error('Server: Transform setup error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during transformation setup' },
      { status: 500 }
    );
  }
} 
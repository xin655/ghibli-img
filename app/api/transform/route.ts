import { NextResponse } from 'next/server';
import { canTransformImage, incrementFreeTrialCount } from '@/app/lib/userState';
import { jwtVerify } from 'jose';
import connectDB from '@/app/lib/db';
import Image from '@/app/models/Image';
import User, { IUserDocument } from '@/app/models/User';
import sharp from 'sharp';
import OpenAI from 'openai';
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from 'stream';

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

export async function POST(request: Request) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1];
    let userId: string | null = null; // Explicitly type userId as string or null
    let user: IUserDocument | null = null; // Explicitly type user
    let isAuthenticated = false;

    // If token exists, attempt authentication
    if (token) {
      try {
        const secret = new TextEncoder().encode(
          process.env.JWT_SECRET || 'your-secret-key'
        );
        
        const { payload } = await jwtVerify(token, secret);
        const googleId = payload.userId as string;

        await connectDB();

        user = await User.findOne({ googleId });
        if (user) {
          userId = user._id.toString(); // Convert ObjectId to string and assign to userId
          isAuthenticated = true;

          // Use non-null assertion as userId is guaranteed to be a string here
          const { canTransform, reason } = await canTransformImage(userId!); 
          if (!canTransform) {
            return NextResponse.json(
              { error: reason || 'Cannot transform image' },
              { status: 403 }
            );
          }
        } else {
           return NextResponse.json(
              { error: 'User not found' },
              { status: 404 }
            );
        }
      } catch (jwtError) {
        console.error('Server: JWT verification failed:', jwtError);
      }
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
    try {
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

    } catch (s3Error) {
      console.error('Server: S3 download error:', s3Error);
      return NextResponse.json(
        { error: 'Failed to download image from storage' },
        { status: 500 }
      );
    }

    try {
        // Generate DALL-E prompt based on style
        const dallEPrompt = styleToPrompt(style, basePrompt || 'a beautiful image');

        // Create variation using the image buffer
        const variationResponse = await openai.images.createVariation({
            model: "dall-e-2",
            image: new File([imageBuffer], filename, { type: originalImage?.metadata?.format || 'image/png' }), // Use extracted filename
            n: 1,
            size: "1024x1024",
            response_format: "b64_json"
        });

        if (!variationResponse.data?.[0]?.b64_json) {
            throw new Error('No image data received from DALL-E');
        }

        // Get the transformed image data
        const image_base64 = variationResponse.data[0].b64_json;
        const image_bytes = Buffer.from(image_base64, 'base64');

        // Generate unique filename for transformed image in S3
        const transformedFileName = `transformed_${Date.now()}.png`;
        const transformedS3Key = `uploads/${transformedFileName}`;

        // Upload transformed image to S3
        const transformedUploadParams = {
          Bucket: process.env.S3_BUCKET_NAME!,
          Key: transformedS3Key,
          Body: image_bytes,
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
            // Update transformed image metadata (optional)
            // originalImage.metadata.transformedSize = image_bytes.length;
            // Add width/height if you process the image with sharp after DALL-E
            await originalImage.save();

            // Use non-null assertion as userId is guaranteed to be a string here
            await incrementFreeTrialCount(userId!); 
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
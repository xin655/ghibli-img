import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/app/lib/db';
import Image from '@/app/models/Image';
import User from '@/app/models/User';
import { SubscriptionService } from '@/app/lib/services/SubscriptionService';
import sharp from 'sharp';
import OpenAI from 'openai';
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from 'stream';

// Initialize OpenAI client (lazy initialization)
let openai: OpenAI | null = null;

function getOpenAI() {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

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
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

export async function GET() {
  return NextResponse.json({ message: 'Transform API is working' });
}

// Main transform route handler
export async function POST(request: Request) {
  console.log('Server: Entering transform route POST function');

  try {
    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      );
    }
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

    console.log('Server: Transform - isAuthenticated:', isAuthenticated);

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
    const s3Key = url.pathname.substring(1); // Remove leading slash
    const filename = s3Key.split('/').pop() || 'image.png';

    console.log('Server: Transform - Received imageUrl:', imageUrl);
    console.log('Server: Transform - Derived s3Key:', s3Key);

    // Find the original image in database (only if user is authenticated)
    let originalImage = null;
    if (isAuthenticated && userId) {
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
    let imageMetadata: sharp.Metadata;
    try {
      // Download image from S3
      const { Body } = await getS3Client().send(new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME!,
        Key: s3Key,
      }));

      if (!Body) {
        throw new Error('Could not get image body from S3');
      }

      // Convert stream to buffer for OpenAI
      imageBuffer = await streamToBuffer(Body as Readable);
      
      // Get image metadata using sharp
      imageMetadata = await sharp(imageBuffer).metadata();
      console.log('Server: Transform - Image metadata:', imageMetadata);

    } catch (s3Error) {
      console.error('Server: S3 download error:', s3Error);
      return NextResponse.json(
        { error: 'Failed to download image from storage' },
        { status: 500 }
      );
    }

    try {
        // Generate DALL-E prompt based on style
        const dallEPrompt = styleToPrompt(style, basePrompt || 'Transform this image');
        console.log('Server: Transform - DALL-E Prompt:', dallEPrompt);

        // Use DALL-E 2 for image editing/variation
        // Create a File-like object from the buffer
        const imageFile = new File([imageBuffer], filename, { type: 'image/png' });
        
        // Set image size based on user authentication
        const imageSize = isAuthenticated ? "1024x1024" : "512x512";
        
        const response = await getOpenAI().images.createVariation({
          image: imageFile,
          n: 1,
          size: imageSize, // 1024x1024 for authenticated, 512x512 for anonymous
        });

        if (!response.data || response.data.length === 0) {
          throw new Error('No image generated from OpenAI');
        }

        const generatedImageUrl = response.data[0].url;
        if (!generatedImageUrl) {
          throw new Error('Generated image URL is null');
        }

        console.log('Server: Transform - Generated image URL:', generatedImageUrl);

        // Download the generated image from OpenAI
        const imageResponse = await fetch(generatedImageUrl);
        if (!imageResponse.ok) {
          throw new Error(`Failed to download generated image: ${imageResponse.statusText}`);
        }

        const generatedImageBuffer = Buffer.from(await imageResponse.arrayBuffer());

        // Upload the transformed image to S3
        const transformedFilename = `transformed_${Date.now()}_${filename}`;
        const transformedS3Key = `transformed/${transformedFilename}`;
        
        await getS3Client().send(new PutObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME!,
          Key: transformedS3Key,
          Body: generatedImageBuffer,
          ContentType: 'image/png',
        }));

        const transformedS3Url = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${transformedS3Key}`;
        console.log('Server: Transform - Transformed S3 URL:', transformedS3Url);

        // Update database record (only for authenticated users)
        if (isAuthenticated && originalImage && user) {
          // 检查使用量限制
          try {
            const canUse = await SubscriptionService.checkUsageLimit(user._id.toString(), 'transform', 1);
            if (!canUse) {
              return NextResponse.json({
                error: 'Usage limit exceeded',
                details: {
                  message: 'You have reached your usage limit. Please upgrade your subscription to continue.',
                  currentPlan: user.subscription?.plan || 'free',
                  isActive: user.subscription?.isActive || false,
                }
              }, { status: 403 });
            }

            // 记录使用量
            await SubscriptionService.recordUsage(user._id.toString(), 'transform', 1);

            originalImage.transformedUrl = transformedS3Url;
            originalImage.style = style;
            originalImage.status = 'completed';
            await originalImage.save();

            // 更新免费试用次数（仅对免费用户）
            if (user.usage.freeTrialsRemaining > 0 && (!user.subscription?.isActive || user.subscription?.plan === 'free')) {
              user.usage.freeTrialsRemaining -= 1;
              await user.save();
            }
          } catch (error) {
            console.error('Usage limit check failed:', error);
            return NextResponse.json({
              error: 'Usage limit exceeded',
              details: {
                message: 'You have reached your usage limit. Please upgrade your subscription to continue.',
              }
            }, { status: 403 });
          }
        }

        return NextResponse.json({
          transformedUrl: transformedS3Url,
          style: style,
          message: 'Image transformed successfully'
        });

    } catch (openaiError) {
      console.error('Server: OpenAI API error:', openaiError);
      return NextResponse.json(
        { error: 'Failed to transform image using AI service' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Server: Transform route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
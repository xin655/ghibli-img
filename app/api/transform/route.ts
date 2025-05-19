import { NextResponse } from 'next/server';
import { canTransformImage, incrementFreeTrialCount } from '@/app/lib/userState';
import { jwtVerify } from 'jose';
import connectDB from '@/app/lib/db';
import Image from '@/app/models/Image';
import User from '@/app/models/User';
import path from 'path';
import { writeFile, mkdir } from 'fs/promises';
import fs from 'fs';
import sharp from 'sharp';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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

export async function POST(request: Request) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1];
    let userId = null;
    let user = null;
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
          userId = user._id;
          isAuthenticated = true;

          const { canTransform, reason } = await canTransformImage(userId);
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
        console.error('JWT verification failed:', jwtError);
      }
    }

    // Get the image data from the request
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

    // Find the original image in database (only if user is authenticated)
    let originalImage = null;
    if(isAuthenticated && userId) {
       originalImage = await Image.findOne({
        originalUrl: imageUrl,
        userId: userId,
      });

      if (!originalImage) {
        return NextResponse.json(
          { error: 'Image not found or does not belong to user' },
          { status: 404 }
        );
      }
    }

    // Define originalPath
    const originalPath = path.join(process.cwd(), 'public', imageUrl);

    try {
        // Create a read stream from the image file
        const imageStream = fs.createReadStream(originalPath);

        // Generate DALL-E prompt based on style
        const dallEPrompt = styleToPrompt(style, basePrompt || 'a beautiful image');

        // Create variation using the image stream
        const variationResponse = await openai.images.createVariation({
            model: "dall-e-2",
            image: imageStream,
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

        // Save the transformed image
        const transformedFileName = `transformed_${Date.now()}.png`;
        const transformedPath = path.join(process.cwd(), 'public', 'uploads', transformedFileName);
        
        // Ensure uploads directory exists
        await mkdir(path.join(process.cwd(), 'public', 'uploads'), { recursive: true });
        
        // Save the image
        await writeFile(transformedPath, image_bytes);

        // Update image record in database and increment count (only for authenticated users)
        if(isAuthenticated && user && originalImage) {
            originalImage.transformedUrl = `/uploads/${transformedFileName}`;
            originalImage.style = style;
            originalImage.status = 'completed';
            await originalImage.save();

            await incrementFreeTrialCount(user._id);
        }

        // Return the transformed image URL
        return NextResponse.json({ 
            transformedImageUrl: `/uploads/${transformedFileName}` 
        });

    } catch (apiError: any) {
        console.error('DALL-E API Error:', apiError);
        const errorMessage = apiError.response?.data?.error?.message || 'Failed to transform image using DALL-E';
        return NextResponse.json(
            { error: errorMessage },
            { status: apiError.response?.status || 500 }
        );
    }

  } catch (error) {
    console.error('Transform error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during transformation setup' },
      { status: 500 }
    );
  }
} 
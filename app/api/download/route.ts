import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getUserState } from '@/app/lib/userState';
import { readFile } from 'fs/promises';
import path from 'path';

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

    // Verify the token
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

    // Check user permissions
    const userState = await getUserState(userId);
    if (!userState) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // 从相对路径构建完整的文件路径
    const imagePath = path.join(process.cwd(), 'public', imageUrl);
    
    try {
      // 读取图片文件
      const imageBuffer = await readFile(imagePath);

      // 设置响应头
      const headers = new Headers();
      headers.set('Content-Type', 'image/jpeg');
      headers.set('Content-Disposition', `attachment; filename="ghibli-${style}-${Date.now()}.jpg"`);

      return new NextResponse(imageBuffer, {
        status: 200,
        headers,
      });
    } catch (error) {
      console.error('File read error:', error);
      return NextResponse.json(
        { error: 'Image file not found' },
        { status: 404 }
      );
    }

  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: 'Failed to download image' },
      { status: 500 }
    );
  }
} 
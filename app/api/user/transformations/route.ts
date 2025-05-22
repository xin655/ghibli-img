import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/authOptions';
import connectDB from '@/app/lib/db';
import User, { IUserDocument } from '@/app/models/User';
import ImageCollection from '@/app/models/Image';

export async function GET(request: Request) {
  console.log('Server: Entering /api/user/transformations GET function');

  try {
    const session = await getServerSession(authOptions);
    console.log('Server: /api/user/transformations - session:', session);

    if (!session || !session.user?.email) {
      console.log('Server: Authentication required - No valid session found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    await connectDB();
    // Find user to get their database ID
    const user = await User.findOne({ email: session.user.email });

    if (!user) {
      console.log('Server: User not found in DB for email:', session.user.email);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    console.log('Server: Fetching transformations for user ID:', user._id);

    // Get pagination parameters from request query
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '10', 10); // Default limit to 10
    const skip = (page - 1) * limit;

    // Fetch paginated image transformation records for the user
    const transformations = await ImageCollection.find({ userId: user._id })
      .sort({ createdAt: -1 }) // Sort by creation date, newest first
      .skip(skip)
      .limit(limit);

    // Get total count for pagination info
    const totalTransformations = await ImageCollection.countDocuments({ userId: user._id });
    const totalPages = Math.ceil(totalTransformations / limit);

    console.log(`Server: Found ${transformations.length} transformations for user (Page ${page} of ${totalPages})`);

    // Return transformations, total count, and pagination info
    return NextResponse.json({ 
      transformations: transformations.map(t => t.toObject()),
      totalTransformations,
      totalPages,
      currentPage: page,
      itemsPerPage: limit,
    });

  } catch (error) {
    console.error('Server: Error fetching transformations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transformations' },
      { status: 500 }
    );
  }
} 
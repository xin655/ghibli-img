import { NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { createUserState, getUserState } from '@/app/lib/userState';
import connectDB from '@/app/lib/db';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function POST(request: Request) {
  try {
    await connectDB();

    const { id_token } = await request.json();

    if (!id_token) {
      return NextResponse.json({ error: 'No ID token provided' }, { status: 400 });
    }

    // Verify the Google ID token
    const ticket = await client.verifyIdToken({
      idToken: id_token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.sub || !payload.email) {
      return NextResponse.json({ error: 'Invalid token or missing payload data' }, { status: 401 });
    }

    // Extract user information from the validated payload
    const user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name || '',
      picture: payload.picture || '',
    };

    // Get or create user state using the updated functions
    let userState = await getUserState(user.id);
    
    if (!userState) {
      // If user state doesn't exist, create a new user document in MongoDB
      // Pass name and photo extracted from the payload
      userState = await createUserState(user.id, user.email, user.name, user.picture);
    }

    // Generate JWT token
    // The JWT should contain identifying information, like the user's Google ID (user.id)
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    // Return the JWT token and relevant user information (including the fetched/created userState)
    return NextResponse.json({
      token,
      user: {
        id: userState.userId,
        email: userState.email,
        name: user.name,
        picture: user.picture,
      },
      userState
    });

  } catch (error) {
    console.error('Auth error:', error);
    // Return a generic authentication failed error for security
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 401 }
    );
  }
} 
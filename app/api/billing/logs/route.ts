import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/app/lib/db';
import { LoggingService } from '@/app/lib/services/LoggingService';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let decoded: { userId: string };
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { userId: string };
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    await connectDB();

    const url = new URL(req.url);
    const type = url.searchParams.get('type') || 'subscription';
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    let data: any[] = [];

    switch (type) {
      case 'subscription':
        data = await LoggingService.getUserSubscriptionLogs(decoded.userId, limit, offset);
        break;
      case 'payment':
        data = await LoggingService.getUserPaymentHistory(decoded.userId, limit, offset);
        break;
      case 'records':
        data = await LoggingService.getUserSubscriptionRecords(decoded.userId);
        break;
      case 'stats':
        data = await LoggingService.getSubscriptionStats(decoded.userId);
        break;
      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
    }

    return NextResponse.json({ data, type, limit, offset });
  } catch (error) {
    console.error('Logs API error:', error);
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}



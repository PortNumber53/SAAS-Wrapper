import { NextRequest, NextResponse } from 'next/server';
import { getXataClient } from '@/lib/xata';

export async function GET(req: NextRequest) {
  try {
    const xata = getXataClient();

    // Fetch only published pages
    const pages = await xata.db.pages
      .filter()
      .getAll();

    return new NextResponse(JSON.stringify(pages), {
      status: 200,
      headers: new Headers({
        'Content-Type': 'application/json',
      }),
    });
  } catch (error) {
    console.error('Error fetching pages:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to fetch pages' }), {
      status: 500,
      headers: new Headers({
        'Content-Type': 'application/json',
      }),
    });
  }
}

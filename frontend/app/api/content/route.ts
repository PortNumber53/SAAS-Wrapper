import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getXataClient } from '@/lib/xata';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  // Ensure user is authenticated
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { 
      path, 
      markdown,
      is_homepage = false,
      is_published = false
    } = await req.json();

    // Validate path format
    if (!path) {
      return NextResponse.json({ error: 'Path is required' }, { status: 400 });
    }

    const xata = getXataClient();

    // Fetch existing record
    let existingRecord = await xata.db.pages
      .filter({ path })
      .getFirst();

    // Prepare markdown content
    const timestamp = new Date().toISOString();
    const newMarkdownEntry = JSON.stringify({ 
      current: markdown || '',
      timestamp 
    });

    if (existingRecord) {
      // If record exists, archive current content and update
      const updatedRecord = await xata.db.pages.update(existingRecord.xata_id, {
        path,
        markdown_content: newMarkdownEntry,
        owner: session.user.id,
        is_homepage,
        is_published
      });

      return NextResponse.json(updatedRecord, { status: 200 });
    } else {
      // Create new record
      const newRecord = await xata.db.pages.create({
        path,
        markdown_content: newMarkdownEntry,
        owner: session.user.id,
        is_homepage,
        is_published
      });

      return NextResponse.json(newRecord, { status: 201 });
    }
  } catch (error) {
    console.error('Content save error:', error);
    return NextResponse.json({ error: 'Failed to save content' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get('path');
  const published = searchParams.get('published') === 'true';

  if (!path) {
    return NextResponse.json({ error: 'Path is required' }, { status: 400 });
  }

  try {
    const xata = getXataClient();

    // Build query
    let query = xata.db.pages.filter({ path });
    
    // If published is specified, add is_published filter
    if (published) {
      query = query.filter({ is_published: true });
    }

    const content = await query.getFirst();

    if (!content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    return NextResponse.json(content, { status: 200 });
  } catch (error) {
    console.error('Content fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 });
  }
}

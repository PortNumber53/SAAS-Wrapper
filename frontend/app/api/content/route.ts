import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/auth';
import { xata } from '@/lib/xata';

export const runtime = 'edge';

// Define an interface for the expected data structure
interface ContentData {
  path: string;
  markdown?: string;
  is_homepage?: boolean;
  is_published?: boolean;
}

// Type guard to check if the body is a valid ContentData
function isContentData(body: unknown): body is ContentData {
  return (
    typeof body === 'object' &&
    body !== null &&
    'path' in body &&
    typeof (body as ContentData).path === 'string'
  );
}

export async function POST(req: NextRequest) {
  const session = await auth()

  // Ensure user is authenticated
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();

    // Validate body structure
    if (!isContentData(body)) {
      return NextResponse.json({
        error: 'Invalid request body'
      }, { status: 400 });
    }

    const validatedData: ContentData = {
      path: body.path,
      markdown: body.markdown ?? '',
      is_homepage: body.is_homepage ?? false,
      is_published: body.is_published ?? false
    };

    // Fetch existing record
    const existingRecord = await xata.db.pages
      .filter({ path: validatedData.path })
      .getFirst();

    // Prepare markdown content
    const timestamp = new Date().toISOString();
    const newMarkdownEntry = JSON.stringify({
      current: validatedData.markdown,
      timestamp
    });

    if (existingRecord) {
      // Update existing record
      const updatedRecord = await xata.db.pages.update(existingRecord.id, {
        markdown_content: newMarkdownEntry,
        path: validatedData.path,
        owner: session.user.id,
        is_homepage: validatedData.is_homepage,
        is_published: validatedData.is_published
      } as const);

      return NextResponse.json(updatedRecord, { status: 200 });
    }

    // Create new record
    const newRecord = await xata.db.pages.create({
      markdown_content: newMarkdownEntry,
      path: validatedData.path,
      owner: session.user.id,
      is_homepage: validatedData.is_homepage,
      is_published: validatedData.is_published
    });

    return NextResponse.json(newRecord, { status: 201 });
  } catch (error) {
    console.error('Content save error:', error);
    return NextResponse.json({ error: 'Failed to save content' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await auth()

  // Ensure user is authenticated
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const path = searchParams.get('path');
  const published = searchParams.get('published') === 'true';

  if (!path) {
    return NextResponse.json({ error: 'Path is required' }, { status: 400 });
  }

  try {
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

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/auth'
import { xata } from '@/lib/xata'

export const runtime = 'edge'

interface WebhookEventBody {
  integration_id: string
  event_type: string
  metadata: Record<string, any>
}

export async function GET(request: NextRequest) {
  try {
    // Ensure user is authenticated
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const eventType = searchParams.get('event_type')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    // Build query
    let query = xata.db.webhook_events
      .filter({ platform: 'instagram' })
      .sort('xata.createdAt', 'desc')

    if (eventType) {
      query = query.filter({ event_type: eventType })
    }
    if (status) {
      query = query.filter({ status })
    }

    // Get paginated results
    const events = await query
      .getPaginated({
        pagination: {
          size: limit,
          offset: (page - 1) * limit
        }
      })

    return NextResponse.json(events)

  } catch (error) {
    console.error('Error fetching webhook events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch webhook events' },
      { status: 500 }
    )
  }
}

// Add new webhook event
export async function POST(request: NextRequest) {
  try {
    // Ensure user is authenticated
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json() as WebhookEventBody
    const { integration_id, event_type, metadata } = body

    // Validate required fields
    if (!integration_id || !event_type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create webhook event
    const event = await xata.db.webhook_events.create({
      integration_id,
      user_id: session.user.id,
      platform: 'instagram',
      event_type,
      status: 'pending',
      metadata,
      processed_at: null
    })

    return NextResponse.json(event)

  } catch (error) {
    console.error('Error creating webhook event:', error)
    return NextResponse.json(
      { error: 'Failed to create webhook event' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { xata } from '@/lib/xata'

export const runtime = 'edge'

// Convert string to Uint8Array
function stringToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str)
}

// Convert Uint8Array to hex string
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// Verify webhook subscription
export async function GET(request: NextRequest) {
  // Generate a random request ID using Web Crypto API
  const requestId = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  try {
    const searchParams = new URL(request.url).searchParams
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const ipCountry = request.headers.get('cf-ipcountry')

    // Get the challenge string from Instagram
    const mode = searchParams.get('hub.mode')
    const token = searchParams.get('hub.verify_token')
    const challenge = searchParams.get('hub.challenge')

    console.log('Webhook verification request:', {
      requestId,
      userAgent,
      ipCountry,
      mode,
      tokenProvided: !!token,
      challenge: challenge || 'none'
    })

    // Verify token (should match what you set in Meta developer portal)
    const verifyToken = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN

    // Validate required parameters
    if (!mode || !token || !challenge) {
      console.error('Missing required parameters:', { requestId, mode, hasToken: !!token, hasChallenge: !!challenge })
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // Validate it's coming from Facebook's IP range
    const isFacebookRequest = userAgent?.includes('facebookplatform') ||
                            request.headers.get('cf-connecting-ip')?.includes('2a03:2880:')

    if (!isFacebookRequest) {
      console.warn('Suspicious webhook verification request:', { requestId, userAgent, ipCountry })
    }

    if (mode === 'subscribe' && token === verifyToken) {
      console.log('Webhook verification successful:', { requestId, challenge })
      // Return the challenge as plain text
      return new NextResponse(challenge, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
        },
      })
    }

    console.error('Invalid verification token:', { requestId })
    return NextResponse.json({ error: 'Invalid verification token' }, { status: 403 })
  } catch (error) {
    console.error('Instagram webhook verification error:', { requestId, error })
    return NextResponse.json({ error: 'Webhook verification failed' }, { status: 500 })
  }
}

// Handle webhook events
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const data = JSON.parse(body)
    console.log('Received webhook event:', data)

    // Handle different types of events
    for (const entry of data.entry) {
      // Handle messaging events
      if (entry.messaging) {
        // Instagram messaging webhooks have some important characteristics:
        // 1. Each message generates two events:
        //    - One with is_echo=true: represents the message being sent by your page
        //    - One without is_echo: represents the actual message from the user
        // 2. The IDs in the webhook are PSIDs (Page-Scoped IDs):
        //    - These are different from regular Instagram user IDs
        //    - Each user gets a different PSID for each Business Account they interact with
        //    - PSIDs remain consistent for that specific user-page interaction
        //    - Use these PSIDs (not regular Instagram IDs) when sending messages back
        for (const message of entry.messaging) {
          await xata.db.webhook_events.create({
            platform: 'instagram',
            event_type: 'message',
            metadata: message,
            processed_at: new Date(message.timestamp)
          })
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

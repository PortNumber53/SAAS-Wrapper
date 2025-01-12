import { NextRequest, NextResponse } from 'next/server'
import { xata } from '@/lib/xata'

export const runtime = 'edge'

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
    // Verify the request is from Instagram
    const signature = request.headers.get('x-hub-signature')
    if (!signature) {
      return NextResponse.json({ error: 'No signature' }, { status: 401 })
    }

    // Get the raw body
    const body = await request.text()
    
    // Verify signature (you should implement this)
    const isValid = verifySignature(body, signature)
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const data = JSON.parse(body)
    
    // Handle different types of events
    for (const entry of data.entry) {
      const changes = entry.changes
      
      for (const change of changes) {
        switch (change.field) {
          case 'media':
            await handleMediaUpdate(change.value)
            break
          case 'story':
            await handleStoryUpdate(change.value)
            break
          case 'mentions':
            await handleMention(change.value)
            break
          default:
            console.log('Unhandled Instagram webhook field:', change.field)
        }
      }
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('Instagram webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

// Verify the webhook signature
function verifySignature(body: string, signature: string): boolean {
  const appSecret = process.env.INSTAGRAM_APP_SECRET
  if (!appSecret) {
    console.error('Instagram app secret not configured')
    return false
  }

  // TODO: Implement signature verification using crypto
  // This should use crypto.createHmac to verify the signature
  // For now, returning true for development
  return true
}

// Handle media updates (posts, reels, etc.)
async function handleMediaUpdate(value: any) {
  try {
    // Get the integration record to check if it's active
    const integration = await xata.db.integrations
      .filter({ slug: 'instagram-business' })
      .getFirst()

    if (!integration?.is_active) {
      console.log('Instagram integration not active, skipping media update')
      return
    }

    // TODO: Implement media update handling
    // This could include:
    // - Storing new media information in your database
    // - Updating product catalogs
    // - Sending notifications
    console.log('New Instagram media:', value)
  } catch (error) {
    console.error('Error handling Instagram media update:', error)
  }
}

// Handle story updates
async function handleStoryUpdate(value: any) {
  try {
    const integration = await xata.db.integrations
      .filter({ slug: 'instagram-business' })
      .getFirst()

    if (!integration?.is_active) {
      console.log('Instagram integration not active, skipping story update')
      return
    }

    // TODO: Implement story update handling
    console.log('New Instagram story:', value)
  } catch (error) {
    console.error('Error handling Instagram story update:', error)
  }
}

// Handle mentions
async function handleMention(value: any) {
  try {
    const integration = await xata.db.integrations
      .filter({ slug: 'instagram-business' })
      .getFirst()

    if (!integration?.is_active) {
      console.log('Instagram integration not active, skipping mention')
      return
    }

    // TODO: Implement mention handling
    console.log('New Instagram mention:', value)
  } catch (error) {
    console.error('Error handling Instagram mention:', error)
  }
}

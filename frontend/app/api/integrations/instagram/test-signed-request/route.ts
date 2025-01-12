import { NextRequest, NextResponse } from 'next/server'
import { xata } from '@/lib/xata'

export const runtime = 'edge'

async function generateSignedRequest(payload: any): Promise<string> {
  const appSecret = process.env.INSTAGRAM_CLIENT_SECRET
  if (!appSecret) {
    throw new Error('App secret not configured')
  }

  // Encode payloadGET /api/integrations/instagram/test-signed-request?endpoint=deauthorize
  const payloadString = JSON.stringify(payload)
  const encodedPayload = btoa(payloadString)

  // Generate signature
  const encoder = new TextEncoder()
  const keyData = encoder.encode(appSecret)
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const payloadData = encoder.encode(encodedPayload)
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    payloadData
  )

  // Convert signature to base64
  const signatureArray = Array.from(new Uint8Array(signatureBuffer))
  const signatureString = String.fromCharCode.apply(null, signatureArray)
  const encodedSignature = btoa(signatureString)

  return `${encodedSignature}.${encodedPayload}`
}

export async function GET(request: NextRequest) {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const endpoint = searchParams.get('endpoint')

    if (!endpoint) {
      return NextResponse.json({ error: 'Missing endpoint parameter' }, { status: 400 })
    }

    // Get current Instagram integration
    const integration = await xata.db.integrations
      .filter({ slug: 'instagram-business' })
      .getFirst()

    if (!integration?.settings?.user_id) {
      return NextResponse.json({ error: 'No Instagram integration found' }, { status: 404 })
    }

    // Generate test payload
    const payload = {
      algorithm: 'HMAC-SHA256',
      issued_at: Math.floor(Date.now() / 1000),
      user_id: integration.settings.user_id
    }

    // Generate signed request
    const signedRequest = await generateSignedRequest(payload)

    // Generate curl command
    const curlCommand = `curl -X POST ${request.nextUrl.origin}/api/integrations/instagram/${endpoint} \\
  -H "Content-Type: application/json" \\
  -d '{
    "signed_request": "${signedRequest}"
  }'`

    return NextResponse.json({
      signedRequest,
      curlCommand
    })

  } catch (error) {
    console.error('Error generating test signed request:', error)
    return NextResponse.json(
      { error: 'Failed to generate test signed request' },
      { status: 500 }
    )
  }
}

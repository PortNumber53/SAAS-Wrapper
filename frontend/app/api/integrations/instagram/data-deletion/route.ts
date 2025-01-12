import { NextRequest, NextResponse } from 'next/server'
import { xata } from '@/lib/xata'

export const runtime = 'edge'

interface MetaSignedRequest {
  signed_request: string;
  user_id?: string;
}

interface ParsedSignedRequest {
  algorithm: string;
  expires: number;
  issued_at: number;
  user_id: string;
}

async function parseSignedRequest(signedRequest: string): Promise<ParsedSignedRequest | null> {
  try {
    const [encodedSig, payload] = signedRequest.split('.')
    
    // Decode the data
    const sig = atob(encodedSig)
    const data = JSON.parse(atob(payload))
    
    // Get the expected signature
    const appSecret = process.env.INSTAGRAM_CLIENT_SECRET
    if (!appSecret) {
      throw new Error('App secret not configured')
    }
    
    // Convert app secret to key
    const encoder = new TextEncoder()
    const keyData = encoder.encode(appSecret)
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    
    // Generate expected signature
    const payloadData = encoder.encode(payload)
    const expectedSigBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      payloadData
    )
    
    // Convert actual signature to ArrayBuffer for comparison
    const actualSigArray = new Uint8Array(sig.length)
    for (let i = 0; i < sig.length; i++) {
      actualSigArray[i] = sig.charCodeAt(i)
    }
    
    // Compare signatures
    if (actualSigArray.length !== new Uint8Array(expectedSigBuffer).length) {
      return null
    }
    
    const match = actualSigArray.every((byte, i) => 
      byte === new Uint8Array(expectedSigBuffer)[i]
    )
    
    if (!match) {
      return null
    }
    
    return data
  } catch (error) {
    console.error('Error parsing signed request:', error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    // Handle both form-urlencoded and application/json
    let signed_request: string | undefined
    const contentType = request.headers.get('content-type') || ''
    
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData()
      signed_request = formData.get('signed_request')?.toString()
    } else if (contentType.includes('application/json')) {
      const body = await request.json() as MetaSignedRequest
      signed_request = body.signed_request
    }

    if (!signed_request) {
      return NextResponse.json({ error: 'Missing signed_request' }, { status: 400 })
    }

    // Parse the signed request
    const data = await parseSignedRequest(signed_request)
    if (!data) {
      return NextResponse.json({ error: 'Invalid signed request data' }, { status: 400 })
    }

    // Find the integration record
    const integration = await xata.db.integrations
      .filter({ 
        platform: 'instagram-business',
        'settings.user_id': data.user_id 
      })
      .getFirst()

    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
    }

    // Create webhook event record
    await xata.db.webhook_events.create({
      integration_id: integration.id,
      user_id: integration.user_id,
      platform: 'instagram',
      event_type: 'data_deletion',
      status: 'pending',
      metadata: data,
      processed_at: null
    })

    // Create deletion request record
    await xata.db.deletion_requests.create({
      integration_id: integration.id,
      user_id: integration.user_id,
      platform: 'instagram',
      status: 'pending'
    })

    // Return confirmation URL where the user can check deletion status
    const statusUrl = `${request.nextUrl.origin}/api/integrations/instagram/data-deletion/status?id=${data.user_id}`
    
    return NextResponse.json({ 
      message: 'Data deletion request received',
      url: statusUrl
    })
  } catch (error) {
    console.error('Instagram data deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to process data deletion request' },
      { status: 500 }
    )
  }
}

// Status endpoint for checking deletion status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('id')

    if (!userId) {
      return NextResponse.json({ error: 'Missing user ID' }, { status: 400 })
    }

    // Check deletion status
    const deletionRequest = await xata.db.deletion_requests
      .filter({ 
        user_id: userId,
        platform: 'instagram'
      })
      .sort('created_at', 'desc')
      .getFirst()

    if (!deletionRequest) {
      return NextResponse.json({ 
        status: 'No deletion request found'
      })
    }

    return NextResponse.json({ 
      status: deletionRequest.status,
      completed_at: deletionRequest.completed_at
    })
  } catch (error) {
    console.error('Error checking deletion status:', error)
    return NextResponse.json(
      { error: 'Failed to check deletion status' },
      { status: 500 }
    )
  }
}

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
    // Handle both multipart/form-data and application/json
    let signed_request: string | undefined
    const contentType = request.headers.get('content-type') || ''
    
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      signed_request = formData.get('signed_request')?.toString()
    } else if (contentType.includes('application/json')) {
      const body = await request.json() as MetaSignedRequest
      signed_request = body.signed_request
    }

    if (!signed_request) {
      return NextResponse.json({ error: 'Missing signed_request' }, { status: 400 })
    }

    // Verify the signed request
    const parsedRequest = await parseSignedRequest(signed_request)
    if (!parsedRequest) {
      return NextResponse.json({ error: 'Invalid signed request' }, { status: 403 })
    }

    // Find and update the Instagram integration
    const integration = await xata.db.integrations
      .filter({ 
        slug: 'instagram-business',
        'settings.user_id': parsedRequest.user_id.toString()
      })
      .getFirst()

    if (integration) {
      // Clear the credentials and deactivate
      await xata.db.integrations.update(integration.id, {
        settings: {},
        is_active: false
      })
    }

    return NextResponse.json({ 
      message: 'Successfully deauthorized Instagram integration'
    })
  } catch (error) {
    console.error('Instagram deauthorization error:', error)
    return NextResponse.json(
      { error: 'Failed to process deauthorization' },
      { status: 500 }
    )
  }
}

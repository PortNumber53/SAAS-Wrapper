import { NextRequest, NextResponse } from 'next/server'
import { xata } from '@/lib/xata'

export const runtime = 'edge'

interface MetaSignedRequest {
  signed_request: string;
  user_id?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Get the signed request from Meta
    const body = await request.json() as MetaSignedRequest
    const { signed_request } = body

    if (!signed_request) {
      return NextResponse.json({ error: 'Missing signed_request' }, { status: 400 })
    }

    // TODO: Verify the signed request using your app secret
    // const isValid = verifySignedRequest(signed_request)
    // if (!isValid) {
    //   return NextResponse.json({ error: 'Invalid signed request' }, { status: 403 })
    // }

    // Find and update the Instagram integration
    const integration = await xata.db.integrations
      .filter({ slug: 'instagram-business' })
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

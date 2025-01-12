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

    // Find and delete all Instagram-related data
    const integration = await xata.db.integrations
      .filter({ slug: 'instagram-business' })
      .getFirst()

    if (integration) {
      // Clear all Instagram data
      await xata.db.integrations.update(integration.id, {
        settings: {},
        is_active: false
      })

      // TODO: Delete any other Instagram-related data
      // - Media records
      // - User data
      // - Analytics
      // - etc.
    }

    // Return confirmation URL where the user can check deletion status
    const statusUrl = `https://saaswrapper.truvis.co/api/integrations/instagram/data-deletion/status`
    
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

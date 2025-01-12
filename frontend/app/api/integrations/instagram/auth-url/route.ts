import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/auth'

export const runtime = 'edge'

async function generateState(): Promise<string> {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

export async function GET(request: NextRequest) {
  try {
    // Ensure user is authenticated
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the current URL to use as redirect_uri
    const url = new URL(request.url)
    const redirectUri = `${url.protocol}//${url.host}/api/integrations/instagram/callback`

    // Instagram OAuth parameters
    const instagramClientId = process.env.INSTAGRAM_CLIENT_ID
    // Instagram Business API scopes from Meta Developer Console
    const scopes = [
      'instagram_business_basic',
      'instagram_business_manage_messages',
      'instagram_business_manage_comments',
      'instagram_business_content_publish'
    ]

    if (!instagramClientId) {
      throw new Error('Instagram client ID not configured')
    }

    // Construct the Instagram Business authorization URL
    const authUrl = new URL('https://www.instagram.com/oauth/authorize')
    authUrl.searchParams.append('client_id', instagramClientId)
    authUrl.searchParams.append('redirect_uri', redirectUri)
    authUrl.searchParams.append('scope', scopes.join(','))
    authUrl.searchParams.append('response_type', 'code')
    authUrl.searchParams.append('enable_fb_login', '0')
    authUrl.searchParams.append('force_authentication', '1')
    authUrl.searchParams.append('state', await generateState())

    return NextResponse.json({ authUrl: authUrl.toString() })

  } catch (error) {
    console.error('Instagram auth URL error:', error)
    return NextResponse.json(
      { error: 'Failed to generate Instagram authorization URL' },
      { status: 500 }
    )
  }
}

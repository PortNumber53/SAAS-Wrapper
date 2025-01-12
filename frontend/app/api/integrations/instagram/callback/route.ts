import { NextRequest, NextResponse } from 'next/server'
import { xata } from '@/lib/xata'
import { auth } from '@/app/auth'

export const runtime = 'edge'

interface InstagramTokenResponse {
  access_token: string;
  token_type: string;
  user_id?: string;
}

interface InstagramUserResponse {
  id: string;
  username: string;
  account_type: string;
}

async function exchangeCodeForToken(code: string, redirectUri: string): Promise<{ accessToken: string; userId: string; username: string }> {
  const instagramClientId = process.env.INSTAGRAM_CLIENT_ID
  const instagramClientSecret = process.env.INSTAGRAM_CLIENT_SECRET

  if (!instagramClientId || !instagramClientSecret) {
    throw new Error('Instagram credentials not configured')
  }

  // Exchange code for access token using Instagram Business API
  const tokenResponse = await fetch(
    'https://api.instagram.com/oauth/access_token',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: instagramClientId,
        client_secret: instagramClientSecret,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code: code
      })
    }
  )

  if (!tokenResponse.ok) {
    const errorData = await tokenResponse.text()
    throw new Error(`Failed to exchange code for token: ${errorData}`)
  }

  const tokenData = await tokenResponse.json() as InstagramTokenResponse
  const { access_token: accessToken, user_id: initialUserId } = tokenData

  if (!initialUserId) {
    throw new Error('No user ID returned from Instagram')
  }

  // Get long-lived token
  const longLivedTokenResponse = await fetch(
    `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${instagramClientSecret}&access_token=${accessToken}`
  )

  if (!longLivedTokenResponse.ok) {
    const errorData = await longLivedTokenResponse.text()
    throw new Error(`Failed to get long-lived token: ${errorData}`)
  }

  const longLivedTokenData = await longLivedTokenResponse.json() as InstagramTokenResponse
  const longLivedToken = longLivedTokenData.access_token

  // Get user info
  const userResponse = await fetch(
    `https://graph.instagram.com/me?fields=id,username,account_type&access_token=${longLivedToken}`
  )

  if (!userResponse.ok) {
    const errorData = await userResponse.text()
    throw new Error(`Failed to get user info: ${errorData}`)
  }

  const userData = await userResponse.json() as InstagramUserResponse
  
  if (userData.account_type !== 'BUSINESS') {
    throw new Error('Instagram account must be a business account')
  }

  return {
    accessToken: longLivedToken,
    userId: initialUserId,
    username: userData.username
  }
}

export async function GET(request: NextRequest) {
  try {
    // Ensure user is authenticated
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the authorization code from the URL
    const searchParams = new URL(request.url).searchParams
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    const errorReason = searchParams.get('error_reason')
    const errorDescription = searchParams.get('error_description')

    if (error || !code) {
      console.error('Instagram OAuth error:', { error, errorReason, errorDescription })
      return NextResponse.json(
        { error: errorDescription || 'Failed to authenticate with Instagram' },
        { status: 400 }
      )
    }

    // Get the current URL to use as redirect_uri (must match the one used in auth-url)
    const url = new URL(request.url)
    const redirectUri = `${url.protocol}//${url.host}/api/integrations/instagram/callback`

    // Exchange the code for an access token and get user info
    const { accessToken, userId, username } = await exchangeCodeForToken(code, redirectUri)

    // Find or create Instagram integration
    const integration = await xata.db.integrations
      .filter({ slug: 'instagram-business' })
      .getFirst()

    const instagramSettings = {
      access_token: accessToken,
      user_id: userId,
      username
    }

    if (integration) {
      await xata.db.integrations.update(integration.id, {
        settings: instagramSettings,
        is_active: true
      })
    } else {
      await xata.db.integrations.create({
        slug: 'instagram-business',
        name: 'Instagram Business',
        description: 'Connect your Instagram Business account to automatically publish content.',
        is_active: true,
        settings: instagramSettings
      })
    }

    // Redirect back to the integrations page
    return NextResponse.redirect(new URL('/account/integrations', request.url))

  } catch (error) {
    console.error('Instagram callback error:', error)
    // Redirect to integrations page with error
    const redirectUrl = new URL('/account/integrations', request.url)
    redirectUrl.searchParams.append('error', 'instagram_auth_failed')
    return NextResponse.redirect(redirectUrl)
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/auth'
import { xata } from '@/lib/xata'

export const runtime = 'edge'

interface InstagramIntegrationBody {
  accessToken?: string;
  username?: string;
  is_active: boolean;
}

export async function POST(request: NextRequest) {
  try {
    // Ensure user is authenticated
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse the request body
    const body = await request.json() as InstagramIntegrationBody

    // Type guard and validation
    const accessToken = body.accessToken || ''
    const username = body.username || ''
    const is_active = body.is_active

    // Validate input if integration is active
    if (is_active && !accessToken) {
      return NextResponse.json(
        { error: 'Access Token is required when integration is active' },
        { status: 400 }
      )
    }

    // Prepare Instagram settings
    const instagramSettings = {
      accessToken,
      username
    }

    // Get the Instagram integration if it exists
    const existingIntegration = await xata.db.integrations
      .filter({ slug: 'instagram-business' })
      .getFirst()

    if (existingIntegration) {
      // Update existing record
      const updatedRecord = await xata.db.integrations.update(existingIntegration.id, {
        settings: instagramSettings,
        is_active
      })

      return NextResponse.json({
        message: 'Instagram integration settings updated successfully',
        integration: {
          ...instagramSettings,
          is_active: updatedRecord.is_active
        }
      }, { status: 200 })
    }

    // Create new record if not exists
    const newRecord = await xata.db.integrations.create({
      slug: 'instagram-business',
      name: 'Instagram Business',
      description: 'Connect your Instagram Business account to automatically publish content.',
      is_active,
      settings: instagramSettings
    })

    return NextResponse.json({
      message: 'Instagram integration settings saved successfully',
      integration: {
        ...instagramSettings,
        is_active: newRecord.is_active
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Instagram integration save error:', error)
    return NextResponse.json(
      { error: 'Failed to save Instagram integration settings' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Ensure user is authenticated
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the Instagram integration
    const instagramIntegration = await xata.db.integrations
      .filter({ slug: 'instagram-business' })
      .getFirst()

    if (!instagramIntegration) {
      return NextResponse.json({
        integration: null
      })
    }

    const settings = instagramIntegration.settings as { accessToken?: string; username?: string }

    return NextResponse.json({
      integration: {
        accessToken: settings?.accessToken || '',
        username: settings?.username || '',
        is_active: instagramIntegration.is_active
      }
    })

  } catch (error) {
    console.error('Instagram integration fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Instagram integration settings' },
      { status: 500 }
    )
  }
}

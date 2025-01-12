import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/auth'
import { xata } from '@/lib/xata'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    // Ensure user is authenticated
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find the Instagram integration record
    const existingIntegration = await xata.db.integrations
      .filter({ slug: 'instagram-business' })
      .getFirst()

    if (existingIntegration) {
      // Update the record to remove credentials and deactivate
      await xata.db.integrations.update(existingIntegration.id, {
        settings: {},
        is_active: false
      })

      return NextResponse.json({
        message: 'Instagram integration disconnected successfully'
      })
    }

    return NextResponse.json({
      message: 'Instagram integration not found'
    }, { status: 404 })

  } catch (error) {
    console.error('Instagram disconnect error:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect Instagram integration' },
      { status: 500 }
    )
  }
}

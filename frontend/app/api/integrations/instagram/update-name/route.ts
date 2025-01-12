import { NextRequest, NextResponse } from 'next/server'
import { xata } from '@/lib/xata'
import { auth } from '@/app/auth'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    // Ensure user is authenticated
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Update the Instagram integration name
    const integration = await xata.db.integrations
      .filter({ slug: 'instagram-business' })
      .getFirst()

    if (integration) {
      await xata.db.integrations.update(integration.id, {
        name: 'Instagram Business',
        description: 'Connect your Instagram Business account to automatically publish content.'
      })
    } else {
      // Create if it doesn't exist
      await xata.db.integrations.create({
        slug: 'instagram-business',
        name: 'Instagram Business',
        description: 'Connect your Instagram Business account to automatically publish content.',
        is_active: false,
        settings: {}
      })
    }

    return NextResponse.json({ 
      message: 'Instagram integration name updated successfully' 
    })
  } catch (error) {
    console.error('Error updating Instagram integration name:', error)
    return NextResponse.json(
      { error: 'Failed to update Instagram integration name' },
      { status: 500 }
    )
  }
}

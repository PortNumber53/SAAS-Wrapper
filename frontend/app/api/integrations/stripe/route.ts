import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/auth'
import { xata } from '@/lib/xata'

export const runtime = 'edge'

interface StripeIntegrationBody {
  secretKey?: string;
  publishableKey?: string;
  webhookSecret?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Ensure user is authenticated
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse the request body
    const body = await request.json() as StripeIntegrationBody

    // Type guard and validation
    const secretKey = body.secretKey || ''
    const publishableKey = body.publishableKey || ''
    const webhookSecret = body.webhookSecret || ''

    // Validate input
    if (!publishableKey) {
      return NextResponse.json(
        { error: 'Publishable Key is required' },
        { status: 400 }
      )
    }

    // Prepare Stripe settings
    const stripeSettings = {
      secretKey,
      publishableKey,
      webhookSecret
    }

    // Find the Stripe integration record
    const existingIntegration = await xata.db.integrations
      .filter({ slug: 'stripe' })
      .getFirst()

    console.log('existingIntegration', existingIntegration)

    if (existingIntegration) {
      // Update existing record
      const updatedRecord = await xata.db.integrations.update(existingIntegration.id, {
        settings: stripeSettings
      })

      return NextResponse.json({
        message: 'Stripe integration settings updated successfully',
        integration: updatedRecord
      }, { status: 200 })
    }

    // Create new record if not exists
    const newRecord = await xata.db.integrations.create({
      slug: 'stripe',
      settings: stripeSettings
    })

    return NextResponse.json({
      message: 'Stripe integration settings saved successfully',
      integration: newRecord
    }, { status: 201 })

  } catch (error) {
    console.error('Stripe integration save error:', error)
    return NextResponse.json(
      { error: 'Failed to save Stripe integration settings' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const params = url.searchParams

  try {
    // Ensure user is authenticated
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Retrieve Stripe integration settings
    const stripeIntegration = await xata.db.integrations
      .filter({ slug: 'stripe' })
      .getFirst()

    console.log('Stripe integration record:', stripeIntegration)

    return NextResponse.json({
      integration: stripeIntegration?.settings
        ? {
            publishableKey: stripeIntegration.settings.publishableKey,
            secretKey: stripeIntegration.settings.secretKey,
            hasSecretKey: !!stripeIntegration.settings.secretKey,
            webhookSecret: stripeIntegration.settings.webhookSecret
          }
        : null
    }, { status: 200 })

  } catch (error) {
    console.error('Stripe integration retrieve error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve Stripe integration settings' },
      { status: 500 }
    )
  }
}

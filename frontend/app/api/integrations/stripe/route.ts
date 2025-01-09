import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/auth'
import { xata } from '@/lib/xata'

export const runtime = 'edge'

interface StripeIntegrationBody {
  secretKey?: string;
  publishableKey?: string;
  webhookSecret?: string;
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
    const body = await request.json() as StripeIntegrationBody

    // Type guard and validation
    const secretKey = body.secretKey || ''
    const publishableKey = body.publishableKey || ''
    const webhookSecret = body.webhookSecret || ''
    const is_active = body.is_active

    // Validate input if integration is active
    if (is_active && !publishableKey) {
      return NextResponse.json(
        { error: 'Publishable Key is required when integration is active' },
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

    if (existingIntegration) {
      // Update existing record
      const updatedRecord = await xata.db.integrations.update(existingIntegration.id, {
        settings: stripeSettings,
        is_active
      })

      return NextResponse.json({
        message: 'Stripe integration settings updated successfully',
        integration: {
          ...stripeSettings,
          is_active: updatedRecord.is_active
        }
      }, { status: 200 })
    }

    // Create new record if not exists
    const newRecord = await xata.db.integrations.create({
      slug: 'stripe',
      settings: stripeSettings,
      is_active,
      name: 'Stripe'
    })

    return NextResponse.json({
      message: 'Stripe integration settings saved successfully',
      integration: {
        ...stripeSettings,
        is_active: newRecord.is_active
      }
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

    if (!stripeIntegration) {
      return NextResponse.json({
        integration: null
      })
    }

    return NextResponse.json({
      integration: {
        ...(stripeIntegration.settings as any),
        is_active: stripeIntegration.is_active
      }
    })
  } catch (error) {
    console.error('Stripe integration fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Stripe integration settings' },
      { status: 500 }
    )
  }
}

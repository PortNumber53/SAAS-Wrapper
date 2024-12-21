import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/auth'
import Stripe from 'stripe'

// Ensure the Stripe secret key is available
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing Stripe secret key')
}

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia'
})

// Add Edge Runtime configuration
export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const session = await auth()
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse the request body with type safety
    const body = await request.json() as { priceId?: string }
    const priceId = body.priceId

    if (!priceId) {
      return NextResponse.json({ error: 'Missing price ID' }, { status: 400 })
    }

    // Create Stripe Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXTAUTH_URL}/dashboard?success=true`,
      cancel_url: `${process.env.NEXTAUTH_URL}/pricing?canceled=true`,
      automatic_tax: { enabled: true },
      customer_email: session.user.email || undefined,
      billing_address_collection: 'auto',
      payment_method_types: ['card'],
    })

    // Return the session ID
    return NextResponse.json({
      id: checkoutSession.id
    })

  } catch (error) {
    console.error('Checkout Error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'

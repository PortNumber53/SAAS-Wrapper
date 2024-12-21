import { loadStripe } from '@stripe/stripe-js'

interface StripeCheckoutSession {
  id: string;
}

export async function handleCheckout(priceId: string) {
  if (!priceId) {
    console.error('No price ID provided')
    return
  }

  try {
    // Load Stripe with your publishable key
    const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

    // Call your backend to create a checkout session
    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ priceId }),
    })

    if (!response.ok) {
      throw new Error('Failed to create checkout session')
    }

    const session: StripeCheckoutSession = await response.json()

    // Redirect to Stripe Checkout
    const result = await stripe?.redirectToCheckout({
      sessionId: session.id,
    })

    if (result?.error) {
      console.error(result.error)
    }
  } catch (error) {
    console.error('Checkout error:', error)
  }
}

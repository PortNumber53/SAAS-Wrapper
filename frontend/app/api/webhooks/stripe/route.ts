import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { xata } from '@/lib/xata'

// Ensure Stripe and Xata are properly initialized
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing Stripe secret key')
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia'
})

// Webhook secret for verifying the event came from Stripe
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    // Retrieve the raw body and signature
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json({ error: 'No signature' }, {
        status: 400,
        headers: new Headers()
      })
    }

    // Verify the webhook came from Stripe
    let event: Stripe.Event
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        webhookSecret
      )
    } catch (err) {
      console.error('Webhook verification failed:', err)
      return NextResponse.json({ error: 'Webhook error' }, {
        status: 400,
        headers: new Headers()
      })
    }

    // Log all incoming events for debugging
    console.log(`Received Stripe webhook event: ${event.type}`)
    console.log('Event data:', JSON.stringify(event.data.object, null, 2))

    // Handle different Stripe event types
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          const session = event.data.object as Stripe.Checkout.Session
          await handleCheckoutSessionCompleted(session)
          break

        case 'customer.subscription.created':
          const subscription = event.data.object as Stripe.Subscription
          await handleSubscriptionCreated(subscription)
          break

        case 'customer.subscription.updated':
          const updatedSubscription = event.data.object as Stripe.Subscription
          await handleSubscriptionUpdated(updatedSubscription)
          break

        case 'customer.subscription.deleted':
          const deletedSubscription = event.data.object as Stripe.Subscription
          await handleSubscriptionCanceled(deletedSubscription)
          break

        // New event handlers
        case 'invoice.created':
        case 'invoice.finalized':
        case 'invoice.updated':
        case 'invoice.paid':
        case 'invoice.payment_succeeded':
          await handleInvoiceEvent(event.type, event.data.object as Stripe.Invoice)
          break

        case 'customer.updated':
        case 'customer.created':
          await handleCustomerEvent(event.type, event.data.object as Stripe.Customer)
          break

        default:
          console.log(`Unhandled event type ${event.type}`)
      }
    } catch (handlerError) {
      console.error('Webhook handler error:', handlerError)
      // Log full error details for debugging
      console.error('Full error details:', JSON.stringify(handlerError, Object.getOwnPropertyNames(handlerError), 2))
    }

    return NextResponse.json({ received: true }, {
      headers: new Headers()
    })
  } catch (globalError) {
    console.error('Global webhook error:', globalError)
    return NextResponse.json({ error: 'Webhook processing failed' }, {
      status: 500,
      headers: new Headers()
    })
  }
}

// Handle completed checkout session
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const customerId = session.customer as string
  const customerEmail = session.customer_email

  if (!customerEmail) {
    console.error('No customer email found in session')
    return
  }

  // Retrieve full customer details
  const customer = await stripe.customers.retrieve(customerId)

  // Type guard to ensure we have an active customer
  if ('metadata' in customer) {
    // Find and update user in nextauth_users table
    const user = await findUserByEmailOrStripeCustomerId(customer)

    if (user) {
      console.log('Prepared update data existingUser:', JSON.stringify(user, null, 2))

      await xata.db.nextauth_users.update(user.id, {
        stripeCustomerId: customerId,
        stripeMetadata: JSON.stringify(customer.metadata || {})
      })
    } else {
      console.error('User not found:', customerEmail)
    }
  } else {
    console.error('Customer has been deleted or is not retrievable')
  }
}

// Handle new subscription creation
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  try {
    console.log('Subscription details:', JSON.stringify(subscription, null, 2))

    // Find existing subscription
    const existingSub = await xata.db.subscriptions.filter({
      stripeSubscriptionId: subscription.id
    }).getFirst()

    // If subscription already exists, just log and return
    if (existingSub) {
      console.log(`Subscription ${subscription.id} already exists. Skipping creation.`)
      return
    }

    // Attempt to find the user
    const customer = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer
    const userId = await findUserByEmailOrStripeCustomerId(customer)

    console.log(`Resolved User ID: ${userId}`)

    // Create a new subscription only if it doesn't exist
    await xata.db.subscriptions.create({
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: subscription.customer as string,
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
      canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
      plan: subscription.items.data[0]?.price?.id || null,
      planAmount: subscription.items.data[0]?.price?.unit_amount || null,

      // Link to the user via Stripe Customer ID
      user: userId
    })

    console.log(`Created new subscription ${subscription.id}`)
  } catch (error) {
    console.error('Error handling subscription creation:', error)
  }
}

// Handle subscription updates
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    console.log('Updated Subscription details:', JSON.stringify(subscription, null, 2))

    // Find the existing subscription by Stripe Subscription ID
    const existingSub = await xata.db.subscriptions.filter({
      stripeSubscriptionId: subscription.id
    }).getFirst()

    // Attempt to find the user
    const customer = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer
    const userId = await findUserByEmailOrStripeCustomerId(customer)

    console.log(`Resolved User ID: ${userId}`)

    // Prepare update/create data
    const subscriptionData = {
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: subscription.customer as string,
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
      canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
      plan: subscription.items.data[0]?.price?.id || null,
      planAmount: subscription.items.data[0]?.price?.unit_amount || null,

      // Link to the user via Stripe Customer ID
      user: userId
    }

    // If no existing subscription, create a new one
    if (!existingSub) {
      await xata.db.subscriptions.create(subscriptionData)
      console.log(`Created new subscription from update event ${subscription.id}`)
      return
    }

    // Update the existing subscription
    console.log('Prepared update data existingSubscription:', JSON.stringify(existingSub, null, 2))

    await xata.db.subscriptions.update(existingSub.id, subscriptionData)
    console.log(`Updated subscription ${subscription.id} with status: ${subscription.status}`)
  } catch (error) {
    console.error('Error handling subscription update:', error)
  }
}

// Handle subscription cancellation
async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  const sub = await xata.db.subscriptions.filter({
    stripeSubscriptionId: subscription.id
  }).getFirst()

  if (sub) {
    console.log('Prepared update data existingSubscription:', JSON.stringify(sub, null, 2))

    await xata.db.subscriptions.update(sub.id, {
      status: 'canceled',
      canceledAt: new Date()
    })
  }
}

// New function to handle invoice-related events
async function handleInvoiceEvent(eventType: string, invoice: Stripe.Invoice) {
  console.log(`Handling invoice event: ${eventType}`)
  console.log('Invoice details:', JSON.stringify(invoice, null, 2))

  // You can add specific logic for different invoice events
  // For example, tracking invoice status or updating customer records
  try {
    const existingInvoice = await xata.db.invoices.filter({
      stripeInvoiceId: invoice.id
    }).getFirst()

    // Find the user associated with this Stripe Customer ID
    const customer = await stripe.customers.retrieve(invoice.customer as string) as Stripe.Customer
    const user = await findUserByEmailOrStripeCustomerId(customer)

    const invoiceData = {
      stripeInvoiceId: invoice.id,
      status: invoice.status || 'unknown',
      amount: invoice.amount_paid || 0,
      stripeCustomerId: invoice.customer as string,
      stripeEmail: invoice.customer_email || '',
      createdAt: new Date(invoice.created * 1000),
      subscriptionId: invoice.subscription as string,
      periodStart: invoice.period_start ? new Date(invoice.period_start * 1000) : undefined,
      periodEnd: invoice.period_end ? new Date(invoice.period_end * 1000) : undefined,
      dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : undefined,
      hostedInvoiceUrl: invoice.hosted_invoice_url || undefined,
      user: user?.id || undefined
    }

    if (!existingInvoice) {
      // Create a new invoice record if it doesn't exist
      await xata.db.invoices.create(invoiceData)
    } else {
      // Update existing invoice record
      console.log('Prepared update data existingInvoice:', JSON.stringify(existingInvoice, null, 2))

      await xata.db.invoices.update(existingInvoice.id, invoiceData)
    }
  } catch (error) {
    console.error(`Error handling invoice event ${eventType}:`, error)
  }
}

// New function to find user by email or Stripe Customer ID
async function findUserByEmailOrStripeCustomerId(customer: Stripe.Customer) {
  console.log(`Searching for user: Email=${customer.email}, Stripe Customer ID=${customer.id}`)

  // First, try to find by Stripe Customer ID
  let existingUser = await xata.db.nextauth_users.filter({
    stripeCustomerId: customer.id
  }).getFirst()

  // If not found by Stripe Customer ID, try to find by email
  if (!existingUser && customer.email) {
    existingUser = await xata.db.nextauth_users.filter({
      email: customer.email
    }).getFirst()

    // If found by email, update with Stripe Customer ID
    if (existingUser) {
      console.log(`User found by email: ${customer.email}`)
      console.log('Prepared update data existingUser:', JSON.stringify(existingUser, null, 2))

      await xata.db.nextauth_users.update(existingUser.id, {
        stripeCustomerId: customer.id
      })
    }
  }

  return existingUser
}

// New function to handle customer-related events
async function handleCustomerEvent(eventType: string, customer: Stripe.Customer) {
  console.log(`Handling customer event: ${eventType}`)
  console.log('Customer details:', JSON.stringify(customer, null, 2))

  try {
    // Use the new function to find the user
    const existingUser = await findUserByEmailOrStripeCustomerId(customer)

    if (existingUser) {
      console.log('Existing user details:', JSON.stringify(existingUser, null, 2))

      // Prepare update data with only valid fields
      const updateData: Record<string, string> = {
        stripeCustomerId: customer.id
      }

      // Only add non-null values to update
      if (customer.email) {
        updateData.email = customer.email
      }

      if (customer.name) {
        updateData.name = customer.name
      }

      console.log('Prepared update data:', JSON.stringify(updateData, null, 2))
      console.log('Prepared update data existingUser:', JSON.stringify(existingUser, null, 2))

      try {
        // Attempt to update user record
        const updatedUser = await xata.db.nextauth_users.update(existingUser.id, updateData)
        console.log(`Successfully updated user ${existingUser.id}:`, JSON.stringify(updatedUser, null, 2))
      } catch (updateError) {
        console.error('Error updating user record:', updateError)
        console.error('Update data:', JSON.stringify(updateData, null, 2))
        console.error('Existing user details:', JSON.stringify(existingUser, null, 2))

        // Additional error investigation
        if (updateError instanceof Error) {
          console.error('Error name:', updateError.name)
          console.error('Error message:', updateError.message)
          console.error('Error stack:', updateError.stack)
        }
      }
    } else {
      console.warn(`No user found for Stripe Customer ID: ${customer.id} or email: ${customer.email}`)
    }
  } catch (error) {
    console.error(`Error handling customer event ${eventType}:`, error)

    // Log full error details
    if (error instanceof Error) {
      console.error('Error name:', error.name)
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
  }
}

export const dynamic = 'force-dynamic'
export const runtime = 'edge'

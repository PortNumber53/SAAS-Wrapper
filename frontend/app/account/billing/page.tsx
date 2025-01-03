import { auth } from "@/app/auth"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { xata } from "@/lib/xata"
import { Kysely } from 'kysely'
import { XataDialect } from '@xata.io/kysely'
import { format } from "date-fns"
import type { DatabaseSchema } from "@/vendor/xata"
import type { SubscriptionsRecord } from "@/vendor/xata"

const db = new Kysely<DatabaseSchema>({
  dialect: new XataDialect({ xata })
});

export const runtime = 'edge'

// Helper function to format amount from cents to dollars
function formatAmount(amountInCents?: number | null): string {
  if (!amountInCents) return '29.99'
  return (amountInCents / 100).toFixed(2)
}

export default async function BillingPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  // Fetch the user's active subscription
  if (!session?.user?.id) {
    redirect('/login')
  }

  console.log('Debugging Billing Page - User ID:', session.user.id)

  try {
    const userSubscription = await db
      .selectFrom('subscriptions')
      .innerJoin('nextauth_users', 'subscriptions.user', 'nextauth_users.xata_id')
      .where('nextauth_users.xata_id', '=', session.user.id)
      .where('subscriptions.status', '=', 'active')
      .orderBy('subscriptions.currentPeriodEnd', 'desc')
      .selectAll()
      .executeTakeFirst() as SubscriptionsRecord | null

    console.log('User Subscription:', userSubscription ? JSON.stringify(userSubscription, null, 2) : 'No active subscription')

    const billingHistory = await db
      .selectFrom('subscriptions')
      .innerJoin('nextauth_users', 'subscriptions.user', 'nextauth_users.xata_id')
      .where('nextauth_users.xata_id', '=', session.user.id)
      .orderBy('subscriptions.currentPeriodEnd', 'desc')
      .selectAll()
      .execute() as SubscriptionsRecord[]

    console.log('Billing History:', billingHistory.length > 0 ? JSON.stringify(billingHistory, null, 2) : 'No billing history')

    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Billing</h1>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Current Subscription</CardTitle>
            </CardHeader>
            <CardContent>
              {userSubscription ? (
                <div className="space-y-2">
                  <p>Status: {userSubscription.status}</p>
                  <p>Amount: ${formatAmount(userSubscription.planAmount)}</p>
                  <p>
                    Current Period End:{' '}
                    {userSubscription.currentPeriodEnd
                      ? format(new Date(userSubscription.currentPeriodEnd), 'PPP')
                      : 'N/A'}
                  </p>
                  {/* Debug Information */}
                  <details>
                    <summary>Debug Subscription Details</summary>
                    <pre>{JSON.stringify(userSubscription, null, 2)}</pre>
                  </details>
                </div>
              ) : (
                <div>
                  <p>No active subscription</p>
                  <details>
                    <summary>Troubleshooting Tips</summary>
                    <ul>
                      <li>Ensure you completed the Stripe checkout</li>
                      <li>Check if Stripe webhook events were processed</li>
                      <li>Verify your Stripe customer and subscription status</li>
                    </ul>
                  </details>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Billing History</CardTitle>
            </CardHeader>
            <CardContent>
              {billingHistory.length > 0 ? (
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4">Date</th>
                      <th className="text-right py-2 px-4">Amount</th>
                      <th className="text-left py-2 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billingHistory.map((subscription) => (
                      <tr key={subscription.xata_id} className="border-b">
                        <td className="py-2 px-4">
                          {subscription.currentPeriodEnd
                            ? format(new Date(subscription.currentPeriodEnd), 'PPP')
                            : 'N/A'}
                        </td>
                        <td className="text-right py-2 px-4">
                          ${formatAmount(subscription.planAmount)}
                        </td>
                        <td className="py-2 px-4">{subscription.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div>
                  <p>No billing history found</p>
                  <details>
                    <summary>Possible Reasons</summary>
                    <ul>
                      <li>Subscription not yet processed</li>
                      <li>Webhook events might not have been received</li>
                      <li>Database synchronization issue</li>
                    </ul>
                  </details>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  } catch (error) {
    console.error('Billing Page Error:', error)
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Billing</h1>
        <Card>
          <CardContent>
            <p>Error loading billing information</p>
            <details>
              <summary>Error Details</summary>
              <pre>{JSON.stringify(error, null, 2)}</pre>
            </details>
          </CardContent>
        </Card>
      </div>
    )
  }
}

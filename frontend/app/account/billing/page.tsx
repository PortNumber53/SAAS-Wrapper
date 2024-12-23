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

  const userSubscription = await db
    .selectFrom('subscriptions')
    .innerJoin('nextauth_users', 'subscriptions.user', 'nextauth_users.xata_id')
    .where('nextauth_users.xata_id', '=', session.user.id)
    .where('subscriptions.status', '=', 'active')
    .orderBy('subscriptions.currentPeriodEnd', 'desc')
    .selectAll()
    .executeTakeFirst() as SubscriptionsRecord | null

  const billingHistory = await db
    .selectFrom('subscriptions')
    .innerJoin('nextauth_users', 'subscriptions.user', 'nextauth_users.xata_id')
    .where('nextauth_users.xata_id', '=', session.user.id)
    .orderBy('subscriptions.currentPeriodEnd', 'desc')
    .selectAll()
    .execute() as SubscriptionsRecord[]

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
              </div>
            ) : (
              <p>No active subscription</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Billing History</CardTitle>
          </CardHeader>
          <CardContent>
            {billingHistory.length > 0 ? (
              <ul className="space-y-2">
                {billingHistory.map((subscription) => (
                  <li
                    key={subscription.xata_id}
                    className="flex justify-between items-center"
                  >
                    <span>
                      {subscription.currentPeriodEnd
                        ? format(new Date(subscription.currentPeriodEnd), 'PPP')
                        : 'N/A'}
                    </span>
                    <span>${formatAmount(subscription.planAmount)}</span>
                    <span>{subscription.status}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No billing history</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

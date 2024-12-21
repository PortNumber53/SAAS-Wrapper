import { auth } from "@/app/auth"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getXataClient } from "@/lib/xata"
import { format } from "date-fns"

const xata = getXataClient()

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
  const userSubscription = await xata.db.subscriptions
    .filter({
      user: session.user.id,
      status: 'active'
    })
    .sort('currentPeriodEnd', 'desc')
    .getFirst()

  // Fetch billing history
  const billingHistory = await xata.db.subscriptions
    .filter({
      user: session.user.id
    })
    .sort('currentPeriodEnd', 'desc')
    .getMany()

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
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold">{userSubscription.tier || 'Pro Plan'} Plan</p>
                  <p className="text-muted-foreground">
                    Billed {userSubscription.billingCycle || 'Monthly'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold">
                    ${formatAmount(userSubscription.planAmount)}/month
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Renews {userSubscription.currentPeriodEnd
                      ? format(new Date(userSubscription.currentPeriodEnd), 'MMM dd, yyyy')
                      : 'Soon'}
                  </p>
                  <Button variant="outline" size="sm" className="mt-2">
                    Change Plan
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-muted-foreground">No active subscription</p>
                <Button variant="default" size="sm" className="mt-2">
                  Choose a Plan
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold">Visa ••••  1234</p>
                <p className="text-muted-foreground">Expires 12/25</p>
              </div>
              <Button variant="secondary" size="sm">
                Update Payment Method
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Billing History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 text-left">Date</th>
                    <th className="py-2 text-left">Description</th>
                    <th className="py-2 text-right">Amount</th>
                    <th className="py-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {billingHistory.map((billing) => (
                    <tr key={billing.xata_id}>
                      <td className="py-2">
                        {billing.currentPeriodEnd
                          ? format(new Date(billing.currentPeriodEnd), 'MMM dd, yyyy')
                          : 'N/A'}
                      </td>
                      <td>{billing.tier || 'Pro Plan'} - {billing.billingCycle || 'Monthly'} Subscription</td>
                      <td className="text-right">${formatAmount(billing.planAmount)}</td>
                      <td className="text-right uppercase">{billing.status || 'COMPLETED'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

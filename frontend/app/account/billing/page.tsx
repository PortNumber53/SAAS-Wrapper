import { auth } from "@/app/auth"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function BillingPage() {
  const session = await auth()
  
  if (!session) {
    redirect('/login')
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Billing</h1>
      
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Current Subscription</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold">Pro Plan</p>
                <p className="text-muted-foreground">Billed Monthly</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold">$29.99/month</p>
                <Button variant="outline" size="sm" className="mt-2">
                  Change Plan
                </Button>
              </div>
            </div>
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
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-2">Dec 1, 2023</td>
                    <td>Pro Plan - Monthly Subscription</td>
                    <td className="text-right">$29.99</td>
                  </tr>
                  <tr>
                    <td className="py-2">Nov 1, 2023</td>
                    <td>Pro Plan - Monthly Subscription</td>
                    <td className="text-right">$29.99</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

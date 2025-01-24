"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { usePageTitle } from "@/lib/page-title-context";
import { CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import type { SubscriptionsRecord } from "@/vendor/xata";
import { getCurrentSubscription, getBillingHistory } from "./actions";
import { formatAmount } from "@/lib/currency";

export const runtime = "edge";

export default function BillingPage() {
  const { data: session } = useSession();
  const { setPageTitle } = usePageTitle();
  const [subscription, setSubscription] = useState<SubscriptionsRecord | null>(
    null
  );
  const [billingHistory, setBillingHistory] = useState<SubscriptionsRecord[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setPageTitle("Billing & Payments", CreditCard);
  }, [setPageTitle]);

  useEffect(() => {
    async function fetchBillingData() {
      if (!session?.user?.id) return;

      try {
        const [currentSubscription, history] = await Promise.all([
          getCurrentSubscription(session.user.id),
          getBillingHistory(session.user.id),
        ]);

        setSubscription(currentSubscription);
        setBillingHistory(history || []);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchBillingData();
  }, [session?.user?.id]);

  if (!session) {
    redirect("/login");
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="gnome-header">Billing & Payments</h1>
        <div className="gnome-card">
          <p className="text-gnome-dark/70 dark:text-white/70">
            Loading billing information...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="gnome-header">Billing & Payments</h1>
        <Card>
          <CardContent>
            <p>Error loading billing information</p>
            <details>
              <summary>Error Details</summary>
              <pre>{error.message}</pre>
            </details>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="gnome-header">Billing & Payments</h1>
      <div className="gnome-card">
        <p className="text-gnome-dark/70 dark:text-white/70">
          Manage your billing information and view payment history.
        </p>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Current Subscription</CardTitle>
            </CardHeader>
            <CardContent>
              {subscription ? (
                <div className="space-y-2">
                  <p>Status: {subscription.status}</p>
                  <p>Amount: ${formatAmount(subscription.planAmount)}</p>
                  <p>
                    Current Period End:{" "}
                    {subscription.currentPeriodEnd
                      ? format(new Date(subscription.currentPeriodEnd), "PPP")
                      : "N/A"}
                  </p>
                </div>
              ) : (
                <div>
                  <p>No active subscription</p>
                  <details>
                    <summary>Troubleshooting Tips</summary>
                    <ul>
                      <li>Ensure you completed the Stripe checkout</li>
                      <li>Check if Stripe webhook events were processed</li>
                      <li>
                        Verify your Stripe customer and subscription status
                      </li>
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
                      <tr key={subscription.id} className="border-b">
                        <td className="py-2 px-4">
                          {subscription.currentPeriodEnd
                            ? format(
                                new Date(subscription.currentPeriodEnd),
                                "PPP"
                              )
                            : "N/A"}
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
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

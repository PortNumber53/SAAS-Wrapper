"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { usePageTitle } from "@/lib/page-title-context";
import { CreditCard } from "lucide-react";
import { getSubscriptions, updateSubscription } from "./actions";
import type { SubscriptionsRecord } from "@/vendor/xata";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

export const runtime = "edge";

export default function SubscriptionsPage() {
  const { data: session } = useSession();
  const { setPageTitle } = usePageTitle();
  const [subscriptions, setSubscriptions] = useState<SubscriptionsRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setPageTitle("Subscriptions", CreditCard);
  }, [setPageTitle]);

  useEffect(() => {
    if (session) {
      loadSubscriptions();
    }
  }, [session]);

  if (!session) {
    redirect("/login");
  }

  const loadSubscriptions = async () => {
    try {
      const data = await getSubscriptions();
      setSubscriptions(data);
    } catch (error) {
      toast.error("Failed to load subscriptions");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelSubscription = async (
    subscription: SubscriptionsRecord
  ) => {
    if (confirm("Are you sure you want to cancel this subscription?")) {
      try {
        await updateSubscription(subscription.id, {
          status: "canceled",
          cancelAtPeriodEnd: true,
        });
        toast.success("Subscription canceled successfully");
        loadSubscriptions();
      } catch (error) {
        toast.error("Failed to cancel subscription");
      }
    }
  };

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString();
  };

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="gnome-header">Subscriptions</h1>
      </div>

      <div className="bg-white dark:bg-gnome-dark-800 rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Billing Cycle</TableHead>
              <TableHead>Current Period</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subscriptions.map((subscription) => (
              <TableRow key={subscription.id}>
                <TableCell className="font-medium">
                  {subscription.plan || "-"}
                  {subscription.tier && (
                    <span className="ml-2 text-sm text-gray-500">
                      ({subscription.tier})
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      subscription.status === "active"
                        ? "bg-green-100 text-green-800"
                        : subscription.status === "canceled"
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {subscription.status || "unknown"}
                  </span>
                </TableCell>
                <TableCell>
                  {formatCurrency(
                    subscription.planAmount,
                    subscription.currency || "USD"
                  )}
                </TableCell>
                <TableCell>{subscription.billingCycle || "-"}</TableCell>
                <TableCell>
                  {formatDate(subscription.currentPeriodStart)} -{" "}
                  {formatDate(subscription.currentPeriodEnd)}
                </TableCell>
                <TableCell>
                  {subscription.status === "active" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCancelSubscription(subscription)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Cancel
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {subscriptions.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  No subscriptions found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

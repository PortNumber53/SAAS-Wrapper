"use server";

import { xata } from "@/lib/xata";
import type { SubscriptionsRecord } from "@/vendor/xata";

export async function getCurrentSubscription(userId: string) {
  try {
    const subscription = await xata.db.subscriptions
      .filter({
        "user.id": userId,
        status: "active",
      })
      .sort("currentPeriodEnd", "desc")
      .getFirst();

    return subscription;
  } catch (error) {
    console.error("Error fetching current subscription:", error);
    throw error;
  }
}

export async function getBillingHistory(userId: string) {
  try {
    const history = await xata.db.subscriptions
      .filter({
        "user.id": userId,
      })
      .sort("currentPeriodEnd", "desc")
      .getAll();

    return history;
  } catch (error) {
    console.error("Error fetching billing history:", error);
    throw error;
  }
}

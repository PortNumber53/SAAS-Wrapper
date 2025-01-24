"use server";

import { xata } from "@/lib/xata";
import { auth } from "@/app/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { SubscriptionsRecord } from "@/vendor/xata";

// Subscription validation schema
const SubscriptionSchema = z.object({
  plan: z.string(),
  tier: z.string(),
  status: z.string(),
  billingCycle: z.string(),
  planAmount: z.number().min(0),
  currency: z.string().default("USD"),
  stripeSubscriptionId: z.string().optional(),
  stripeCustomerId: z.string().optional(),
  cancelAtPeriodEnd: z.boolean().optional(),
});

export async function getSubscriptions() {
  const session = await auth();

  if (!session) {
    throw new Error("Unauthorized");
  }

  try {
    const subscriptions = await xata.db.subscriptions
      .sort("xata_createdat", "desc")
      .getAll();

    // Convert Xata records to plain objects
    return subscriptions.map((sub: SubscriptionsRecord) => ({
      id: sub.id,
      plan: sub.plan,
      tier: sub.tier,
      status: sub.status,
      billingCycle: sub.billingCycle,
      planAmount: sub.planAmount,
      currency: sub.currency,
      stripeSubscriptionId: sub.stripeSubscriptionId,
      stripeCustomerId: sub.stripeCustomerId,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      currentPeriodStart: sub.currentPeriodStart,
      currentPeriodEnd: sub.currentPeriodEnd,
      canceledAt: sub.canceledAt,
      stripePlanId: sub.stripePlanId,
      totalAmount: sub.totalAmount,
      xata_createdat: sub.xata_createdat,
      xata_id: sub.xata_id,
      xata_updatedat: sub.xata_updatedat,
      xata_version: sub.xata_version,
      user: sub.user ? { id: sub.user.id } : null,
    }));
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    throw error;
  }
}

export async function updateSubscription(
  id: string,
  data: {
    status?: string;
    cancelAtPeriodEnd?: boolean;
  }
) {
  const session = await auth();

  if (!session) {
    throw new Error("Unauthorized");
  }

  try {
    const subscription = await xata.db.subscriptions.update(id, data);
    return subscription;
  } catch (error) {
    console.error("Error updating subscription:", error);
    throw error;
  }
}

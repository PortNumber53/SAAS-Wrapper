"use client"

// Add Edge Runtime configuration
export const runtime = 'edge'

import { Button } from "@/components/ui/button"
import { 
  CheckIcon, 
  XIcon, 
  StarIcon 
} from "lucide-react"
import pricingData from "@/lib/pricing.json"
import { handleCheckout } from "./checkout"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { PricingCard } from "@/components/pricing/pricing-card"

export default function PricingPage() {
  const { data: session } = useSession()

  const onCheckout = async (priceId: string | null) => {
    if (!session) {
      // Redirect to login if not authenticated
      return window.location.href = "/login"
    }

    if (priceId) {
      await handleCheckout(priceId)
    }
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Simple, transparent pricing</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Choose the plan that best fits your team's needs. No hidden fees, cancel anytime.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {pricingData.tiers.map((tier) => (
          <PricingCard 
            key={tier.id} 
            tier={tier}
            onCheckout={onCheckout}
          />
        ))}
      </div>

      <div className="text-center mt-12">
        <p className="text-muted-foreground">
          Need a custom solution? <a href="mailto:sales@truvis.co" className="text-primary hover:underline">Contact our sales team</a>
        </p>
      </div>
    </div>
  )
}

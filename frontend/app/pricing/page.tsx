"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  CheckIcon, 
  XIcon, 
  StarIcon 
} from "lucide-react"
import pricingData from "@/lib/pricing.json"

export default function PricingPage() {
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
          <Card 
            key={tier.id} 
            className={`
              ${tier.featured ? 'border-primary shadow-lg' : ''}
              flex flex-col
            `}
          >
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>{tier.name}</CardTitle>
                {tier.featured && (
                  <StarIcon className="w-5 h-5 text-yellow-500" />
                )}
              </div>
              <p className="text-muted-foreground">{tier.description}</p>
            </CardHeader>
            
            <CardContent className="flex flex-col flex-grow">
              <div className="text-4xl font-bold mb-6 flex items-baseline">
                {tier.price !== null ? `$${tier.price}` : "Custom"}
                <span className="text-sm text-muted-foreground ml-2">
                  {tier.price !== null ? "/month" : <span className="invisible">/month</span>}
                </span>
              </div>

              <div className="space-y-4 mb-6 flex-grow">
                <h3 className="font-semibold">What's included</h3>
                {tier.features.map((feature) => (
                  <div key={feature} className="flex items-center">
                    <CheckIcon className="w-4 h-4 mr-2 text-green-500" />
                    <span>{feature}</span>
                  </div>
                ))}

                {tier.unavailableFeatures.length > 0 && (
                  <>
                    <h3 className="font-semibold mt-4">Not included</h3>
                    {tier.unavailableFeatures.map((feature) => (
                      <div key={feature} className="flex items-center text-muted-foreground">
                        <XIcon className="w-4 h-4 mr-2 text-red-500" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>

              <Button 
                variant={tier.featured ? "default" : "outline"} 
                className="w-full mt-auto"
              >
                {tier.cta}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center mt-12">
        <p className="text-muted-foreground">
          Need a custom solution? <a href="#" className="text-primary hover:underline">Contact our sales team</a>
        </p>
      </div>
    </div>
  )
}

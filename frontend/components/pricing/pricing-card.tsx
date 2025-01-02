import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  CheckIcon, 
  XIcon, 
  StarIcon 
} from "lucide-react"
import Link from "next/link"

export interface PricingTier {
  id: string
  name: string
  price: number | null
  stripePrice: string | null
  description: string
  features: string[]
  unavailableFeatures: string[]
  featured?: boolean
  cta?: string
}

interface PricingCardProps {
  tier: PricingTier
  onCheckout?: (priceId: string | null) => void
}

export function PricingCard({ tier, onCheckout }: PricingCardProps) {
  const handleCheckout = () => {
    if (onCheckout && tier.stripePrice) {
      onCheckout(tier.stripePrice)
    }
  }

  return (
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

        {tier.id === 'enterprise' ? (
          <Link 
            href="mailto:sales@truvis.co" 
            className="w-full"
          >
            <Button 
              variant="outline" 
              className="w-full"
            >
              {tier.cta || 'Contact Sales'}
            </Button>
          </Link>
        ) : (
          <Button 
            onClick={handleCheckout}
            className="w-full"
          >
            {tier.cta || 'Get Started'}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

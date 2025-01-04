"use client"

import React, { useState } from 'react'
import { StripeIntegration } from '@/components/integrations/stripe-integration'

export default function IntegrationsPage() {
  const [activeIntegration, setActiveIntegration] = useState<string | null>(null)

  const integrations = [
    {
      id: 'stripe',
      name: 'Stripe',
      description: 'Payment processing and billing',
      icon: '/icons/stripe.svg',
      component: StripeIntegration
    }
  ]

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Integrations</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {integrations.map((integration) => (
          <div 
            key={integration.id} 
            className="border rounded-lg p-4 hover:shadow-md cursor-pointer"
            onClick={() => setActiveIntegration(integration.id)}
          >
            <img src={integration.icon} alt={integration.name} className="w-12 h-12 mb-4" />
            <h2 className="text-lg font-semibold">{integration.name}</h2>
            <p className="text-muted-foreground">{integration.description}</p>
          </div>
        ))}
      </div>

      {activeIntegration && (
        <div className="mt-8">
          {(() => {
            const Integration = integrations.find(i => i.id === activeIntegration)?.component;
            return Integration ? <Integration /> : null;
          })()}
        </div>
      )}
    </div>
  )
}

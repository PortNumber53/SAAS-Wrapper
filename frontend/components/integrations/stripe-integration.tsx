"use client"

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { Checkbox } from '@/components/ui/checkbox'
import { updateStoredIntegrationStatus } from '@/lib/integration-utils'

interface StripeIntegrationResponse {
  integration: {
    publishableKey?: string;
    secretKey?: string;
    webhookSecret?: string;
    is_active: boolean;
  } | null;
}

interface StripeIntegrationErrorResponse {
  error?: string;
}

export function StripeIntegration() {
  const { toast } = useToast()
  const [stripeSettings, setStripeSettings] = useState({
    publishableKey: '',
    secretKey: '',
    webhookSecret: '',
    is_active: false
  })
  const [showSecrets, setShowSecrets] = useState({
    secretKey: false,
    webhookSecret: false
  })
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const fetchStripeSettings = async () => {
      try {
        const response = await fetch('/api/integrations/stripe')
        const data = await response.json() as StripeIntegrationResponse

        console.log('Fetched Stripe integration data:', data)

        if (!response.ok) {
          throw new Error('Failed to fetch Stripe settings')
        }

        if (data.integration) {
          setStripeSettings(prev => ({
            ...prev,
            publishableKey: data.integration?.publishableKey || '',
            secretKey: data.integration?.secretKey || '',
            webhookSecret: data.integration?.webhookSecret || '',
            is_active: data.integration?.is_active || false
          }))
        }
      } catch (error) {
        console.error('Error fetching Stripe settings:', error)
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to load Stripe settings',
          variant: 'destructive'
        })
      }
    }

    fetchStripeSettings()
  }, [])

  const handleSave = async () => {
    setIsLoading(true)
    try {
      // Validate input if integration is active
      if (stripeSettings.is_active && !stripeSettings.publishableKey) {
        throw new Error('Publishable Key is required when integration is active')
      }

      const response = await fetch('/api/integrations/stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(stripeSettings),
      })

      if (!response.ok) {
        const errorData = await response.json() as StripeIntegrationErrorResponse
        throw new Error(errorData.error || 'Failed to save Stripe settings')
      }

      // Update localStorage
      updateStoredIntegrationStatus({ stripe: stripeSettings.is_active })

      // Show success toast
      toast({
        title: 'Stripe Integration',
        description: 'Settings saved successfully',
        variant: 'default'
      })
    } catch (error) {
      // Show error toast
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const toggleSecretVisibility = (field: 'secretKey' | 'webhookSecret') => {
    setShowSecrets(prev => ({
      ...prev,
      [field]: !prev[field]
    }))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stripe Integration</CardTitle>
        <CardDescription>
          Configure your Stripe integration settings. These keys can be found in your Stripe Dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_active"
              checked={stripeSettings.is_active}
              onCheckedChange={(checked) => 
                setStripeSettings(prev => ({...prev, is_active: checked === true}))
              }
            />
            <Label htmlFor="is_active">Enable Stripe Integration</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="publishableKey">Publishable Key</Label>
            <Input
              id="publishableKey"
              type="text"
              value={stripeSettings.publishableKey}
              onChange={(e) => setStripeSettings(prev => ({...prev, publishableKey: e.target.value}))}
              placeholder="pk_test_..."
              disabled={!stripeSettings.is_active}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="secretKey">Secret Key</Label>
            <div className="relative">
              <Input
                id="secretKey"
                type={showSecrets.secretKey ? "text" : "password"}
                value={stripeSettings.secretKey}
                onChange={(e) => setStripeSettings(prev => ({...prev, secretKey: e.target.value}))}
                placeholder="sk_test_..."
                disabled={!stripeSettings.is_active}
              />
              <button
                type="button"
                onClick={() => toggleSecretVisibility('secretKey')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2"
                disabled={!stripeSettings.is_active}
              >
                {showSecrets.secretKey ? (
                  <EyeOffIcon className="h-4 w-4 text-gray-500" />
                ) : (
                  <EyeIcon className="h-4 w-4 text-gray-500" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="webhookSecret">Webhook Secret</Label>
            <div className="relative">
              <Input
                id="webhookSecret"
                type={showSecrets.webhookSecret ? "text" : "password"}
                value={stripeSettings.webhookSecret}
                onChange={(e) => setStripeSettings(prev => ({...prev, webhookSecret: e.target.value}))}
                placeholder="whsec_..."
                disabled={!stripeSettings.is_active}
              />
              <button
                type="button"
                onClick={() => toggleSecretVisibility('webhookSecret')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2"
                disabled={!stripeSettings.is_active}
              >
                {showSecrets.webhookSecret ? (
                  <EyeOffIcon className="h-4 w-4 text-gray-500" />
                ) : (
                  <EyeIcon className="h-4 w-4 text-gray-500" />
                )}
              </button>
            </div>
          </div>

          <Button 
            onClick={handleSave} 
            disabled={isLoading || (stripeSettings.is_active && (!stripeSettings.publishableKey || !stripeSettings.secretKey))}
          >
            {isLoading ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

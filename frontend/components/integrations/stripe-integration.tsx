"use client"

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

export function StripeIntegration() {
  const { toast } = useToast()
  const [stripeSettings, setStripeSettings] = useState({
    publishableKey: '',
    secretKey: '',
    webhookSecret: ''
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
        const data = await response.json()

        console.log('Fetched Stripe integration data:', data)

        if (!response.ok) {
          throw new Error('Failed to fetch Stripe settings')
        }

        if (data.integration) {
          setStripeSettings(prev => ({
            ...prev,
            publishableKey: data.integration.publishableKey || '',
            secretKey: data.integration.secretKey || '',
            webhookSecret: data.integration.webhookSecret || ''
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
      // Validate inputs
      if (!stripeSettings.publishableKey || !stripeSettings.secretKey) {
        throw new Error('Publishable Key and Secret Key are required')
      }

      const response = await fetch('/api/integrations/stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(stripeSettings),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save Stripe settings')
      }

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
          <div className="space-y-2">
            <Label htmlFor="publishableKey">Publishable Key</Label>
            <Input
              id="publishableKey"
              type="text"
              value={stripeSettings.publishableKey}
              onChange={(e) => setStripeSettings(prev => ({...prev, publishableKey: e.target.value}))}
              placeholder="pk_test_..."
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
              />
              <button
                type="button"
                onClick={() => toggleSecretVisibility('secretKey')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2"
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
              />
              <button
                type="button"
                onClick={() => toggleSecretVisibility('webhookSecret')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2"
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
            className="w-full mt-6"
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : 'Save Integration Settings'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from '@/components/ui/use-toast'
import { Checkbox } from '@/components/ui/checkbox'
import { updateStoredIntegrationStatus } from '@/lib/integration-utils'
import { InstagramIcon } from 'lucide-react'

interface InstagramIntegrationResponse {
  integration: {
    accessToken?: string;
    username?: string;
    is_active: boolean;
  } | null;
}

interface InstagramIntegrationErrorResponse {
  error?: string;
}

interface InstagramAuthUrlResponse {
  authUrl: string;
}

export function InstagramIntegration() {
  const { toast } = useToast()
  const [instagramSettings, setInstagramSettings] = useState({
    accessToken: '',
    username: '',
    is_active: false
  })
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const fetchInstagramSettings = async () => {
      try {
        const response = await fetch('/api/integrations/instagram')
        const data = await response.json() as InstagramIntegrationResponse

        if (!response.ok) {
          throw new Error('Failed to fetch Instagram settings')
        }

        if (data.integration) {
          setInstagramSettings(prev => ({
            ...prev,
            accessToken: data.integration?.accessToken || '',
            username: data.integration?.username || '',
            is_active: data.integration?.is_active || false
          }))
        }
      } catch (error) {
        console.error('Error fetching Instagram settings:', error)
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to load Instagram settings',
          variant: 'destructive'
        })
      }
    }

    fetchInstagramSettings()
  }, [])

  const handleInstagramAuth = async () => {
    // Instagram OAuth URL will be configured in the backend
    try {
      const response = await fetch('/api/integrations/instagram/auth-url')
      const data = await response.json() as InstagramAuthUrlResponse
      
      if (!response.ok) {
        throw new Error('Failed to get authentication URL')
      }

      // Redirect to Instagram authorization page
      window.location.href = data.authUrl
    } catch (error) {
      console.error('Error starting Instagram auth:', error)
      toast({
        title: 'Error',
        description: 'Failed to start Instagram authentication',
        variant: 'destructive'
      })
    }
  }

  const handleStatusChange = async (checked: boolean) => {
    setInstagramSettings(prev => ({ ...prev, is_active: checked }))
    
    try {
      const response = await fetch('/api/integrations/instagram/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: checked }),
      })

      if (!response.ok) {
        throw new Error('Failed to update integration status')
      }

      // Update localStorage
      updateStoredIntegrationStatus({ instagram: checked })

      toast({
        title: 'Instagram Business',
        description: `Integration ${checked ? 'enabled' : 'disabled'} successfully`,
      })
    } catch (error) {
      console.error('Error updating status:', error)
      // Revert the state if the API call fails
      setInstagramSettings(prev => ({ ...prev, is_active: !checked }))
      toast({
        title: 'Error',
        description: 'Failed to update integration status',
        variant: 'destructive'
      })
    }
  }

  const disconnectInstagram = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/integrations/instagram/disconnect', {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to disconnect Instagram account')
      }

      setInstagramSettings({
        accessToken: '',
        username: '',
        is_active: false
      })

      // Update localStorage
      updateStoredIntegrationStatus({ instagram: false })

      toast({
        title: 'Instagram Business',
        description: 'Successfully disconnected Instagram account',
      })
    } catch (error) {
      console.error('Error disconnecting Instagram:', error)
      toast({
        title: 'Error',
        description: 'Failed to disconnect Instagram account',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle>Instagram Business</CardTitle>
            <CardDescription>
              Connect your Instagram Business account to automatically publish content.
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={instagramSettings.is_active}
              onCheckedChange={handleStatusChange}
              disabled={!instagramSettings.accessToken}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {!instagramSettings.accessToken ? (
            <Button
              onClick={handleInstagramAuth}
              className="w-full"
              disabled={isLoading}
            >
              <InstagramIcon className="w-4 h-4 mr-2" />
              Connect Instagram Business Account
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Connected Account</p>
                  <p className="text-sm text-muted-foreground">@{instagramSettings.username}</p>
                </div>
                <Button
                  variant="destructive"
                  onClick={disconnectInstagram}
                  disabled={isLoading}
                >
                  Disconnect
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

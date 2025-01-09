import { xata } from '@/lib/xata'

const INTEGRATION_STATUS_KEY = 'integrationStatus'

interface IntegrationStatus {
  stripe?: boolean;
}

export async function fetchIntegrationStatus(): Promise<IntegrationStatus> {
  try {
    const stripeIntegration = await xata.db.integrations
      .filter({ slug: 'stripe' })
      .getFirst()

    const status = {
      stripe: stripeIntegration?.is_active || false
    }

    // Store in localStorage for quick access
    if (typeof window !== 'undefined') {
      localStorage.setItem(INTEGRATION_STATUS_KEY, JSON.stringify(status))
    }

    return status
  } catch (error) {
    console.error('Error fetching integration status:', error)
    return { stripe: false }
  }
}

export function getStoredIntegrationStatus(): IntegrationStatus {
  if (typeof window === 'undefined') {
    return { stripe: false }
  }

  try {
    const stored = localStorage.getItem(INTEGRATION_STATUS_KEY)
    return stored ? JSON.parse(stored) : { stripe: false }
  } catch {
    return { stripe: false }
  }
}

export function updateStoredIntegrationStatus(status: Partial<IntegrationStatus>) {
  if (typeof window === 'undefined') return

  const current = getStoredIntegrationStatus()
  const updated = { ...current, ...status }
  localStorage.setItem(INTEGRATION_STATUS_KEY, JSON.stringify(updated))
  return updated
}

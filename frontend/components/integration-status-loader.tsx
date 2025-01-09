'use client'

import { useSession } from 'next-auth/react'
import { useEffect } from 'react'
import { fetchIntegrationStatus } from '@/lib/integration-utils'

export function IntegrationStatusLoader() {
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      fetchIntegrationStatus()
    }
  }, [session, status])

  return null
}

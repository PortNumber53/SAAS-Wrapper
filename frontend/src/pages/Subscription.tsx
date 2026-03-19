import { useEffect, useState } from 'react'
import { useToast } from '../components/ToastProvider'
import useAppStore, { type AppState } from '../store/app'

type Tier = {
  id: number
  slug: string
  name: string
  description: string
  unit_amount: number
  currency: string
  interval: string
  features: string[]
  sort_order: number
}

export default function SubscriptionPage() {
  const toast = useToast()
  const [tiers, setTiers] = useState<Tier[]>([])
  const [loading, setLoading] = useState(true)
  const [checkoutBusy, setCheckoutBusy] = useState<string | null>(null)
  const [portalBusy, setPortalBusy] = useState(false)
  const subscription = useAppStore((s: AppState) => s.subscription)
  const subscriptionLoaded = useAppStore((s: AppState) => s.subscriptionLoaded)
  const loadSubscription = useAppStore((s: AppState) => s.loadSubscription)

  useEffect(() => {
    loadSubscription()
    fetch('/api/subscription/tiers')
      .then(r => r.ok ? r.json() : { ok: false })
      .then(j => {
        if (j?.ok && Array.isArray(j.tiers)) setTiers(j.tiers)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Check for success/canceled query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('success') === '1') {
      toast.show('Subscription activated!', 'success')
      loadSubscription()
      window.history.replaceState({}, '', window.location.pathname)
    } else if (params.get('canceled') === '1') {
      toast.show('Checkout canceled', 'info')
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const handleCheckout = async (tierSlug: string) => {
    setCheckoutBusy(tierSlug)
    try {
      const res = await fetch('/api/subscription/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tier_slug: tierSlug }),
      })
      const j = await res.json()
      if (j?.ok && j.url) {
        window.location.href = j.url
        return
      }
      toast.show(j?.message || j?.error || 'Checkout failed', 'error')
    } catch {
      toast.show('Checkout failed', 'error')
    } finally {
      setCheckoutBusy(null)
    }
  }

  const handlePortal = async () => {
    setPortalBusy(true)
    try {
      const res = await fetch('/api/subscription/portal', { method: 'POST' })
      const j = await res.json()
      if (j?.ok && j.url) {
        window.location.href = j.url
        return
      }
      toast.show(j?.error || 'Could not open billing portal', 'error')
    } catch {
      toast.show('Could not open billing portal', 'error')
    } finally {
      setPortalBusy(false)
    }
  }

  const formatPrice = (amount: number, currency: string) => {
    const val = amount / 100
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(val)
  }

  const currentTier = subscription?.tier || 'free'
  const isPaid = currentTier !== 'free' && subscription?.stripe_customer_id

  if (loading || !subscriptionLoaded) {
    return <section className='card'><p>Loading...</p></section>
  }

  return (
    <section className='card'>
      <h1>Subscription</h1>

      {/* Current plan info */}
      {subscription && currentTier !== 'free' && (
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 16, marginBottom: 16, background: 'var(--surface)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <strong>Current Plan: {subscription.tier_name}</strong>
            <span style={{
              padding: '2px 8px',
              borderRadius: 12,
              fontSize: '0.8em',
              fontWeight: 600,
              background: subscription.status === 'active' ? '#dcfce7' : '#fef3c7',
              color: subscription.status === 'active' ? '#166534' : '#92400e',
            }}>
              {subscription.cancel_at_period_end ? 'Canceling' : subscription.status}
            </span>
          </div>
          {subscription.current_period_end && (
            <div className='read-the-docs' style={{ marginTop: 4 }}>
              {subscription.cancel_at_period_end
                ? `Access until ${new Date(subscription.current_period_end).toLocaleDateString()}`
                : `Renews ${new Date(subscription.current_period_end).toLocaleDateString()}`}
            </div>
          )}
          {isPaid && (
            <button className='btn' style={{ marginTop: 8 }} onClick={handlePortal} disabled={portalBusy}>
              {portalBusy ? 'Opening...' : 'Manage Billing'}
            </button>
          )}
        </div>
      )}

      {/* Tier comparison */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(tiers.length, 3)}, 1fr)`, gap: 16 }}>
        {tiers.map(tier => {
          const isCurrent = tier.slug === currentTier
          const isUpgrade = tier.sort_order > (tiers.find(t => t.slug === currentTier)?.sort_order ?? -1)
          const isDowngrade = tier.sort_order < (tiers.find(t => t.slug === currentTier)?.sort_order ?? 999)
          const isFree = tier.slug === 'free'
          const features = Array.isArray(tier.features) ? tier.features : []
          return (
            <div
              key={tier.slug}
              style={{
                border: isCurrent ? '2px solid var(--primary)' : '1px solid var(--border)',
                borderRadius: 12,
                padding: 20,
                background: 'var(--surface)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <h3 style={{ margin: 0 }}>{tier.name}</h3>
              <p className='read-the-docs' style={{ margin: '4px 0 12px' }}>{tier.description}</p>
              <div style={{ fontSize: '1.75em', fontWeight: 700, marginBottom: 4 }}>
                {isFree ? 'Free' : `${formatPrice(tier.unit_amount, tier.currency)}`}
              </div>
              {!isFree && <div className='read-the-docs' style={{ marginBottom: 12 }}>per {tier.interval}</div>}
              <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0', flex: 1 }}>
                {features.map((f, i) => (
                  <li key={i} style={{ padding: '4px 0', fontSize: '0.9em' }}>
                    {f}
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <button className='btn' disabled style={{ marginTop: 8 }}>Current Plan</button>
              ) : isFree ? (
                isPaid ? (
                  <button className='btn' onClick={handlePortal} disabled={portalBusy} style={{ marginTop: 8 }}>
                    Manage Billing
                  </button>
                ) : null
              ) : isUpgrade || isDowngrade ? (
                isPaid ? (
                  <button className='btn' onClick={handlePortal} disabled={portalBusy} style={{ marginTop: 8 }}>
                    {isUpgrade ? 'Upgrade' : 'Change Plan'}
                  </button>
                ) : (
                  <button
                    className='btn primary'
                    onClick={() => handleCheckout(tier.slug)}
                    disabled={checkoutBusy !== null}
                    style={{ marginTop: 8 }}
                  >
                    {checkoutBusy === tier.slug ? 'Redirecting...' : isUpgrade ? 'Upgrade' : 'Subscribe'}
                  </button>
                )
              ) : null}
            </div>
          )
        })}
      </div>
    </section>
  )
}

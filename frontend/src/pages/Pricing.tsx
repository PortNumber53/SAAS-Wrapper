import { useEffect, useState } from 'react'

type Tier = {
    id: string
    name: string
    slug: string
    price_cents: number
    currency: string
    billing_interval: string
    max_integrations: number
    max_api_calls: number
    max_storage_mb: number
    features: string[]
    sort_order: number
}

type CurrentSub = {
    tier_slug: string
    tier_name: string
    status: string
    price_cents: number
} | null

export default function PricingPage() {
    const [tiers, setTiers] = useState<Tier[]>([])
    const [currentSub, setCurrentSub] = useState<CurrentSub>(null)
    const [loading, setLoading] = useState(true)
    const [busy, setBusy] = useState<string | null>(null)
    const [successMsg, setSuccessMsg] = useState<string | null>(null)

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        if (params.get('success') === 'true') {
            setSuccessMsg('Subscription activated! Your plan is now active.')
            window.history.replaceState({}, '', '/pricing')
        }
        if (params.get('canceled') === 'true') {
            setSuccessMsg(null)
            window.history.replaceState({}, '', '/pricing')
        }

        Promise.all([
            fetch('/api/subscriptions/tiers').then(r => r.json()),
            fetch('/api/subscriptions/current').then(r => r.json()).catch(() => ({ ok: true, subscription: null })),
        ]).then(([tiersRes, subRes]) => {
            if (tiersRes.ok && tiersRes.tiers) setTiers(tiersRes.tiers)
            if (subRes.ok) setCurrentSub(subRes.subscription)
        }).finally(() => setLoading(false))
    }, [])

    const handleSubscribe = async (tier: Tier) => {
        setBusy(tier.slug)
        setSuccessMsg(null)
        try {
            const res = await fetch('/api/subscriptions/subscribe', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ tier_slug: tier.slug }),
            })
            const data = await res.json()
            if (data.ok && data.checkout_url) {
                window.location.href = data.checkout_url
                return
            }
            if (data.ok && data.message) {
                setSuccessMsg(data.message)
                setCurrentSub({ tier_slug: tier.slug, tier_name: tier.name, status: 'active', price_cents: tier.price_cents })
            }
        } catch (e: any) {
            console.error('Subscribe error', e)
        } finally {
            setBusy(null)
        }
    }

    const handleChangeTier = async (tier: Tier) => {
        setBusy(tier.slug)
        setSuccessMsg(null)
        try {
            const res = await fetch('/api/subscriptions/change-tier', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ tier_slug: tier.slug }),
            })
            const data = await res.json()
            if (data.ok && data.checkout_url) {
                window.location.href = data.checkout_url
                return
            }
            if (data.ok) {
                setSuccessMsg(data.message || 'Plan changed!')
                setCurrentSub({ tier_slug: tier.slug, tier_name: tier.name, status: 'active', price_cents: tier.price_cents })
            }
        } catch (e: any) {
            console.error('Change tier error', e)
        } finally {
            setBusy(null)
        }
    }

    const formatPrice = (cents: number) => {
        if (cents === 0) return 'Free'
        return `$${(cents / 100).toFixed(2)}`
    }

    if (loading) {
        return (
            <section className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                <p style={{ color: 'var(--muted)' }}>Loading plans…</p>
            </section>
        )
    }

    return (
        <div className="pricing-page">
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Choose Your Plan</h1>
                <p style={{ color: 'var(--muted)', maxWidth: 500, margin: '0.5rem auto' }}>
                    Scale your business with the right tools. Upgrade or downgrade anytime.
                </p>
            </div>

            {successMsg && (
                <div className="pricing-success">
                    ✅ {successMsg}
                </div>
            )}

            <div className="pricing-grid">
                {tiers.map((tier) => {
                    const isCurrent = currentSub?.tier_slug === tier.slug
                    const isPopular = tier.slug === 'pro'
                    return (
                        <div key={tier.id} className={`pricing-card ${isPopular ? 'popular' : ''} ${isCurrent ? 'current' : ''}`}>
                            {isPopular && <div className="pricing-badge">Most Popular</div>}
                            {isCurrent && <div className="pricing-badge current-badge">Current Plan</div>}
                            <h2 className="pricing-name">{tier.name}</h2>
                            <div className="pricing-price">
                                <span className="price-amount">{formatPrice(tier.price_cents)}</span>
                                {tier.price_cents > 0 && <span className="price-interval">/{tier.billing_interval}</span>}
                            </div>
                            <ul className="pricing-features">
                                {(tier.features || []).map((f, i) => (
                                    <li key={i}>
                                        <span className="feature-check">✓</span>
                                        {f}
                                    </li>
                                ))}
                            </ul>
                            <div className="pricing-action">
                                {isCurrent ? (
                                    <button className="btn" disabled>Current Plan</button>
                                ) : currentSub ? (
                                    <button
                                        className={`btn ${isPopular ? 'primary' : ''}`}
                                        onClick={() => handleChangeTier(tier)}
                                        disabled={busy !== null}
                                    >
                                        {busy === tier.slug ? 'Processing…' : tier.price_cents > (currentSub.price_cents || 0) ? 'Upgrade' : 'Switch'}
                                    </button>
                                ) : (
                                    <button
                                        className={`btn ${isPopular ? 'primary' : ''}`}
                                        onClick={() => handleSubscribe(tier)}
                                        disabled={busy !== null}
                                    >
                                        {busy === tier.slug ? 'Processing…' : tier.price_cents === 0 ? 'Get Started' : 'Subscribe'}
                                    </button>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

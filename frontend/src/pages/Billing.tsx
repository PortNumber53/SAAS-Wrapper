import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import useAppStore, { type AppState } from '../store/app'

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
    tier_id: string
    status: string
    price_cents: number
    current_period_end?: string
    current_period_start?: string
    max_integrations: number
    max_api_calls: number
    max_storage_mb: number
    stripe_subscription_id?: string
} | null

type BillingEvent = {
    event_id: string
    event_type: string
    subscription_id: string | null
    payment_intent_id: string | null
    amount: number
    currency: string
    status: string
    created_at: string
}

export default function BillingPage() {
    const session = useAppStore((s: AppState) => s.session)
    const sessionLoaded = useAppStore((s: AppState) => s.sessionLoaded)
    const [tiers, setTiers] = useState<Tier[]>([])
    const [currentSub, setCurrentSub] = useState<CurrentSub>(null)
    const [events, setEvents] = useState<BillingEvent[]>([])
    const [loading, setLoading] = useState(true)
    const [busy, setBusy] = useState<string | null>(null)
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
    const [activeTab, setActiveTab] = useState<'plan' | 'history'>('plan')
    const [autoRenew, setAutoRenew] = useState(true)
    const [renewBusy, setRenewBusy] = useState(false)

    const loadData = () => {
        setLoading(true)
        Promise.all([
            fetch('/api/subscriptions/tiers').then(r => r.json()),
            fetch('/api/subscriptions/current').then(r => r.json()).catch(() => ({ ok: true, subscription: null })),
            fetch('/api/subscriptions/history').then(r => r.json()).catch(() => ({ ok: true, events: [] })),
        ]).then(([tiersRes, subRes, historyRes]) => {
            if (tiersRes.ok && tiersRes.tiers) setTiers(tiersRes.tiers)
            if (subRes.ok) {
                setCurrentSub(subRes.subscription)
                // Auto-renew defaults to true unless subscription is set to cancel
                setAutoRenew(subRes.subscription?.status === 'active')
            }
            if (historyRes.ok && historyRes.events) setEvents(historyRes.events)
        }).finally(() => setLoading(false))
    }

    useEffect(() => {
        if (!sessionLoaded || !session?.ok) return
        const params = new URLSearchParams(window.location.search)
        if (params.get('success') === 'true') {
            setMessage({ type: 'success', text: 'Subscription activated successfully!' })
            window.history.replaceState({}, '', '/account/billing')
        }
        if (params.get('canceled') === 'true') {
            setMessage({ type: 'error', text: 'Checkout was canceled.' })
            window.history.replaceState({}, '', '/account/billing')
        }
        loadData()

        // WebSocket for realtime updates
        const getWsUrl = () => {
            if (window.location.hostname === 'localhost') return 'ws://localhost:18311/ws'
            return `wss://api-${window.location.hostname}/ws`
        }

        let ws: WebSocket | null = null
        let timeout: any = null

        const connect = () => {
            try {
                ws = new WebSocket(getWsUrl())
                ws.onopen = () => {
                    // console.log('WS connected')
                }
                ws.onmessage = (msg) => {
                    try {
                        const data = JSON.parse(msg.data)
                        if (data.type === 'billing_update') {
                            loadData()
                        }
                    } catch (e) {
                        // ignore
                    }
                }
                ws.onclose = () => {
                    // Reconnect after 3s
                    timeout = setTimeout(connect, 3000)
                }
            } catch (e) {
                console.error('WS error', e)
            }
        }

        connect()

        return () => {
            if (ws) ws.close()
            if (timeout) clearTimeout(timeout)
        }
    }, [sessionLoaded, session?.ok])

    const formatPrice = (cents: number) => {
        if (cents === 0) return 'Free'
        return `$${(cents / 100).toFixed(2)}`
    }

    const formatStorage = (mb: number) => {
        if (mb >= 1024) return `${(mb / 1024).toFixed(0)}GB`
        return `${mb}MB`
    }

    const formatLimit = (n: number) => {
        if (n < 0) return 'Unlimited'
        if (n >= 1000) return `${(n / 1000).toFixed(0)}k`
        return String(n)
    }

    const formatEventType = (type: string) => {
        const map: Record<string, string> = {
            'checkout.session.completed': 'Checkout completed',
            'payment_intent.succeeded': 'Payment succeeded',
            'payment_intent.payment_failed': 'Payment failed',
            'customer.subscription.created': 'Subscription created',
            'customer.subscription.updated': 'Subscription updated',
            'customer.subscription.deleted': 'Subscription canceled',
        }
        return map[type] || type.replace(/[._]/g, ' ')
    }

    const handleChangeTier = async (tier: Tier) => {
        setBusy(tier.slug)
        setMessage(null)
        try {
            const endpoint = currentSub ? '/api/subscriptions/change-tier' : '/api/subscriptions/subscribe'
            const res = await fetch(endpoint, {
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
                setMessage({ type: 'success', text: data.message || `Switched to ${tier.name}!` })
                loadData()
            } else {
                setMessage({ type: 'error', text: data.error || 'Something went wrong' })
            }
        } catch (e: any) {
            setMessage({ type: 'error', text: e.message || 'Network error' })
        } finally {
            setBusy(null)
        }
    }

    const handleRenewToggle = async () => {
        const newVal = !autoRenew
        setRenewBusy(true)
        setMessage(null)
        try {
            const endpoint = newVal ? '/api/subscriptions/reactivate' : '/api/subscriptions/cancel'
            const res = await fetch(endpoint, { method: 'POST' })
            const data = await res.json()
            if (data.ok) {
                setAutoRenew(newVal)
                setMessage({ type: 'success', text: data.message || (newVal ? 'Auto-renewal enabled' : 'Subscription will cancel at period end') })
                loadData()
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to update' })
            }
        } catch (e: any) {
            setMessage({ type: 'error', text: e.message || 'Network error' })
        } finally {
            setRenewBusy(false)
        }
    }

    if (!sessionLoaded) return <section className='card'><p>Loading…</p></section>
    if (!session?.ok) return <section className='card'><p>Please <Link to='/'>log in</Link> to manage billing.</p></section>

    return (
        <div className='billing-page'>
            <h1>Billing & Subscription</h1>
            <p style={{ color: 'var(--muted)', marginBottom: '1rem' }}>
                Manage your subscription for <strong>{session.email}</strong>
            </p>

            {message && (
                <div className={`billing-message ${message.type}`}>
                    {message.type === 'success' ? '✅' : '⚠️'} {message.text}
                </div>
            )}

            {/* Tabs */}
            <div className='billing-tabs'>
                <button
                    className={`billing-tab ${activeTab === 'plan' ? 'active' : ''}`}
                    onClick={() => setActiveTab('plan')}
                >Plan</button>
                <button
                    className={`billing-tab ${activeTab === 'history' ? 'active' : ''}`}
                    onClick={() => setActiveTab('history')}
                >Billing History</button>
            </div>

            {loading ? (
                <section className='card'><p style={{ color: 'var(--muted)' }}>Loading…</p></section>
            ) : activeTab === 'plan' ? (
                <>
                    {/* Current Plan Summary */}
                    {currentSub && (
                        <section className='card billing-current'>
                            <div className='billing-plan-summary'>
                                <div className='billing-plan-header'>
                                    <span className='billing-plan-name'>{currentSub.tier_name}</span>
                                    <span className={`billing-status ${currentSub.status}`}>{currentSub.status}</span>
                                </div>
                                <div className='billing-plan-price'>
                                    {formatPrice(currentSub.price_cents)}
                                    {currentSub.price_cents > 0 && <span className='billing-interval'>/month</span>}
                                </div>
                                <div className='billing-limits'>
                                    <div className='billing-limit'>
                                        <span className='billing-limit-label'>Integrations</span>
                                        <span className='billing-limit-value'>{formatLimit(currentSub.max_integrations)}</span>
                                    </div>
                                    <div className='billing-limit'>
                                        <span className='billing-limit-label'>API Calls</span>
                                        <span className='billing-limit-value'>{formatLimit(currentSub.max_api_calls)}/mo</span>
                                    </div>
                                    <div className='billing-limit'>
                                        <span className='billing-limit-label'>Storage</span>
                                        <span className='billing-limit-value'>{formatStorage(currentSub.max_storage_mb)}</span>
                                    </div>
                                </div>
                                {currentSub.current_period_end && (
                                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: 'var(--muted)' }}>
                                        Current period ends {new Date(currentSub.current_period_end).toLocaleDateString()}
                                    </p>
                                )}
                            </div>
                            {/* Auto-renew toggle */}
                            {currentSub.price_cents > 0 && currentSub.stripe_subscription_id && (
                                <label className='billing-renew-toggle'>
                                    <input
                                        type='checkbox'
                                        checked={autoRenew}
                                        disabled={renewBusy}
                                        onChange={handleRenewToggle}
                                    />
                                    <span>{renewBusy ? 'Updating…' : 'Renew subscription'}</span>
                                </label>
                            )}
                        </section>
                    )}

                    {/* Tier Cards */}
                    <h2 style={{ fontSize: '1.1rem', margin: '1.5rem 0 1rem' }}>
                        {currentSub ? 'Change Plan' : 'Choose a Plan'}
                    </h2>
                    <div className='billing-tiers'>
                        {tiers.map(tier => {
                            const isCurrent = currentSub?.tier_slug === tier.slug
                            const isUpgrade = currentSub ? tier.price_cents > (currentSub.price_cents || 0) : false
                            const isDowngrade = currentSub ? tier.price_cents < (currentSub.price_cents || 0) : false
                            return (
                                <div key={tier.id} className={`billing-tier-card ${isCurrent ? 'current' : ''} ${tier.slug === 'pro' ? 'recommended' : ''}`}>
                                    {tier.slug === 'pro' && !isCurrent && <div className='billing-rec-badge'>Recommended</div>}
                                    {isCurrent && <div className='billing-rec-badge billing-active-badge'>Active</div>}
                                    <div className='billing-tier-top'>
                                        <div className='billing-tier-name'>{tier.name}</div>
                                        <div className='billing-tier-price'>
                                            {formatPrice(tier.price_cents)}
                                            {tier.price_cents > 0 && <span className='billing-interval'>/mo</span>}
                                        </div>
                                    </div>
                                    <ul className='billing-tier-features'>
                                        {(tier.features || []).map((f, i) => (
                                            <li key={i}><span className='feature-check'>✓</span>{f}</li>
                                        ))}
                                    </ul>
                                    <div className='billing-tier-action'>
                                        {isCurrent ? (
                                            <button className='btn' disabled>Current Plan</button>
                                        ) : (
                                            <button
                                                className={`btn ${tier.slug === 'pro' ? 'primary' : ''}`}
                                                disabled={busy !== null}
                                                onClick={() => handleChangeTier(tier)}
                                            >
                                                {busy === tier.slug ? 'Processing…'
                                                    : isUpgrade ? 'Upgrade'
                                                        : isDowngrade ? 'Downgrade'
                                                            : 'Select Plan'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </>
            ) : (
                /* History Tab */
                <section className='card billing-history'>
                    <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>Billing History</h2>
                    {events.length === 0 ? (
                        <p style={{ color: 'var(--muted)' }}>No billing events yet.</p>
                    ) : (
                        <div className='billing-history-table-wrap'>
                            <table className='billing-history-table'>
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Event</th>
                                        <th>Amount</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {events.map(ev => (
                                        <tr key={ev.event_id}>
                                            <td>{new Date(ev.created_at).toLocaleDateString()}</td>
                                            <td>{formatEventType(ev.event_type)}</td>
                                            <td>{ev.amount > 0 ? `$${(ev.amount / 100).toFixed(2)}` : '—'}</td>
                                            <td>
                                                <span className={`billing-ev-status ${ev.status === 'succeeded' || ev.status === 'paid' || ev.status === 'active' ? 'ok' : ev.status === 'failed' ? 'fail' : ''}`}>
                                                    {ev.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            )}
        </div>
    )
}

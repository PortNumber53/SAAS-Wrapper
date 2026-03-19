import { useEffect, useState } from 'react'
import { useToast } from '../components/ToastProvider'

type Tier = {
  id: number
  slug: string
  name: string
  description: string
  stripe_product_id: string | null
  stripe_price_id: string | null
  unit_amount: number
  currency: string
  interval: string
  features: string[]
  sort_order: number
  active: boolean
  created_at: string
  updated_at: string
}

type Migration = {
  id: number
  tier_slug: string
  tier_name: string
  old_stripe_product_id: string
  old_stripe_price_id: string
  new_stripe_product_id: string
  new_stripe_price_id: string
  grace_period_days: number
  status: string
  total_users: number
  migrated_users: number
  failed_users: number
  started_at: string | null
  completed_at: string | null
  created_at: string
}

export default function AdminDashboardPage() {
  const toast = useToast()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [tiers, setTiers] = useState<Tier[]>([])
  const [migrations, setMigrations] = useState<Migration[]>([])
  const [loading, setLoading] = useState(true)

  // Edit tier state
  const [editSlug, setEditSlug] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editFeatures, setEditFeatures] = useState('')
  const [editActive, setEditActive] = useState(true)
  const [saving, setSaving] = useState(false)

  // Set price state
  const [priceSlug, setPriceSlug] = useState<string | null>(null)
  const [priceProductName, setPriceProductName] = useState('')
  const [priceAmount, setPriceAmount] = useState(990)
  const [priceCurrency, setPriceCurrency] = useState('usd')
  const [priceInterval, setPriceInterval] = useState('month')
  const [priceGraceDays, setPriceGraceDays] = useState(0)
  const [priceSaving, setPriceSaving] = useState(false)

  useEffect(() => {
    checkAdmin()
  }, [])

  const checkAdmin = async () => {
    try {
      const r = await fetch('/api/admin/check')
      const j = await r.json()
      if (j?.ok && j.is_admin) {
        setIsAdmin(true)
        await loadData()
      } else {
        setIsAdmin(false)
      }
    } catch {
      setIsAdmin(false)
    }
    setLoading(false)
  }

  const loadData = async () => {
    const [tiersRes, migrationsRes] = await Promise.all([
      fetch('/api/admin/subscription/tiers').then(r => r.ok ? r.json() : { ok: false }),
      fetch('/api/admin/subscription/migrations').then(r => r.ok ? r.json() : { ok: false }),
    ])
    if (tiersRes?.ok && Array.isArray(tiersRes.tiers)) setTiers(tiersRes.tiers)
    if (migrationsRes?.ok && Array.isArray(migrationsRes.migrations)) setMigrations(migrationsRes.migrations)
  }

  const startEdit = (tier: Tier) => {
    setEditSlug(tier.slug)
    setEditName(tier.name)
    setEditDesc(tier.description)
    setEditFeatures((Array.isArray(tier.features) ? tier.features : []).join('\n'))
    setEditActive(tier.active)
  }

  const cancelEdit = () => setEditSlug(null)

  const saveEdit = async () => {
    if (!editSlug) return
    setSaving(true)
    try {
      const features = editFeatures.split('\n').map(s => s.trim()).filter(Boolean)
      const res = await fetch(`/api/admin/subscription/tiers/${editSlug}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: editName, description: editDesc, features, active: editActive }),
      })
      if (!res.ok) { toast.show('Save failed', 'error'); return }
      toast.show('Tier updated', 'success')
      setEditSlug(null)
      await loadData()
    } catch { toast.show('Save failed', 'error') }
    finally { setSaving(false) }
  }

  const startSetPrice = (tier: Tier) => {
    setPriceSlug(tier.slug)
    setPriceProductName(`${tier.name} Plan`)
    setPriceAmount((tier.unit_amount || 990) / 100)
    setPriceCurrency(tier.currency || 'usd')
    setPriceInterval(tier.interval || 'month')
    setPriceGraceDays(0)
  }

  const cancelSetPrice = () => setPriceSlug(null)

  const savePrice = async () => {
    if (!priceSlug) return
    setPriceSaving(true)
    try {
      const res = await fetch(`/api/admin/subscription/tiers/${priceSlug}/update-price`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          new_product_name: priceProductName,
          new_unit_amount: Math.round(priceAmount * 100),
          currency: priceCurrency,
          interval: priceInterval,
          grace_period_days: priceGraceDays,
        }),
      })
      const j = await res.json()
      if (!res.ok) { toast.show(j?.message || j?.error || 'Failed', 'error'); return }
      toast.show(`Price set! Product: ${j.new_product_id}, Price: ${j.new_price_id}${j.total_users > 0 ? `. Migration started for ${j.total_users} user(s).` : ''}`, 'success', 6000)
      setPriceSlug(null)
      await loadData()
    } catch { toast.show('Failed to set price', 'error') }
    finally { setPriceSaving(false) }
  }

  const fmt = (amount: number, currency: string) => {
    if (!amount) return '-'
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: (currency || 'usd').toUpperCase() }).format(amount / 100)
  }

  const statusBadge = (status: string) => {
    const colors: Record<string, { bg: string; fg: string }> = {
      pending: { bg: '#fef3c7', fg: '#92400e' },
      running: { bg: '#dbeafe', fg: '#1e40af' },
      completed: { bg: '#dcfce7', fg: '#166534' },
      failed: { bg: '#fee2e2', fg: '#991b1b' },
    }
    const c = colors[status] || { bg: '#f3f4f6', fg: '#374151' }
    return <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.8em', fontWeight: 600, background: c.bg, color: c.fg }}>{status}</span>
  }

  if (loading) return <section className='card'><p>Loading...</p></section>
  if (!isAdmin) return <section className='card'><h2>Access Denied</h2><p>You do not have admin access.</p></section>

  return (
    <section className='card'>
      <h1>Admin Dashboard</h1>
      <p className='read-the-docs'>Manage subscription tiers, pricing, and view migration jobs.</p>

      {/* Tiers */}
      <h2 style={{ marginTop: 24 }}>Subscription Tiers</h2>
      <div style={{ display: 'grid', gap: 12 }}>
        {tiers.map(tier => (
          <div key={tier.slug} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 16, background: 'var(--surface)' }}>
            {editSlug === tier.slug ? (
              /* Edit mode */
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <strong>Editing: {tier.slug}</strong>
                  <label style={{ fontSize: '0.85em', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input type='checkbox' checked={editActive} onChange={e => setEditActive(e.target.checked)} /> Active
                  </label>
                </div>
                <input placeholder='Name' value={editName} onChange={e => setEditName(e.target.value)} />
                <input placeholder='Description' value={editDesc} onChange={e => setEditDesc(e.target.value)} />
                <div>
                  <label className='read-the-docs' style={{ fontSize: '0.85em' }}>Features (one per line)</label>
                  <textarea rows={4} value={editFeatures} onChange={e => setEditFeatures(e.target.value)} style={{ width: '100%', resize: 'vertical' }} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className='btn primary' onClick={saveEdit} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                  <button className='btn' onClick={cancelEdit}>Cancel</button>
                </div>
              </div>
            ) : priceSlug === tier.slug ? (
              /* Set price mode */
              <div style={{ display: 'grid', gap: 8 }}>
                <strong>Set Price for: {tier.name} ({tier.slug})</strong>
                {tier.stripe_price_id && (
                  <div className='read-the-docs' style={{ fontSize: '0.85em' }}>
                    Current: {fmt(tier.unit_amount, tier.currency)}/{tier.interval} (price: {tier.stripe_price_id})
                    <br />Existing subscribers will be migrated to the new price.
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <input placeholder='Stripe product name' value={priceProductName} onChange={e => setPriceProductName(e.target.value)} style={{ flex: '1 1 200px' }} />
                  <select value={priceCurrency} onChange={e => setPriceCurrency(e.target.value)}>
                    <option value='usd'>USD</option>
                    <option value='eur'>EUR</option>
                  </select>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span className='read-the-docs' style={{ fontSize: '0.85em' }}>$</span>
                    <input type='text' inputMode='decimal' value={priceAmount} onChange={e => setPriceAmount(Number(e.target.value) || 0)} style={{ width: 120 }} />
                  </div>
                  <select value={priceInterval} onChange={e => setPriceInterval(e.target.value)}>
                    <option value='month'>Monthly</option>
                    <option value='year'>Yearly</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <label className='read-the-docs' style={{ fontSize: '0.85em' }}>Grace period (days):</label>
                  <input type='number' min={0} max={90} value={priceGraceDays} onChange={e => setPriceGraceDays(Number(e.target.value) || 0)} style={{ width: 80 }} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className='btn primary' onClick={savePrice} disabled={priceSaving}>{priceSaving ? 'Creating...' : 'Create Stripe Price'}</button>
                  <button className='btn' onClick={cancelSetPrice}>Cancel</button>
                </div>
              </div>
            ) : (
              /* Display mode */
              <div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <strong>{tier.name}</strong>
                  <span className='read-the-docs' style={{ fontSize: '0.85em' }}>({tier.slug})</span>
                  {statusBadge(tier.active ? 'active' : 'inactive')}
                  {tier.slug === 'free' && <span className='read-the-docs' style={{ fontSize: '0.85em' }}>(no Stripe price needed)</span>}
                </div>
                <div className='read-the-docs' style={{ marginTop: 4 }}>{tier.description}</div>
                <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap', fontSize: '0.9em' }}>
                  <div>
                    <strong>Price:</strong>{' '}
                    {tier.slug === 'free'
                      ? 'Free'
                      : tier.stripe_price_id
                        ? <>{fmt(tier.unit_amount, tier.currency)}/{tier.interval}</>
                        : <span style={{ color: 'tomato' }}>Not configured</span>}
                  </div>
                  {tier.stripe_product_id && <div><strong>Product:</strong> {tier.stripe_product_id}</div>}
                  {tier.stripe_price_id && <div><strong>Price ID:</strong> {tier.stripe_price_id}</div>}
                </div>
                {Array.isArray(tier.features) && tier.features.length > 0 && (
                  <div style={{ marginTop: 8, fontSize: '0.85em' }}>
                    <strong>Features:</strong> {tier.features.join(' · ')}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button className='btn' onClick={() => startEdit(tier)}>Edit Info</button>
                  {tier.slug !== 'free' && <button className='btn primary' onClick={() => startSetPrice(tier)}>Set Price</button>}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Migration Jobs */}
      <h2 style={{ marginTop: 32 }}>Price Migration Jobs</h2>
      {migrations.length === 0 ? (
        <p className='read-the-docs'>No migration jobs yet. Jobs are created when you change a tier's price.</p>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {migrations.map(m => (
            <div key={m.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12, background: 'var(--surface)', fontSize: '0.9em' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <strong>#{m.id} {m.tier_name}</strong>
                {statusBadge(m.status)}
                <span className='read-the-docs'>Grace: {m.grace_period_days}d</span>
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 4, flexWrap: 'wrap' }}>
                <span>Users: {m.migrated_users}/{m.total_users} migrated</span>
                {m.failed_users > 0 && <span style={{ color: 'tomato' }}>{m.failed_users} failed</span>}
              </div>
              <div className='read-the-docs' style={{ marginTop: 4 }}>
                Old: {m.old_stripe_price_id || '(none)'} → New: {m.new_stripe_price_id}
              </div>
              <div className='read-the-docs'>
                Created: {new Date(m.created_at).toLocaleString()}
                {m.started_at && <> · Started: {new Date(m.started_at).toLocaleString()}</>}
                {m.completed_at && <> · Completed: {new Date(m.completed_at).toLocaleString()}</>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <button className='btn' onClick={() => { loadData(); toast.show('Refreshed', 'info') }}>Refresh</button>
      </div>
    </section>
  )
}

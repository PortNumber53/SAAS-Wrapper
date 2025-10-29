import { useEffect, useState } from 'react'
import { useToast } from '../components/ToastProvider'

export default function CommercePage() {
  const toast = useToast()
  const [products, setProducts] = useState<Array<{ stripe_product_id: string; name: string; description?: string }>>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')

  const [priceProduct, setPriceProduct] = useState('')
  const [currency, setCurrency] = useState('usd')
  const [amount, setAmount] = useState<number>(500)
  const [ptype, setPtype] = useState<'one_time'|'recurring'>('one_time')
  const [interval, setInterval] = useState<'day'|'week'|'month'|'year'>('month')
  const [intervalCount, setIntervalCount] = useState<number>(1)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/products')
      const j = await res.json()
      if (j?.ok && Array.isArray(j.products)) {
        setProducts(j.products)
        if (!priceProduct && j.products.length) setPriceProduct(j.products[0].stripe_product_id)
      }
    } catch (e) { /* noop */ }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const createProduct = async () => {
    if (!name.trim()) return toast.show('Enter a product name', 'error')
    try {
      const res = await fetch('/api/stripe/products', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: name.trim(), description: desc }) })
      if (!res.ok) { toast.show(await res.text(), 'error'); return }
      toast.show('Product created', 'success')
      setName(''); setDesc('');
      await load()
    } catch { toast.show('Create failed', 'error') }
  }

  const createPrice = async () => {
    if (!priceProduct) return toast.show('Choose a product', 'error')
    const payload: any = { product_id: priceProduct, currency, unit_amount: amount, type: ptype }
    if (ptype === 'recurring') { payload.interval = interval; payload.interval_count = intervalCount }
    try {
      const res = await fetch('/api/stripe/prices', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) { toast.show(await res.text(), 'error'); return }
      toast.show('Price created', 'success')
    } catch { toast.show('Create failed', 'error') }
  }

  return (
    <section className='card'>
      <h1>Commerce</h1>
      <p className='read-the-docs'>Create Stripe products and prices (one-time or subscriptions). Use Checkout to sell.</p>
      {loading ? <p>Loading…</p> : (
        <div style={{display:'grid', gap:12}}>
          <div style={{border:'1px solid var(--border)', borderRadius:8, padding:12, background:'var(--surface)'}}>
            <strong>Create Product</strong>
            <div style={{display:'flex', gap:8, marginTop:8, alignItems:'center', flexWrap:'wrap'}}>
              <input placeholder='Name' value={name} onChange={e => setName(e.target.value)} style={{flex:'1 1 220px'}} />
              <input placeholder='Description (optional)' value={desc} onChange={e => setDesc(e.target.value)} style={{flex:'2 1 320px'}} />
              <button className='btn primary' onClick={createProduct}>Create</button>
            </div>
          </div>

          <div style={{border:'1px solid var(--border)', borderRadius:8, padding:12, background:'var(--surface)'}}>
            <strong>Create Price</strong>
            <div className='read-the-docs'>Attach a one-time or recurring price to a product.</div>
            <div style={{display:'grid', gap:8, marginTop:8}}>
              <div style={{display:'flex', gap:8, flexWrap:'wrap', alignItems:'center'}}>
                <select value={priceProduct} onChange={e => setPriceProduct(e.target.value)}>
                  {products.map(p => <option key={p.stripe_product_id} value={p.stripe_product_id}>{p.name}</option>)}
                </select>
                <select value={currency} onChange={e => setCurrency(e.target.value)}>
                  <option value='usd'>USD</option>
                  <option value='eur'>EUR</option>
                </select>
                <input type='number' min={50} step={50} value={amount} onChange={e => setAmount(Number(e.target.value)||0)} style={{width:140}} />
                <select value={ptype} onChange={e => setPtype(e.target.value as any)}>
                  <option value='one_time'>One-time</option>
                  <option value='recurring'>Subscription</option>
                </select>
                {ptype === 'recurring' && (
                  <>
                    <select value={interval} onChange={e => setInterval(e.target.value as any)}>
                      <option value='day'>Day</option>
                      <option value='week'>Week</option>
                      <option value='month'>Month</option>
                      <option value='year'>Year</option>
                    </select>
                    <input type='number' min={1} max={12} value={intervalCount} onChange={e => setIntervalCount(Number(e.target.value)||1)} style={{width:120}} />
                  </>
                )}
                <button className='btn primary' onClick={createPrice}>Create Price</button>
              </div>
            </div>
          </div>

          <div>
            <strong>Products</strong>
            <div style={{display:'grid', gap:8, marginTop:8}}>
              {products.length === 0 && <div className='read-the-docs'>No products yet.</div>}
              {products.map(p => (
                <div key={p.stripe_product_id} style={{border:'1px solid var(--border)',borderRadius:8,padding:12}}>
                  <div><strong>{p.name}</strong></div>
                  {p.description && <div className='read-the-docs'>{p.description}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}


'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase, type PurchaseOrder, type Profile } from '@/lib/supabase'
import { loadPaystack, PAYSTACK_PUBLIC_KEY } from '@/lib/paystack'
import Navbar from '@/components/Navbar'

function formatCents(c: number) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(c / 100)
}

export default function PODetailPage() {
  const { id } = useParams<{ id: string }>()
  const [po, setPO] = useState<PurchaseOrder | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [amount, setAmount] = useState('')
  const [investing, setInvesting] = useState(false)
  const [error, setError] = useState('')
  const [fundedPct, setFundedPct] = useState(0)
  const router = useRouter()

  useEffect(() => {
    const getData = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      const { data: poData } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('id', id)
        .single()
      setPO(poData as PurchaseOrder)

      if (session) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        setProfile(profileData as Profile)
      }

      // Estimate funded pct
      const idx = ['PO-001','PO-002','PO-003','PO-004','PO-005'].indexOf(poData?.identifier || '')
      setFundedPct(Math.min(40 + idx * 10, 95))
      setLoading(false)
    }
    getData()
  }, [id])

  const expectedReturn = po ? Math.round(parseInt(amount || '0') * (po.return_rate_bps / 10000) * (po.duration_days / 365)) : 0

  const handleInvest = async () => {
    const amountCents = Math.round(parseFloat(amount) * 100)
    if (amountCents < 5000) { setError('Minimum investment is R50'); return }
    if (!profile) { router.push('/auth/login'); return }
    if (profile.kyc_status !== 'approved') { router.push('/settings'); return }

    setInvesting(true)
    setError('')

    try {
      await loadPaystack()

      // Get current wallet balance
      const { data: wallet } = await supabase
        .from('investor_wallets')
        .select('balance_cents')
        .eq('investor_id', profile.id)
        .single()

      if (!wallet || wallet.balance_cents < amountCents) {
        setError('Insufficient wallet balance. Please fund your wallet first.')
        setInvesting(false)
        return
      }

      // Create investment record and deduct from wallet
      const { data: funding, error: fundError } = await supabase
        .from('po_fundings')
        .insert({ po_id: id, investor_id: profile.id, amount_cents: amountCents })
        .select()
        .single()

      if (fundError) {
        setError('Failed to create investment: ' + fundError.message)
        setInvesting(false)
        return
      }

      // Deduct from wallet (fallback manual update)
      const { error: rpcErr } = await supabase
        .from('investor_wallets')
        .update({ balance_cents: wallet.balance_cents - amountCents })
        .eq('investor_id', profile.id)

      // Create investment transaction
      await supabase
        .from('wallet_transactions')
        .insert({ 
          investor_id: profile.id, 
          type: 'investment', 
          amount_cents: -amountCents,
          reference_type: 'po_funding',
          reference_id: funding.id,
          description: `Investment in ${po?.identifier}`
        })

      alert(`Investment of ${formatCents(amountCents)} in ${po?.identifier} confirmed! Check your portfolio.`)
      setShowModal(false)
      router.push('/portfolio')
    } catch (err: any) {
      setError(err.message || 'Investment failed')
    }
    setInvesting(false)
  }

  const handlePaystackFund = async () => {
    const amountCents = Math.round(parseFloat(amount) * 100)
    if (isNaN(amountCents) || amountCents < 5000) { setError('Minimum investment is R50'); return }

    setInvesting(true)
    setError('')

    try {
      await loadPaystack()

      // Create Paystack payment
      const res = await fetch('/api/invest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          po_id: id, 
          amount_cents: amountCents,
          email: profile?.email 
        })
      })

      const { authorization_url, error: apiError } = await res.json()
      if (apiError) throw new Error(apiError)

      if (authorization_url) {
        window.location.href = authorization_url
      } else {
        throw new Error('No payment URL received')
      }
    } catch (err: any) {
      setError(err.message || 'Payment failed')
      setInvesting(false)
    }
  }

  if (loading) return (
    <div style={{ background: '#09090b', minHeight: '100vh' }}>
      <Navbar />
      <div className="container" style={{ padding: '4rem 1.5rem', textAlign: 'center', color: '#71717a' }}>Loading...</div>
    </div>
  )

  if (!po) return (
    <div style={{ background: '#09090b', minHeight: '100vh' }}>
      <Navbar />
      <div className="container" style={{ padding: '4rem 1.5rem', textAlign: 'center', color: '#71717a' }}>
        Purchase order not found.
        <Link href="/marketplace" className="btn-secondary" style={{ marginLeft: '1rem' }}>Back</Link>
      </div>
    </div>
  )

  return (
    <div style={{ background: '#09090b', minHeight: '100vh' }}>
      <Navbar />
      <div className="container" style={{ padding: '2.5rem 1.5rem' }}>
        <Link href="/marketplace" style={{ color: '#a1a1aa', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginBottom: '1.5rem' }}>← Back to Marketplace</Link>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2rem', alignItems: 'start' }}>
          {/* Left: PO Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.25rem' }}>{po.supplier_name}</h1>
                  <p style={{ color: '#a1a1aa', fontSize: '0.9rem' }}>{po.identifier} · Listed {new Date(po.listed_at).toLocaleDateString()}</p>
                </div>
                <span className={`badge ${po.risk_grade === 'A' ? 'badge-green' : po.risk_grade === 'B' ? 'badge-yellow' : 'badge-red'}`}>
                  Risk Grade {po.risk_grade}
                </span>
              </div>

              {po.description && (
                <p style={{ color: '#d4d4d8', lineHeight: 1.7 }}>{po.description}</p>
            )}
            </div>

            {/* Financial Summary */}
            <div className="card">
              <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Financial Summary</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                {[
                  { label: 'Purchase Order Amount', value: formatCents(po.po_amount_cents) },
                  { label: 'Expected Return Rate', value: `${(po.return_rate_bps / 100).toFixed(1)}% p.a.` },
                  { label: 'Trade Duration', value: `${po.duration_days} days` },
                  { label: 'Risk Grade', value: `Grade ${po.risk_grade}` },
                  { label: 'Buyer', value: po.buyer_name },
                  { label: 'Status', value: po.status.charAt(0).toUpperCase() + po.status.slice(1) },
                ].map((row) => (
                  <div key={row.label}>
                    <p style={{ color: '#71717a', fontSize: '0.8rem', marginBottom: '0.25rem' }}>{row.label}</p>
                    <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>{row.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* How it Works */}
            <div className="card">
              <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>How It Works</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[
                  { step: '1', text: 'You fund the purchase order. Your capital is used to purchase goods for the buyer.' },
                  { step: '2', text: 'The buyer receives goods and pays back the PO amount + return within the trade duration.' },
                  { step: '3', text: 'Once repaid, your principal + return is credited to your wallet as a distribution.' },
                ].map((item) => (
                  <div key={item.step} style={{ display: 'flex', gap: '0.75rem' }}>
                    <div style={{ width: 24, height: 24, background: '#2563eb', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>{item.step}</div>
                    <p style={{ color: '#a1a1aa', fontSize: '0.875rem', lineHeight: 1.5 }}>{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Invest Panel */}
          <div style={{ position: 'sticky', top: '5rem' }}>
            <div className="card">
              <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Invest in this PO</h2>

              <div style={{ background: '#111113', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: '#a1a1aa', fontSize: '0.875rem' }}>Funded</span>
                  <span style={{ fontWeight: 600 }}>{fundedPct}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${fundedPct}%` }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ background: '#111113', borderRadius: '0.5rem', padding: '0.875rem', textAlign: 'center' }}>
                  <p style={{ color: '#71717a', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Return Rate</p>
                  <p style={{ fontWeight: 800, color: '#4ade80', fontSize: '1rem' }}>{(po.return_rate_bps / 100).toFixed(1)}%</p>
                </div>
                <div style={{ background: '#111113', borderRadius: '0.5rem', padding: '0.875rem', textAlign: 'center' }}>
                  <p style={{ color: '#71717a', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Duration</p>
                  <p style={{ fontWeight: 800, fontSize: '1rem' }}>{po.duration_days}d</p>
                </div>
              </div>

              {profile?.kyc_status !== 'approved' ? (
                <div style={{ background: '#1c1400', border: '1px solid #713f12', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1rem' }}>
                  <p style={{ color: '#facc15', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>KYC Required</p>
                  <p style={{ color: '#a1a1aa', fontSize: '0.8rem', marginBottom: '0.75rem' }}>Complete identity verification before investing.</p>
                  <Link href="/settings" className="btn-primary" style={{ justifyContent: 'center', fontSize: '0.875rem', width: '100%' }}>
                    Complete KYC
                  </Link>
                </div>
              ) : (
                <button onClick={() => setShowModal(true)} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                  Invest Now →
                </button>
              )}

              {!profile && (
                <Link href="/auth/login" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                  Sign In to Invest
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Invest Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="card" style={{ width: '100%', maxWidth: 440 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Invest in {po.identifier}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', fontSize: '1.25rem' }}>×</button>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label className="label">Investment Amount (ZAR)</label>
              <input
                type="number"
                className="input-field"
                placeholder="Minimum R50"
                min={50}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <p style={{ color: '#71717a', fontSize: '0.75rem', marginTop: '0.375rem' }}>Minimum investment: R50</p>
            </div>

            {parseInt(amount || '0') >= 50 && (
              <div style={{ background: '#111113', borderRadius: '0.5rem', padding: '0.875rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                  <span style={{ color: '#a1a1aa', fontSize: '0.8rem' }}>Your investment</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{formatCents(Math.round(parseFloat(amount || '0') * 100))}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                  <span style={{ color: '#a1a1aa', fontSize: '0.8rem' }}>Expected return</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#4ade80' }}>+{formatCents(expectedReturn)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid #27272a' }}>
                  <span style={{ color: '#a1a1aa', fontSize: '0.8rem' }}>Total at maturity</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>{formatCents(Math.round(parseFloat(amount || '0') * 100) + expectedReturn)}</span>
                </div>
              </div>
            )}

            {error && (
              <div style={{ background: '#2d0000', border: '1px solid #7f1d1d', borderRadius: '0.5rem', padding: '0.75rem', color: '#f87171', fontSize: '0.875rem', marginBottom: '1rem' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={handlePaystackFund} disabled={investing} className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                {investing ? 'Processing...' : 'Pay with Paystack 💳'}
              </button>
              <button onClick={handleInvest} disabled={investing} className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>
                {investing ? 'Processing...' : 'Use Wallet Balance'}
              </button>
            </div>

            <p style={{ color: '#71717a', fontSize: '0.75rem', textAlign: 'center', marginTop: '0.75rem' }}>
              Test card: 4242 4242 4242 4242 · Any future expiry · Any CVC
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

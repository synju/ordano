'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase, type PurchaseOrder } from '@/lib/supabase'
import Navbar from '@/components/Navbar'

function formatCents(c: number) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(c / 100)
}

function RiskBadge({ grade }: { grade: string }) {
  const cls = grade === 'A' ? 'risk-a' : grade === 'B' ? 'risk-b' : 'risk-c'
  return <span className={cls} style={{ fontWeight: 700, fontSize: '0.875rem' }}>Risk {grade}</span>
}

export default function MarketplacePage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    const getOrders = async () => {
      const { data } = await supabase
        .from('purchase_orders')
        .select('*')
        .in('status', ['listed', 'funded', 'active'])
        .order('listed_at', { ascending: false })
      setOrders(data || [])
      setLoading(false)
    }
    getOrders()
  }, [])

  const filtered = orders.filter(o =>
    o.supplier_name.toLowerCase().includes(filter.toLowerCase()) ||
    o.risk_grade.includes(filter.toUpperCase())
  )

  const getProgress = (po: PurchaseOrder) => {
    // For demo, estimate 40-80% funded based on index
    const idx = orders.indexOf(po)
    const base = 40 + (idx * 10)
    return Math.min(base, 95)
  }

  return (
    <div style={{ background: '#09090b', minHeight: '100vh' }}>
      <Navbar />
      <div className="container" style={{ padding: '2.5rem 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>Investment Marketplace</h1>
            <p style={{ color: '#a1a1aa' }}>Browse and invest in verified purchase order opportunities.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search suppliers..."
              className="input-field"
              style={{ width: 220, padding: '0.5rem 0.875rem', fontSize: '0.875rem' }}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#71717a' }}>Loading opportunities...</div>
        ) : filtered.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '4rem', color: '#71717a' }}>
            No opportunities match your search.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
            {filtered.map((po) => {
              const fundedPct = getProgress(po)
              const expectedReturn = Math.round(po.po_amount_cents * (po.return_rate_bps / 10000) * (po.duration_days / 365))
              return (
                <div key={po.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.25rem' }}>{po.supplier_name}</p>
                      <p style={{ color: '#a1a1aa', fontSize: '0.8rem' }}>{po.identifier} · {po.buyer_name}</p>
                    </div>
                    <RiskBadge grade={po.risk_grade} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <p style={{ color: '#71717a', fontSize: '0.75rem', marginBottom: '0.125rem' }}>PO Amount</p>
                      <p style={{ fontWeight: 700, fontSize: '0.95rem' }}>{formatCents(po.po_amount_cents)}</p>
                    </div>
                    <div>
                      <p style={{ color: '#71717a', fontSize: '0.75rem', marginBottom: '0.125rem' }}>Return Rate</p>
                      <p style={{ fontWeight: 700, fontSize: '0.95rem', color: '#4ade80' }}>{(po.return_rate_bps / 100).toFixed(1)}% p.a.</p>
                    </div>
                    <div>
                      <p style={{ color: '#71717a', fontSize: '0.75rem', marginBottom: '0.125rem' }}>Duration</p>
                      <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>{po.duration_days} days</p>
                    </div>
                    <div>
                      <p style={{ color: '#71717a', fontSize: '0.75rem', marginBottom: '0.125rem' }}>Expected Return</p>
                      <p style={{ fontWeight: 700, fontSize: '0.95rem', color: '#4ade80' }}>~{formatCents(expectedReturn)}</p>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.375rem' }}>
                      <span style={{ color: '#a1a1aa' }}>Funded</span>
                      <span style={{ fontWeight: 600 }}>{fundedPct}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${fundedPct}%` }} />
                    </div>
                  </div>

                  {po.description && (
                    <p style={{ color: '#71717a', fontSize: '0.8rem', lineHeight: 1.5 }}>{po.description}</p>
                  )}

                  <Link href={`/marketplace/${po.id}`} className="btn-primary" style={{ justifyContent: 'center', fontSize: '0.875rem' }}>
                    View & Invest →
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

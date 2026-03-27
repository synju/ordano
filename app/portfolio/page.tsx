'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase, type POFunding, type PurchaseOrder, type WalletTransaction } from '@/lib/supabase'
import Navbar from '@/components/Navbar'

function formatCents(c: number) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(c / 100)
}

export default function PortfolioPage() {
  const [fundings, setFundings] = useState<(POFunding & { purchase_order: PurchaseOrder })[]>([])
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const getData = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth/login'); return }

      const [{ data: fundingsData }, { data: txsData }] = await Promise.all([
        supabase
          .from('po_fundings')
          .select('*, purchase_order:purchase_orders(*)')
          .eq('investor_id', session.user.id)
          .order('invested_at', { ascending: false }),
        supabase
          .from('wallet_transactions')
          .select('*')
          .eq('investor_id', session.user.id)
          .order('created_at', { ascending: false })
      ])

      setFundings(fundingsData as any || [])
      setTransactions(txsData || [])
      setLoading(false)
    }
    getData()
  }, [])

  const totalInvested = fundings.reduce((s, f) => s + f.amount_cents, 0)
  const totalExpected = fundings.reduce((s, f) => {
    if (!f.purchase_order) return s
    return s + Math.round(f.amount_cents * (1 + f.purchase_order.return_rate_bps / 10000))
  }, 0)

  if (loading) return (
    <div style={{ background: '#09090b', minHeight: '100vh' }}>
      <Navbar />
      <div className="container" style={{ padding: '4rem 1.5rem', textAlign: 'center', color: '#71717a' }}>Loading...</div>
    </div>
  )

  return (
    <div style={{ background: '#09090b', minHeight: '100vh' }}>
      <Navbar />
      <div className="container" style={{ padding: '2.5rem 1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>My Portfolio</h1>
        <p style={{ color: '#a1a1aa', marginBottom: '2rem' }}>Track your investments and transaction history.</p>

        {/* Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div className="card">
            <p style={{ color: '#a1a1aa', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Total Invested</p>
            <p style={{ fontSize: '2rem', fontWeight: 800 }}>{formatCents(totalInvested)}</p>
          </div>
          <div className="card">
            <p style={{ color: '#a1a1aa', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Expected at Maturity</p>
            <p style={{ fontSize: '2rem', fontWeight: 800, color: '#4ade80' }}>{formatCents(totalExpected)}</p>
          </div>
          <div className="card">
            <p style={{ color: '#a1a1aa', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Active Positions</p>
            <p style={{ fontSize: '2rem', fontWeight: 800 }}>{fundings.filter(f => f.status === 'active').length}</p>
          </div>
          <div className="card">
            <p style={{ color: '#a1a1aa', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Completed</p>
            <p style={{ fontSize: '2rem', fontWeight: 800 }}>{fundings.filter(f => f.status !== 'active').length}</p>
          </div>
        </div>

        {/* Investments */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>My Investments</h2>
          {fundings.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#71717a' }}>
              No investments yet.{' '}
              <Link href="/marketplace" style={{ color: '#2563eb' }}>Browse opportunities →</Link>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #27272a' }}>
                    {['PO', 'Supplier', 'Amount', 'Duration', 'Return Rate', 'Status', 'Invested'].map(h => (
                      <th key={h} style={{ padding: '0.875rem 1.25rem', textAlign: 'left', color: '#71717a', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fundings.map((f) => (
                    <tr key={f.id} style={{ borderBottom: '1px solid #27272a' }}>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <Link href={`/marketplace/${f.po_id}`} style={{ color: '#2563eb', fontWeight: 600, fontSize: '0.875rem' }}>{f.purchase_order?.identifier}</Link>
                      </td>
                      <td style={{ padding: '1rem 1.25rem', fontSize: '0.875rem' }}>{f.purchase_order?.supplier_name}</td>
                      <td style={{ padding: '1rem 1.25rem', fontWeight: 700, fontSize: '0.875rem' }}>{formatCents(f.amount_cents)}</td>
                      <td style={{ padding: '1rem 1.25rem', fontSize: '0.875rem' }}>{f.purchase_order?.duration_days}d</td>
                      <td style={{ padding: '1rem 1.25rem', fontSize: '0.875rem', color: '#4ade80' }}>{(f.purchase_order!.return_rate_bps / 100).toFixed(1)}%</td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span className={`badge ${f.status === 'active' ? 'badge-blue' : f.status === 'returned' ? 'badge-green' : 'badge-red'}`}>{f.status}</span>
                      </td>
                      <td style={{ padding: '1rem 1.25rem', color: '#71717a', fontSize: '0.8rem' }}>{new Date(f.invested_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Transactions */}
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>Transaction History</h2>
          {transactions.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '2rem', color: '#71717a' }}>No transactions yet.</div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {transactions.map((tx, i) => (
                <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: i < transactions.length - 1 ? '1px solid #27272a' : 'none' }}>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '0.9rem', textTransform: 'capitalize' }}>{tx.type}</p>
                    <p style={{ color: '#71717a', fontSize: '0.8rem' }}>{tx.description || tx.type}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontWeight: 700, fontSize: '0.95rem', color: tx.amount_cents >= 0 ? '#4ade80' : '#f87171' }}>
                      {tx.amount_cents >= 0 ? '+' : ''}{formatCents(Math.abs(tx.amount_cents))}
                    </p>
                    <p style={{ color: '#71717a', fontSize: '0.75rem' }}>{new Date(tx.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

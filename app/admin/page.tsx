'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseAdmin, type PurchaseOrder, type POFunding } from '@/lib/supabase'
import Navbar from '@/components/Navbar'

function formatCents(c: number) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(c / 100)
}

export default function AdminPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [fundings, setFundings] = useState<(POFunding & { profile?: { email: string; full_name: string } })[]>([])
  const [loading, setLoading] = useState(true)
  const [simulating, setSimulating] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const router = useRouter()

  useEffect(() => {
    // Simple admin check — in production this would be proper role-based auth
    const checkAdmin = async () => {
      const { data: { session } } = await supabaseAdmin.auth.getSession()
      if (!session) { router.push('/auth/login'); return }
      // Allow any logged-in user to access admin in Phase 0
      await loadData()
    }
    checkAdmin()
  }, [])

  const loadData = async () => {
    const [{ data: pos }, { data: fds }] = await Promise.all([
      supabaseAdmin
        .from('purchase_orders')
        .select('*')
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('po_fundings')
        .select('*, profile:profiles(email, full_name)')
        .order('invested_at', { ascending: false })
    ])
    setOrders(pos || [])
    setFundings(fds as any || [])
    setLoading(false)
  }

  const handleSimulateRepayment = async (poId: string) => {
    setSimulating(poId)
    setMsg('')

    try {
      const po = orders.find(o => o.id === poId)
      if (!po) return

      const poFundings = fundings.filter(f => f.po_id === poId && f.status === 'active')

      // Update PO status to repaid
      await supabaseAdmin
        .from('purchase_orders')
        .update({ status: 'repaid', repaid_at: new Date().toISOString() })
        .eq('id', poId)

      // For each active funding, create distribution and update status
      for (const funding of poFundings) {
        const returnAmount = Math.round(funding.amount_cents * (1 + po.return_rate_bps / 10000))

        await supabaseAdmin
          .from('po_fundings')
          .update({ status: 'returned', returned_at: new Date().toISOString(), return_amount_cents: returnAmount })
          .eq('id', funding.id)

        // Credit investor wallet
        const { data: wallet } = await supabaseAdmin
          .from('investor_wallets')
          .select('balance_cents')
          .eq('investor_id', funding.investor_id)
          .single()

        await supabaseAdmin
          .from('investor_wallets')
          .update({ balance_cents: (wallet?.balance_cents || 0) + returnAmount })
          .eq('investor_id', funding.investor_id)

        // Create distribution transaction
        await supabaseAdmin
          .from('wallet_transactions')
          .insert({
            investor_id: funding.investor_id,
            type: 'distribution',
            amount_cents: returnAmount,
            reference_type: 'po_repayment',
            reference_id: funding.id,
            description: `Repayment from ${po.identifier}`
          })
      }

      setMsg(`Repayment simulated for ${po.identifier}. ${poFundings.length} investor(s) credited.`)
      await loadData()
    } catch (err: any) {
      setMsg('Error: ' + err.message)
    }

    setSimulating(null)
  }

  const totalFunded = orders.filter(o => o.status === 'active' || o.status === 'funded' || o.status === 'repaid').length

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Admin Panel</h1>
          <span className="badge badge-red">Phase 0</span>
        </div>
        <p style={{ color: '#a1a1aa', marginBottom: '2rem' }}>Manage purchase orders and simulate repayments.</p>

        {msg && (
          <div style={{ background: '#052e16', border: '1px solid #166534', borderRadius: '0.5rem', padding: '0.875rem 1rem', color: '#4ade80', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            {msg}
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div className="card">
            <p style={{ color: '#a1a1aa', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Total POs</p>
            <p style={{ fontSize: '2rem', fontWeight: 800 }}>{orders.length}</p>
          </div>
          <div className="card">
            <p style={{ color: '#a1a1aa', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Active / Funded</p>
            <p style={{ fontSize: '2rem', fontWeight: 800 }}>{orders.filter(o => ['active','funded'].includes(o.status)).length}</p>
          </div>
          <div className="card">
            <p style={{ color: '#a1a1aa', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Total Fundings</p>
            <p style={{ fontSize: '2rem', fontWeight: 800 }}>{fundings.length}</p>
          </div>
          <div className="card">
            <p style={{ color: '#a1a1aa', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Repaid</p>
            <p style={{ fontSize: '2rem', fontWeight: 800 }}>{orders.filter(o => o.status === 'repaid').length}</p>
          </div>
        </div>

        {/* All Purchase Orders */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>All Purchase Orders</h2>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #27272a' }}>
                  {['ID', 'Supplier', 'Amount', 'Return', 'Duration', 'Risk', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '0.875rem 1.25rem', textAlign: 'left', color: '#71717a', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((po) => {
                  const poFundings = fundings.filter(f => f.po_id === po.id)
                  const hasActiveFundings = poFundings.some(f => f.status === 'active')
                  return (
                    <tr key={po.id} style={{ borderBottom: '1px solid #27272a' }}>
                      <td style={{ padding: '1rem 1.25rem', fontWeight: 600, fontSize: '0.875rem', color: '#2563eb' }}>{po.identifier}</td>
                      <td style={{ padding: '1rem 1.25rem', fontSize: '0.875rem' }}>{po.supplier_name}</td>
                      <td style={{ padding: '1rem 1.25rem', fontWeight: 600, fontSize: '0.875rem' }}>{formatCents(po.po_amount_cents)}</td>
                      <td style={{ padding: '1rem 1.25rem', fontSize: '0.875rem', color: '#4ade80' }}>{(po.return_rate_bps / 100).toFixed(1)}%</td>
                      <td style={{ padding: '1rem 1.25rem', fontSize: '0.875rem' }}>{po.duration_days}d</td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span className={po.risk_grade === 'A' ? 'risk-a' : po.risk_grade === 'B' ? 'risk-b' : 'risk-c'} style={{ fontWeight: 700, fontSize: '0.875rem' }}>{po.risk_grade}</span>
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span className={`badge ${po.status === 'repaid' ? 'badge-green' : po.status === 'active' || po.status === 'funded' ? 'badge-blue' : 'badge-gray'}`}>{po.status}</span>
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        {hasActiveFundings && po.status !== 'repaid' && (
                          <button
                            onClick={() => handleSimulateRepayment(po.id)}
                            disabled={simulating === po.id}
                            className="btn-secondary"
                            style={{ padding: '0.375rem 0.875rem', fontSize: '0.8rem' }}
                          >
                            {simulating === po.id ? 'Processing...' : 'Simulate Repayment'}
                          </button>
                        )}
                        {po.status === 'repaid' && (
                          <span style={{ color: '#4ade80', fontSize: '0.8rem', fontWeight: 600 }}>✓ Repaid</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* All Fundings */}
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>All Fundings</h2>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #27272a' }}>
                  {['Investor', 'PO', 'Amount', 'Status', 'Invested'].map(h => (
                    <th key={h} style={{ padding: '0.875rem 1.25rem', textAlign: 'left', color: '#71717a', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fundings.map((f) => (
                  <tr key={f.id} style={{ borderBottom: '1px solid #27272a' }}>
                    <td style={{ padding: '1rem 1.25rem', fontSize: '0.875rem' }}>{f.profile?.email || f.investor_id.slice(0, 8) + '...'}</td>
                    <td style={{ padding: '1rem 1.25rem', fontSize: '0.875rem', fontWeight: 600, color: '#2563eb' }}>
                      {orders.find(o => o.id === f.po_id)?.identifier || f.po_id.slice(0, 8)}
                    </td>
                    <td style={{ padding: '1rem 1.25rem', fontWeight: 600, fontSize: '0.875rem' }}>{formatCents(f.amount_cents)}</td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <span className={`badge ${f.status === 'active' ? 'badge-blue' : f.status === 'returned' ? 'badge-green' : 'badge-red'}`}>{f.status}</span>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', color: '#71717a', fontSize: '0.8rem' }}>{new Date(f.invested_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {fundings.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#71717a' }}>No fundings yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

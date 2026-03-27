'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase, type Profile, type POFunding, type PurchaseOrder, type WalletTransaction } from '@/lib/supabase'
import Navbar from '@/components/Navbar'

function formatCents(c: number) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(c / 100)
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [fundings, setFundings] = useState<(POFunding & { purchase_order: PurchaseOrder })[]>([])
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [walletBalance, setWalletBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const getData = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()
      setProfile(profile as Profile)

      const { data: wallet } = await supabase
        .from('investor_wallets')
        .select('balance_cents')
        .eq('investor_id', session.user.id)
        .single()
      if (wallet) setWalletBalance(wallet.balance_cents)

      const { data: userFundings } = await supabase
        .from('po_fundings')
        .select('*, purchase_order:purchase_orders(*)')
        .eq('investor_id', session.user.id)
        .eq('status', 'active')
      setFundings(userFundings as any || [])

      const { data: txs } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('investor_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(5)
      setTransactions(txs || [])

      setLoading(false)
    }
    getData()
  }, [])

  if (loading) return (
    <div style={{ background: '#09090b', minHeight: '100vh' }}>
      <Navbar />
      <div className="container" style={{ padding: '4rem 1.5rem', textAlign: 'center', color: '#71717a' }}>Loading...</div>
    </div>
  )

  const totalInvested = fundings.reduce((sum, f) => sum + f.amount_cents, 0)
  const activePOs = fundings.length

  return (
    <div style={{ background: '#09090b', minHeight: '100vh' }}>
      <Navbar />
      <div className="container" style={{ padding: '2.5rem 1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>Dashboard</h1>
        <p style={{ color: '#a1a1aa', marginBottom: '2rem' }}>Welcome back — here&apos;s your portfolio overview.</p>

        {/* KYC Banner */}
        {profile?.kyc_status !== 'approved' && (
          <div className="card" style={{ marginBottom: '1.5rem', background: '#1c1400', borderColor: '#713f12' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.25rem' }}>⚠️</span>
                <div>
                  <p style={{ fontWeight: 600 }}>Complete your KYC verification</p>
                  <p style={{ color: '#a1a1aa', fontSize: '0.875rem' }}>You need to verify your identity before investing.</p>
                </div>
              </div>
              <Link href="/settings" className="btn-primary" style={{ fontSize: '0.875rem' }}>Complete KYC</Link>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div className="card">
            <p style={{ color: '#a1a1aa', fontSize: '0.8rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Wallet Balance</p>
            <p style={{ fontSize: '2rem', fontWeight: 800 }}>{formatCents(walletBalance)}</p>
            <Link href="/settings" style={{ color: '#2563eb', fontSize: '0.8rem', fontWeight: 500 }}>Fund wallet →</Link>
          </div>
          <div className="card">
            <p style={{ color: '#a1a1aa', fontSize: '0.8rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Invested</p>
            <p style={{ fontSize: '2rem', fontWeight: 800 }}>{formatCents(totalInvested)}</p>
            <Link href="/portfolio" style={{ color: '#2563eb', fontSize: '0.8rem', fontWeight: 500 }}>View portfolio →</Link>
          </div>
          <div className="card">
            <p style={{ color: '#a1a1aa', fontSize: '0.8rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Positions</p>
            <p style={{ fontSize: '2rem', fontWeight: 800 }}>{activePOs}</p>
            <Link href="/marketplace" style={{ color: '#2563eb', fontSize: '0.8rem', fontWeight: 500 }}>Browse opportunities →</Link>
          </div>
          <div className="card">
            <p style={{ color: '#a1a1aa', fontSize: '0.8rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>KYC Status</p>
            <span className={`badge ${profile?.kyc_status === 'approved' ? 'badge-green' : profile?.kyc_status === 'rejected' ? 'badge-red' : 'badge-yellow'}`}>
              {profile?.kyc_status || 'pending'}
            </span>
            <Link href="/settings" style={{ color: '#2563eb', fontSize: '0.8rem', fontWeight: 500, display: 'block', marginTop: '0.25rem' }}>Update →</Link>
          </div>
        </div>

        {/* Active Positions */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>Active Positions</h2>
          {fundings.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '2.5rem', color: '#71717a' }}>
              <p style={{ marginBottom: '1rem' }}>No active investments yet.</p>
              <Link href="/marketplace" className="btn-primary">Browse Opportunities</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {fundings.map((f) => (
                <div key={f.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <p style={{ fontWeight: 600 }}>{f.purchase_order?.supplier_name}</p>
                    <p style={{ color: '#a1a1aa', fontSize: '0.875rem' }}>{f.purchase_order?.identifier} · {f.purchase_order?.duration_days} days · Risk {f.purchase_order?.risk_grade}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontWeight: 700 }}>{formatCents(f.amount_cents)}</p>
                    <p style={{ color: '#4ade80', fontSize: '0.8rem' }}>~{formatCents(Math.round(f.amount_cents * (1 + f.purchase_order!.return_rate_bps / 10000)))} expected</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>Recent Transactions</h2>
          {transactions.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '2rem', color: '#71717a' }}>
              No transactions yet
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {transactions.map((tx, i) => (
                <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.875rem 1.25rem', borderBottom: i < transactions.length - 1 ? '1px solid #27272a' : 'none' }}>
                  <div>
                    <p style={{ fontWeight: 500, fontSize: '0.9rem', textTransform: 'capitalize' }}>{tx.type}</p>
                    <p style={{ color: '#71717a', fontSize: '0.8rem' }}>{tx.description || tx.type}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontWeight: 700, color: tx.amount_cents >= 0 ? '#4ade80' : '#f87171' }}>
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

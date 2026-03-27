'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, type Profile, type InvestorWallet } from '@/lib/supabase'
import Navbar from '@/components/Navbar'

function formatCents(c: number) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(c / 100)
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [wallet, setWallet] = useState<InvestorWallet | null>(null)
  const [fullName, setFullName] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [fundAmount, setFundAmount] = useState('')
  const [fundingWallet, setFundingWallet] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const getData = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth/login'); return }

      const [{ data: profileData }, { data: walletData }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', session.user.id).single(),
        supabase.from('investor_wallets').select('*').eq('investor_id', session.user.id).single()
      ])

      setProfile(profileData as Profile)
      setWallet(walletData as InvestorWallet)
      setFullName(profileData?.full_name || '')
    }
    getData()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    await supabase
      .from('profiles')
      .update({ full_name: fullName, updated_at: new Date().toISOString() })
      .eq('id', session.user.id)

    setMsg('Profile updated successfully.')
    setSaving(false)
    setTimeout(() => setMsg(''), 3000)
  }

  const handleSimulateKYC = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    await supabase
      .from('profiles')
      .update({ kyc_status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', session.user.id)

    setProfile({ ...profile!, kyc_status: 'approved' })
    setMsg('KYC status updated to approved (simulated).')
    setTimeout(() => setMsg(''), 4000)
  }

  const handleFundWallet = async () => {
    const amount = Math.round(parseFloat(fundAmount) * 100)
    if (isNaN(amount) || amount < 100) return
    setFundingWallet(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    // Simulate Paystack deposit — in test mode, just add funds
    // Get or create wallet transaction
    await supabase
      .from('wallet_transactions')
      .insert({ investor_id: session.user.id, type: 'deposit', amount_cents: amount, description: 'Wallet deposit (Paystack test)' })

    await supabase
      .from('investor_wallets')
      .update({ balance_cents: (wallet?.balance_cents || 0) + amount, updated_at: new Date().toISOString() })
      .eq('investor_id', session.user.id)

    setWallet({ ...wallet!, balance_cents: (wallet?.balance_cents || 0) + amount } as InvestorWallet)
    setFundAmount('')
    setFundingWallet(false)
    setMsg(`Wallet funded with ${formatCents(amount)} (simulated Paystack deposit).`)
    setTimeout(() => setMsg(''), 4000)
  }

  if (!profile) return (
    <div style={{ background: '#09090b', minHeight: '100vh' }}>
      <Navbar />
      <div className="container" style={{ padding: '4rem 1.5rem', textAlign: 'center', color: '#71717a' }}>Loading...</div>
    </div>
  )

  return (
    <div style={{ background: '#09090b', minHeight: '100vh' }}>
      <Navbar />
      <div className="container" style={{ padding: '2.5rem 1.5rem', maxWidth: 720 }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>Settings</h1>
        <p style={{ color: '#a1a1aa', marginBottom: '2rem' }}>Manage your profile and wallet.</p>

        {msg && (
          <div style={{ background: '#052e16', border: '1px solid #166534', borderRadius: '0.5rem', padding: '0.875rem 1rem', color: '#4ade80', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            {msg}
          </div>
        )}

        {/* Profile */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Profile Information</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label className="label">Full name</label>
              <input type="text" className="input-field" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input-field" value={profile.email || ''} disabled style={{ opacity: 0.6 }} />
            </div>
            <button onClick={handleSave} disabled={saving} className="btn-primary" style={{ alignSelf: 'flex-start' }}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Wallet */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Wallet</h2>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <p style={{ color: '#71717a', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Current Balance</p>
              <p style={{ fontSize: '2rem', fontWeight: 800 }}>{formatCents(wallet?.balance_cents || 0)}</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
            <input
              type="number"
              className="input-field"
              placeholder="Amount in ZAR (e.g. 500)"
              min={100}
              value={fundAmount}
              onChange={(e) => setFundAmount(e.target.value)}
              style={{ flex: 1 }}
            />
            <button onClick={handleFundWallet} disabled={fundingWallet || !fundAmount} className="btn-primary">
              {fundingWallet ? 'Processing...' : 'Add Funds'}
            </button>
          </div>
          <p style={{ color: '#71717a', fontSize: '0.75rem' }}>💳 Paystack test mode — use card 4242 4242 4242 4242</p>
        </div>

        {/* KYC */}
        <div className="card">
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Identity Verification (KYC)</h2>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>KYC Status</p>
              <span className={`badge ${profile.kyc_status === 'approved' ? 'badge-green' : profile.kyc_status === 'rejected' ? 'badge-red' : 'badge-yellow'}`}>
                {profile.kyc_status}
              </span>
            </div>
          </div>

          {profile.kyc_status !== 'approved' && (
            <>
              <div style={{ background: '#0c1a3d', border: '1px solid #1e3a5f', borderRadius: '0.5rem', padding: '0.875rem', marginBottom: '1rem' }}>
                <p style={{ color: '#60a5fa', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>📋 Phase 0 Note</p>
                <p style={{ color: '#93c5fd', fontSize: '0.8rem' }}>Phase 0 uses simulated KYC. Click below to simulate approval. No external verification is performed.</p>
              </div>
              <button onClick={handleSimulateKYC} className="btn-primary" style={{ background: '#16a34a' }}>
                ✅ Complete KYC (Simulated — Phase 0)
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

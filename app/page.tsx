import Link from 'next/link'
import Navbar from '@/components/Navbar'

export default function LandingPage() {
  return (
    <div style={{ background: '#09090b', minHeight: '100vh' }}>
      <Navbar />
      
      {/* Hero */}
      <section style={{ padding: '6rem 0 4rem', textAlign: 'center', background: 'radial-gradient(ellipse at 50% 0%, #1a1a2e 0%, #09090b 70%)' }}>
        <div className="container">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#0c1a3d', border: '1px solid #1e3a5f', borderRadius: '9999px', padding: '0.375rem 1rem', fontSize: '0.8rem', color: '#60a5fa', marginBottom: '1.5rem' }}>
            <span style={{ width: 6, height: 6, background: '#4ade80', borderRadius: '50%', display: 'inline-block' }}></span>
            Phase 0 — Live Demo
          </div>
          
          <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: '1.5rem', maxWidth: 800, margin: '0 auto 1.5rem' }}>
            Invest in <span style={{ color: '#2563eb' }}>Real Commerce</span>.<br />Earn Real Returns.
          </h1>
          
          <p style={{ fontSize: '1.125rem', color: '#a1a1aa', maxWidth: 560, margin: '0 auto 2.5rem', lineHeight: 1.7 }}>
            Ordano lets retail investors fund purchase order financing for verified businesses. 
            Earn 10–15% returns on short-duration trades — fully collateralized, fully transparent.
          </p>
          
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/auth/signup" className="btn-primary" style={{ padding: '0.875rem 2rem', fontSize: '1rem' }}>
              Start Investing →
            </Link>
            <Link href="/marketplace" className="btn-secondary" style={{ padding: '0.875rem 2rem', fontSize: '1rem' }}>
              View Opportunities
            </Link>
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section style={{ padding: '4rem 0' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {[
              {
                icon: '💰',
                title: '10–15% Expected Returns',
                desc: 'Short-duration trades (45–120 days) with clear return rates. No hidden fees, no vague promises.'
              },
              {
                icon: '🛡️',
                title: 'Fully Collateralized',
                desc: 'Every purchase order is backed by the goods being traded. Your capital is protected by real assets.'
              },
              {
                icon: '⚡',
                title: 'Short Duration',
                desc: 'Trade terms of 45–120 days. Your capital isn\'t locked up for years — it rotates and compounds.'
              },
              {
                icon: '📊',
                title: 'Transparent Reporting',
                desc: 'See exactly which orders are funded, their status, and your returns in real time via your portfolio dashboard.'
              },
              {
                icon: '🔒',
                title: 'Risk-Graded Opportunities',
                desc: 'Every PO is risk-assessed (A/B/C grades). You choose your risk level and expected return.'
              },
              {
                icon: '🌍',
                title: 'ZAR-Native Platform',
                desc: 'Built for South African investors. Paystack-powered deposits and withdrawals in ZAR.'
              }
            ].map((prop, i) => (
              <div key={i} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.75rem' }}>{prop.icon}</span>
                <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>{prop.title}</h3>
                <p style={{ color: '#a1a1aa', fontSize: '0.875rem', lineHeight: 1.6 }}>{prop.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section style={{ padding: '4rem 0', background: '#111113', borderTop: '1px solid #1c1c1e', borderBottom: '1px solid #1c1c1e' }}>
        <div className="container">
          <h2 style={{ fontSize: '2rem', fontWeight: 800, textAlign: 'center', marginBottom: '3rem', letterSpacing: '-0.02em' }}>How It Works</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', textAlign: 'center' }}>
            {[
              { step: '01', title: 'Sign Up & Verify', desc: 'Create your account and complete quick KYC verification in minutes.' },
              { step: '02', title: 'Fund Your Wallet', desc: 'Deposit ZAR into your Ordano wallet via Paystack (test mode).' },
              { step: '03', title: 'Browse & Invest', desc: 'Explore rated purchase orders and invest in the ones that fit your strategy.' },
              { step: '04', title: 'Earn Returns', desc: 'Receive principal + return when the trade completes. Reinvest or withdraw.' }
            ].map((item, i) => (
              <div key={i} style={{ position: 'relative' }}>
                <div style={{ fontSize: '3rem', fontWeight: 800, color: '#2563eb', opacity: 0.3, marginBottom: '0.5rem' }}>{item.step}</div>
                <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>{item.title}</h3>
                <p style={{ color: '#a1a1aa', fontSize: '0.875rem' }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={{ padding: '4rem 0' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '2rem', textAlign: 'center' }}>
            {[
              { value: '5', label: 'Live Opportunities' },
              { value: '10.5–15%', label: 'Expected Returns' },
              { value: '45–120d', label: 'Trade Durations' },
              { value: 'ZAR', label: 'Currency' }
            ].map((stat, i) => (
              <div key={i}>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#2563eb' }}>{stat.value}</div>
                <div style={{ color: '#a1a1aa', fontSize: '0.875rem', marginTop: '0.25rem' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '5rem 0', textAlign: 'center' }}>
        <div className="container">
          <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1rem' }}>Ready to start investing?</h2>
          <p style={{ color: '#a1a1aa', marginBottom: '2rem' }}>Join the waitlist or sign up for Phase 0 access today.</p>
          <Link href="/auth/signup" className="btn-primary" style={{ padding: '0.875rem 2.5rem', fontSize: '1rem' }}>
            Create Free Account →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #1c1c1e', padding: '2rem 0', textAlign: 'center' }}>
        <div className="container">
          <p style={{ color: '#52525b', fontSize: '0.8rem' }}>© 2026 Ordano (Pty) Ltd. Phase 0 prototype — test mode only. Not financial advice.</p>
        </div>
      </footer>
    </div>
  )
}

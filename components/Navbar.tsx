'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Navbar() {
  const [session, setSession] = useState<any>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <nav style={{ background: '#09090b', borderBottom: '1px solid #27272a' }} className="sticky top-0 z-50">
      <div className="container">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div style={{ width: 32, height: 32, background: '#2563eb', borderRadius: 8 }}>
              <div style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 }}>O</div>
            </div>
            <span style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>Ordano</span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            {session ? (
              <>
                <Link href="/marketplace" style={{ color: '#a1a1aa', fontSize: '0.9rem', fontWeight: 500 }}>Marketplace</Link>
                <Link href="/portfolio" style={{ color: '#a1a1aa', fontSize: '0.9rem', fontWeight: 500 }}>Portfolio</Link>
                <Link href="/dashboard" style={{ color: '#a1a1aa', fontSize: '0.9rem', fontWeight: 500 }}>Dashboard</Link>
                <Link href="/settings" style={{ color: '#a1a1aa', fontSize: '0.9rem', fontWeight: 500 }}>Settings</Link>
                <button onClick={handleLogout} className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>Sign Out</button>
              </>
            ) : (
              <>
                <Link href="/auth/login" style={{ color: '#a1a1aa', fontSize: '0.9rem', fontWeight: 500 }}>Sign In</Link>
                <Link href="/auth/signup" className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>Get Started</Link>
              </>
            )}
          </div>

          <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
              {menuOpen ? (
                <><path d="M6 6l12 12M6 18L18 6" /></>
              ) : (
                <><path d="M4 6h16M4 12h16M4 18h16" /></>
              )}
            </svg>
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden pb-4 flex flex-col gap-3">
            {session ? (
              <>
                <Link href="/marketplace" onClick={() => setMenuOpen(false)} style={{ color: '#a1a1aa', padding: '0.5rem 0' }}>Marketplace</Link>
                <Link href="/portfolio" onClick={() => setMenuOpen(false)} style={{ color: '#a1a1aa', padding: '0.5rem 0' }}>Portfolio</Link>
                <Link href="/dashboard" onClick={() => setMenuOpen(false)} style={{ color: '#a1a1aa', padding: '0.5rem 0' }}>Dashboard</Link>
                <Link href="/settings" onClick={() => setMenuOpen(false)} style={{ color: '#a1a1aa', padding: '0.5rem 0' }}>Settings</Link>
                <button onClick={handleLogout} className="btn-secondary w-full">Sign Out</button>
              </>
            ) : (
              <>
                <Link href="/auth/login" onClick={() => setMenuOpen(false)} style={{ color: '#a1a1aa', padding: '0.5rem 0' }}>Sign In</Link>
                <Link href="/auth/signup" onClick={() => setMenuOpen(false)} className="btn-primary w-fit">Get Started</Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}

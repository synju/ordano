import Link from 'next/link'
import Navbar from '@/components/Navbar'

export default function VerifyEmailPage() {
  return (
    <div style={{ background: '#09090b', minHeight: '100vh' }}>
      <Navbar />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 1.5rem' }}>
        <div className="card" style={{ width: '100%', maxWidth: 480, textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📧</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem' }}>Check your email</h1>
          <p style={{ color: '#a1a1aa', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            We&apos;ve sent a verification link to your email address. Click the link in the email to verify your account, then continue to your dashboard.
          </p>
          <p style={{ color: '#71717a', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
            Don&apos;t see the email? Check your spam folder.
          </p>
          <Link href="/auth/login" className="btn-secondary" style={{ justifyContent: 'center' }}>
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}

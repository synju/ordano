import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { po_id, amount_cents, email } = await request.json()

    if (!po_id || !amount_cents || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Create Paystack inline payment reference
    const reference = `INV_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const amount_kobo = amount_cents * 100 // Paystack uses kobo/kobo

    const paystackRes = await fetch('https://api.paystack.co/transaction/inline', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        amount: amount_kobo,
        reference,
        currency: 'ZAR',
        metadata: { po_id, type: 'investment' }
      })
    })

    const paystackData = await paystackRes.json()

    if (!paystackData.status) {
      return NextResponse.json({ error: paystackData.message || 'Paystack error' }, { status: 400 })
    }

    return NextResponse.json({
      authorization_url: paystackData.data.authorization_url,
      reference
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

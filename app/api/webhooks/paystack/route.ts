import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-paystack-signature')

    // Verify webhook signature in production
    // const hash = crypto.createHmac('sha512', process.env.PAYSTACK_WEBHOOK_SECRET!).update(body).digest('hex')
    // if (hash !== signature) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })

    const event = JSON.parse(body)

    if (event.event === 'charge.success') {
      const { reference, metadata, amount } = event.data
      const { po_id } = metadata

      if (!po_id) {
        return NextResponse.json({ received: true })
      }

      const amount_cents = Math.round(amount / 100)

      // Find investor by email
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', event.data.customer.email)
        .limit(1)

      const investorId = profiles?.[0]?.id
      if (!investorId) {
        return NextResponse.json({ error: 'Investor not found' }, { status: 404 })
      }

      // Create funding
      const { data: funding, error: fundError } = await supabaseAdmin
        .from('po_fundings')
        .insert({ po_id, investor_id: investorId, amount_cents })
        .select()
        .single()

      if (fundError) {
        console.error('Fund error:', fundError)
        return NextResponse.json({ error: fundError.message }, { status: 500 })
      }

      // Deduct from wallet
      const { data: wallet } = await supabaseAdmin
        .from('investor_wallets')
        .select('balance_cents')
        .eq('investor_id', investorId)
        .single()

      await supabaseAdmin
        .from('investor_wallets')
        .update({ balance_cents: Math.max(0, (wallet?.balance_cents || 0) - amount_cents) })
        .eq('investor_id', investorId)

      // Create investment transaction
      await supabaseAdmin
        .from('wallet_transactions')
        .insert({
          investor_id: investorId,
          type: 'investment',
          amount_cents: -amount_cents,
          reference_type: 'po_funding',
          reference_id: funding.id,
          description: `Investment via Paystack`
        })
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

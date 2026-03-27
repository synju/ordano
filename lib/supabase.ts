import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export type Profile = {
  id: string
  email: string | null
  full_name: string | null
  kyc_status: 'pending' | 'approved' | 'rejected'
  kyc_onfido_ref: string | null
  created_at: string
  updated_at: string
}

export type PurchaseOrder = {
  id: string
  identifier: string
  supplier_name: string
  buyer_name: string
  po_amount_cents: number
  return_rate_bps: number
  duration_days: number
  risk_grade: 'A' | 'B' | 'C'
  status: 'listed' | 'funded' | 'active' | 'repaid' | 'defaulted'
  description: string | null
  listed_at: string
  funded_at: string | null
  repaid_at: string | null
  default_at: string | null
  created_at: string
  updated_at: string
}

export type POFunding = {
  id: string
  po_id: string
  investor_id: string
  amount_cents: number
  invested_at: string
  status: 'active' | 'returned' | 'defaulted'
  returned_at: string | null
  return_amount_cents: number | null
}

export type WalletTransaction = {
  id: string
  investor_id: string
  type: 'deposit' | 'investment' | 'distribution' | 'withdrawal'
  amount_cents: number
  reference_type: string | null
  reference_id: string | null
  description: string | null
  created_at: string
}

export type InvestorWallet = {
  id: string
  investor_id: string
  balance_cents: number
  updated_at: string
}

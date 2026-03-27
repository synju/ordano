-- Ordano Phase 0 Database Schema
-- Run this in Supabase SQL Editor: https://vbtsqnkbcyxisorvznji.supabase.co/project/default/sql

-- Enable UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── profiles ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  kyc_status TEXT DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'approved', 'rejected')),
  kyc_onfido_ref TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── purchase_orders ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT UNIQUE NOT NULL,
  supplier_name TEXT NOT NULL,
  buyer_name TEXT NOT NULL,
  po_amount_cents BIGINT NOT NULL,
  return_rate_bps INTEGER NOT NULL,
  duration_days INTEGER NOT NULL,
  risk_grade TEXT NOT NULL CHECK (risk_grade IN ('A', 'B', 'C')),
  status TEXT DEFAULT 'listed' CHECK (status IN ('listed', 'funded', 'active', 'repaid', 'defaulted')),
  description TEXT,
  listed_at TIMESTAMPTZ DEFAULT now(),
  funded_at TIMESTAMPTZ,
  repaid_at TIMESTAMPTZ,
  default_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── investor_wallets ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS investor_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  balance_cents BIGINT DEFAULT 0 NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-create wallet when profile is created
CREATE OR REPLACE FUNCTION public.handle_new_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.investor_wallets (investor_id, balance_cents)
  VALUES (NEW.id, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_created ON profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile();

-- ─── po_fundings ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS po_fundings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  investor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount_cents BIGINT NOT NULL,
  invested_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'returned', 'defaulted')),
  returned_at TIMESTAMPTZ,
  return_amount_cents BIGINT,
  UNIQUE(po_id, investor_id)
);

-- ─── wallet_transactions ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'investment', 'distribution', 'withdrawal')),
  amount_cents BIGINT NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Indexes ────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_po_fundings_investor ON po_fundings(investor_id);
CREATE INDEX IF NOT EXISTS idx_po_fundings_po ON po_fundings(po_id);
CREATE INDEX IF NOT EXISTS idx_wallet_txn_investor ON wallet_transactions(investor_id);
CREATE INDEX IF NOT EXISTS idx_wallet_txn_created ON wallet_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);

-- ─── Seed Data ──────────────────────────────────────────────────────────────────
INSERT INTO purchase_orders (identifier, supplier_name, buyer_name, po_amount_cents, return_rate_bps, duration_days, risk_grade, status, description) VALUES
  ('PO-001', 'Apex Electronics Ltd', 'Meridian Retail Group', 5000000, 1150, 60, 'A', 'listed', 'Consumer electronics bulk order. 30-day payment history with buyer. Secured by inventory.'),
  ('PO-002', 'Nordic Textiles Co', 'Atlantic Fashion House', 2500000, 1320, 90, 'B', 'listed', 'Seasonal apparel order. Repeat customer with established terms.'),
  ('PO-003', 'Coastal Foods Inc', 'Pacific Grocery Co', 10000000, 1500, 120, 'C', 'listed', 'Perishable goods supply contract. Shorter cycle, higher rate to offset risk.'),
  ('PO-004', 'Meridian Steel Works', 'Continental Construction', 7500000, 1280, 75, 'B', 'listed', 'Structural steel for commercial project. Fixed-asset backed.'),
  ('PO-005', 'GreenPack Packaging', 'Organic Life Brands', 1500000, 1050, 45, 'A', 'listed', 'Sustainable packaging for FMCG client. Repeat supplier relationship.')
ON CONFLICT (identifier) DO NOTHING;

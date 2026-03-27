# Ordano — Phase 0 Prototype Specification
**Version:** 1.0  
**Date:** 2026-03-27  
**Status:** Ready for Development  
**Author:** Peach (CEO)

---

## 1. Overview

### 1.1 What This Is

Phase 0 is a fully functional investor-facing web application demonstrating the end-to-end experience of investing in purchase order (PO) financing — using real UI, real flows, real payment integration, but simulated (test-mode) money.

It is not a mockup. Every button works. Every flow completes. The data is fake but the experience is real.

### 1.2 What This Is Not

- No real money moves (Paystack test mode only — same API as Stripe, ZAR-native)
- No real bank accounts (Synapse/Evolve not connected)
- No real KYC verification (simulated KYC form — no external API needed for Phase 0)
- POs are seeded by admin, not real borrowers

### 1.3 Goals

1. Demonstrate the full investor journey from sign-up to repayment
2. Collect real investor waitlist sign-ups (email capture)
3. Provide a live URL for investor/partner demos
4. Anchor a fundraise pitch to a working product

---

## 2. Product Name & Brand

**Name:** Ordano  
**Tagline:** _Invest in real commerce._  
**Domain:** ordano.com (to be registered)  
**Tone:** Trustworthy, modern, premium. Not playful, not corporate. Think the financial product equivalent of a premium consumer app.

---

## 3. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | Next.js 14 (App Router) | Hosted on Vercel (free) |
| Backend | Next.js API Routes + Server Actions | No separate server needed |
| Database | Supabase (PostgreSQL free tier) | Auth, DB, Storage all included |
| Payments | Paystack (test mode) | Free — Stripe-owned, ZAR-native, works in SA |
| KYC | Simulated (Phase 0) | No external API — form mimics KYC UX, always approves |
| Email | Resend (free tier) | Or AWS SES |
| Hosting | Vercel (free) | Next.js optimized |
| Domain | ordano.com | To be registered |

---

## 4. User Flows

### 4.1 Investor Sign-Up

```
Landing Page → "Get Started" → Email + Password → Email Verification → KYC Start
```

- Landing page: Hero with tagline, value prop (5 bullet points), CTA
- Auth: Email/password via Supabase Auth
- Email verification required before KYC
- On KYC start: redirect to Onfido SDK flow (sandbox — always passes)
- Post-KYC: redirect to investor dashboard with "KYC Pending" → "KYC Approved" state change

### 4.2 KYC Flow (Onfido Sandbox)

```
1. Applicant enters basic info (first name, last name, email, DOB)
2. Upload government ID (drivers licence or passport)
3. Take selfie
4. Onfido sandbox returns "clear" result automatically
5. Platform marks user as KYC_APPROVED
```

Note: In sandbox, Onfido approves 100% of cases. Real Onfido account would require review logic.

### 4.3 PO Marketplace (Browse POs)

```
Dashboard → "Browse Investments" → PO Listing Page → PO Detail → Invest
```

**PO Card shows:**
- Supplier name (fake company name)
- PO amount ($XX,XXX)
- Return rate (e.g. 12.5% p.a.)
- Duration (e.g. 90 days)
- Risk grade (A / B / C)
- Funding progress bar (e.g. 65% funded)
- "Expected return: $XXX"

**PO Detail Page shows:**
- All card fields with full descriptions
- Financial summary table
- "How it works" explainer
- "Invest" button → amount selection modal

### 4.4 Investment Flow

```
PO Detail → "Invest" → Amount Modal → Confirm → Paystack Checkout (test) → Success
```

1. Investor enters investment amount (minimum $50)
2. Modal shows projected return calculation
3. "Confirm Investment" → creates Paystack checkout session (test mode)
4. Paystack test card UI shown (test card: 4242 4242 4242 4242)
5. On success: webhook updates investor wallet, PO funding record created
6. Redirect to portfolio with success state

**Paystack Test Card:**
- Number: 4242 4242 4242 4242
- Expiry: Any future date
- CVC: Any 3 digits
- Postcode: Any 5 digits

### 4.5 Investor Dashboard

```
Portfolio Overview | Transaction History | KYC Status
```

**Portfolio Overview:**
- Total invested (sum of all po_fundings.amount_cents)
- Total expected return
- Number of active POs
- Wallet balance (simulated)

**Transaction History:**
- All wallet_transactions: deposits, investments, distributions
- Filterable by type and date

**KYC Status Badge:**
- KYC Pending (yellow)
- KYC Approved (green)
- KYC Failed (red — only if sandbox returns fail)

### 4.6 Repayment Simulation (Admin-Triggered)

For Phase 0, repayments are simulated manually by an admin action:
- Admin panel (simple, separate route /admin)
- Lists all funded POs
- "Simulate Repayment" button on each
- Triggers: updates PO status to REPAID, creates distribution wallet_transaction for each investor proportionally

---

## 5. Data Model

All tables in Supabase (PostgreSQL).

```sql
-- users: extends Supabase auth.users
profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT,
  full_name TEXT,
  kyc_status TEXT DEFAULT 'pending', -- pending | approved | rejected
  kyc_onfido_ref TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
)

-- PO financing specific
purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT,           -- e.g. "PO-001"
  supplier_name TEXT,
  buyer_name TEXT,
  po_amount_cents BIGINT,
  return_rate_bps INT,        -- basis points, e.g. 1250 = 12.50%
  duration_days INT,
  risk_grade TEXT,            -- A | B | C
  status TEXT DEFAULT 'listed', -- listed | funded | active | repaid | defaulted
  description TEXT,
  listed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
)

po_fundings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID REFERENCES purchase_orders(id),
  investor_id UUID REFERENCES profiles(id),
  amount_cents BIGINT,
  invested_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'active', -- active | returned | defaulted
  returned_at TIMESTAMPTZ,
  return_amount_cents BIGINT
)

wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID REFERENCES profiles(id),
  type TEXT, -- deposit | investment | distribution | withdrawal
  amount_cents BIGINT,         -- positive for credits, negative for debits
  reference_type TEXT,          -- po_funding | po_repayment | wallet
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
)

investor_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID UNIQUE REFERENCES profiles(id),
  balance_cents BIGINT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
)
```

---

## 6. API Endpoints

### Public
- `POST /api/auth/signup` — Register new investor
- `POST /api/auth/login` — Login
- `GET /api/auth/session` — Get current session

### Investor (authenticated)
- `GET /api/profile` — Get current user profile + KYC status
- `PATCH /api/profile` — Update profile
- `GET /api/purchase-orders` — List all listed POs
- `GET /api/purchase-orders/[id]` — PO detail
- `POST /api/invest` — Create investment (creates Paystack Checkout session)
- `GET /api/portfolio` — Investor's portfolio summary
- `GET /api/transactions` — Investor's transaction history
- `GET /api/wallet` — Investor's wallet balance

### Webhooks
- `POST /api/webhooks/paystack` — Paystack webhook (payment success)

### Admin (simple auth)
- `GET /api/admin/purchase-orders` — List all POs (admin view)
- `POST /api/admin/purchase-orders` — Create a PO (seed data)
- `POST /api/admin/simulate-repayment/[po_id]` — Trigger repayment simulation

---

## 7. Pages

| Route | Description |
|---|---|
| `/` | Landing page |
| `/auth/login` | Login |
| `/auth/signup` | Sign up |
| `/auth/verify-email` | Email verification notice |
| `/dashboard` | Investor dashboard (portfolio overview) |
| `/marketplace` | Browse all POs |
| `/marketplace/[id]` | PO detail + invest flow |
| `/portfolio` | Full portfolio + transaction history |
| `/settings` | Profile + KYC status |
| `/admin` | Admin panel (PO management + repayment simulation) |

---

## 8. Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Paystack (test mode)
PAYSTACK_PUBLIC_KEY=        # pk_test_... (get from Paystack dashboard > Settings > API Keys)
PAYSTACK_SECRET_KEY=        # sk_test_... (get from Paystack dashboard > Settings > API Keys)
PAYSTACK_WEBHOOK_SECRET=   # from Paystack dashboard > Settings > API Keys & Webhooks

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 9. Seed Data

Seed 5 POs on first deploy:

| ID | Supplier | Amount | Return | Duration | Risk |
|---|---|---|---|---|---|
| PO-001 | Apex Electronics Ltd | $50,000 | 11.5% | 60 days | A |
| PO-002 | Nordic Textiles Co | $25,000 | 13.2% | 90 days | B |
| PO-003 | Coastal Foods Inc | $100,000 | 15.0% | 120 days | C |
| PO-004 | Meridian Steel Works | $75,000 | 12.8% | 75 days | B |
| PO-005 | GreenPack Packaging | $15,000 | 10.5% | 45 days | A |

---

## 10. Development Timeline

| Week | Deliverable |
|---|---|
| 1 | Repo setup, Supabase project, Next.js app, env vars, auth flow, landing page |
| 2 | KYC flow (Onfido sandbox), profile page, dashboard |
| 3 | PO marketplace, PO detail page, Paystack Checkout integration |
| 4 | Portfolio page, transaction history, wallet display |
| 5 | Admin panel, repayment simulation, seed data |
| 6 | Email notifications (Resend), final QA, domain setup, Vercel deploy |

---

## 11. What the Developer Needs

- Access to the GitHub repo (provided)
- Supabase account (I will create the project, need Charlie's email for invite)
- Paystack test mode keys (✓ Charlie has registered — keys secured at ordano-paystack-keys.env)
- Onfido sandbox keys (needs human to register — link provided)
- This spec document

I will prepare the Supabase project myself. Charlie needs to: (1) confirm Paystack keys received ✓, (2) check the repo.

**Paystack test keys are:** `sk_test_...` and `pk_test_...` (same format as Stripe)  
**All Onfido sandbox keys** are available immediately after signup at dashboard.onfido.com

---

## 12. Next Steps After Phase 0

- Collect waitlist sign-ups from landing page
- Pitch to angels/family office with live URL
- Raise pre-seed ($100K–$250K)
- Engage Evolve Bank + Synapse for real payment rails
- Move to Reg CF raise

---

_End of Phase 0 Specification — Ordano_

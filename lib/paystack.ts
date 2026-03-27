const PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY!

export interface PaystackInitializeData {
  reference: string
  access_code: string
  authorization_url: string
}

export interface PaystackTransaction {
  id: number
  domain: string
  status: string
  reference: string
  amount: number
  currency: string
}

declare global {
  interface Window {
    PaystackPop: {
      setup: (config: PaystackConfig) => PaystackInstance
    }
  }
}

interface PaystackConfig {
  key: string
  email: string
  amount: number
  currency?: string
  ref?: string
  callback: (response: { reference: string; status: string; trans: string; transaction: string }) => void
  onClose?: () => void
}

interface PaystackInstance {
  openIframe: () => void
}

export function loadPaystack(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.PaystackPop) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = 'https://js.paystack.co/v3/inline.js'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Paystack'))
    document.head.appendChild(script)
  })
}

export { PAYSTACK_PUBLIC_KEY }

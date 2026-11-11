import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', CAD: 'CA$', AUD: 'A$', AED: 'AED ', INR: '₹',
}

export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const { data: invoice, error } = await supabase.rpc('get_public_invoice', { p_token: token })

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 text-center font-sans">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-md w-full shadow-xl">
          <h1 className="text-xl font-bold text-red-400 mb-2">Invoice Not Found</h1>
          <p className="text-slate-400 text-sm mb-6">
            This invoice link has expired or the token is invalid.
          </p>
          <Link href="/" className="inline-block bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
            Go to Home
          </Link>
        </div>
      </div>
    )
  }

  const rawCurrency = (invoice.currency || 'INR').toUpperCase()
  const isINR = rawCurrency === 'INR'
  const currencySymbol = CURRENCY_SYMBOLS[rawCurrency] || `${rawCurrency} `
  const isPaid = invoice.status === 'paid'
  const businessName = invoice.business_name || 'Merchant'
  const invoiceAmount = Number(invoice.amount || invoice.total || 0)

  const upiId = invoice.upi_id || ''
  const upiLink = upiId && isINR
    ? `upi://pay?pa=${upiId}&pn=${encodeURIComponent(businessName)}&am=${invoiceAmount.toFixed(2)}&tn=${encodeURIComponent('Invoice_' + invoice.invoice_number)}`
    : ''
  const qrCodeUrl = upiLink
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiLink)}`
    : null

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 font-sans flex flex-col items-center justify-center print:bg-white print:text-black print:p-0">
      <style>{`
        @media print {
          body { background: #ffffff !important; color: #000000 !important; }
          .print-hidden { display: none !important; }
          .invoice-card {
            border: 1px solid #e5e7eb !important;
            box-shadow: none !important;
            background: #ffffff !important;
            color: #000000 !important;
            max-width: 100% !important;
            width: 100% !important;
          }
          .invoice-card * {
            color: #111827 !important;
            border-color: #e5e7eb !important;
            background: transparent !important;
          }
        }
      `}</style>

      <div className="max-w-lg w-full flex justify-between items-center mb-4 px-2 print-hidden">
        <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">
          Verified Commercial Invoice
        </span>
        <button
          id="print-btn"
          className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium py-1.5 px-3.5 rounded-lg transition active:scale-95 shadow-sm"
        >
          🖨️ Print / Save PDF
        </button>
      </div>

      <div className="invoice-card max-w-lg w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex justify-between items-start border-b border-slate-800 pb-5">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">{businessName}</h1>
            <p className="text-xs text-slate-400 mt-1">Invoice #{invoice.invoice_number}</p>
            {invoice.tax_id && (
              <p className="text-[11px] font-mono text-slate-500 mt-0.5">Tax/VAT ID: {invoice.tax_id}</p>
            )}
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
              isPaid
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}
          >
            {invoice.status}
          </span>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Billed To</span>
            <span className="font-medium text-white">{invoice.client}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Due Date</span>
            <span className="font-medium text-white">{invoice.due_date || 'On Receipt'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Currency</span>
            <span className="font-medium font-mono text-white">{rawCurrency}</span>
          </div>
          <div className="border-t border-slate-800 pt-3 flex justify-between items-baseline">
            <span className="text-base text-slate-300 font-medium">Total Amount</span>
            <span className="text-2xl font-extrabold text-white">
              {currencySymbol}
              {invoiceAmount.toLocaleString(isINR ? 'en-IN' : 'en-US', { minimumFractionDigits: isINR ? 0 : 2 })}
            </span>
          </div>
        </div>

        {!isPaid ? (
          <div className="space-y-4 print-hidden">
            {isINR && upiId ? (
              <div className="flex flex-col items-center bg-slate-950/40 border border-slate-800 rounded-2xl p-6 text-center space-y-4">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Scan to Pay via UPI</p>
                {qrCodeUrl && (
                  <div className="bg-white p-3 rounded-xl shadow-md">
                    <img src={qrCodeUrl} alt="UPI QR Code" className="w-44 h-44 rounded-lg" />
                  </div>
                )}
                <p className="text-xs text-slate-400">
                  UPI ID: <span className="font-mono text-slate-200">{upiId}</span>
                </p>
                <a
                  href={upiLink}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-4 rounded-xl text-sm transition sm:hidden"
                >
                  Pay via UPI App (GPay / PhonePe)
                </a>
              </div>
            ) : (
              <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-5 text-center space-y-2">
                <div className="w-9 h-9 mx-auto rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-sm">
                  {currencySymbol.trim()}
                </div>
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                  Global Export Invoice ({rawCurrency})
                </h3>
                <p className="text-xs text-slate-400">
                  Zero-rated international service export. Please process payment via online gateway or wire transfer.
                </p>
              </div>
            )}

            {invoice.payment_link && (
              <a
                href={invoice.payment_link}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full block bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-4 rounded-xl text-center text-sm transition shadow-lg shadow-blue-900/20"
              >
                Pay via Online Card / Portal (Stripe / PayPal) →
              </a>
            )}
          </div>
        ) : (
          <div className="p-4 bg-emerald-950/30 border border-emerald-800/40 rounded-2xl text-center text-emerald-400 text-sm font-medium">
            ✓ This invoice has been successfully marked as paid.
          </div>
        )}

        <p className="text-center text-[11px] text-slate-500 pt-2">
          Secured & Powered by <span className="font-semibold text-slate-400">Invoice-OS Global</span>
        </p>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            const btn = document.getElementById('print-btn');
            if (btn) btn.addEventListener('click', () => window.print());
          `,
        }}
      />
    </div>
  )
                }

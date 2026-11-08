import { addDays, invoiceTotals, TODAY } from '@/lib/invoices'
import { formatCurrency, formatDate } from '@/lib/format'
import type { ParsedInvoice } from '@/lib/parse-invoice'
import { cn } from '@/lib/utils'

function Placeholder({ className }: { className?: string }) {
  return <span className={cn('inline-block h-3 rounded bg-neutral-200', className)} aria-hidden="true" />
}

function Field({ value, placeholder, className }: { value: React.ReactNode; placeholder: string; className?: string }) {
  if (value === null || value === undefined || value === '') {
    return (
      <>
        <Placeholder className={placeholder} />
        <span className="sr-only">Not yet specified</span>
      </>
    )
  }
  return (
    <span key={String(value)} className={cn('animate-in fade-in duration-300', className)}>
      {value}
    </span>
  )
}

type Props = {
  draft: ParsedInvoice
  number: string
  thinking: boolean
}

export function InvoicePreview({ draft, number, thinking }: Props) {
  const { subtotal, tax, total } = invoiceTotals({ items: draft.items, taxRate: draft.taxRate })
  const dueDate = draft.dueInDays !== null ? addDays(TODAY, draft.dueInDays) : null

  return (
    <article
      aria-label="Invoice preview"
      className="relative mx-auto flex aspect-[1/1.32] w-full max-w-[560px] flex-col overflow-hidden rounded-md bg-white p-8 text-neutral-900 shadow-2xl shadow-black/60 ring-1 ring-black/5 sm:p-10"
    >
      {thinking && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 animate-shimmer bg-[linear-gradient(110deg,transparent_30%,oklch(0.62_0.17_277/0.12)_50%,transparent_70%)] bg-[length:200%_100%]"
        />
      )}
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded bg-neutral-900 text-[10px] font-bold text-white">
              N
            </span>
            <span className="text-sm font-semibold">Northwind Studio</span>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-neutral-500">
            418 Market St, Suite 200
            <br />
            San Francisco, CA 94105
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold tracking-tight">Invoice</p>
          <p className="mt-1 font-mono text-xs text-neutral-500">{number}</p>
        </div>
      </header>

      <div className="mt-8 grid grid-cols-3 gap-4 text-xs">
        <div className="col-span-1 flex flex-col gap-1">
          <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">Billed to</p>
          <Field value={draft.clientName} placeholder="w-24" className="font-medium" />
          <Field value={draft.clientEmail} placeholder="w-28" className="truncate text-neutral-500" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">Issued</p>
          <span>{formatDate(TODAY, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">Due</p>
          <Field
            value={dueDate ? formatDate(dueDate, { month: 'short', day: 'numeric', year: 'numeric' }) : null}
            placeholder="w-20"
          />
          {draft.dueInDays !== null && (
            <span className="text-[10px] text-neutral-400">
              {draft.dueInDays === 0 ? 'On receipt' : `Net ${draft.dueInDays}`}
            </span>
          )}
        </div>
      </div>

      <table className="mt-8 w-full text-xs">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-[10px] tracking-wider text-neutral-400 uppercase">
            <th scope="col" className="pb-2 font-medium">Description</th>
            <th scope="col" className="pb-2 text-right font-medium">Qty</th>
            <th scope="col" className="pb-2 text-right font-medium">Rate</th>
            <th scope="col" className="pb-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {draft.items.length === 0 ? (
            <tr>
              <td className="py-3"><Placeholder className="w-36" /></td>
              <td className="py-3 text-right"><Placeholder className="w-4" /></td>
              <td className="py-3 text-right"><Placeholder className="w-12" /></td>
              <td className="py-3 text-right"><Placeholder className="w-14" /></td>
            </tr>
          ) : (
            draft.items.map((item, i) => (
              <tr
                key={`${i}-${item.description}-${item.unitPrice}`}
                className="animate-in fade-in slide-in-from-left-1 border-b border-neutral-100 duration-300"
              >
                <td className="py-3 pr-2 font-medium">{item.description}</td>
                <td className="py-3 text-right font-mono text-neutral-600">{item.quantity}</td>
                <td className="py-3 text-right font-mono text-neutral-600">{formatCurrency(item.unitPrice)}</td>
                <td className="py-3 text-right font-mono">{formatCurrency(item.quantity * item.unitPrice)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="mt-6 ml-auto flex w-1/2 min-w-48 flex-col gap-2 text-xs">
        <div className="flex justify-between text-neutral-500">
          <span>Subtotal</span>
          <span className="font-mono text-neutral-900">{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between text-neutral-500">
          <span>Tax {draft.taxRate ? `(${draft.taxRate}%)` : ''}</span>
          <span className="font-mono text-neutral-900">{formatCurrency(tax)}</span>
        </div>
        <div className="mt-1 flex items-baseline justify-between border-t border-neutral-900 pt-3">
          <span className="font-medium">Total due</span>
          <span key={total} className="animate-in fade-in font-mono text-lg font-semibold duration-300">
            {formatCurrency(total)}
          </span>
        </div>
      </div>

      <footer className="mt-auto flex items-end justify-between gap-4 border-t border-neutral-100 pt-5 text-[10px] text-neutral-400">
        <p className="max-w-[60%] leading-relaxed">
          {draft.notes ?? 'Thank you for your business. Pay online by card or ACH — reminders are sent automatically.'}
        </p>
        <span className="rounded bg-neutral-900 px-3 py-1.5 text-[11px] font-medium text-white">Pay {formatCurrency(total)}</span>
      </footer>
    </article>
  )
}

'use client'

import { AlertTriangle, ArrowUpRight, CircleDollarSign, Hourglass, ReceiptIndianRupee } from 'lucide-react'
import { daysBetween, invoiceTotals, TODAY, type Invoice } from '@/lib/invoices'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'

function BentoCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50 p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)] backdrop-blur-sm',
        className,
      )}
    >
      {children}
    </section>
  )
}

function CardLabel({ icon: Icon, children, tone }: { icon: typeof Hourglass; children: React.ReactNode; tone: string }) {
  return (
    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
      <span className={cn('flex size-6 items-center justify-center rounded-md border border-slate-700 bg-slate-800/80', tone)}>
        <Icon className="size-3.5" aria-hidden="true" />
      </span>
      {children}
    </div>
  )
}

function calculateMetrics(invoices: Invoice[], curr: string) {
  const currencyInvoices = invoices.filter(i => (i.currency || 'USD') === curr);
  const paid = currencyInvoices.filter(i => i.status === 'paid');
  const pending = currencyInvoices.filter(i => i.status === 'pending');
  const overdue = currencyInvoices.filter(i => i.status === 'overdue');
  
  const totalCollected = paid.reduce((s, i) => s + invoiceTotals(i).total, 0);
  const totalPending = pending.reduce((s, i) => s + invoiceTotals(i).total, 0);
  const totalOverdue = overdue.reduce((s, i) => s + invoiceTotals(i).total, 0);

  return { totalCollected, totalPending, totalOverdue, count: currencyInvoices.length, pendingCount: pending.length, overdue };
}

export function TotalCollectedCard({ invoices }: { invoices: Invoice[] }) {
  // Compute true collected totals straight from the database
  const usd = calculateMetrics(invoices, 'USD');
  const inr = calculateMetrics(invoices, 'INR');

  return (
    <BentoCard className="md:col-span-2">
      <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="relative flex h-full flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        
        {/* USD Revenue Block */}
        <div className="flex flex-col gap-3">
          <CardLabel icon={CircleDollarSign} tone="text-emerald-400">Global Collected (USD)</CardLabel>
          <p className="font-mono text-4xl font-semibold tracking-tight text-white">{formatCurrency(usd.totalCollected, 'USD')}</p>
          <p className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/10 px-1.5 py-0.5 font-medium text-emerald-400 border border-emerald-500/20">
              {usd.count} Invoices
            </span>
            Processed to date
          </p>
        </div>

        {/* Separator for Desktop */}
        <div className="hidden sm:block w-px h-full bg-slate-800" />
        
        {/* INR Revenue Block */}
        <div className="flex flex-col gap-3">
          <CardLabel icon={ReceiptIndianRupee} tone="text-emerald-400">Local Collected (INR)</CardLabel>
          <p className="font-mono text-4xl font-semibold tracking-tight text-white">{formatCurrency(inr.totalCollected, 'INR')}</p>
          <p className="flex items-center gap-1.5 text-xs text-slate-400">
             <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/10 px-1.5 py-0.5 font-medium text-emerald-400 border border-emerald-500/20">
              {inr.count} Invoices
            </span>
            Processed to date
          </p>
        </div>

      </div>
    </BentoCard>
  )
}

export function PendingCashflowCard({ invoices }: { invoices: Invoice[] }) {
  const usd = calculateMetrics(invoices, 'USD');
  const inr = calculateMetrics(invoices, 'INR');

  return (
    <BentoCard>
      <div className="flex h-full flex-col gap-3">
        <CardLabel icon={Hourglass} tone="text-amber-400">Pending Cashflow</CardLabel>
        
        <div className="mt-2 flex flex-col gap-2">
            <div className="flex justify-between items-baseline border-b border-slate-800 pb-2">
                <span className="text-xs text-slate-400">Global (USD)</span>
                <span className="font-mono text-xl font-semibold text-amber-400">{formatCurrency(usd.totalPending, 'USD')}</span>
            </div>
            <div className="flex justify-between items-baseline pt-1">
                <span className="text-xs text-slate-400">Local (INR)</span>
                <span className="font-mono text-xl font-semibold text-amber-400">{formatCurrency(inr.totalPending, 'INR')}</span>
            </div>
        </div>

        <div className="mt-auto">
           <p className="text-[11px] text-slate-500">
             {usd.pendingCount + inr.pendingCount} open invoices waiting on payment
           </p>
        </div>
      </div>
    </BentoCard>
  )
}

export function OverdueRiskCard({ invoices }: { invoices: Invoice[] }) {
  const overdue = invoices
    .filter((i) => i.status === 'overdue')
    .map((i) => ({ ...i, late: daysBetween(i.dueDate, TODAY), totalAmount: invoiceTotals(i).total }))
    .sort((a, b) => b.late - a.late)
    
  const totalUsdRisk = overdue.filter(i => (i.currency || 'USD') === 'USD').reduce((s, i) => s + i.totalAmount, 0)
  const totalInrRisk = overdue.filter(i => (i.currency || 'USD') === 'INR').reduce((s, i) => s + i.totalAmount, 0)

  return (
    <BentoCard className="border-red-500/20 bg-red-950/10">
      <div aria-hidden="true" className="pointer-events-none absolute -right-10 -bottom-16 size-40 rounded-full bg-red-500/10 blur-3xl" />
      <div className="relative flex h-full flex-col gap-3">
        <CardLabel icon={AlertTriangle} tone="text-red-400">Cashflow At Risk</CardLabel>
        
        {totalUsdRisk > 0 || totalInrRisk > 0 ? (
            <div className="flex flex-col gap-1 mt-1">
               {totalUsdRisk > 0 && <span className="font-mono text-2xl font-bold tracking-tight text-red-400">{formatCurrency(totalUsdRisk, 'USD')}</span>}
               {totalInrRisk > 0 && <span className="font-mono text-xl font-bold tracking-tight text-red-400">{formatCurrency(totalInrRisk, 'INR')}</span>}
            </div>
        ) : (
            <p className="font-mono text-2xl font-bold tracking-tight text-slate-600">Zero Risk</p>
        )}

        <ul className="mt-auto flex flex-col gap-1.5 pt-4">
          {overdue.slice(0, 3).map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate font-medium text-slate-300">{i.clientName}</span>
              <span className="shrink-0 rounded bg-red-500/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-red-400">
                {i.late}d LATE
              </span>
            </li>
          ))}
        </ul>
      </div>
    </BentoCard>
  )
}

export { BentoCard }

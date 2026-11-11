'use client'

import { ArrowRight, Mail } from 'lucide-react'
import { buildChaseSchedule, nextStep } from '@/lib/chase'
import { daysBetween, invoiceTotals, TODAY, type Invoice } from '@/lib/invoices'
import { formatCurrency, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { BentoCard, OverdueRiskCard, PendingCashflowCard, TotalCollectedCard } from './stat-cards'
import { RevenueChart } from './revenue-chart'
import { StatusBadge } from './status-badge'

type Props = {
  invoices: Invoice[]
  onOpenChase: () => void
}

function UpcomingChases({ invoices, onOpenChase }: Props) {
  const upcoming = invoices
    .filter((i) => i.status === 'pending' || i.status === 'overdue')
    .map((i) => ({ invoice: i, step: nextStep(buildChaseSchedule(i, false)) }))
    .filter((x): x is { invoice: Invoice; step: NonNullable<typeof x.step> } => Boolean(x.step))
    .sort((a, b) => a.step.date.localeCompare(b.step.date))
    .slice(0, 5)

  return (
    <BentoCard className="flex flex-col">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Next follow-ups</h2>
        <Mail className="size-4 text-muted-foreground" aria-hidden="true" />
      </div>
      <ol className="mt-4 flex flex-1 flex-col gap-3">
        {upcoming.map(({ invoice, step }) => {
          const inDays = daysBetween(TODAY, step.date)
          return (
            <li key={step.id} className="flex items-start gap-3">
              <span
                className={cn(
                  'mt-1.5 size-1.5 shrink-0 rounded-full',
                  step.tone === 'final' || step.tone === 'firm' ? 'bg-destructive' : 'bg-primary',
                )}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{invoice.clientName}</p>
                <p className="truncate text-xs text-muted-foreground">{step.label}</p>
              </div>
              <span className="shrink-0 font-mono text-xs text-muted-foreground">
                {inDays === 0 ? 'Today' : `in ${inDays}d`}
              </span>
            </li>
          )
        })}
      </ol>
      <button
        type="button"
        onClick={onOpenChase}
        className="mt-4 inline-flex items-center gap-1 self-start text-xs font-medium text-primary hover:underline"
      >
        Open Smart Chase <ArrowRight className="size-3" aria-hidden="true" />
      </button>
    </BentoCard>
  )
}

function RecentInvoices({ invoices }: { invoices: Invoice[] }) {
  return (
    <BentoCard className="p-0 md:col-span-4">
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <h2 className="text-sm font-medium">Recent invoices</h2>
        <span className="text-xs text-muted-foreground">{invoices.length} total</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-y border-border text-left text-xs text-muted-foreground">
              <th scope="col" className="px-5 py-2 font-medium">Invoice</th>
              <th scope="col" className="px-5 py-2 font-medium">Client</th>
              <th scope="col" className="px-5 py-2 font-medium">Status</th>
              <th scope="col" className="px-5 py-2 font-medium">Due</th>
              <th scope="col" className="px-5 py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoices.slice(0, 8).map((inv) => (
              <tr
                key={inv.id}
                className={cn(
                  'border-b border-border/60 transition-colors last:border-0 hover:bg-accent/40',
                  inv.isNew && 'animate-in fade-in slide-in-from-top-1 bg-primary/5',
                )}
              >
                <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                  {inv.number}
                  {inv.isNew && (
                    <span className="ml-2 rounded bg-primary/15 px-1.5 py-0.5 font-sans text-[10px] font-medium text-primary">
                      New
                    </span>
                  )}
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="flex size-6 items-center justify-center rounded-md bg-accent text-[10px] font-semibold"
                      aria-hidden="true"
                    >
                      {inv.clientName.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="truncate">{inv.clientName}</span>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <StatusBadge status={inv.status} />
                </td>
                <td className="px-5 py-3 text-muted-foreground">{formatDate(inv.dueDate)}</td>
                <td className="px-5 py-3 text-right font-mono font-medium">
                  {formatCurrency(invoiceTotals(inv).total, inv.currency || 'USD')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </BentoCard>
  )
}

export function OverviewView({ invoices, onOpenChase }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      <TotalCollectedCard invoices={invoices} />
      <PendingCashflowCard invoices={invoices} />
      <OverdueRiskCard invoices={invoices} />
      <RevenueChart invoices={invoices} />
      <UpcomingChases invoices={invoices} onOpenChase={onOpenChase} />
      <RecentInvoices invoices={invoices} />
    </div>
  )
                }

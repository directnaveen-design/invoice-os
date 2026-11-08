import { AlertTriangle, ArrowUpRight, CircleDollarSign, Hourglass } from 'lucide-react'
import { daysBetween, invoiceTotals, revenueSeries, TODAY, type Invoice } from '@/lib/invoices'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'

function BentoCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-[inset_0_1px_0_0_oklch(1_0_0/4%)]',
        className,
      )}
    >
      {children}
    </section>
  )
}

function CardLabel({ icon: Icon, children, tone }: { icon: typeof Hourglass; children: React.ReactNode; tone: string }) {
  return (
    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
      <span className={cn('flex size-6 items-center justify-center rounded-md border border-border bg-muted/60', tone)}>
        <Icon className="size-3.5" aria-hidden="true" />
      </span>
      {children}
    </div>
  )
}

export function TotalCollectedCard() {
  const total = revenueSeries.reduce((s, p) => s + p.collected, 0)
  const max = Math.max(...revenueSeries.map((p) => p.collected))
  const prev = revenueSeries.at(-3)!.collected
  const last = revenueSeries.at(-2)!.collected
  const growth = ((last - prev) / prev) * 100

  return (
    <BentoCard className="md:col-span-2">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-primary/20 blur-3xl"
      />
      <div className="relative flex h-full flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3">
          <CardLabel icon={CircleDollarSign} tone="text-success">
            Total collected · last 12 months
          </CardLabel>
          <p className="font-mono text-4xl font-semibold tracking-tight">{formatCurrency(total)}</p>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-0.5 rounded-full bg-success/10 px-1.5 py-0.5 font-medium text-success">
              <ArrowUpRight className="size-3" aria-hidden="true" />
              {growth.toFixed(1)}%
            </span>
            vs. September
          </p>
        </div>
        <div className="flex h-16 items-end gap-1" aria-hidden="true">
          {revenueSeries.map((p, i) => (
            <div
              key={p.month}
              className={cn(
                'w-2.5 rounded-sm',
                i === revenueSeries.length - 1 ? 'bg-primary/40' : i >= revenueSeries.length - 3 ? 'bg-primary' : 'bg-primary/25',
              )}
              style={{ height: `${(p.collected / max) * 100}%` }}
            />
          ))}
        </div>
      </div>
    </BentoCard>
  )
}

export function PendingCashflowCard({ invoices }: { invoices: Invoice[] }) {
  const pending = invoices.filter((i) => i.status === 'pending')
  const total = pending.reduce((s, i) => s + invoiceTotals(i).total, 0)
  const thisWeek = pending
    .filter((i) => daysBetween(TODAY, i.dueDate) <= 7)
    .reduce((s, i) => s + invoiceTotals(i).total, 0)
  const pct = total ? (thisWeek / total) * 100 : 0

  return (
    <BentoCard>
      <div className="flex h-full flex-col gap-3">
        <CardLabel icon={Hourglass} tone="text-warning">
          Pending cashflow
        </CardLabel>
        <p className="font-mono text-2xl font-semibold tracking-tight">{formatCurrency(total)}</p>
        <p className="text-xs text-muted-foreground">
          {pending.length} open invoice{pending.length === 1 ? '' : 's'}
        </p>
        <div className="mt-auto flex flex-col gap-2">
          <div
            className="flex h-1.5 overflow-hidden rounded-full bg-muted"
            role="img"
            aria-label={`${Math.round(pct)}% due within 7 days`}
          >
            <div className="h-full bg-warning" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>
              <span className="text-foreground">{formatCurrency(thisWeek, { compact: true })}</span> this week
            </span>
            <span>{formatCurrency(total - thisWeek, { compact: true })} later</span>
          </div>
        </div>
      </div>
    </BentoCard>
  )
}

export function OverdueRiskCard({ invoices }: { invoices: Invoice[] }) {
  const overdue = invoices
    .filter((i) => i.status === 'overdue')
    .map((i) => ({ ...i, late: daysBetween(i.dueDate, TODAY), total: invoiceTotals(i).total }))
    .sort((a, b) => b.late - a.late)
  const total = overdue.reduce((s, i) => s + i.total, 0)

  return (
    <BentoCard className="border-destructive/20">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -bottom-16 size-40 rounded-full bg-destructive/15 blur-3xl"
      />
      <div className="relative flex h-full flex-col gap-3">
        <CardLabel icon={AlertTriangle} tone="text-destructive">
          Overdue risk
        </CardLabel>
        <p className="font-mono text-2xl font-semibold tracking-tight text-destructive">{formatCurrency(total)}</p>
        <ul className="mt-auto flex flex-col gap-1.5">
          {overdue.slice(0, 3).map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate text-muted-foreground">{i.clientName}</span>
              <span className="shrink-0 font-mono text-destructive/90">{i.late}d late</span>
            </li>
          ))}
        </ul>
      </div>
    </BentoCard>
  )
}

export { BentoCard }

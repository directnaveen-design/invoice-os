'use client'

import { useMemo, useState } from 'react'
import { CalendarClock, CircleCheck, Eye, Mail, Pause, Play, Send } from 'lucide-react'
import { buildChaseSchedule, nextStep, type ChaseStep } from '@/lib/chase'
import { addDays, daysBetween, invoiceTotals, TODAY, type Invoice } from '@/lib/invoices'
import { formatCurrency, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { BentoCard } from '@/components/dashboard/stat-cards'

const stepStyles: Record<ChaseStep['status'], { ring: string; label: string }> = {
  sent: { ring: 'border-success/50 bg-success/15 text-success', label: 'Sent' },
  today: { ring: 'border-primary bg-primary text-primary-foreground shadow-[0_0_16px_-2px] shadow-primary/70', label: 'Sending today' },
  scheduled: { ring: 'border-border bg-card text-muted-foreground', label: 'Scheduled' },
  paused: { ring: 'border-dashed border-border bg-card text-muted-foreground/60', label: 'Paused' },
}

function StatusIcon({ status }: { status: ChaseStep['status'] }) {
  if (status === 'sent') return <CircleCheck className="size-3.5" aria-hidden="true" />
  if (status === 'today') return <Send className="size-3" aria-hidden="true" />
  if (status === 'paused') return <Pause className="size-3" aria-hidden="true" />
  return <CalendarClock className="size-3.5" aria-hidden="true" />
}

function Timeline({
  steps,
  selectedId,
  onSelect,
}: {
  steps: ChaseStep[]
  selectedId: string
  onSelect: (id: string) => void
}) {
  return (
    <ol className="relative flex flex-col">
      {steps.map((step, i) => {
        const s = stepStyles[step.status]
        const delta = daysBetween(TODAY, step.date)
        const selected = selectedId === step.id
        const prevSent = i > 0 && steps[i - 1].status === 'sent'
        return (
          <li key={step.id} className="relative flex gap-4 pb-2 last:pb-0">
            {i < steps.length - 1 && (
              <span
                aria-hidden="true"
                className={cn(
                  'absolute top-8 bottom-0 left-[13px] w-px',
                  step.status === 'sent' ? 'bg-success/40' : 'bg-border',
                )}
              />
            )}
            <span
              className={cn(
                'relative z-10 mt-1 flex size-7 shrink-0 items-center justify-center rounded-full border',
                s.ring,
                prevSent && step.status === 'today' && 'animate-pulse',
              )}
            >
              <StatusIcon status={step.status} />
            </span>
            <button
              type="button"
              onClick={() => onSelect(step.id)}
              aria-pressed={selected}
              className={cn(
                'flex min-w-0 flex-1 items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors',
                selected ? 'border-primary/40 bg-primary/5' : 'border-transparent hover:bg-accent/40',
              )}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{step.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {step.offset === 0 ? 'On due date' : step.offset < 0 ? `${-step.offset}d before due` : `${step.offset}d after due`}
                  {' · '}
                  {s.label}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="font-mono text-xs">{formatDate(step.date)}</span>
                {step.status === 'sent' ? (
                  <span className={cn('flex items-center gap-1 text-[11px]', step.opened ? 'text-success' : 'text-muted-foreground')}>
                    <Eye className="size-3" aria-hidden="true" />
                    {step.opened ? 'Opened' : 'Not opened'}
                  </span>
                ) : (
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {delta === 0 ? 'today' : `in ${delta}d`}
                  </span>
                )}
              </div>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

function EmailPreview({ step, invoice }: { step: ChaseStep; invoice: Invoice }) {
  return (
    <div className="rounded-lg border border-border bg-background/60">
      <div className="flex flex-col gap-1 border-b border-border px-4 py-3 text-xs">
        <p>
          <span className="text-muted-foreground">To </span>
          {invoice.clientEmail || 'billing contact'}
        </p>
        <p className="font-medium text-foreground">{step.subject}</p>
      </div>
      <div className="px-4 py-4 text-sm leading-relaxed whitespace-pre-line text-muted-foreground">{step.body}</div>
      <div className="px-4 pb-4">
        <span className="inline-flex rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
          Pay {formatCurrency(invoiceTotals(invoice).total)}
        </span>
      </div>
    </div>
  )
}

export function ChaseView({ invoices }: { invoices: Invoice[] }) {
  const unpaid = useMemo(
    () =>
      invoices
        .filter((i) => i.status === 'pending' || i.status === 'overdue')
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [invoices],
  )
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(unpaid[0]?.id)
  const [paused, setPaused] = useState<Set<string>>(new Set())
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null)

  const schedules = useMemo(
    () => new Map(unpaid.map((inv) => [inv.id, buildChaseSchedule(inv, paused.has(inv.id))])),
    [unpaid, paused],
  )

  const invoice = unpaid.find((i) => i.id === selectedInvoiceId) ?? unpaid[0]
  const steps = invoice ? schedules.get(invoice.id)! : []
  const selectedStep =
    steps.find((s) => s.id === selectedStepId) ?? nextStep(steps) ?? steps.at(-1)

  const weekEnd = addDays(TODAY, 7)
  const allSteps = [...schedules.values()].flat()
  const scheduledThisWeek = allSteps.filter((s) => (s.status === 'scheduled' || s.status === 'today') && s.date <= weekEnd).length
  const sent = allSteps.filter((s) => s.status === 'sent')
  const openRate = sent.length ? (sent.filter((s) => s.opened).length / sent.length) * 100 : 0
  const atStake = unpaid.reduce((s, i) => s + invoiceTotals(i).total, 0)

  function togglePause(id: string) {
    setPaused((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const stats = [
    { label: 'Active sequences', value: String(unpaid.length - paused.size) },
    { label: 'Sending this week', value: String(scheduledThisWeek) },
    { label: 'Email open rate', value: `${openRate.toFixed(0)}%` },
    { label: 'Balance being chased', value: formatCurrency(atStake) },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <BentoCard key={s.label} className="p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="mt-2 font-mono text-xl font-semibold tracking-tight">{s.value}</p>
          </BentoCard>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <BentoCard className="p-0 lg:col-span-2">
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <h2 className="text-sm font-medium">Unpaid invoices</h2>
            <span className="text-xs text-muted-foreground">{unpaid.length}</span>
          </div>
          <ul className="flex flex-col border-t border-border">
            {unpaid.map((inv) => {
              const sched = schedules.get(inv.id)!
              const sentCount = sched.filter((s) => s.status === 'sent').length
              const active = invoice?.id === inv.id
              const isPaused = paused.has(inv.id)
              return (
                <li key={inv.id} className="border-b border-border/60 last:border-0">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedInvoiceId(inv.id)
                      setSelectedStepId(null)
                    }}
                    aria-pressed={active}
                    className={cn(
                      'relative flex w-full flex-col gap-2.5 px-4 py-3 text-left transition-colors',
                      active ? 'bg-accent/60' : 'hover:bg-accent/30',
                    )}
                  >
                    {active && <span aria-hidden="true" className="absolute inset-y-0 left-0 w-0.5 bg-primary" />}
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">{inv.clientName}</span>
                      <span className="font-mono text-sm">{formatCurrency(invoiceTotals(inv).total)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={inv.status} />
                        <span className="font-mono text-[11px] text-muted-foreground">{inv.number}</span>
                      </div>
                      <div className="flex gap-1" aria-label={`${sentCount} of ${sched.length} reminders sent`}>
                        {sched.map((s) => (
                          <span
                            key={s.id}
                            className={cn(
                              'h-1 w-3 rounded-full',
                              s.status === 'sent' && 'bg-success',
                              s.status === 'today' && 'bg-primary',
                              s.status === 'scheduled' && 'bg-muted-foreground/30',
                              s.status === 'paused' && 'bg-muted-foreground/15',
                            )}
                          />
                        ))}
                      </div>
                    </div>
                    {isPaused && <span className="text-[11px] text-warning">Automation paused</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        </BentoCard>

        {invoice && selectedStep && (
          <BentoCard className="flex flex-col gap-5 lg:col-span-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-medium">Chase sequence · {invoice.clientName}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Due {formatDate(invoice.dueDate, { month: 'long', day: 'numeric' })} ·{' '}
                  {invoice.status === 'overdue'
                    ? `${daysBetween(invoice.dueDate, TODAY)} days overdue`
                    : `due in ${daysBetween(TODAY, invoice.dueDate)} days`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => togglePause(invoice.id)}
                aria-pressed={paused.has(invoice.id)}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
              >
                {paused.has(invoice.id) ? (
                  <>
                    <Play className="size-3" aria-hidden="true" /> Resume automation
                  </>
                ) : (
                  <>
                    <Pause className="size-3" aria-hidden="true" /> Pause automation
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              <Timeline steps={steps} selectedId={selectedStep.id} onSelect={setSelectedStepId} />
              <div className="flex flex-col gap-2">
                <p className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  <Mail className="size-3" aria-hidden="true" /> Email preview
                </p>
                <EmailPreview step={selectedStep} invoice={invoice} />
              </div>
            </div>
          </BentoCard>
        )}
      </div>
    </div>
  )
}

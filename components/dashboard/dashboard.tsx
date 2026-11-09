'use client'

import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import { Loader2, Plus, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { buildChaseSchedule } from '@/lib/chase'
import { addDays, TODAY, type Invoice } from '@/lib/invoices'
import { fetchInvoices, insertInvoice } from '@/lib/supabase/invoices'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ChaseView } from '@/components/chase/chase-view'
import { MagicInvoiceDrawer } from '@/components/invoice/magic-invoice-drawer'
import { AppSidebar, type View } from './app-sidebar'
import { OverviewView } from './overview-view'

const titles: Record<View, { title: string; subtitle: string }> = {
  overview: { title: 'Overview', subtitle: 'Cashflow at a glance' },
  chase: { title: 'Smart Chase', subtitle: 'Automated follow-ups for unpaid invoices' },
}

export function Dashboard() {
  const [view, setView] = useState<View>('overview')
  const { data: invoices = [], error: loadError, isLoading, mutate } = useSWR('invoices', fetchInvoices)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setDrawerOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const nextNumber = useMemo(() => {
    const max = Math.max(0, ...invoices.map((i) => Number(i.number.replace(/\D/g, '')) || 0))
    return `INV-${String(max + 1).padStart(4, '0')}`
  }, [invoices])

  const scheduledThisWeek = useMemo(() => {
    const weekEnd = addDays(TODAY, 7)
    return invoices
      .filter((i) => i.status === 'pending' || i.status === 'overdue')
      .flatMap((i) => buildChaseSchedule(i, false))
      .filter((s) => s.status !== 'sent' && s.date <= weekEnd).length
  }, [invoices])

  async function handleCreate(invoice: Invoice) {
    try {
      await insertInvoice(invoice)
    } catch (err) {
      toast.error('Could not save invoice', {
        description: err instanceof Error ? err.message : 'Supabase insert failed.',
      })
      return false
    }
    await mutate(
      async () => {
        const fresh = await fetchInvoices()
        return fresh.map((i) => (i.number === invoice.number ? { ...i, isNew: true } : i))
      },
      { optimisticData: [invoice, ...invoices], revalidate: false },
    )
    toast.success(`${invoice.number} created`, { description: `Chase scheduled for ${invoice.clientName}.` })
    setDrawerOpen(false)
    setView('overview')
    return true
  }

  const { title, subtitle } = titles[view]

  return (
    <div className="flex h-dvh overflow-hidden">
      <AppSidebar
        view={view}
        onViewChange={setView}
        onNewInvoice={() => setDrawerOpen(true)}
        scheduledThisWeek={scheduledThisWeek}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border px-4 md:px-6">
          <div className="flex min-w-0 items-baseline gap-3">
            <h1 className="text-sm font-semibold">{title}</h1>
            <p className="hidden truncate text-xs text-muted-foreground sm:block">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="ml-auto hidden w-72 items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground lg:flex"
          >
            <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
            <span className="flex-1 truncate text-left">Bill a client in plain English…</span>
            <kbd className="rounded border border-border bg-background px-1.5 font-mono text-[10px]">⌘K</kbd>
          </button>
          <span className="ml-auto hidden font-mono text-xs text-muted-foreground sm:inline lg:ml-0">
            {formatDate(TODAY, { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
          <Button size="sm" className="ml-auto sm:ml-0" onClick={() => setDrawerOpen(true)}>
            <Plus aria-hidden="true" />
            New invoice
          </Button>
        </header>

        <nav aria-label="Main" className="flex gap-1 border-b border-border px-4 py-2 md:hidden">
          {(Object.keys(titles) as View[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-current={view === v ? 'page' : undefined}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs',
                view === v ? 'bg-accent text-foreground' : 'text-muted-foreground',
              )}
            >
              {titles[v].title}
            </button>
          ))}
        </nav>

        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl p-4 md:p-6">
            {loadError ? (
              <div role="alert" className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {"Couldn't load invoices from Supabase: "}
                {loadError instanceof Error ? loadError.message : 'Unknown error'}
              </div>
            ) : isLoading ? (
              <p role="status" className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                Loading invoices…
              </p>
            ) : invoices.length === 0 ? (
              <p className="mb-4 rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                No invoices yet. Press ⌘K to create your first one.
              </p>
            ) : null}
            {view === 'overview' ? (
              <OverviewView invoices={invoices} onOpenChase={() => setView('chase')} />
            ) : (
              <ChaseView invoices={invoices} />
            )}
          </div>
        </main>
      </div>

      <MagicInvoiceDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        invoiceNumber={nextNumber}
        onCreate={handleCreate}
      />
    </div>
  )
}

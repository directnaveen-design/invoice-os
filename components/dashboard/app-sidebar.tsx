'use client'

import { BellRing, ChevronsUpDown, LayoutGrid, Sparkles, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

export type View = 'overview' | 'chase'

const nav: { id: View; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'chase', label: 'Smart Chase', icon: BellRing },
]

type Props = {
  view: View
  onViewChange: (v: View) => void
  onNewInvoice: () => void
  scheduledThisWeek: number
}

export function AppSidebar({ view, onViewChange, onNewInvoice, scheduledThisWeek }: Props) {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
      <div className="flex h-14 items-center gap-2.5 px-4">
        <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-[0_0_20px_-4px] shadow-primary/60">
          <Zap className="size-4" aria-hidden="true" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="truncate text-sm font-semibold">Ledgerline</span>
          <span className="truncate text-xs text-muted-foreground">Northwind Studio</span>
        </div>
        <ChevronsUpDown className="size-3.5 text-muted-foreground" aria-hidden="true" />
      </div>

      <div className="px-3 pb-3">
        <button
          type="button"
          onClick={onNewInvoice}
          className="group flex w-full items-center gap-2 rounded-md border border-border bg-accent/60 px-2.5 py-1.5 text-sm text-foreground transition-colors hover:bg-accent"
        >
          <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
          <span className="flex-1 text-left">Magic invoice</span>
          <kbd className="rounded border border-border bg-background px-1.5 font-mono text-[10px] text-muted-foreground">
            ⌘K
          </kbd>
        </button>
      </div>

      <nav aria-label="Main" className="flex flex-col gap-0.5 px-3">
        <p className="px-2 pt-2 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Workspace</p>
        {nav.map((item) => {
          const active = view === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onViewChange(item.id)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors',
                active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground',
              )}
            >
              <item.icon className="size-4" aria-hidden="true" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.id === 'chase' && scheduledThisWeek > 0 && (
                <span className="rounded-full bg-primary/15 px-1.5 font-mono text-[10px] text-primary">
                  {scheduledThisWeek}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      <div className="mt-auto p-3">
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-2 text-xs font-medium">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-success" />
            </span>
            Automations active
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            Smart Chase is monitoring every unpaid invoice.
          </p>
        </div>
      </div>
    </aside>
  )
}

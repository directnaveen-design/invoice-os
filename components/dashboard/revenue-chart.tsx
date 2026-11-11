'use client'

import { useState, useMemo } from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { invoiceTotals, type Invoice } from '@/lib/invoices'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'
import { BentoCard } from './stat-cards'

const chartConfig = {
  collected: { label: 'Collected', color: 'var(--chart-1)' },
  invoiced: { label: 'Invoiced', color: 'var(--chart-2)' },
} satisfies ChartConfig

const ranges = [
  { id: '3m', label: '3M', months: 3 },
  { id: '6m', label: '6M', months: 6 },
  { id: '12m', label: '12M', months: 12 },
] as const

const currencies = ['INR', 'USD'] as const

export function RevenueChart({ invoices = [] }: { invoices?: Invoice[] }) {
  const [range, setRange] = useState<(typeof ranges)[number]['id']>('12m')
  const [currency, setCurrency] = useState<(typeof currencies)[number]>('INR')
  const months = ranges.find((r) => r.id === range)!.months

  const data = useMemo(() => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()

    const monthsData = Array.from({ length: months }).map((_, i) => {
      const d = new Date(currentYear, currentMonth - (months - 1 - i), 1)
      return {
        year: d.getFullYear(),
        monthIdx: d.getMonth(),
        month: d.toLocaleString('en-US', { month: 'short' }),
        invoiced: 0,
        collected: 0,
      }
    })

    invoices
      .filter((inv) => (inv.currency || 'USD') === currency)
      .forEach((inv) => {
        const amt = invoiceTotals(inv).total
        const [y, m] = (inv.issueDate || '').split('-').map(Number)
        if (!y || !m) return

        const bucket = monthsData.find((b) => b.year === y && b.monthIdx === m - 1)
        if (bucket) {
          bucket.invoiced += amt
          if (inv.status === 'paid') {
            bucket.collected += amt
          }
        }
      })

    return monthsData
  }, [invoices, months, currency])

  const collected = data.reduce((s, p) => s + p.collected, 0)
  const invoiced = data.reduce((s, p) => s + p.invoiced, 0)
  const rate = invoiced > 0 ? (collected / invoiced) * 100 : 0

  return (
    <BentoCard className="md:col-span-3">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-medium">Revenue ({currency})</h2>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-5 gap-y-1">
            <p className="text-xs text-muted-foreground">
              <span className="mr-1.5 inline-block size-2 rounded-full bg-chart-1" aria-hidden="true" />
              Collected{' '}
              <span className="ml-1 font-mono text-sm text-foreground">
                {formatCurrency(collected, currency)}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              <span className="mr-1.5 inline-block size-2 rounded-full bg-chart-2" aria-hidden="true" />
              Invoiced{' '}
              <span className="ml-1 font-mono text-sm text-foreground">
                {formatCurrency(invoiced, currency)}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              Collection rate{' '}
              <span className="ml-1 font-mono text-sm text-success">{rate.toFixed(1)}%</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Currency" className="flex rounded-md border border-border bg-muted/40 p-0.5">
            {currencies.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={currency === c}
                onClick={() => setCurrency(c)}
                className={cn(
                  'rounded px-2.5 py-1 font-mono text-xs transition-colors',
                  currency === c ? 'bg-accent text-foreground shadow-sm font-semibold' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {c}
              </button>
            ))}
          </div>

          <div role="group" aria-label="Date range" className="flex rounded-md border border-border bg-muted/40 p-0.5">
            {ranges.map((r) => (
              <button
                key={r.id}
                type="button"
                aria-pressed={range === r.id}
                onClick={() => setRange(r.id)}
                className={cn(
                  'rounded px-2.5 py-1 font-mono text-xs transition-colors',
                  range === r.id ? 'bg-accent text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <ChartContainer config={chartConfig} className="mt-6 aspect-auto h-64 w-full">
        <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="fillCollected" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-collected)" stopOpacity={0.45} />
              <stop offset="100%" stopColor="var(--color-collected)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={10} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={52}
            tickFormatter={(v: number) => {
              const sym = currency === 'INR' ? '₹' : '$'
              if (v === 0) return `${sym}0`
              return v >= 1000 ? `${sym}${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k` : `${sym}${v}`
            }}
          />
          <ChartTooltip
            cursor={{ stroke: 'var(--border)' }}
            content={<ChartTooltipContent indicator="dot" />}
          />
          <Area
            dataKey="invoiced"
            type="monotone"
            stroke="var(--color-invoiced)"
            strokeDasharray="4 4"
            strokeWidth={1.5}
            fill="transparent"
          />
          <Area
            dataKey="collected"
            type="monotone"
            stroke="var(--color-collected)"
            strokeWidth={2}
            fill="url(#fillCollected)"
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </AreaChart>
      </ChartContainer>
    </BentoCard>
  )
}

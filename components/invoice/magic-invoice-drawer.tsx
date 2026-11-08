'use client'

import { useMemo, useState } from 'react'
import { ArrowUp, Check, CornerDownLeft, Loader2, Sparkles } from 'lucide-react'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { addDays, TODAY, type Invoice } from '@/lib/invoices'
import { formatCurrency } from '@/lib/format'
import { parseInvoicePrompt, type ParsedInvoice } from '@/lib/parse-invoice'
import { cn } from '@/lib/utils'
import { InvoicePreview } from './invoice-preview'

const examples = [
  'Bill Acme Corp $1,200 for UI Design due in 7 days, add 10% tax',
  'Invoice Pied Piper 32 hours at $140/hr for API docs, net 30',
  'Charge Hooli $4.5k for brand workshop and $900 for travel, due in 2 weeks, 8% tax',
]

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoiceNumber: string
  onCreate: (invoice: Invoice) => void
}

export function MagicInvoiceDrawer({ open, onOpenChange, invoiceNumber, onCreate }: Props) {
  const [prompt, setPrompt] = useState('')
  const [aiResult, setAiResult] = useState<{ prompt: string; draft: ParsedInvoice } | null>(null)
  const [thinking, setThinking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const localDraft = useMemo(() => parseInvoicePrompt(prompt), [prompt])
  const aiApplied = aiResult?.prompt === prompt
  const draft = aiApplied ? aiResult.draft : localDraft
  const canCreate = Boolean(draft.clientName && draft.items.length > 0)

  async function refineWithAI() {
    const text = prompt.trim()
    if (!text || thinking) return
    setThinking(true)
    setError(null)
    try {
      const res = await fetch('/api/parse-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text }),
      })
      if (!res.ok) throw new Error('Request failed')
      const data = (await res.json()) as ParsedInvoice
      setAiResult({ prompt, draft: data })
    } catch {
      setError('AI was unavailable — using the instant parse instead.')
    } finally {
      setThinking(false)
    }
  }

  function handleCreate() {
    if (!canCreate || !draft.clientName) return
    onCreate({
      id: invoiceNumber.toLowerCase(),
      number: invoiceNumber,
      clientName: draft.clientName,
      clientEmail: draft.clientEmail ?? '',
      items: draft.items,
      taxRate: draft.taxRate,
      issueDate: TODAY,
      dueDate: addDays(TODAY, draft.dueInDays ?? 14),
      status: 'pending',
      isNew: true,
    })
    setPrompt('')
    setAiResult(null)
    setError(null)
  }

  const fields = [
    { label: 'Client', value: draft.clientName },
    {
      label: 'Line items',
      value: draft.items.length
        ? draft.items.map((i) => `${i.description} · ${formatCurrency(i.quantity * i.unitPrice)}`).join(', ')
        : null,
    },
    { label: 'Tax', value: draft.taxRate ? `${draft.taxRate}%` : null },
    { label: 'Terms', value: draft.dueInDays !== null ? `Due in ${draft.dueInDays} days` : null },
  ]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 border-border bg-background p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-6xl"
      >
        <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[420px_1fr]">
          <div className="flex min-h-0 flex-col border-b border-border lg:border-r lg:border-b-0">
            <div className="flex flex-col gap-1 border-b border-border p-5">
              <div className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-md bg-primary/15 text-primary">
                  <Sparkles className="size-3.5" aria-hidden="true" />
                </span>
                <SheetTitle className="text-sm font-semibold">Magic AI Invoice</SheetTitle>
              </div>
              <SheetDescription className="text-xs text-muted-foreground">
                Describe the bill in plain English. The preview updates as you type — press Enter to refine with AI.
              </SheetDescription>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-5">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  refineWithAI()
                }}
                className="rounded-xl border border-border bg-card shadow-[0_0_0_1px_oklch(0.62_0.17_277/0)] transition-shadow focus-within:border-primary/50 focus-within:shadow-[0_0_0_4px_oklch(0.62_0.17_277/0.12)]"
              >
                <label htmlFor="magic-prompt" className="sr-only">
                  Invoice description
                </label>
                <textarea
                  id="magic-prompt"
                  autoFocus
                  rows={4}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      if (e.nativeEvent.isComposing || e.keyCode === 229) return
                      e.preventDefault()
                      refineWithAI()
                    }
                  }}
                  placeholder="Bill Acme Corp $1,200 for UI Design due in 7 days, add 10% tax"
                  className="block w-full resize-none bg-transparent px-4 pt-4 text-sm leading-relaxed outline-none placeholder:text-muted-foreground/60"
                />
                <div className="flex items-center justify-between px-3 pb-3">
                  <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    {thinking ? (
                      <>
                        <Loader2 className="size-3 animate-spin text-primary" aria-hidden="true" /> Refining with AI…
                      </>
                    ) : aiApplied ? (
                      <>
                        <Check className="size-3 text-success" aria-hidden="true" /> AI refined
                      </>
                    ) : (
                      <>
                        <CornerDownLeft className="size-3" aria-hidden="true" /> Enter to refine
                      </>
                    )}
                  </span>
                  <Button type="submit" size="icon-sm" disabled={!prompt.trim() || thinking} aria-label="Refine with AI">
                    <ArrowUp aria-hidden="true" />
                  </Button>
                </div>
              </form>
              <p role="status" className={cn('-mt-3 text-xs text-warning', !error && 'sr-only')}>
                {error ?? (thinking ? 'Refining invoice with AI' : '')}
              </p>

              {!prompt && (
                <div className="flex flex-col gap-2">
                  <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Try</p>
                  {examples.map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      onClick={() => setPrompt(ex)}
                      className="rounded-lg border border-border bg-card/50 px-3 py-2 text-left text-xs leading-relaxed text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Detected</p>
                <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card/50">
                  {fields.map((f) => (
                    <li key={f.label} className="flex items-start gap-3 px-3 py-2.5 text-xs">
                      <span
                        className={cn(
                          'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border',
                          f.value ? 'border-success/40 bg-success/15 text-success' : 'border-border text-transparent',
                        )}
                        aria-hidden="true"
                      >
                        <Check className="size-2.5" />
                      </span>
                      <span className="w-20 shrink-0 text-muted-foreground">{f.label}</span>
                      <span className={cn('min-w-0 flex-1', f.value ? 'text-foreground' : 'text-muted-foreground/50')}>
                        {f.value ?? 'Not detected'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-border p-4">
              <span className="font-mono text-xs text-muted-foreground">{invoiceNumber}</span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button size="sm" disabled={!canCreate} onClick={handleCreate}>
                  Create &amp; schedule chase
                </Button>
              </div>
            </div>
          </div>

          <div className="relative hidden min-h-0 overflow-y-auto bg-[radial-gradient(oklch(1_0_0/6%)_1px,transparent_1px)] [background-size:16px_16px] p-8 lg:block">
            <p className="mb-4 text-center text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              Live preview
            </p>
            <InvoicePreview draft={draft} number={invoiceNumber} thinking={thinking} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

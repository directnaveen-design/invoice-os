import { z } from 'zod'
import { clients } from './invoices'

export const parsedInvoiceSchema = z.object({
  clientName: z.string().nullable().describe('Company or person being billed'),
  clientEmail: z.string().nullable().describe('Billing email if mentioned'),
  items: z
    .array(
      z.object({
        description: z.string(),
        quantity: z.number().positive(),
        unitPrice: z.number().nonnegative(),
      }),
    )
    .describe('Line items. Use quantity 1 when a flat fee is given.'),
  taxRate: z.number().min(0).max(100).describe('Tax percentage, e.g. 10 for 10%. 0 if none.'),
  dueInDays: z.number().int().min(0).max(365).nullable().describe('Days from today until due'),
  notes: z.string().nullable().describe('Optional short note for the client'),
})

export type ParsedInvoice = z.infer<typeof parsedInvoiceSchema>

export const emptyDraft: ParsedInvoice = {
  clientName: null,
  clientEmail: null,
  items: [],
  taxRate: 0,
  dueInDays: null,
  notes: null,
}

function toNumber(raw: string, suffix?: string) {
  const n = Number.parseFloat(raw.replace(/,/g, ''))
  if (Number.isNaN(n)) return null
  return suffix?.toLowerCase() === 'k' ? n * 1000 : n
}

function titleCase(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Instant heuristic parse so the preview updates on every keystroke; AI refines on submit. */
export function parseInvoicePrompt(prompt: string): ParsedInvoice {
  const text = prompt.trim()
  if (!text) return emptyDraft

  const clientMatch =
    text.match(/(?:bill|invoice|charge)\s+(.+?)(?=\s+(?:\$|for\b|usd\b|\d)|,|$)/i) ??
    text.match(/\bto\s+([A-Z][\w&.]*(?:\s+[A-Z][\w&.]*)*)/)
  let clientName = clientMatch?.[1]?.trim() ?? null
  if (clientName) {
    const known = clients.find((c) => c.name.toLowerCase().startsWith(clientName!.toLowerCase()))
    clientName = known?.name ?? titleCase(clientName)
  }
  const knownClient = clients.find((c) => c.name === clientName)

  const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[\w.]+/)

  const amountMatch = text.match(/\$\s?([\d,]+(?:\.\d+)?)\s?(k)?\b/i) ?? text.match(/\b([\d,]+(?:\.\d+)?)\s?(k)?\s?(?:usd|dollars)\b/i)
  const amount = amountMatch ? toNumber(amountMatch[1], amountMatch[2]) : null

  const qtyMatch = text.match(/\b(\d+)\s*(?:x|×|hours?|hrs?|units?|seats?)\b/i)
  const perMatch = /\/(?:hr|hour|unit|seat)|per\s+(?:hour|unit|seat)|an hour/i.test(text)
  const quantity = qtyMatch && perMatch ? Number(qtyMatch[1]) : 1

  const descMatch = text.match(/\bfor\s+(.+?)(?=\s+(?:due|net)\b|,|\.|\s+add\b|\s+with\b|\s+plus\b|$)/i)
  const description = descMatch?.[1]?.trim()

  const items =
    amount !== null
      ? [{ description: description ? titleCase(description) : 'Professional services', quantity, unitPrice: amount }]
      : []

  const taxMatch = text.match(/(\d+(?:\.\d+)?)\s?%\s?(?:tax|vat|gst|sales tax)?/i)
  const taxRate = taxMatch ? Number.parseFloat(taxMatch[1]) : 0

  let dueInDays: number | null = null
  const dueMatch = text.match(/(?:due\s+in|in)\s+(\d+)\s+(day|week|month)s?/i)
  const netMatch = text.match(/\bnet\s?(\d+)\b/i)
  if (dueMatch) {
    const n = Number(dueMatch[1])
    dueInDays = dueMatch[2].toLowerCase() === 'week' ? n * 7 : dueMatch[2].toLowerCase() === 'month' ? n * 30 : n
  } else if (netMatch) {
    dueInDays = Number(netMatch[1])
  } else if (/due\s+(?:on\s+receipt|today|now)/i.test(text)) {
    dueInDays = 0
  }

  return {
    clientName,
    clientEmail: emailMatch?.[0] ?? knownClient?.email ?? null,
    items,
    taxRate,
    dueInDays,
    notes: null,
  }
}

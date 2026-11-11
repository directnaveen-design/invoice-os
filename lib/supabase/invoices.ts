import { createClient } from './client'
import { invoiceTotals, TODAY, type Invoice, type InvoiceStatus, type LineItem } from '@/lib/invoices'

type InvoiceRow = {
  id?: string | number | null
  invoice_number: string | null
  client: string | null
  client_email?: string | null
  amount: number | string | null
  subtotal?: number | string | null
  tax_rate?: number | string | null
  items?: LineItem[] | string | null
  status: string | null
  issue_date?: string | null
  due_date: string | null
  created_at?: string | null
  user_id?: string | null
  client_id?: string | null
  currency?: string | null
  share_token?: string | null
  payment_link?: string | null
  upi_id?: string | null
  business_name?: string | null
}

const STATUSES: InvoiceStatus[] = ['paid', 'pending', 'overdue', 'draft']

function toStatus(raw: string | null, dueDate: string): InvoiceStatus {
  const status = STATUSES.find((s) => s === raw?.toLowerCase()) ?? 'pending'
  return status === 'pending' && dueDate < TODAY ? 'overdue' : status
}

function parseItems(raw: unknown): LineItem[] {
  if (Array.isArray(raw)) return raw as LineItem[]
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    } catch {
      // ignore json parse error
    }
  }
  return []
}

function rowToInvoice(row: InvoiceRow): Invoice {
  const dueDate = row.due_date?.slice(0, 10) ?? TODAY
  const issueDate = row.issue_date?.slice(0, 10) ?? row.created_at?.slice(0, 10) ?? dueDate
  const number = row.invoice_number ?? 'INV-????'
  const parsed = parseItems(row.items)
  const items = parsed.length > 0 
    ? parsed 
    : [{ description: 'Invoice total', quantity: 1, unitPrice: Number(row.amount ?? 0) }]

  return {
    id: String(row.id ?? number),
    number,
    clientName: row.client ?? 'Unknown client',
    clientEmail: row.client_email ?? '',
    items,
    taxRate: Number(row.tax_rate ?? 0),
    issueDate: issueDate > dueDate ? dueDate : issueDate,
    dueDate,
    status: toStatus(row.status, dueDate),
    currency: row.currency ?? 'USD',
  }
}

// Extended type for dashboard
export type InvoiceDetailed = Invoice & {
  rawAmount: number
  currency: string
  share_token: string
  payment_link: string | null
  upi_id: string | null
  business_name: string | null
}

function rowToInvoiceDetailed(row: InvoiceRow): InvoiceDetailed {
  return {
    ...rowToInvoice(row),
    rawAmount: Number(row.amount ?? 0),
    currency: row.currency ?? 'USD',
    share_token: row.share_token ?? '',
    payment_link: row.payment_link ?? null,
    upi_id: row.upi_id ?? null,
    business_name: row.business_name ?? null,
  }
}

export async function fetchInvoices(): Promise<Invoice[]> {
  const { data, error } = await createClient().from('invoices').select('*')
  if (error) {
    console.error('Failed to load invoices from Supabase:', error)
    throw error
  }
  return (data as InvoiceRow[])
    .map(rowToInvoice)
    .sort((a, b) => b.number.localeCompare(a.number, undefined, { numeric: true }))
}

export async function insertInvoice(
  invoice: Invoice,
  meta?: { currency?: string; share_token?: string; upi_id?: string | null; business_name?: string | null }
) {
  const totals = invoiceTotals(invoice)
  const currency = meta?.currency ?? invoice.currency ?? 'USD'
  
  const { error } = await createClient().from('invoices').insert({
    invoice_number: invoice.number,
    client: invoice.clientName,
    client_email: invoice.clientEmail ?? '',
    amount: totals.total,
    subtotal: totals.subtotal,
    tax_rate: invoice.taxRate ?? 0,
    items: invoice.items ?? [],
    status: invoice.status,
    issue_date: invoice.issueDate ?? TODAY,
    due_date: invoice.dueDate,
    currency,
    share_token: meta?.share_token ?? crypto.randomUUID(),
    upi_id: meta?.upi_id ?? null,
    business_name: meta?.business_name ?? null,
  })
  if (error) {
    console.error('Failed to insert invoice into Supabase:', error)
    throw error
  }
}

export async function fetchInvoicesDetailed(): Promise<InvoiceDetailed[]> {
  const { data, error } = await createClient().from('invoices').select('*')
  if (error) {
    console.error('Failed to load invoices from Supabase:', error)
    throw error
  }
  return (data as InvoiceRow[])
    .map(rowToInvoiceDetailed)
    .sort((a, b) => b.number.localeCompare(a.number, undefined, { numeric: true }))
}

export async function markInvoiceAsPaid(invoiceId: string) {
  const { error } = await createClient()
    .from('invoices')
    .update({ status: 'paid' })
    .eq('id', invoiceId)
  if (error) throw error
}

export type ProfileData = {
  business_name: string | null
  upi_id: string | null
  default_currency: string | null
  subscription_tier?: string | null
}

export async function getProfile(userId: string): Promise<ProfileData | null> {
  const { data, error } = await createClient()
    .from('profiles')
    .select('business_name, upi_id, default_currency, subscription_tier')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  return (data as ProfileData | null) ?? null
}

export async function upsertProfile(
  userId: string,
  updates: { business_name?: string; upi_id?: string; default_currency?: string; subscription_tier?: string }
) {
  const { error } = await createClient()
    .from('profiles')
    .upsert({ id: userId, ...updates }, { onConflict: 'id' })
  if (error) throw error
}

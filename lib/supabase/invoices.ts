import { createClient } from './client'
import { invoiceTotals, TODAY, type Invoice, type InvoiceStatus } from '@/lib/invoices'

type InvoiceRow = {
  id?: string | number | null
  invoice_number: string | null
  client: string | null
  amount: number | string | null
  status: string | null
  due_date: string | null
  created_at?: string | null
  user_id?: string | null
  client_id?: string | null
}

const STATUSES: InvoiceStatus[] = ['paid', 'pending', 'overdue', 'draft']

function toStatus(raw: string | null, dueDate: string): InvoiceStatus {
  const status = STATUSES.find((s) => s === raw?.toLowerCase()) ?? 'pending'
  return status === 'pending' && dueDate < TODAY ? 'overdue' : status
}

function rowToInvoice(row: InvoiceRow): Invoice {
  const dueDate = row.due_date?.slice(0, 10) ?? TODAY
  const issueDate = row.created_at?.slice(0, 10) ?? dueDate
  const number = row.invoice_number ?? 'INV-????'
  return {
    id: String(row.id ?? number),
    number,
    clientName: row.client ?? 'Unknown client',
    clientEmail: '',
    items: [{ description: 'Invoice total', quantity: 1, unitPrice: Number(row.amount ?? 0) }],
    taxRate: 0,
    issueDate: issueDate > dueDate ? dueDate : issueDate,
    dueDate,
    status: toStatus(row.status, dueDate),
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

export async function insertInvoice(invoice: Invoice) {
  const { error } = await createClient().from('invoices').insert({
    invoice_number: invoice.number,
    client: invoice.clientName,
    amount: invoiceTotals(invoice).total,
    status: invoice.status,
    due_date: invoice.dueDate,
  })
  if (error) {
    console.error('Failed to insert invoice into Supabase:', error)
    throw error
  }
}

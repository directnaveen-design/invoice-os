export type InvoiceStatus = 'paid' | 'pending' | 'overdue' | 'draft'

export type LineItem = {
  description: string
  quantity: number
  unitPrice: number
}

export type Client = {
  id: string
  name: string
  email: string
}

export type Invoice = {
  id: string
  number: string
  clientName: string
  clientEmail: string
  items: LineItem[]
  taxRate: number
  issueDate: string
  dueDate: string
  status: InvoiceStatus
  currency?: string
  paidDate?: string
  isNew?: boolean
}

export const TODAY = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
const DAY = 86_400_000

export function addDays(iso: string, days: number) {
  if (!iso) return TODAY
  const d = new Date(`${iso.includes('T') ? iso : `${iso}T00:00:00`}`)
  return new Date(d.getTime() + days * DAY).toISOString().slice(0, 10)
}

export function daysBetween(from: string, to: string) {
  if (!from || !to) return 0
  const dFrom = new Date(`${from.includes('T') ? from : `${from}T00:00:00`}`).getTime()
  const dTo = new Date(`${to.includes('T') ? to : `${to}T00:00:00`}`).getTime()
  return Math.round((dTo - dFrom) / DAY)
}

export function invoiceTotals(inv: Pick<Invoice, 'items' | 'taxRate'>) {
  const items = Array.isArray(inv.items) ? inv.items : []
  const subtotal = items.reduce((sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0)
  const tax = Math.round(subtotal * ((Number(inv.taxRate) || 0) / 100) * 100) / 100
  return { subtotal, tax, total: subtotal + tax }
}

export const clients: Client[] = [
  { id: 'c_acme', name: 'Acme Corp', email: 'ap@acme.co' },
  { id: 'c_globex', name: 'Globex Corporation', email: 'finance@globex.com' },
  { id: 'c_initech', name: 'Initech', email: 'billing@initech.io' },
  { id: 'c_stark', name: 'Stark Industries', email: 'payables@stark.com' },
  { id: 'c_umbrella', name: 'Umbrella Health', email: 'accounts@umbrella.health' },
  { id: 'c_hooli', name: 'Hooli', email: 'vendors@hooli.xyz' },
  { id: 'c_piper', name: 'Pied Piper', email: 'richard@piedpiper.com' },
  { id: 'c_wayne', name: 'Wayne Enterprises', email: 'ap@wayne.com' },
  { id: 'c_soylent', name: 'Soylent', email: 'ops@soylent.com' },
]

export type RevenuePoint = { month: string; invoiced: number; collected: number }

// Fallback empty seed (real data dashboard context se compute hoga)
export const seedInvoices: Invoice[] = []
export const revenueSeries: RevenuePoint[] = [
  { month: 'Jun', invoiced: 0, collected: 0 },
  { month: 'Jul', invoiced: 0, collected: 0 },
  { month: 'Aug', invoiced: 0, collected: 0 },
  { month: 'Sep', invoiced: 0, collected: 0 },
  { month: 'Oct', invoiced: 0, collected: 0 },
  { month: 'Nov', invoiced: 0, collected: 0 },
]
    

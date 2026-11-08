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
  paidDate?: string
  isNew?: boolean
}

export const TODAY = '2026-11-08'

const DAY = 86_400_000

export function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`)
  return new Date(d.getTime() + days * DAY).toISOString().slice(0, 10)
}

export function daysBetween(from: string, to: string) {
  return Math.round(
    (new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / DAY,
  )
}

export function invoiceTotals(inv: Pick<Invoice, 'items' | 'taxRate'>) {
  const subtotal = inv.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0)
  const tax = Math.round(subtotal * (inv.taxRate / 100) * 100) / 100
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

function clientEmail(name: string) {
  return clients.find((c) => c.name === name)?.email ?? ''
}

function inv(
  number: string,
  clientName: string,
  items: LineItem[],
  taxRate: number,
  issueDate: string,
  dueDate: string,
  status: InvoiceStatus,
  paidDate?: string,
): Invoice {
  return {
    id: number.toLowerCase(),
    number,
    clientName,
    clientEmail: clientEmail(clientName),
    items,
    taxRate,
    issueDate,
    dueDate,
    status,
    paidDate,
  }
}

export const seedInvoices: Invoice[] = [
  inv('INV-0144', 'Soylent', [{ description: 'Packaging illustrations', quantity: 4, unitPrice: 650 }], 0, '2026-11-02', '2026-11-09', 'pending'),
  inv('INV-0143', 'Acme Corp', [{ description: 'Landing page build', quantity: 1, unitPrice: 3600 }], 8, '2026-10-15', '2026-11-05', 'overdue'),
  inv('INV-0142', 'Wayne Enterprises', [{ description: 'Annual design ops license', quantity: 1, unitPrice: 12000 }], 10, '2026-10-28', '2026-11-27', 'pending'),
  inv('INV-0141', 'Pied Piper', [{ description: 'Compression dashboard UI', quantity: 40, unitPrice: 120 }], 0, '2026-10-25', '2026-11-14', 'pending'),
  inv('INV-0140', 'Hooli', [{ description: 'Motion design pack', quantity: 1, unitPrice: 2750 }], 5, '2026-10-20', '2026-11-10', 'pending'),
  inv(
    'INV-0139',
    'Umbrella Health',
    [
      { description: 'Patient portal UX audit', quantity: 1, unitPrice: 3200 },
      { description: 'Moderated usability sessions', quantity: 6, unitPrice: 450 },
    ],
    0,
    '2026-10-10',
    '2026-11-01',
    'overdue',
  ),
  inv('INV-0137', 'Stark Industries', [{ description: 'Product design sprint', quantity: 2, unitPrice: 4800 }], 10, '2026-10-05', '2026-10-25', 'overdue'),
  inv('INV-0134', 'Initech', [{ description: 'Q4 design retainer', quantity: 1, unitPrice: 6500 }], 8, '2026-10-01', '2026-10-31', 'paid', '2026-10-29'),
  inv('INV-0131', 'Globex Corporation', [{ description: 'Brand system refresh', quantity: 1, unitPrice: 8400 }], 0, '2026-09-20', '2026-10-20', 'paid', '2026-10-18'),
  inv('INV-0129', 'Hooli', [{ description: 'Icon library — 120 glyphs', quantity: 120, unitPrice: 35 }], 5, '2026-09-12', '2026-10-02', 'paid', '2026-10-06'),
]

export type RevenuePoint = { month: string; invoiced: number; collected: number }

export const revenueSeries: RevenuePoint[] = [
  { month: 'Dec', invoiced: 14200, collected: 11800 },
  { month: 'Jan', invoiced: 12600, collected: 13100 },
  { month: 'Feb', invoiced: 15900, collected: 12400 },
  { month: 'Mar', invoiced: 17800, collected: 16200 },
  { month: 'Apr', invoiced: 16400, collected: 17100 },
  { month: 'May', invoiced: 19300, collected: 15800 },
  { month: 'Jun', invoiced: 21200, collected: 19600 },
  { month: 'Jul', invoiced: 18700, collected: 20400 },
  { month: 'Aug', invoiced: 22500, collected: 18900 },
  { month: 'Sep', invoiced: 24100, collected: 22700 },
  { month: 'Oct', invoiced: 26800, collected: 23500 },
  { month: 'Nov', invoiced: 19400, collected: 14920 },
]

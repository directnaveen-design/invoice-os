import { addDays, daysBetween, invoiceTotals, TODAY, type Invoice } from './invoices'
import { formatCurrency, formatDate } from './format'

export type ChaseTone = 'heads-up' | 'due' | 'nudge' | 'firm' | 'final'
export type ChaseStepStatus = 'sent' | 'today' | 'scheduled' | 'paused'

export type ChaseStep = {
  id: string
  tone: ChaseTone
  label: string
  offset: number
  date: string
  status: ChaseStepStatus
  opened: boolean
  subject: string
  body: string
}

const SEQUENCE: { tone: ChaseTone; label: string; offset: number }[] = [
  { tone: 'heads-up', label: 'Gentle heads-up', offset: -3 },
  { tone: 'due', label: 'Due today', offset: 0 },
  { tone: 'nudge', label: 'Friendly nudge', offset: 3 },
  { tone: 'firm', label: 'Firm reminder', offset: 7 },
  { tone: 'final', label: 'Final notice', offset: 14 },
]

function seededOpen(id: string) {
  let h = 0
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) | 0
  return Math.abs(h) % 3 !== 0
}

function copy(tone: ChaseTone, invoice: Invoice) {
  const amount = formatCurrency(invoiceTotals(invoice).total)
  const due = formatDate(invoice.dueDate, { month: 'long', day: 'numeric' })
  const first = invoice.clientName.split(' ')[0]
  switch (tone) {
    case 'heads-up':
      return {
        subject: `Upcoming: ${invoice.number} for ${amount} due ${due}`,
        body: `Hi ${first} team,\n\nQuick heads-up that invoice ${invoice.number} for ${amount} is due on ${due}. You can pay securely in one click using the link below.\n\nThanks so much!`,
      }
    case 'due':
      return {
        subject: `${invoice.number} is due today`,
        body: `Hi ${first} team,\n\nJust a reminder that ${invoice.number} (${amount}) is due today. If it's already on its way, please ignore this note.\n\nAppreciate it!`,
      }
    case 'nudge':
      return {
        subject: `Following up on ${invoice.number}`,
        body: `Hi ${first} team,\n\nFollowing up on ${invoice.number} for ${amount}, which was due on ${due}. Could you let us know when we can expect payment?\n\nHappy to resend anything you need.`,
      }
    case 'firm':
      return {
        subject: `Action needed: ${invoice.number} is 7 days past due`,
        body: `Hi ${first} team,\n\n${invoice.number} for ${amount} is now one week past due. Please arrange payment at your earliest convenience, or reply if there's an issue we should resolve.\n\nThank you.`,
      }
    case 'final':
      return {
        subject: `Final notice: ${invoice.number} (${amount})`,
        body: `Hi ${first} team,\n\nThis is a final notice for ${invoice.number} (${amount}), now 14 days overdue. Per our terms, a late fee may apply after this date. Please settle the balance or reach out today.\n\nRegards.`,
      }
  }
}

export function buildChaseSchedule(invoice: Invoice, paused: boolean): ChaseStep[] {
  return SEQUENCE.map((step) => {
    const date = addDays(invoice.dueDate, step.offset)
    const delta = daysBetween(TODAY, date)
    let status: ChaseStepStatus = delta < 0 ? 'sent' : delta === 0 ? 'today' : 'scheduled'
    if (paused && status !== 'sent') status = 'paused'
    const id = `${invoice.id}-${step.tone}`
    return {
      id,
      ...step,
      date,
      status,
      opened: status === 'sent' && seededOpen(id),
      ...copy(step.tone, invoice),
    }
  })
}

export function nextStep(steps: ChaseStep[]) {
  return steps.find((s) => s.status === 'today' || s.status === 'scheduled')
}

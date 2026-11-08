import { cn } from '@/lib/utils'
import type { InvoiceStatus } from '@/lib/invoices'

const styles: Record<InvoiceStatus, { label: string; dot: string; text: string }> = {
  paid: { label: 'Paid', dot: 'bg-success', text: 'text-success' },
  pending: { label: 'Pending', dot: 'bg-warning', text: 'text-warning' },
  overdue: { label: 'Overdue', dot: 'bg-destructive', text: 'text-destructive' },
  draft: { label: 'Draft', dot: 'bg-muted-foreground', text: 'text-muted-foreground' },
}

export function StatusBadge({ status, className }: { status: InvoiceStatus; className?: string }) {
  const s = styles[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2 py-0.5 text-xs font-medium',
        s.text,
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full', s.dot)} aria-hidden="true" />
      {s.label}
    </span>
  )
}

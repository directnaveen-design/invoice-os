import { generateText, Output } from 'ai'
import { parsedInvoiceSchema } from '@/lib/parse-invoice'
import { clients, TODAY } from '@/lib/invoices'

export const maxDuration = 30

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : ''
  if (!prompt || prompt.length > 1000) {
    return Response.json({ error: 'Prompt must be between 1 and 1000 characters.' }, { status: 400 })
  }

  try {
    const { output } = await generateText({
      model: 'google/gemini-3.5-flash',
      output: Output.object({ schema: parsedInvoiceSchema }),
      system: [
        'You convert natural-language billing requests into structured invoice drafts.',
        `Today is ${TODAY}. Convert relative due dates into a whole number of days from today.`,
        'Amounts are USD. Split distinct services into separate line items.',
        'If an hourly rate and hours are given, use hours as quantity and the rate as unitPrice.',
        'Write concise, professional line-item descriptions in Title Case.',
        `Known clients (prefer exact names when they match): ${clients.map((c) => `${c.name} <${c.email}>`).join(', ')}.`,
        'Use null for anything not stated. Never invent amounts.',
      ].join('\n'),
      prompt,
    })
    return Response.json(output)
  } catch (error) {
    console.error('[parse-invoice] generation failed', error)
    return Response.json({ error: 'AI parsing failed.' }, { status: 502 })
  }
}

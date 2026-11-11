import { generateText, Output } from 'ai'
import { parsedInvoiceSchema } from '@/lib/parse-invoice'
import { clients, TODAY } from '@/lib/invoices'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 30

// Supabase client initialize (server-side ke liye)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  // 1. SECURITY SHIELD: Check auth token (Bina login wale bots ko block karo)
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return Response.json({ error: 'Unauthorized API Access.' }, { status: 401 });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return Response.json({ error: 'Invalid or Expired Session.' }, { status: 401 });
  }

  // 2. PARSE BODY
  const body = await req.json().catch(() => null)
  const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : ''
  if (!prompt || prompt.length > 1000) {
    return Response.json({ error: 'Prompt must be between 1 and 1000 characters.' }, { status: 400 })
  }

  try {
    // 3. AI ENGINE: Use environment variable or fallback to safe flash model
    const aiModel = process.env.AI_PRIMARY_MODEL || 'google/gemini-2.5-flash';

    const { output } = await generateText({
      model: aiModel,
      output: Output.object({ schema: parsedInvoiceSchema }),
      system: [
        'You convert natural-language billing requests into structured invoice drafts.',
        `Today is ${TODAY}. Convert relative due dates into a whole number of days from today.`,
        'Amounts can be in any currency. Split distinct services into separate line items.',
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
    return Response.json({ error: 'AI parsing failed due to load or quota.' }, { status: 502 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { runDiagnostic } from '@/lib/analyze'
import type { AnalyzeRequest } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 60

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function validate(body: unknown): AnalyzeRequest | { error: string } {
  if (!body || typeof body !== 'object') {
    return { error: 'Request body must be a JSON object.' }
  }

  const record = body as Record<string, unknown>
  const query = clean(record.query)
  const productName = clean(record.productName)
  const brandName = clean(record.brandName)

  if (!query || !productName || !brandName) {
    return { error: 'query, productName, and brandName are required.' }
  }

  if (query.length > 240) return { error: 'query must be 240 characters or fewer.' }
  if (productName.length > 120) return { error: 'productName must be 120 characters or fewer.' }
  if (brandName.length > 120) return { error: 'brandName must be 120 characters or fewer.' }

  return { query, productName, brandName }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const validated = validate(body)

    if ('error' in validated) {
      return NextResponse.json({ error: validated.error }, { status: 400 })
    }

    const result = await runDiagnostic(validated)
    return NextResponse.json(result)
  } catch (error) {
    console.error('[AEO Diagnostic] analyze failed', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

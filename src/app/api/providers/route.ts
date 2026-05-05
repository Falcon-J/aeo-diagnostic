import { NextResponse } from 'next/server'
import type { AIEngine } from '@/types'

const PROVIDERS: Array<{ engine: AIEngine; label: string; envKey: string }> = [
  { engine: 'gemini', label: 'Gemini', envKey: 'GEMINI_API_KEY' },
  { engine: 'groq', label: 'Groq', envKey: 'GROQ_API_KEY' },
  { engine: 'openrouter', label: 'OpenRouter', envKey: 'OPENROUTER_API_KEY' }
]

function configured(name: string): boolean {
  const value = process.env[name]?.trim()
  return Boolean(value && !value.includes('...'))
}

export function GET() {
  return NextResponse.json({
    providers: PROVIDERS.map((provider) => ({
      engine: provider.engine,
      label: provider.label,
      configured: configured(provider.envKey)
    })),
    fairRun: {
      prompt: 'same shopper prompt',
      maxOutputTokens: 700,
      temperature: 0.2,
      timeoutSeconds: 45
    }
  })
}

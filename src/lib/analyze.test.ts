import { describe, expect, it } from 'vitest'
import { analyzeEngineResponse } from './analyze'

describe('analyzeEngineResponse', () => {
  it('scores a positive first-place brand mention at 100', () => {
    const result = analyzeEngineResponse(
      'openrouter',
      'OpenRouter',
      '1. Natural Vitality Calm Magnesium is the best magnesium option for many seniors.\n2. Thorne Magnesium\n3. Pure Encapsulations',
      120,
      'Calm Magnesium',
      'Natural Vitality'
    )

    expect(result.score).toBe(100)
    expect(result.rankPosition).toBe(1)
    expect(result.sentiment).toBe('positive')
    expect(result.mentionsBrand).toBe(true)
    expect(result.mentionsProduct).toBe(true)
    expect(result.mentionedBrands).toContain('Natural Vitality Calm Magnesium')
  })

  it('keeps absent brands at zero when no product or brand is mentioned', () => {
    const result = analyzeEngineResponse(
      'gemini',
      'Gemini',
      '1. Thorne Magnesium\n2. Pure Encapsulations\n3. Nature Made',
      90,
      'Calm Magnesium',
      'Natural Vitality'
    )

    expect(result.score).toBe(0)
    expect(result.sentiment).toBe('not_mentioned')
    expect(result.mentionsBrand).toBe(false)
    expect(result.competitors).toContain('Thorne Magnesium')
  })

  it('derives rank from extracted brand order when no numbered list exists', () => {
    const result = analyzeEngineResponse(
      'gemini',
      'Gemini',
      'For seniors, Thorne Magnesium is a common pick. Natural Vitality Calm Magnesium is also a strong option. Pure Encapsulations is another reputable choice.',
      140,
      'Calm Magnesium',
      'Natural Vitality'
    )

    expect(result.mentionedBrands.slice(0, 3)).toEqual([
      'Thorne Magnesium',
      'Natural Vitality Calm Magnesium',
      'Pure Encapsulations'
    ])
    expect(result.rankPosition).toBe(2)
  })

  it('penalizes lower ranked neutral mentions', () => {
    const result = analyzeEngineResponse(
      'groq',
      'Groq',
      '1. Thorne Magnesium\n2. Pure Encapsulations\n4. Natural Vitality Calm Magnesium is another option.',
      200,
      'Calm Magnesium',
      'Natural Vitality'
    )

    expect(result.rankPosition).toBe(4)
    expect(result.sentiment).toBe('neutral')
    expect(result.score).toBe(61)
  })
})

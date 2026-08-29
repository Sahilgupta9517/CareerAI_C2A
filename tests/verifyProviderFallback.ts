import assert from 'node:assert/strict'
import { aiService } from '../server/services/aiService.ts'

const originalFetch = globalThis.fetch
const originalOrder = process.env.AI_PROVIDER_ORDER
const originalOpenRouterKey = process.env.OPENROUTER_API_KEY
const originalOpenAIKey = process.env.OPENAI_API_KEY

const calls: string[] = []
process.env.AI_PROVIDER_ORDER = 'openrouter,openai'
process.env.OPENROUTER_API_KEY = 'unit-test-openrouter-key'
process.env.OPENAI_API_KEY = 'unit-test-openai-key'

globalThis.fetch = async (input) => {
  const url = String(input)
  calls.push(url)
  if (url.includes('openrouter.ai')) return new Response('rate limited', { status: 429 })
  if (url.includes('api.openai.com')) return new Response(JSON.stringify({ choices: [{ message: { content: 'fallback provider response' } }] }), { status: 200 })
  throw new Error(`Unexpected provider URL: ${url}`)
}

const result = await aiService.chat('How should I improve my career roadmap?', { profile: { name: 'Test User' } }, 'roadmap')
assert.equal(result, 'fallback provider response')
assert.deepEqual(calls, ['https://openrouter.ai/api/v1/chat/completions', 'https://api.openai.com/v1/chat/completions'])

if (originalOrder === undefined) delete process.env.AI_PROVIDER_ORDER
else process.env.AI_PROVIDER_ORDER = originalOrder
if (originalOpenRouterKey === undefined) delete process.env.OPENROUTER_API_KEY
else process.env.OPENROUTER_API_KEY = originalOpenRouterKey
if (originalOpenAIKey === undefined) delete process.env.OPENAI_API_KEY
else process.env.OPENAI_API_KEY = originalOpenAIKey
globalThis.fetch = originalFetch

console.log('Provider fallback proof passed: OpenRouter 429 -> OpenAI success')

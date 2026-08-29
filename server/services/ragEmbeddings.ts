import { createHash } from 'node:crypto'

export interface EmbeddingProvider {
  readonly name: string
  readonly dimensions: number
  generateEmbedding(text: string): Promise<number[]>
  generateEmbeddings(texts: string[]): Promise<number[][]>
}

const EMBEDDING_DIMENSIONS = 128
const embeddingTimeoutMs = () => Math.max(1000, Number(process.env.RAG_EMBEDDING_TIMEOUT_MS || process.env.RAG_TIMEOUT_MS) || 8000)

const isUsableKey = (value: string | undefined): value is string => Boolean(value && !value.startsWith('your_') && value !== 'your_key_here')

const fetchJsonWithTimeout = async (input: string, init: RequestInit, milliseconds: number): Promise<{ response: Response; payload: unknown }> => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), milliseconds)
  try {
    const response = await fetch(input, { ...init, signal: controller.signal })
    const payload = await response.json()
    return { response, payload }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('Embedding provider timed out.')
    throw error
  } finally {
    clearTimeout(timer)
  }
}

const hashToken = (token: string) => {
  let hash = 2166136261
  for (let index = 0; index < token.length; index += 1) {
    hash ^= token.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export class DeterministicEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'deterministic-local'
  readonly dimensions = EMBEDDING_DIMENSIONS

  async generateEmbedding(text: string): Promise<number[]> {
    const vector = Array.from({ length: this.dimensions }, () => 0)
    const tokens = text.toLowerCase().match(/[a-z0-9]+/g) ?? []
    for (const token of tokens) {
      const first = hashToken(token) % this.dimensions
      const second = hashToken(`${token}:2`) % this.dimensions
      vector[first] += 1
      vector[second] -= 0.5
    }
    const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0))
    return magnitude ? vector.map((value) => value / magnitude) : vector
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((text) => this.generateEmbedding(text)))
  }
}

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'openai'
  readonly dimensions = EMBEDDING_DIMENSIONS
  private readonly apiKey: string
  private readonly model: string

  constructor(apiKey: string, model = process.env.RAG_EMBEDDING_MODEL || 'text-embedding-3-small') {
    this.apiKey = apiKey
    this.model = model
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const embeddings = await this.generateEmbeddings([text])
    const embedding = embeddings[0]
    if (!embedding) throw new Error('OpenAI returned no embedding.')
    return embedding
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (!texts.length) return []
    const { response, payload } = await fetchJsonWithTimeout('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({ model: this.model, input: texts, dimensions: EMBEDDING_DIMENSIONS, encoding_format: 'float' }),
    }, embeddingTimeoutMs())
    if (!response.ok) throw new Error(response.status === 429 ? 'OpenAI embedding provider is rate limited.' : response.status >= 500 ? 'OpenAI embedding provider is temporarily unavailable.' : `OpenAI embedding provider request failed (${response.status}).`)
    if (!payload || typeof payload !== 'object' || !Array.isArray((payload as { data?: unknown }).data)) throw new Error('OpenAI returned an invalid embedding response.')
    const rows = (payload as { data: Array<{ embedding?: unknown; index?: unknown }> }).data
    const result = rows.sort((left, right) => Number(left.index ?? 0) - Number(right.index ?? 0)).map((row) => row.embedding)
    if (result.length !== texts.length || result.some((vector) => !Array.isArray(vector) || vector.length !== EMBEDDING_DIMENSIONS || vector.some((value) => typeof value !== 'number' || !Number.isFinite(value)))) throw new Error('OpenAI returned an incompatible embedding dimension.')
    return result as number[][]
  }
}

class FallbackEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'embedding-fallback-chain'
  readonly dimensions = EMBEDDING_DIMENSIONS
  private readonly providers: EmbeddingProvider[]
  private readonly local = new DeterministicEmbeddingProvider()

  constructor(providers: EmbeddingProvider[]) {
    this.providers = providers
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const cacheKey = createHash('sha256').update(`${this.name}:${text}`).digest('hex')
    const cached = embeddingCache.get(cacheKey)
    if (cached) return cached
    for (const provider of this.providers) {
      try {
        const result = await provider.generateEmbedding(text)
        embeddingCache.set(cacheKey, result)
        console.log('[RAG] Embedding provider selected', { provider: provider.name })
        return result
      } catch (error) {
        console.warn('[RAG] Embedding provider failed', { provider: provider.name, message: error instanceof Error ? error.message : 'unknown error' })
      }
    }
    const result = await this.local.generateEmbedding(text)
    embeddingCache.set(cacheKey, result)
    console.warn('[RAG] Using deterministic embedding fallback')
    return result
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (!texts.length) return []
    const results: number[][] = []
    for (const text of texts) results.push(await this.generateEmbedding(text))
    return results
  }
}

const embeddingCache = new Map<string, number[]>()
export const createEmbeddingProvider = (): EmbeddingProvider => {
  const configured = (process.env.RAG_EMBEDDING_PROVIDER_ORDER || process.env.EMBEDDING_PROVIDER_ORDER || 'openai,local')
    .split(',').map((item) => item.trim().toLowerCase()).filter(Boolean)
  const providers: EmbeddingProvider[] = []
  for (const name of configured) {
    const openaiKey = process.env.OPENAI_API_KEY
    if (name === 'openai' && isUsableKey(openaiKey)) providers.push(new OpenAIEmbeddingProvider(openaiKey))
    if (name !== 'openai' && name !== 'local' && name !== 'deterministic') console.warn('[RAG] Unknown embedding provider skipped', { provider: name })
  }
  return new FallbackEmbeddingProvider(providers)
}

let provider: EmbeddingProvider | undefined

export const getEmbeddingProvider = (): EmbeddingProvider => {
  if (!provider) provider = createEmbeddingProvider()
  return provider
}

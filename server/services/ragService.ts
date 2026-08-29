import { createHash } from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { chunkKnowledgeText, normalizeKnowledgeText } from './ragChunking.js'
import { getEmbeddingProvider } from './ragEmbeddings.js'
import { knowledgeCategories, type KnowledgeChunk, type KnowledgeDocument, type KnowledgeSearchInput, type RAGContext } from './ragTypes.js'

const maxQueryLength = 1000
const ragTimeoutMs = () => Math.max(1000, Number(process.env.RAG_TIMEOUT_MS) || 8000)
const retrievalCache = new Map<string, { expiresAt: number; result: KnowledgeChunk[] }>()
const retrievalInflight = new Map<string, Promise<KnowledgeChunk[]>>()
const cacheTtlMs = 60 * 1000

const boundedLimit = (limit: number | undefined) => Math.min(20, Math.max(1, Math.floor(limit ?? (Number(process.env.RAG_TOP_K) || 5))))
const boundedThreshold = (threshold: number | undefined) => Math.min(1, Math.max(0, Number.isFinite(threshold) ? threshold as number : Number(process.env.RAG_SIMILARITY_THRESHOLD) || 0.15))
const cleanOptional = (value: unknown, limit = 160) => typeof value === 'string' && value.trim() ? value.trim().slice(0, limit) : null

const validateDocument = (document: KnowledgeDocument) => {
  const title = cleanOptional(document.title, 240)
  const content = normalizeKnowledgeText(document.content)
  if (!title || !content) throw new Error('Knowledge documents require a title and non-empty content.')
  if (!knowledgeCategories.includes(document.category)) throw new Error('Knowledge document category is invalid.')
  if (content.length > 200000) throw new Error('Knowledge document content exceeds the 200000 character limit.')
  return { ...document, title, content, tags: (document.tags ?? []).filter((tag) => typeof tag === 'string').map((tag) => tag.trim()).filter(Boolean).slice(0, 30) }
}

const searchKey = (input: KnowledgeSearchInput) => createHash('sha256').update(JSON.stringify({
  query: input.query.trim().toLowerCase().replace(/\s+/g, ' '),
  role: input.role?.trim().toLowerCase() || null,
  skill: input.skill?.trim().toLowerCase() || null,
  category: input.category || null,
  difficulty: input.difficulty?.trim().toLowerCase() || null,
  limit: boundedLimit(input.limit),
  similarityThreshold: boundedThreshold(input.similarityThreshold),
  userId: input.userId || null,
})).digest('hex')

export const getSupabaseAdminClient = () => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('RAG ingestion requires server-side Supabase configuration.')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export async function ingestKnowledgeDocument(client: SupabaseClient, document: KnowledgeDocument) {
  const normalized = validateDocument(document)
  const chunks = chunkKnowledgeText(normalized.content)
  if (!chunks.length) throw new Error('Knowledge document did not produce searchable chunks.')
  const contentHash = createHash('sha256').update(JSON.stringify({ ...normalized, chunks })).digest('hex')
  const { data: existing, error: existingError } = await client
    .from('career_knowledge_chunks')
    .select('id')
    .eq('content_hash', contentHash)
    .limit(1)
  if (existingError) throw new Error(`Knowledge ingestion lookup failed: ${existingError.message}`)
  if (existing?.length) {
    console.log('[RAG] Ingestion skipped because content is unchanged', { documentHash: contentHash })
    return { documentHash: contentHash, chunkCount: chunks.length, skipped: true }
  }
  const embeddings = await withTimeout(getEmbeddingProvider().generateEmbeddings(chunks), ragTimeoutMs(), 'Embedding generation timed out.')
  const rows = chunks.map((content, chunkIndex) => ({
    title: normalized.title,
    user_id: normalized.userId ?? null,
    source_id: normalized.sourceId ?? null,
    category: normalized.category,
    role: cleanOptional(normalized.role),
    skill: cleanOptional(normalized.skill),
    technology: cleanOptional(normalized.technology),
    difficulty: cleanOptional(normalized.difficulty),
    source: cleanOptional(normalized.source, 500),
    source_type: cleanOptional(normalized.sourceType, 80),
    tags: normalized.tags,
    content,
    chunk_index: chunkIndex,
    content_hash: contentHash,
    embedding: embeddings[chunkIndex],
  }))
  const { data, error } = await client.from('career_knowledge_chunks').upsert(rows, { onConflict: 'content_hash,chunk_index' }).select('id, title, category, role, skill, technology, difficulty, source, source_type, tags, content, chunk_index')
  if (error) throw new Error(`Knowledge ingestion failed: ${error.message}`)
  return { documentHash: contentHash, chunkCount: data?.length ?? rows.length }
}

const searchKnowledgeInternal = async (client: SupabaseClient, input: KnowledgeSearchInput): Promise<KnowledgeChunk[]> => {
  const query = normalizeKnowledgeText(input.query).slice(0, maxQueryLength)
  if (!query) return []
  const limit = boundedLimit(input.limit)
  const embedding = await withTimeout(getEmbeddingProvider().generateEmbedding(query), ragTimeoutMs(), 'Embedding generation timed out.')
  const { data, error } = await withTimeout(client.rpc('match_career_knowledge_chunks', {
    query_embedding: embedding,
    match_count: limit,
    similarity_threshold: boundedThreshold(input.similarityThreshold),
    filter_category: input.category ?? null,
    filter_role: cleanOptional(input.role),
    filter_skill: cleanOptional(input.skill),
    filter_difficulty: cleanOptional(input.difficulty),
    filter_user_id: input.userId ?? null,
  }), ragTimeoutMs(), 'Knowledge retrieval timed out.')
  if (error) throw new Error(`Knowledge retrieval failed: ${error.message}`)
  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: Number(row.id),
    title: String(row.title ?? ''),
    userId: cleanOptional(row.user_id, 80),
    sourceId: cleanOptional(row.source_id, 160),
    category: row.category as KnowledgeChunk['category'],
    role: cleanOptional(row.role),
    skill: cleanOptional(row.skill),
    technology: cleanOptional(row.technology),
    difficulty: cleanOptional(row.difficulty),
    source: cleanOptional(row.source, 500),
    sourceType: cleanOptional(row.source_type, 80),
    tags: Array.isArray(row.tags) ? row.tags.filter((tag): tag is string => typeof tag === 'string') : [],
    content: String(row.content ?? ''),
    chunkIndex: Number(row.chunk_index ?? 0),
    similarity: Math.max(0, Math.min(1, Number(row.similarity ?? 0))),
  }))
}

export async function searchKnowledge(client: SupabaseClient, input: KnowledgeSearchInput): Promise<KnowledgeChunk[]> {
  const query = normalizeKnowledgeText(input.query).slice(0, maxQueryLength)
  if (!query) return []
  const key = searchKey({ ...input, query })
  const cached = retrievalCache.get(key)
  if (cached && cached.expiresAt > Date.now()) return cached.result
  let operation = retrievalInflight.get(key)
  if (!operation) {
    operation = searchKnowledgeInternal(client, { ...input, query })
    retrievalInflight.set(key, operation)
  }
  try {
    const result = await operation
    retrievalCache.set(key, { expiresAt: Date.now() + cacheTtlMs, result })
    return result
  } finally {
    if (retrievalInflight.get(key) === operation) retrievalInflight.delete(key)
  }
}

const retrievalUseful = (query: string) => /career|resume|skill|learn|roadmap|interview|job|role|technology|project|industry|salary|portfolio|ats|experience/i.test(query)

const withTimeout = async <T>(operation: PromiseLike<T>, milliseconds: number, message: string): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([operation, new Promise<T>((_, reject) => { timer = setTimeout(() => reject(new Error(message)), milliseconds) })])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export async function buildRAGContext(client: SupabaseClient, query: string, options: { limit?: number; userId?: string } = {}): Promise<RAGContext> {
  if (!retrievalUseful(query)) return { context: '', sources: [], retrievedCount: 0 }
  try {
    const chunks = await searchKnowledge(client, { query, limit: options.limit ?? 5, userId: options.userId })
    const unique = chunks.filter((chunk, index, all) => all.findIndex((item) => item.content === chunk.content) === index)
    return {
      context: unique.map((chunk, index) => `[Source ${index + 1}: ${chunk.title}]\n${chunk.content}`).join('\n\n').slice(0, 9000),
      sources: unique.map((chunk) => ({ id: chunk.id, title: chunk.title, category: chunk.category, relevance: chunk.similarity, source: chunk.source })),
      retrievedCount: unique.length,
    }
  } catch (error) {
    console.warn('[RAG] Retrieval unavailable; continuing without knowledge context.', { message: error instanceof Error ? error.message : 'unknown error' })
    return { context: '', sources: [], retrievedCount: 0 }
  }
}

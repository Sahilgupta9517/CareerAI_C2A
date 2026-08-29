import assert from 'node:assert/strict'
import { chunkKnowledgeText, normalizeKnowledgeText } from '../server/services/ragChunking.ts'
import { createEmbeddingProvider, DeterministicEmbeddingProvider, OpenAIEmbeddingProvider } from '../server/services/ragEmbeddings.ts'

const normalized = normalizeKnowledgeText('  Career\r\n\r\n\r\n  guidance   for   interviews  ')
assert.equal(normalized, 'Career\n\nguidance for interviews')

const chunks = chunkKnowledgeText('Paragraph one.\n\nParagraph two.\n\nParagraph three.', { chunkSize: 200, overlap: 20 })
assert.ok(chunks.length > 0)
assert.ok(chunks.every((chunk) => chunk.length >= 40 || chunks.length === 1))
assert.deepEqual(chunks, chunkKnowledgeText('Paragraph one.\n\nParagraph two.\n\nParagraph three.', { chunkSize: 200, overlap: 20 }))
assert.deepEqual(chunkKnowledgeText('   '), [])

const embeddings = new DeterministicEmbeddingProvider()
const first = await embeddings.generateEmbedding('React interview preparation')
const second = await embeddings.generateEmbedding('React interview preparation')
assert.equal(first.length, 128)
assert.deepEqual(first, second)

const originalFetch = globalThis.fetch
globalThis.fetch = async () => new Response(JSON.stringify({ data: [{ index: 0, embedding: Array.from({ length: 128 }, () => 0.01) }] }), { status: 200 })
const realProvider = new OpenAIEmbeddingProvider('test-key')
assert.equal((await realProvider.generateEmbedding('semantic career search')).length, 128)
globalThis.fetch = async () => new Response(JSON.stringify({ data: [{ index: 0, embedding: [0.1] }] }), { status: 200 })
await assert.rejects(() => realProvider.generateEmbedding('invalid vector'))
globalThis.fetch = async () => new Response('rate limited', { status: 429 })
await assert.rejects(() => realProvider.generateEmbedding('rate limited'))
const priorOrder = process.env.RAG_EMBEDDING_PROVIDER_ORDER
const priorKey = process.env.OPENAI_API_KEY
process.env.RAG_EMBEDDING_PROVIDER_ORDER = 'openai,local'
process.env.OPENAI_API_KEY = 'unit-test-credential'
const fallbackProvider = createEmbeddingProvider()
assert.equal((await fallbackProvider.generateEmbedding('fallback after provider failure')).length, 128)
if (priorOrder === undefined) delete process.env.RAG_EMBEDDING_PROVIDER_ORDER
else process.env.RAG_EMBEDDING_PROVIDER_ORDER = priorOrder
if (priorKey === undefined) delete process.env.OPENAI_API_KEY
else process.env.OPENAI_API_KEY = priorKey
globalThis.fetch = originalFetch

console.log('RAG verification passed')

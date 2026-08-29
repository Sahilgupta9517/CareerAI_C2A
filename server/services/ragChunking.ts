const normalizeWhitespace = (value: string) => value.replace(/\r\n/g, '\n').replace(/[ \t]*\n[ \t]*/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()

export type ChunkOptions = { chunkSize?: number; overlap?: number }

export const normalizeKnowledgeText = (value: unknown) => typeof value === 'string' ? normalizeWhitespace(value) : ''

export const chunkKnowledgeText = (value: unknown, options: ChunkOptions = {}): string[] => {
  const text = normalizeKnowledgeText(value)
  if (!text) return []
  const chunkSize = Math.max(200, Math.floor(options.chunkSize ?? (Number(process.env.RAG_CHUNK_SIZE) || 1200)))
  const overlap = Math.min(Math.floor(options.overlap ?? (Number(process.env.RAG_CHUNK_OVERLAP) || 150)), chunkSize - 1)
  const paragraphs = text.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean)
  const chunks: string[] = []
  let current = ''

  for (const paragraph of paragraphs) {
    if (!current) {
      current = paragraph
      continue
    }
    if (current.length + paragraph.length + 2 <= chunkSize) {
      current += `\n\n${paragraph}`
      continue
    }
    chunks.push(current)
    const suffix = current.slice(Math.max(0, current.length - overlap))
    current = `${suffix}\n\n${paragraph}`.trim()
    while (current.length > chunkSize) {
      chunks.push(current.slice(0, chunkSize).trim())
      current = current.slice(chunkSize - overlap).trim()
    }
  }
  if (current) chunks.push(current)
  return chunks.filter((chunk) => chunk.length >= Math.min(40, chunkSize))
}

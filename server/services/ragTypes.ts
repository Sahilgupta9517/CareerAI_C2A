export const knowledgeCategories = [
  'career_roles',
  'skills',
  'technologies',
  'interview_topics',
  'learning_resources',
  'career_guidance',
  'industry_trends',
  'project_guidance',
] as const

export type KnowledgeCategory = typeof knowledgeCategories[number]

export type KnowledgeMetadata = {
  title: string
  category: KnowledgeCategory
  userId?: string | null
  sourceId?: string | null
  role?: string | null
  skill?: string | null
  technology?: string | null
  difficulty?: string | null
  source?: string | null
  sourceType?: string | null
  tags?: string[]
  [key: string]: unknown
}

export type KnowledgeDocument = KnowledgeMetadata & {
  content: string
}

export type KnowledgeChunk = KnowledgeMetadata & {
  id: number
  content: string
  chunkIndex: number
  similarity: number
}

export type KnowledgeSearchInput = {
  query: string
  role?: string
  skill?: string
  category?: KnowledgeCategory
  difficulty?: string
  limit?: number
  similarityThreshold?: number
  userId?: string
}

export type RAGContext = {
  context: string
  sources: Array<{ id: number; title: string; category: KnowledgeCategory; relevance: number; source?: string | null }>
  retrievedCount: number
}

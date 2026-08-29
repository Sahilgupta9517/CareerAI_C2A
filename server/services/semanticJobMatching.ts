import { createHash } from 'node:crypto'
import type { NormalizedProviderJob } from './jobProvider.js'
import { getEmbeddingProvider } from './ragEmbeddings.js'

export type SemanticJobProfile = {
  userId: string
  targetRole: string
  skills: string[]
  experience?: string | null
  education?: string | null
  resumeText?: string | null
  preferences?: string | null
}

export type SemanticJobSignal = {
  semanticScore: number
  semanticMatchedSkills: string[]
  semanticMissingSkills: string[]
  semanticReason: string
}

const cache = new Map<string, { expiresAt: number; signals: Map<string, SemanticJobSignal> }>()
const cacheTtlMs = 60 * 1000

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9+#.]+/g, ' ').trim()
const tokens = (value: string) => new Set(normalize(value).split(/\s+/).filter((token) => token.length > 2))

const cosineSimilarity = (left: number[], right: number[]) => {
  if (left.length !== right.length || !left.length) return 0
  let dot = 0
  let leftMagnitude = 0
  let rightMagnitude = 0
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index]
    leftMagnitude += left[index] ** 2
    rightMagnitude += right[index] ** 2
  }
  return leftMagnitude && rightMagnitude ? Math.max(0, Math.min(1, dot / Math.sqrt(leftMagnitude * rightMagnitude))) : 0
}

const profileText = (profile: SemanticJobProfile) => [
  `Target role: ${profile.targetRole}`,
  `Skills: ${profile.skills.join(', ')}`,
  `Experience: ${profile.experience || ''}`,
  `Education: ${profile.education || ''}`,
  `Preferences: ${profile.preferences || ''}`,
  `Resume evidence: ${(profile.resumeText || '').slice(0, 5000)}`,
].join('\n')

export async function calculateSemanticJobSignals(profile: SemanticJobProfile, jobs: NormalizedProviderJob[]): Promise<Map<string, SemanticJobSignal>> {
  if (!jobs.length) return new Map()
  const careerText = profileText(profile)
  const cacheKey = createHash('sha256').update(JSON.stringify({ userId: profile.userId, careerText, jobs: jobs.map((job) => ({ id: job.id, title: job.title, description: job.description, skills: job.skills })) })).digest('hex')
  const cached = cache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) return cached.signals

  const provider = getEmbeddingProvider()
  const [profileEmbedding, jobEmbeddings] = await Promise.all([
    provider.generateEmbedding(careerText),
    provider.generateEmbeddings(jobs.map((job) => `${job.title}\n${job.description}\nSkills: ${job.skills.join(', ')}`)),
  ])
  const profileTokens = tokens(careerText)
  const signals = new Map<string, SemanticJobSignal>()
  jobs.forEach((job, index) => {
    const jobTokens = tokens(`${job.title} ${job.description} ${job.skills.join(' ')}`)
    const matchingSkills = job.skills.filter((skill) => profile.skills.some((candidate) => normalize(candidate) === normalize(skill) || profileTokens.has(normalize(skill))))
    const missingSkills = job.skills.filter((skill) => !matchingSkills.includes(skill)).slice(0, 5)
    const lexicalOverlap = [...jobTokens].filter((token) => profileTokens.has(token)).length / Math.max(1, jobTokens.size)
    const embeddingScore = cosineSimilarity(profileEmbedding, jobEmbeddings[index] ?? [])
    const semanticScore = Math.round(Math.max(0, Math.min(100, embeddingScore * 80 + lexicalOverlap * 20)))
    signals.set(job.id, {
      semanticScore,
      semanticMatchedSkills: matchingSkills.slice(0, 8),
      semanticMissingSkills: missingSkills,
      semanticReason: matchingSkills.length ? `Semantic profile alignment includes ${matchingSkills.slice(0, 3).join(', ')}.` : 'Semantic alignment is based on the supplied role, profile, and job description.',
    })
  })
  cache.set(cacheKey, { expiresAt: Date.now() + cacheTtlMs, signals })
  return signals
}

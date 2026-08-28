export type JobProviderStatus = 'available' | 'unavailable' | 'rate_limited' | 'unauthorized' | 'invalid_response' | 'timeout' | 'failed'

export interface NormalizedProviderJob {
  id: string
  title: string
  company: string
  location: string
  remote: boolean
  employmentType: string
  experienceLevel: string
  salary?: string
  description: string
  skills: string[]
  postedAt: string
  applyUrl?: string
  source: string
}

export interface JobProviderResult {
  jobs: NormalizedProviderJob[]
  page: number
  pageSize: number
  hasMore: boolean
  status: JobProviderStatus
  source: string
}

export interface JobProvider {
  readonly name: string
  search(input: { query?: string; location?: string; page?: number; pageSize?: number }): Promise<JobProviderResult>
}

export class JobProviderError extends Error {
  readonly status: JobProviderStatus
  readonly cause?: unknown
  constructor(status: JobProviderStatus, message: string, options?: { cause?: unknown }) {
    super(message)
    if (options && 'cause' in options) {
      this.cause = options.cause
    }
    this.status = status
    this.name = 'JobProviderError'
  }
}

const cache = new Map<string, { expiresAt: number; result: JobProviderResult }>()
const cacheTtlMs = 5 * 60 * 1000

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value))
const text = (value: unknown) => typeof value === 'string' ? value.trim() : ''
const validUrl = (value: unknown) => {
  const candidate = text(value)
  if (!candidate) return undefined
  try {
    const url = new URL(candidate)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : undefined
  } catch { return undefined }
}
const listValue = (value: unknown) => Array.isArray(value) ? value.flatMap((item) => typeof item === 'string' ? [item.trim()] : []) .filter(Boolean).slice(0, 30) : []

const extractJobs = (payload: unknown): { items: unknown[]; hasMore: boolean } => {
  if (Array.isArray(payload)) return { items: payload, hasMore: false }
  if (!isRecord(payload)) throw new JobProviderError('invalid_response', 'Job provider returned an invalid response.')
  const items = Array.isArray(payload.jobs) ? payload.jobs : Array.isArray(payload.results) ? payload.results : Array.isArray(payload.data) ? payload.data : null
  if (!items) throw new JobProviderError('invalid_response', 'Job provider returned no valid job collection.')
  return { items, hasMore: payload.hasMore === true || payload.nextPage !== null && payload.nextPage !== undefined }
}

const normalizeJob = (value: unknown, source: string, index: number): NormalizedProviderJob | null => {
  if (!isRecord(value)) return null
  const title = text(value.title ?? value.position ?? value.job_title)
  const company = text(value.company ?? value.companyName ?? value.employer_name ?? value.company_name)
  const description = text(value.description ?? value.snippet ?? value.summary)
  if (!title || !company || !description) return null
  const applyUrl = validUrl(value.applyUrl ?? value.apply_url ?? value.url ?? value.redirect_url ?? value.job_apply_link)
  const location = text(value.location ?? value.locationName ?? value.city ?? value.job_city) || 'Location not listed'
  const remote = value.remote === true || /remote/i.test(location) || /remote/i.test(text(value.workMode))
  const id = text(value.id ?? value.jobId ?? value.externalId ?? value.job_id ?? value.slug) || `${source}-${title}-${company}-${index}`
  return {
    id: `${source}:${id}`,
    title,
    company,
    location,
    remote,
    employmentType: text(value.employmentType ?? value.employment_type ?? value.type ?? value.job_employment_type) || 'Not listed',
    experienceLevel: text(value.experienceLevel ?? value.experience_level ?? value.experience ?? value.job_required_experience) || 'Not listed',
    salary: text(value.salary ?? value.salaryRange ?? value.job_min_salary) || undefined,
    description: description.slice(0, 1200),
    skills: listValue(value.skills ?? value.requiredSkills ?? value.tags ?? value.job_required_skills),
    postedAt: text(value.postedAt ?? value.posted_at ?? value.datePosted ?? value.created_at ?? value.job_posted_at_datetime_utc) || 'Recently posted',
    applyUrl,
    source,
  }
}

const deduplicate = (jobs: NormalizedProviderJob[]) => {
  const seen = new Set<string>()
  return jobs.filter((job) => {
    const key = `${job.title}|${job.company}|${job.location}`.toLowerCase().replace(/\s+/g, ' ')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export const normalizeProviderResponse = (payload: unknown, source: string) => {
  const extracted = extractJobs(payload)
  const jobs = deduplicate(extracted.items.flatMap((item, index) => {
    const job = normalizeJob(item, source, index)
    return job ? [job] : []
  }))
  return { jobs, hasMore: extracted.hasMore }
}

const fetchWithTimeout = async (input: string | URL, init: RequestInit, timeoutMs: number): Promise<Response> => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

const timeoutMs = () => Number(process.env.JOB_PROVIDER_TIMEOUT_MS) || 8000

// ─── Arbeitnow (Free, no auth required) ───────────────────────────────────────

export class ArbeitnowJobProvider implements JobProvider {
  readonly name = 'Arbeitnow'

  async search(input: { query?: string; location?: string; page?: number; pageSize?: number }): Promise<JobProviderResult> {
    const page = Math.max(1, input.page ?? 1)
    const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 25))
    const url = new URL('https://www.arbeitnow.com/api/job-board-api')
    url.searchParams.set('page', String(page))

    const cacheKey = `arbeitnow:${url.toString()}:${input.query ?? ''}`
    const cached = cache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) return cached.result

    try {
      const response = await fetchWithTimeout(url.toString(), {
        headers: { Accept: 'application/json' },
      }, timeoutMs())

      if (response.status === 429) throw new JobProviderError('rate_limited', 'Arbeitnow is rate limited.')
      if (!response.ok) throw new JobProviderError('failed', `Arbeitnow returned ${response.status}.`)

      const payload: unknown = await response.json()
      if (!isRecord(payload) || !Array.isArray(payload.data)) {
        throw new JobProviderError('invalid_response', 'Arbeitnow returned invalid data.')
      }

      // Arbeitnow response: { data: [...], links: { next: ... }, meta: { ... } }
      let items: unknown[] = payload.data
      const query = input.query?.toLowerCase()

      // Filter by query since Arbeitnow doesn't have search parameter
      if (query) {
        items = items.filter((item) => {
          if (!isRecord(item)) return false
          const title = text(item.title).toLowerCase()
          const company = text(item.company_name).toLowerCase()
          const description = text(item.description).toLowerCase()
          const tags = Array.isArray(item.tags) ? item.tags.join(' ').toLowerCase() : ''
          return title.includes(query) || company.includes(query) || description.includes(query) || tags.includes(query)
        })
      }

      const normalizedJobs = deduplicate(items.flatMap((item, index) => {
        if (!isRecord(item)) return []
        const job: NormalizedProviderJob | null = {
          id: `arbeitnow:${text(item.slug) || `job-${index}`}`,
          title: text(item.title),
          company: text(item.company_name),
          location: text(item.location) || 'Remote',
          remote: item.remote === true || /remote/i.test(text(item.location)),
          employmentType: Array.isArray(item.job_types) ? item.job_types.join(', ') : 'Full-time',
          experienceLevel: 'Not listed',
          description: text(item.description).slice(0, 1200),
          skills: listValue(item.tags),
          postedAt: text(item.created_at) || 'Recently posted',
          applyUrl: validUrl(item.url),
          source: 'Arbeitnow',
        }
        return job.title && job.company ? [job] : []
      })).slice(0, pageSize)

      const hasMore = isRecord(payload.links) && typeof payload.links.next === 'string'
      const result: JobProviderResult = { jobs: normalizedJobs, page, pageSize, hasMore, status: 'available', source: 'Arbeitnow' }
      cache.set(cacheKey, { expiresAt: Date.now() + cacheTtlMs, result })
      return result
    } catch (error) {
      if (error instanceof JobProviderError) throw error
      if (error instanceof Error && error.name === 'AbortError') throw new JobProviderError('timeout', 'Arbeitnow timed out.', { cause: error })
      throw new JobProviderError('failed', 'Arbeitnow could not be reached.', { cause: error })
    }
  }
}

// ─── RemoteOK (Free, no auth required) ────────────────────────────────────────

export class RemoteOKJobProvider implements JobProvider {
  readonly name = 'RemoteOK'

  async search(input: { query?: string; location?: string; page?: number; pageSize?: number }): Promise<JobProviderResult> {
    const page = Math.max(1, input.page ?? 1)
    const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 25))

    const cacheKey = `remoteok:${input.query ?? ''}:${page}`
    const cached = cache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) return cached.result

    try {
      const url = input.query
        ? `https://remoteok.com/api?tags=${encodeURIComponent(input.query)}`
        : 'https://remoteok.com/api'

      const response = await fetchWithTimeout(url, {
        headers: { Accept: 'application/json', 'User-Agent': 'CareerAI/1.0' },
      }, timeoutMs())

      if (response.status === 429) throw new JobProviderError('rate_limited', 'RemoteOK is rate limited.')
      if (!response.ok) throw new JobProviderError('failed', `RemoteOK returned ${response.status}.`)

      const payload: unknown = await response.json()
      if (!Array.isArray(payload)) throw new JobProviderError('invalid_response', 'RemoteOK returned invalid data.')

      // First element is usually a legal notice object, skip it
      const items = payload.filter((item) => isRecord(item) && text(item.position || item.title))
      const query = input.query?.toLowerCase()

      // Additional client-side filter
      const filtered = query
        ? items.filter((item) => {
          if (!isRecord(item)) return false
          const title = text(item.position).toLowerCase()
          const company = text(item.company).toLowerCase()
          const description = text(item.description).toLowerCase()
          const tags = Array.isArray(item.tags) ? item.tags.join(' ').toLowerCase() : ''
          return title.includes(query) || company.includes(query) || description.includes(query) || tags.includes(query)
        })
        : items

      // Manual pagination (RemoteOK returns all results)
      const start = (page - 1) * pageSize
      const paged = filtered.slice(start, start + pageSize)

      const normalizedJobs = deduplicate(paged.flatMap((item, index) => {
        if (!isRecord(item)) return []
        const job: NormalizedProviderJob = {
          id: `remoteok:${text(item.id) || `job-${start + index}`}`,
          title: text(item.position),
          company: text(item.company),
          location: text(item.location) || 'Remote',
          remote: true,
          employmentType: 'Full-time',
          experienceLevel: 'Not listed',
          salary: text(item.salary) || undefined,
          description: text(item.description).slice(0, 1200),
          skills: listValue(item.tags),
          postedAt: text(item.date) || 'Recently posted',
          applyUrl: validUrl(item.url) || (text(item.id) ? `https://remoteok.com/remote-jobs/${text(item.id)}` : undefined),
          source: 'RemoteOK',
        }
        return job.title && job.company ? [job] : []
      }))

      const hasMore = start + pageSize < filtered.length
      const result: JobProviderResult = { jobs: normalizedJobs, page, pageSize, hasMore, status: 'available', source: 'RemoteOK' }
      cache.set(cacheKey, { expiresAt: Date.now() + cacheTtlMs, result })
      return result
    } catch (error) {
      if (error instanceof JobProviderError) throw error
      if (error instanceof Error && error.name === 'AbortError') throw new JobProviderError('timeout', 'RemoteOK timed out.', { cause: error })
      throw new JobProviderError('failed', 'RemoteOK could not be reached.', { cause: error })
    }
  }
}

// ─── Adzuna (Free tier — needs App ID + Key) ─────────────────────────────────

export class AdzunaJobProvider implements JobProvider {
  readonly name = 'Adzuna'
  private readonly appId: string
  private readonly appKey: string
  private readonly country: string

  constructor(appId: string, appKey: string, country = 'in') {
    this.appId = appId
    this.appKey = appKey
    this.country = country
  }

  async search(input: { query?: string; location?: string; page?: number; pageSize?: number }): Promise<JobProviderResult> {
    const page = Math.max(1, input.page ?? 1)
    const pageSize = Math.min(50, Math.max(1, input.pageSize ?? 25))
    const url = new URL(`https://api.adzuna.com/v1/api/jobs/${this.country}/search/${page}`)
    url.searchParams.set('app_id', this.appId)
    url.searchParams.set('app_key', this.appKey)
    url.searchParams.set('results_per_page', String(pageSize))
    url.searchParams.set('content-type', 'application/json')
    if (input.query) url.searchParams.set('what', input.query)
    if (input.location) url.searchParams.set('where', input.location)

    const cacheKey = `adzuna:${url.toString()}`
    const cached = cache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) return cached.result

    try {
      const response = await fetchWithTimeout(url.toString(), {
        headers: { Accept: 'application/json' },
      }, timeoutMs())

      if (response.status === 401 || response.status === 403) throw new JobProviderError('unauthorized', 'Adzuna API key is invalid.')
      if (response.status === 429) throw new JobProviderError('rate_limited', 'Adzuna is rate limited.')
      if (!response.ok) throw new JobProviderError('failed', `Adzuna returned ${response.status}.`)

      const payload: unknown = await response.json()
      if (!isRecord(payload) || !Array.isArray(payload.results)) {
        throw new JobProviderError('invalid_response', 'Adzuna returned invalid data.')
      }

      const normalizedJobs = deduplicate((payload.results as unknown[]).flatMap((item, index) => {
        if (!isRecord(item)) return []
        const loc = isRecord(item.location) && Array.isArray(item.location.area) ? item.location.area.filter((a: unknown) => typeof a === 'string').join(', ') : text(item.location)
        const job: NormalizedProviderJob = {
          id: `adzuna:${text(item.id) || `job-${index}`}`,
          title: text(item.title),
          company: isRecord(item.company) ? text(item.company.display_name) : text(item.company),
          location: loc || 'Location not listed',
          remote: /remote/i.test(loc),
          employmentType: text(item.contract_type) || text(item.contract_time) || 'Full-time',
          experienceLevel: 'Not listed',
          salary: item.salary_min || item.salary_max ? `${item.salary_min ?? ''}–${item.salary_max ?? ''}` : undefined,
          description: text(item.description).slice(0, 1200),
          skills: listValue(item.category ? [isRecord(item.category) ? text(item.category.label) : text(item.category)] : []),
          postedAt: text(item.created) || 'Recently posted',
          applyUrl: validUrl(item.redirect_url),
          source: 'Adzuna',
        }
        return job.title && job.company ? [job] : []
      }))

      const totalCount = typeof payload.count === 'number' ? payload.count : 0
      const hasMore = page * pageSize < totalCount
      const result: JobProviderResult = { jobs: normalizedJobs, page, pageSize, hasMore, status: 'available', source: 'Adzuna' }
      cache.set(cacheKey, { expiresAt: Date.now() + cacheTtlMs, result })
      return result
    } catch (error) {
      if (error instanceof JobProviderError) throw error
      if (error instanceof Error && error.name === 'AbortError') throw new JobProviderError('timeout', 'Adzuna timed out.', { cause: error })
      throw new JobProviderError('failed', 'Adzuna could not be reached.', { cause: error })
    }
  }
}

// ─── JSearch via RapidAPI (Free tier — needs RapidAPI key) ────────────────────

export class JSearchJobProvider implements JobProvider {
  readonly name = 'JSearch'
  private readonly apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async search(input: { query?: string; location?: string; page?: number; pageSize?: number }): Promise<JobProviderResult> {
    const page = Math.max(1, input.page ?? 1)
    const pageSize = Math.min(20, Math.max(1, input.pageSize ?? 10)) // JSearch limits results
    const query = input.query || 'software developer'
    const url = new URL('https://jsearch.p.rapidapi.com/search')
    url.searchParams.set('query', input.location ? `${query} in ${input.location}` : query)
    url.searchParams.set('page', String(page))
    url.searchParams.set('num_pages', '1')

    const cacheKey = `jsearch:${url.toString()}`
    const cached = cache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) return cached.result

    try {
      const response = await fetchWithTimeout(url.toString(), {
        headers: {
          'X-RapidAPI-Key': this.apiKey,
          'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
          Accept: 'application/json',
        },
      }, timeoutMs())

      if (response.status === 401 || response.status === 403) throw new JobProviderError('unauthorized', 'JSearch API key is invalid.')
      if (response.status === 429) throw new JobProviderError('rate_limited', 'JSearch is rate limited.')
      if (!response.ok) throw new JobProviderError('failed', `JSearch returned ${response.status}.`)

      const payload: unknown = await response.json()
      if (!isRecord(payload) || !Array.isArray(payload.data)) {
        throw new JobProviderError('invalid_response', 'JSearch returned invalid data.')
      }

      const normalizedJobs = deduplicate((payload.data as unknown[]).flatMap((item, index) => {
        if (!isRecord(item)) return []
        const job: NormalizedProviderJob = {
          id: `jsearch:${text(item.job_id) || `job-${index}`}`,
          title: text(item.job_title),
          company: text(item.employer_name),
          location: [text(item.job_city), text(item.job_state), text(item.job_country)].filter(Boolean).join(', ') || 'Location not listed',
          remote: item.job_is_remote === true,
          employmentType: text(item.job_employment_type) || 'Full-time',
          experienceLevel: (() => { const exp = item.job_required_experience as Record<string, unknown> | null | undefined; const months = exp?.required_experience_in_months; return typeof months === 'number' ? `${Math.round(months / 12)} years` : 'Not listed' })(),
          salary: item.job_min_salary || item.job_max_salary ? `${item.job_min_salary ?? ''}–${item.job_max_salary ?? ''} ${text(item.job_salary_currency)}`.trim() : undefined,
          description: text(item.job_description).slice(0, 1200),
          skills: listValue(item.job_required_skills),
          postedAt: text(item.job_posted_at_datetime_utc) || 'Recently posted',
          applyUrl: validUrl(item.job_apply_link),
          source: 'JSearch',
        }
        return job.title && job.company ? [job] : []
      })).slice(0, pageSize)

      const hasMore = normalizedJobs.length >= pageSize
      const result: JobProviderResult = { jobs: normalizedJobs, page, pageSize, hasMore, status: 'available', source: 'JSearch' }
      cache.set(cacheKey, { expiresAt: Date.now() + cacheTtlMs, result })
      return result
    } catch (error) {
      if (error instanceof JobProviderError) throw error
      if (error instanceof Error && error.name === 'AbortError') throw new JobProviderError('timeout', 'JSearch timed out.', { cause: error })
      throw new JobProviderError('failed', 'JSearch could not be reached.', { cause: error })
    }
  }
}

// ─── REST provider (original, for custom endpoints) ──────────────────────────

export class RestJobProvider implements JobProvider {
  readonly name: string
  private readonly endpoint: string
  private readonly apiKey: string
  private readonly timeoutMs: number
  constructor(endpoint: string, apiKey: string, timeoutMs = 8000) {
    this.endpoint = endpoint
    this.apiKey = apiKey
    this.timeoutMs = timeoutMs
    this.name = process.env.JOB_PROVIDER_NAME || 'Configured Job Provider'
  }

  async search(input: { query?: string; location?: string; page?: number; pageSize?: number }): Promise<JobProviderResult> {
    const page = Math.max(1, input.page ?? 1)
    const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 25))
    const url = new URL(this.endpoint)
    url.searchParams.set('page', String(page)); url.searchParams.set('pageSize', String(pageSize))
    if (input.query) url.searchParams.set('query', input.query)
    if (input.location) url.searchParams.set('location', input.location)
    const cacheKey = url.toString()
    const cached = cache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) return cached.result
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs)
    try {
      const response = await fetch(url, { headers: { Accept: 'application/json', ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}) }, signal: controller.signal })
      if (response.status === 401 || response.status === 403) throw new JobProviderError('unauthorized', 'The configured job provider rejected the request.')
      if (response.status === 429) throw new JobProviderError('rate_limited', 'The configured job provider is rate limited.')
      if (!response.ok) throw new JobProviderError('failed', 'The configured job provider is unavailable.')
      const payload = await response.json().catch(() => { throw new JobProviderError('invalid_response', 'The configured job provider returned invalid JSON.') })
      const normalized = normalizeProviderResponse(payload, this.name)
      const result = { jobs: normalized.jobs, page, pageSize, hasMore: normalized.hasMore || normalized.jobs.length >= pageSize, status: 'available' as const, source: this.name }
      cache.set(cacheKey, { expiresAt: Date.now() + cacheTtlMs, result })
      return result
    } catch (error) {
      if (error instanceof JobProviderError) throw error
      if (error instanceof Error && error.name === 'AbortError') throw new JobProviderError('timeout', 'The configured job provider timed out.', { cause: error })
      throw new JobProviderError('failed', 'The configured job provider could not be reached.', { cause: error })
    } finally { clearTimeout(timeout) }
  }
}

// ─── Fallback provider — tries multiple providers in order ───────────────────

export class FallbackJobProvider implements JobProvider {
  readonly name = 'Fallback'
  private readonly providers: JobProvider[]

  constructor(providers: JobProvider[]) {
    this.providers = providers
  }

  async search(input: { query?: string; location?: string; page?: number; pageSize?: number }): Promise<JobProviderResult> {
    let lastError: unknown

    for (const provider of this.providers) {
      try {
        console.log(`[JobProvider] Trying: ${provider.name}`)
        const result = await provider.search(input)
        if (result.jobs.length > 0) {
          console.log(`[JobProvider] Success: ${provider.name} returned ${result.jobs.length} jobs`)
          return result
        }
        console.warn(`[JobProvider] ${provider.name} returned 0 jobs, trying next...`)
      } catch (error) {
        lastError = error
        const status = error instanceof JobProviderError ? error.status : 'failed'
        console.warn(`[JobProvider] ${provider.name} failed (${status}), trying next...`)
      }
    }

    throw lastError instanceof JobProviderError
      ? lastError
      : new JobProviderError('failed', 'All job providers failed.', { cause: lastError })
  }
}

// ─── Factory ─────────────────────────────────────────────────────────────────

const isValidKey = (key: string | undefined): key is string =>
  Boolean(key && !key.startsWith('your_') && key !== 'your_key_here')

export const createConfiguredJobProvider = (): JobProvider | null => {
  const providerType = (process.env.JOB_PROVIDER || '').toLowerCase()

  // Legacy single REST provider
  if (providerType === 'rest') {
    const endpoint = text(process.env.JOB_PROVIDER_URL)
    if (!endpoint || /your[-_]legitimate[-_]job[-_]api|your[-_].*example|example\.com/i.test(endpoint)) return null
    const url = validUrl(endpoint)
    if (!url) throw new JobProviderError('invalid_response', 'JOB_PROVIDER_URL must be an HTTPS URL.')
    return new RestJobProvider(url, process.env.JOB_PROVIDER_API_KEY || '', Number(process.env.JOB_PROVIDER_TIMEOUT_MS) || 8000)
  }

  if (providerType === 'demo' || providerType === '') return null

  // Fallback multi-provider chain
  const order = (process.env.JOB_PROVIDER_ORDER || 'arbeitnow,remoteok')
    .split(',')
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean)

  const providers: JobProvider[] = []

  for (const name of order) {
    if (name === 'adzuna') {
      const appId = process.env.ADZUNA_APP_ID
      const appKey = process.env.ADZUNA_APP_KEY
      if (isValidKey(appId) && isValidKey(appKey)) {
        providers.push(new AdzunaJobProvider(appId, appKey, process.env.ADZUNA_COUNTRY || 'in'))
      }
    }
    if (name === 'jsearch' || name === 'rapidapi') {
      const apiKey = process.env.JSEARCH_API_KEY
      if (isValidKey(apiKey)) {
        providers.push(new JSearchJobProvider(apiKey))
      }
    }
    if (name === 'arbeitnow') {
      providers.push(new ArbeitnowJobProvider())
    }
    if (name === 'remoteok') {
      providers.push(new RemoteOKJobProvider())
    }
  }

  // Always have at least Arbeitnow + RemoteOK (no keys needed)
  if (!providers.some((p) => p instanceof ArbeitnowJobProvider)) {
    providers.push(new ArbeitnowJobProvider())
  }
  if (!providers.some((p) => p instanceof RemoteOKJobProvider)) {
    providers.push(new RemoteOKJobProvider())
  }

  if (providers.length === 0) return null
  if (providers.length === 1) return providers[0]
  return new FallbackJobProvider(providers)
}

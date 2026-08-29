/**
 * Data service for job matching persistence
 * Handles loading and saving data from Supabase
 */

import { supabase } from './supabase'
import { sanitizeSkillList } from './resumeParser'
import type { CareerJobApplication, JobApplicationEvent, ApplicationAnalytics } from '@/types/jobs'

export type { CareerJobApplication, JobApplicationEvent, ApplicationAnalytics }

export type JobMatchingErrorKind = 'AUTH' | 'PROFILE' | 'CAREER_GOAL' | 'SKILLS' | 'RESUME' | 'AI_ANALYSIS' | 'SAVED_JOBS' | 'APPLICATION' | 'APPLICATION_QUERY' | 'APPLICATION_INSERT' | 'APPLICATION_UPDATE' | 'INTERVIEW' | 'EVALUATION' | 'COMPLETION' | 'HISTORY' | 'DETAILS' | 'DELETE'

export class JobMatchingError extends Error {
  public readonly kind: JobMatchingErrorKind

  constructor(kind: JobMatchingErrorKind, message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.kind = kind
    this.name = 'JobMatchingError'
  }
}

export type ApplicationStatus = 'saved' | 'applied' | 'screening' | 'interview' | 'assessment' | 'offer' | 'rejected'

export interface SavedJob {
  id: number
  profile_id: number
  job_id: string
  created_at: string
}

export interface JobApplication {
  id: number
  profile_id: number
  job_id: string
  status: ApplicationStatus
  applied_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CareerGoal {
  id: number
  profile_id: number
  target_role: string
  preferred_location: string | null
  work_preference: string | null
  goal_description: string | null
  created_at: string
  updated_at: string
}

export interface CareerAnalysis {
  id: number
  profile_id: number
  target_role: string
  career_summary: string
  strengths: Array<{ skill: string; reason: string }>
  skill_gaps: Array<{ skill: string; current_level: number; target_level: number; priority: string; reason: string }>
  recommended_skills: Array<{ skill: string; reason: string }>
  learning_strategy: Array<{ step: number; title: string; description: string }>
  recommended_roles: Array<{ role: string; match_percentage: number; reason: string }>
  interview_preparation: Array<{ topic: string; questions: string[] }>
  created_at: string
  updated_at: string
}

export interface JobAnalysisRecord {
  id: number
  profile_id?: number
  job_title: string
  company: string
  job_description: string
  extracted_skills: string[]
  extracted_responsibilities: string[]
  match_score: number
  analysis_type: 'jd_analysis' | 'resume_comparison'
  result: Record<string, unknown>
  created_at: string
  updated_at?: string
}

const applicationFailureMessage = (error: { code?: string; message?: string }) => {
  if (error.code === 'PGRST205') return 'Application tracking is not configured yet. Apply the existing job persistence migration, then retry.'
  if (error.code === '42501') return 'Application tracking is blocked by your account permissions. Please sign in again and retry.'
  return error.message || 'Application status could not be saved. Please try again.'
}

/**
 * Get the authenticated user's profile ID
 */
export async function getCurrentProfile() {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw new JobMatchingError('AUTH', 'Your session could not be verified.', { cause: userError })
  if (!userData.user) throw new JobMatchingError('AUTH', 'Your session has expired. Please sign in again.')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, user_id, name, education, branch, experience, location')
    .eq('user_id', userData.user.id)
    .limit(1)
    .maybeSingle()

  if (profileError) throw new JobMatchingError('PROFILE', 'Your profile could not be loaded.', { cause: profileError })

  if (!profile) {
    const { data: createdProfile, error: createError } = await supabase
      .from('profiles')
      .insert({ user_id: userData.user.id })
      .select('id, user_id, name, education, branch, experience, location')
      .single()

    if (createError) {
      throw new JobMatchingError('PROFILE', 'Your profile could not be created. Please complete your profile setup.', { cause: createError })
    }

    return createdProfile
  }

  return profile
}

/**
 * Get or create career goal
 */
export async function getCareerGoal(profileId: number): Promise<CareerGoal | null> {
  const { data, error } = await supabase
    .from('career_goals')
    .select('*')
    .eq('profile_id', profileId)
    .limit(1)
    .maybeSingle()

  if (error) throw new JobMatchingError('CAREER_GOAL', 'Your target role could not be loaded.', { cause: error })
  return data
}

/**
 * Update or create career goal with target role
 */
export async function setTargetRole(profileId: number, targetRole: string): Promise<CareerGoal> {
  const { data: existing } = await supabase
    .from('career_goals')
    .select('id')
    .eq('profile_id', profileId)
    .limit(1)
    .maybeSingle()

  if (existing) {
    // Update existing
    const { data, error } = await supabase
      .from('career_goals')
      .update({ target_role: targetRole, updated_at: new Date().toISOString() })
      .eq('profile_id', profileId)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    // Insert new
    const { data, error } = await supabase
      .from('career_goals')
      .insert({
        profile_id: profileId,
        target_role: targetRole,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }
}

/**
 * Get the latest career analysis for a target role
 */
export async function getLatestCareerAnalysis(profileId: number, targetRole: string): Promise<CareerAnalysis | null> {
  const { data, error } = await supabase
    .from('career_analyses')
    .select('*')
    .eq('profile_id', profileId)
    .eq('target_role', targetRole)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new JobMatchingError('AI_ANALYSIS', 'Career Analysis could not be loaded for the current target role.', { cause: error })
  return data
}

/**
 * Get all saved jobs for a profile
 */
export async function getSavedJobs(profileId: number): Promise<string[]> {
  const { data, error } = await supabase
    .from('saved_jobs')
    .select('job_id')
    .eq('profile_id', profileId)

  if (error) throw new JobMatchingError('SAVED_JOBS', 'Saved jobs could not be loaded.', { cause: error })
  return data?.map(row => row.job_id) ?? []
}

/**
 * Save a job
 */
export async function saveJob(profileId: number, jobId: string): Promise<SavedJob> {
  const { data, error } = await supabase
    .from('saved_jobs')
    .insert({ profile_id: profileId, job_id: jobId })
    .select()
    .single()

  if (error && error.code !== '23505') throw error // 23505 = unique constraint, job already saved
  if (error && error.code === '23505') {
    // Job already saved, return existing
    const { data: existing } = await supabase
      .from('saved_jobs')
      .select()
      .eq('profile_id', profileId)
      .eq('job_id', jobId)
      .single()
    return existing
  }
  return data
}

/**
 * Unsave a job
 */
export async function unsaveJob(profileId: number, jobId: string): Promise<void> {
  const { error } = await supabase
    .from('saved_jobs')
    .delete()
    .eq('profile_id', profileId)
    .eq('job_id', jobId)

  if (error) throw error
}

/**
 * Get all job applications for a profile
 */
export async function getJobApplications(profileId: number): Promise<JobApplication[]> {
  const { data, error } = await supabase
    .from('job_applications')
    .select('id, profile_id, job_id, status, applied_at, notes, created_at, updated_at')
    .eq('profile_id', profileId)
    .order('updated_at', { ascending: false })

  if (error) {
    logJobMatchingError('APPLICATION_QUERY', error)
    throw new JobMatchingError('APPLICATION_QUERY', applicationFailureMessage(error), { cause: error })
  }
  return (data ?? []).map((row) => ({
    ...row,
    status: row.status as ApplicationStatus,
    applied_at: row.applied_at ?? null,
    notes: row.notes ?? null,
  }))
}

/**
 * Get application status for a job
 */
export async function getApplicationStatus(profileId: number, jobId: string): Promise<ApplicationStatus | null> {
  const { data, error } = await supabase
    .from('job_applications')
    .select('status')
    .eq('profile_id', profileId)
    .eq('job_id', jobId)
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data?.status ?? null
}

/**
 * Update or create job application
 */
export async function updateJobApplication(
  profileId: number,
  jobId: string,
  status: ApplicationStatus,
  notes?: string,
): Promise<JobApplication> {
  const now = new Date().toISOString()
  const payload = {
    profile_id: profileId,
    job_id: jobId,
    status,
    notes: notes ?? null,
    updated_at: now,
    ...(status === 'applied' ? { applied_at: now } : {}),
  }
  const { data, error } = await supabase
    .from('job_applications')
    .upsert(payload, { onConflict: 'profile_id,job_id' })
    .select('id, profile_id, job_id, status, applied_at, notes, created_at, updated_at')
    .single()

  if (error) {
    const kind = error.code === '23505' ? 'APPLICATION_INSERT' : 'APPLICATION_UPDATE'
    logJobMatchingError(kind, error)
    throw new JobMatchingError(kind, applicationFailureMessage(error), { cause: error })
  }
  return { ...data, status: data.status as ApplicationStatus, applied_at: data.applied_at ?? null, notes: data.notes ?? null }
}

/**
 * Load all user-specific data needed for job matching
 */
export async function loadUserJobMatchingData(profileId: number) {
  const careerGoal = await getCareerGoal(profileId)
  const userSkills = await loadUserSkills(profileId)
  let savedJobIds: string[] = []

  try {
    savedJobIds = await getSavedJobs(profileId)
  } catch (error) {
    logJobMatchingError('SAVED_JOBS', error)
  }

  return {
    careerGoal,
    targetRole: careerGoal?.target_role ?? '',
    userSkills,
    savedJobIds,
  }
}

/**
 * Load user skills from Supabase
 */
async function loadUserSkills(profileId: number): Promise<string[]> {
  const skillsResponse = await supabase
    .from('user_skills')
    .select('id, skill_id, proficiency, skill:skills(id, name, category)')
    .eq('profile_id', profileId)
  let rawSkillData: unknown[] = skillsResponse.data ?? []

  if (skillsResponse.error) {
    logJobMatchingError('SKILLS', skillsResponse.error)
    const directResponse = await supabase
      .from('user_skills')
      .select('id, skill_id, proficiency')
      .eq('profile_id', profileId)
    if (directResponse.error) {
      logJobMatchingError('SKILLS', directResponse.error)
      throw new JobMatchingError('SKILLS', 'Your saved skills could not be loaded.', { cause: directResponse.error })
    }
    rawSkillData = (directResponse.data ?? []).map((row) => ({ ...row, skill: null }))
  }

  type SkillRow = { id?: number; skill_id: number; proficiency?: number | null; skill?: { id: number; name: string; category: string | null } | Array<{ id: number; name: string; category: string | null }> | null }
  const rows = rawSkillData as SkillRow[]
  const relationSkills = rows.flatMap((row) => Array.isArray(row.skill) ? row.skill : row.skill ? [row.skill] : [])
  let skillLookup = new Map(relationSkills.map((skill) => [skill.id, skill]))

  // PostgREST may not expose the relationship in every deployed schema. Resolve by FK
  // without inventing names, while retaining the same authenticated profile scope.
  if (relationSkills.length < rows.length) {
    const skillIds = [...new Set(rows.map((row) => row.skill_id).filter((id) => Number.isFinite(id)))]
    if (skillIds.length) {
      const directResponse = await supabase.from('skills').select('id, name, category').in('id', skillIds)
      if (directResponse.error) {
        logJobMatchingError('SKILLS', directResponse.error)
        throw new JobMatchingError('SKILLS', 'Your saved skills could not be resolved to the skills catalog.', { cause: directResponse.error })
      }
      skillLookup = new Map((directResponse.data ?? []).map((skill) => [skill.id, skill]))
    }
  }

  const savedSkills = sanitizeSkillList(rows
    .map((row) => skillLookup.get(row.skill_id)?.name)
    .filter((name): name is string => Boolean(name && name.trim())))

  let resumeSkills: string[] = []
  try {
    const { data: latestResume, error: resumeError } = await supabase
      .from('resume_analyses')
      .select('structured_resume')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (resumeError) throw resumeError
    const persisted = latestResume?.structured_resume
    const persistedSkills =
      persisted && typeof persisted === 'object' && 'technicalSkills' in persisted && Array.isArray(persisted.technicalSkills)
        ? sanitizeSkillList(persisted.technicalSkills)
        : []
    resumeSkills = persistedSkills
  } catch (error) {
    logJobMatchingError('RESUME', error)
    resumeSkills = []
  }

  const seen = new Set<string>()
  return [...savedSkills, ...resumeSkills].filter((skill) => {
    const key = skill.trim().toLowerCase()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function logJobMatchingError(kind: JobMatchingErrorKind, error: unknown) {
  if (import.meta.env.DEV) console.error(`[JobMatching] ${kind} load failed:`, error)
}

const LOCAL_JOB_ANALYSES_KEY = 'careerai_local_job_analyses'

export async function saveJobAnalysis(
  profileId: number,
  analysis: Omit<JobAnalysisRecord, 'id' | 'created_at' | 'updated_at' | 'profile_id'>
): Promise<JobAnalysisRecord> {
  const newRecord: JobAnalysisRecord = {
    id: Date.now(),
    profile_id: profileId,
    ...analysis,
    created_at: new Date().toISOString(),
  }

  try {
    const { data, error } = await supabase
      .from('job_analyses')
      .insert({
        profile_id: profileId,
        job_title: analysis.job_title,
        company: analysis.company,
        job_description: analysis.job_description,
        extracted_skills: analysis.extracted_skills,
        extracted_responsibilities: analysis.extracted_responsibilities,
        match_score: analysis.match_score,
        analysis_type: analysis.analysis_type,
        result: analysis.result,
      })
      .select()
      .single()

    if (error) throw error
    if (data) return data as JobAnalysisRecord
  } catch (error) {
    if (import.meta.env.DEV) console.warn('[JobMatching] DB save failed, saving to local offline storage:', error)
  }

  // Fallback to local storage
  try {
    const existing: JobAnalysisRecord[] = JSON.parse(localStorage.getItem(LOCAL_JOB_ANALYSES_KEY) || '[]')
    const updated = [newRecord, ...existing.filter((item) => item.id !== newRecord.id)].slice(0, 30)
    localStorage.setItem(LOCAL_JOB_ANALYSES_KEY, JSON.stringify(updated))
  } catch {
    // Ignore storage quota errors
  }

  return newRecord
}

export async function getJobAnalyses(profileId: number): Promise<JobAnalysisRecord[]> {
  let dbAnalyses: JobAnalysisRecord[] = []
  try {
    const { data, error } = await supabase
      .from('job_analyses')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
      .limit(30)

    if (!error && data) {
      dbAnalyses = data as JobAnalysisRecord[]
    }
  } catch (error) {
    if (import.meta.env.DEV) console.warn('[JobMatching] Could not fetch job_analyses from DB:', error)
  }

  try {
    const localAnalyses: JobAnalysisRecord[] = JSON.parse(localStorage.getItem(LOCAL_JOB_ANALYSES_KEY) || '[]')
    const combined = [...dbAnalyses]
    localAnalyses.forEach((local) => {
      if (!combined.some((item) => item.job_title === local.job_title && item.analysis_type === local.analysis_type)) {
        combined.push(local)
      }
    })
    return combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  } catch {
    return dbAnalyses
  }
}

export async function deleteJobAnalysis(profileId: number, analysisId: number): Promise<void> {
  try {
    await supabase.from('job_analyses').delete().eq('id', analysisId).eq('profile_id', profileId)
  } catch {
    // Ignore
  }

  try {
    const existing: JobAnalysisRecord[] = JSON.parse(localStorage.getItem(LOCAL_JOB_ANALYSES_KEY) || '[]')
    const updated = existing.filter((item) => item.id !== analysisId)
    localStorage.setItem(LOCAL_JOB_ANALYSES_KEY, JSON.stringify(updated))
  } catch {
    // Ignore
  }
}

const LOCAL_CAREER_APPS_KEY = 'careerai_career_job_applications'
const LOCAL_APP_EVENTS_KEY = 'careerai_job_application_events'

export async function createCareerApplication(
  profileId: number,
  appData: Partial<CareerJobApplication>
): Promise<CareerJobApplication> {
  const companyName = (appData.company_name || 'Target Employer').trim()
  const jobTitle = (appData.job_title || 'Position').trim()
  const now = new Date().toISOString()

  // Deterministic duplicate check in existing applications
  const existingApps = await getCareerApplications(profileId)
  const duplicate = existingApps.find(
    (app) =>
      (app.company_name.toLowerCase() === companyName.toLowerCase() &&
        app.job_title.toLowerCase() === jobTitle.toLowerCase()) ||
      (appData.job_url && app.job_url && app.job_url.trim().toLowerCase() === appData.job_url.trim().toLowerCase())
  )

  if (duplicate) {
    throw new JobMatchingError('APPLICATION_INSERT', `An application for "${jobTitle}" at "${companyName}" is already being tracked.`)
  }

  const payload = {
    profile_id: profileId,
    company_name: companyName,
    job_title: jobTitle,
    job_url: appData.job_url || '',
    location: appData.location || 'Remote',
    employment_type: appData.employment_type || 'Full-time',
    salary_text: appData.salary_text || '',
    description: appData.description || '',
    source: appData.source || 'Manual',
    status: appData.status || 'saved',
    priority: appData.priority || 'MEDIUM',
    applied_at: appData.status === 'applied' ? now : appData.applied_at || null,
    interview_at: appData.interview_at || null,
    notes: appData.notes || '',
    recruiter_notes: appData.recruiter_notes || '',
    follow_up_at: appData.follow_up_at || null,
    updated_at: now,
  }

  try {
    const { data, error } = await supabase
      .from('career_job_applications')
      .insert(payload)
      .select()
      .single()

    if (!error && data) {
      const createdApp = data as CareerJobApplication
      void addApplicationEvent(profileId, createdApp.id, 'created', `Tracked ${jobTitle} at ${companyName}`)
      return createdApp
    }
  } catch (error) {
    if (import.meta.env.DEV) console.warn('[ApplicationTracker] DB insert failed, writing to local storage:', error)
  }

  // Local storage fallback
  const fallbackRecord: CareerJobApplication = {
    id: Date.now(),
    ...payload,
    created_at: now,
    updated_at: now,
  }

  try {
    const local: CareerJobApplication[] = JSON.parse(localStorage.getItem(LOCAL_CAREER_APPS_KEY) || '[]')
    localStorage.setItem(LOCAL_CAREER_APPS_KEY, JSON.stringify([fallbackRecord, ...local]))
    void addApplicationEvent(profileId, fallbackRecord.id, 'created', `Tracked ${jobTitle} at ${companyName}`)
  } catch {
    // Ignore quota limits
  }

  return fallbackRecord
}

export async function getCareerApplications(profileId: number): Promise<CareerJobApplication[]> {
  let dbApps: CareerJobApplication[] = []
  try {
    const { data, error } = await supabase
      .from('career_job_applications')
      .select('*')
      .eq('profile_id', profileId)
      .order('updated_at', { ascending: false })

    if (!error && data) {
      dbApps = data as CareerJobApplication[]
    }
  } catch (error) {
    if (import.meta.env.DEV) console.warn('[ApplicationTracker] DB fetch error:', error)
  }

  try {
    const localApps: CareerJobApplication[] = JSON.parse(localStorage.getItem(LOCAL_CAREER_APPS_KEY) || '[]')
    const combined = [...dbApps]
    localApps.forEach((local) => {
      if (!combined.some((item) => item.id === local.id || (item.company_name === local.company_name && item.job_title === local.job_title))) {
        combined.push(local)
      }
    })
    return combined.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
  } catch {
    return dbApps
  }
}

export async function updateCareerApplication(
  profileId: number,
  id: number,
  updates: Partial<CareerJobApplication>
): Promise<CareerJobApplication> {
  const now = new Date().toISOString()
  const payload = { ...updates, updated_at: now }

  if (updates.status === 'applied' && !updates.applied_at) {
    payload.applied_at = now
  }

  try {
    const { data, error } = await supabase
      .from('career_job_applications')
      .update(payload)
      .eq('id', id)
      .eq('profile_id', profileId)
      .select()
      .single()

    if (!error && data) {
      const updated = data as CareerJobApplication
      if (updates.status) {
        void addApplicationEvent(profileId, id, 'status_change', `Status changed to ${updates.status.toUpperCase()}`)
      }
      if (updates.notes) {
        void addApplicationEvent(profileId, id, 'note', `Updated application notes`)
      }
      if (updates.follow_up_at) {
        void addApplicationEvent(profileId, id, 'follow_up', `Scheduled follow-up for ${new Date(updates.follow_up_at).toLocaleDateString()}`)
      }
      return updated
    }
  } catch (error) {
    if (import.meta.env.DEV) console.warn('[ApplicationTracker] DB update error:', error)
  }

  // Fallback local update
  const local: CareerJobApplication[] = JSON.parse(localStorage.getItem(LOCAL_CAREER_APPS_KEY) || '[]')
  const index = local.findIndex((item) => item.id === id)
  if (index !== -1) {
    const updated = { ...local[index], ...payload, updated_at: now } as CareerJobApplication
    local[index] = updated
    localStorage.setItem(LOCAL_CAREER_APPS_KEY, JSON.stringify(local))
    if (updates.status) {
      void addApplicationEvent(profileId, id, 'status_change', `Status changed to ${updates.status.toUpperCase()}`)
    }
    if (updates.notes) {
      void addApplicationEvent(profileId, id, 'note', `Updated application notes`)
    }
    if (updates.follow_up_at) {
      void addApplicationEvent(profileId, id, 'follow_up', `Scheduled follow-up for ${new Date(updates.follow_up_at).toLocaleDateString()}`)
    }
    return updated
  }

  throw new JobMatchingError('APPLICATION_UPDATE', 'Application record not found.')
}

export async function deleteCareerApplication(profileId: number, id: number): Promise<void> {
  try {
    await supabase.from('career_job_applications').delete().eq('id', id).eq('profile_id', profileId)
  } catch {
    // Ignore DB delete error
  }

  try {
    const local: CareerJobApplication[] = JSON.parse(localStorage.getItem(LOCAL_CAREER_APPS_KEY) || '[]')
    const updated = local.filter((item) => item.id !== id)
    localStorage.setItem(LOCAL_CAREER_APPS_KEY, JSON.stringify(updated))
  } catch {
    // Ignore local error
  }
}

export async function addApplicationEvent(
  profileId: number,
  appId: number,
  eventType: string,
  note?: string
): Promise<JobApplicationEvent> {
  const event: JobApplicationEvent = {
    id: Date.now(),
    application_id: appId,
    profile_id: profileId,
    event_type: eventType as any,
    note: note || '',
    created_at: new Date().toISOString(),
  }

  try {
    const { data } = await supabase
      .from('job_application_events')
      .insert({
        application_id: appId,
        profile_id: profileId,
        event_type: eventType,
        note: note || '',
      })
      .select()
      .single()
    if (data) return data as JobApplicationEvent
  } catch {
    // Fallback to local storage
  }

  try {
    const events: JobApplicationEvent[] = JSON.parse(localStorage.getItem(LOCAL_APP_EVENTS_KEY) || '[]')
    localStorage.setItem(LOCAL_APP_EVENTS_KEY, JSON.stringify([event, ...events]))
  } catch {
    // Ignore quota
  }

  return event
}

export async function getApplicationEvents(_profileId: number, appId: number): Promise<JobApplicationEvent[]> {
  let dbEvents: JobApplicationEvent[] = []
  try {
    const { data } = await supabase
      .from('job_application_events')
      .select('*')
      .eq('application_id', appId)
      .order('created_at', { ascending: false })
    if (data) dbEvents = data as JobApplicationEvent[]
  } catch {
    // Ignore
  }

  try {
    const localEvents: JobApplicationEvent[] = JSON.parse(localStorage.getItem(LOCAL_APP_EVENTS_KEY) || '[]')
    const filtered = localEvents.filter((item) => item.application_id === appId)
    const combined = [...dbEvents]
    filtered.forEach((f) => {
      if (!combined.some((item) => item.id === f.id)) combined.push(f)
    })
    return combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  } catch {
    return dbEvents
  }
}

export function getCareerApplicationAnalytics(applications: CareerJobApplication[]): ApplicationAnalytics {
  const total = applications.length
  const byStatus: Record<string, number> = {
    interested: 0,
    saved: 0,
    applied: 0,
    screening: 0,
    interview: 0,
    technical_round: 0,
    final_round: 0,
    offer: 0,
    rejected: 0,
    withdrawn: 0,
  }
  const byRole: Record<string, number> = {}
  const bySource: Record<string, number> = {}

  let activeCount = 0
  let interviewsCount = 0
  let offersCount = 0

  const nowMs = Date.now()
  const weekMs = 7 * 24 * 60 * 60 * 1000
  const monthMs = 30 * 24 * 60 * 60 * 1000

  let weeklyCount = 0
  let monthlyCount = 0

  let totalDaysToInterview = 0
  let interviewCountWithDates = 0

  applications.forEach((app) => {
    byStatus[app.status] = (byStatus[app.status] || 0) + 1
    byRole[app.job_title] = (byRole[app.job_title] || 0) + 1
    bySource[app.source || 'Manual'] = (bySource[app.source || 'Manual'] || 0) + 1

    if (['applied', 'screening', 'interview', 'technical_round', 'final_round'].includes(app.status)) activeCount++
    if (['screening', 'interview', 'technical_round', 'final_round'].includes(app.status)) interviewsCount++
    if (app.status === 'offer') offersCount++

    if (app.applied_at && (app.interview_at || app.status === 'interview' || app.status === 'technical_round' || app.status === 'final_round')) {
      const appTime = new Date(app.applied_at).getTime()
      const intTime = new Date(app.interview_at || app.updated_at).getTime()
      if (intTime >= appTime) {
        totalDaysToInterview += (intTime - appTime) / (1000 * 60 * 60 * 24)
        interviewCountWithDates++
      }
    }

    const appTime = new Date(app.created_at).getTime()
    if (nowMs - appTime <= weekMs) weeklyCount++
    if (nowMs - appTime <= monthMs) monthlyCount++
  })

  const responseRatePct = total > 0 ? Math.round(((byStatus.screening + byStatus.interview + byStatus.technical_round + byStatus.final_round + byStatus.offer + byStatus.rejected) / total) * 100) : 0
  const interviewRatePct = total > 0 ? Math.round(((byStatus.screening + byStatus.interview + byStatus.technical_round + byStatus.final_round + byStatus.offer) / total) * 100) : 0
  const offerRatePct = total > 0 ? Math.round((byStatus.offer / total) * 100) : 0
  const avgDaysToInterview = interviewCountWithDates > 0 ? Math.round(totalDaysToInterview / interviewCountWithDates) : undefined

  return {
    total,
    activeCount,
    interviewsCount,
    offersCount,
    responseRatePct,
    interviewRatePct,
    offerRatePct,
    byStatus,
    byRole,
    bySource,
    weeklyCount,
    monthlyCount,
    avgDaysToInterview,
  }
}



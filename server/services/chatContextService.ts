import type { SupabaseClient } from '@supabase/supabase-js'
import type { RAGContext } from './ragTypes.js'

export type ChatContextPage = 'dashboard' | 'resume' | 'career-analysis' | 'skill-gap' | 'roadmap' | 'interviews' | 'jobs' | 'profile' | string

export type ChatContext = {
  page: string | null
  agentIntent?: 'resume_analysis' | 'skill_gap' | 'learning_plan' | 'interview_preparation' | 'job_recommendation' | 'job_explanation' | 'job_coach' | 'saved_jobs' | 'application_tracking' | 'application_attention' | 'career_progress' | 'career_next_step' | 'project_recommendation' | 'general_career_question'
  profile?: { name: string | null; education: string | null; branch: string | null; experience: string | null; location: string | null }
  careerGoal?: { target_role: string | null; goal_description: string | null; work_preference: string | null; preferred_location: string | null }
  skills?: Array<{ name: string; proficiency: number }>
  skillGap?: unknown
  resume?: { filename: string; extracted_text: string | null; detected_skills: unknown; strengths: unknown; improvements: unknown; ai_summary: string | null }
  careerAnalysis?: unknown
  roadmap?: unknown
  interviews?: unknown
  jobs?: unknown
  savedJobs?: unknown[]
  applications?: unknown[]
  rag?: RAGContext
}

const text = (value: unknown, limit: number) => typeof value === 'string' ? value.slice(0, limit) : null
const list = (value: unknown, limit: number) => Array.isArray(value) ? value.slice(0, limit) : []

export const intentFor = (message: string): ChatContext['agentIntent'] => {
  const value = message.toLowerCase()
  if (/30[- ]day|monthly plan|career plan/.test(value)) return 'learning_plan'
  if (/today|this week|focus|focus on/.test(value)) return 'career_next_step'
  if (/am i ready|job ready|readiness|ready for/.test(value)) return 'career_progress'
  if (/compare.*(resume|cv)|resume.*(vs|against).*job|match.*my.*resume/.test(value)) return 'job_coach'
  if (/analyze.*(job|description|jd)|parse.*(job|jd)/.test(value)) return 'job_explanation'
  if (/prepare.*(for.*job|me.*for)|coach|job.*interview.*prep/.test(value)) return 'job_coach'
  if (/saved.*job|bookmark|my.*saved/.test(value)) return 'saved_jobs'
  if (/attention|stalled|pending.*app|review.*app|which.*app/.test(value) && /app/.test(value)) return 'application_attention'
  if (/application|status|tracker|applied|screening|offer|pipeline/.test(value)) return 'application_tracking'
  if (/why.*(job|role|match)|match.*(me|fit)|fit.*(job|role)|why.*score.*low/.test(value)) return 'job_explanation'
  if (/recommend|find|suggest|show.*(job|role)|what jobs|best match|which job/.test(value)) return 'job_recommendation'
  if (/project|portfolio/.test(value) && /gap|missing|build|suggest/.test(value)) return 'project_recommendation'
  if (/interview|question|answer|prepare/.test(value)) return 'interview_preparation'
  if (/roadmap|plan|week|learning/.test(value)) return 'learning_plan'
  if (/next step|what should i do next|what to do next|what.*improve first|next action|how.*improve.*match/.test(value)) return 'career_next_step'
  if (/progress|readiness|how ready|score|why.*low|career score|growth trend|health score/.test(value)) return 'career_progress'
  if (/skill|gap|prioritize|which skills|what skills am i missing|study/.test(value)) return 'skill_gap'
  if (/resume|cv|ats|experience|summary/.test(value)) return 'resume_analysis'
  return 'general_career_question'
}

export async function buildChatContext(client: SupabaseClient, message: string, page: ChatContextPage | null): Promise<ChatContext> {
  const agentIntent = intentFor(message)
  const intent = {
    resume: agentIntent === 'resume_analysis',
    skillGap: agentIntent === 'skill_gap' || agentIntent === 'project_recommendation',
    careerAnalysis: agentIntent === 'career_progress' || agentIntent === 'career_next_step',
    roadmap: agentIntent === 'learning_plan',
    interviews: agentIntent === 'interview_preparation',
    jobs: agentIntent === 'job_recommendation' || agentIntent === 'job_explanation' || agentIntent === 'job_coach' || agentIntent === 'saved_jobs' || agentIntent === 'application_tracking' || agentIntent === 'application_attention' || page === 'jobs',
  }
  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('id, name, education, branch, experience, location')
    .limit(1)
    .maybeSingle()
  if (profileError || !profile) throw new Error('Your CareerAI profile could not be loaded.')

  const context: ChatContext = { page: page || null, agentIntent }
  const needsProfile = true
  const needsSkills = needsProfile || intent.skillGap || intent.careerAnalysis || intent.jobs || intent.interviews
  const needsGoal = needsProfile || intent.skillGap || intent.careerAnalysis || intent.jobs || intent.roadmap || intent.interviews
  const needsResume = intent.resume || page === 'resume' || intent.skillGap || intent.interviews || intent.jobs
  const needsAnalysis = intent.careerAnalysis || intent.skillGap || intent.roadmap || page === 'career-analysis'
  const needsRoadmap = intent.roadmap || page === 'roadmap'
  const needsInterviews = intent.interviews || page === 'interviews'
  const needsJobs = intent.jobs

  const queries = await Promise.all([
    needsSkills ? client.from('user_skills').select('proficiency, skill:skills(name)').eq('profile_id', profile.id) : Promise.resolve({ data: [], error: null }),
    needsGoal ? client.from('career_goals').select('target_role, goal_description, work_preference, preferred_location').eq('profile_id', profile.id).limit(1).maybeSingle() : Promise.resolve({ data: null, error: null }),
    needsResume ? client.from('resume_analyses').select('filename, extracted_text, detected_skills, strengths, improvements, ai_summary').eq('profile_id', profile.id).order('created_at', { ascending: false }).limit(1).maybeSingle() : Promise.resolve({ data: null, error: null }),
    needsAnalysis ? client.from('career_analyses').select('target_role, career_summary, strengths, skill_gaps, recommended_skills, learning_strategy, interview_preparation').eq('profile_id', profile.id).order('created_at', { ascending: false }).limit(1).maybeSingle() : Promise.resolve({ data: null, error: null }),
    needsRoadmap ? client.from('roadmap_progress').select('roadmap_item_id, status').eq('profile_id', profile.id).limit(40) : Promise.resolve({ data: [], error: null }),
    needsInterviews ? client.from('mock_interviews').select('target_role, interview_type, difficulty, status, overall_score, completed_questions, total_questions').eq('profile_id', profile.id).order('created_at', { ascending: false }).limit(5) : Promise.resolve({ data: [], error: null }),
    needsJobs ? client.from('saved_jobs').select('job_id, created_at').eq('profile_id', profile.id).limit(25) : Promise.resolve({ data: [], error: null }),
    needsJobs ? client.from('job_applications').select('job_id, status, applied_at, notes, updated_at').eq('profile_id', profile.id).order('updated_at', { ascending: false }).limit(25) : Promise.resolve({ data: [], error: null }),
    needsJobs ? client.from('career_job_applications').select('id, company_name, job_title, status, priority, applied_at, interview_at, notes, recruiter_notes, follow_up_at, updated_at').eq('profile_id', profile.id).order('updated_at', { ascending: false }).limit(30) : Promise.resolve({ data: [], error: null }),
  ])

  const [skillsResult, goalResult, resumeResult, analysisResult, roadmapResult, interviewsResult, savedJobsResult, applicationsResult, careerAppsResult] = queries
  if ([skillsResult, goalResult, resumeResult, analysisResult, roadmapResult, interviewsResult].some((result) => result.error)) throw new Error('Some CareerAI context could not be loaded.')

  context.profile = { name: text(profile.name, 120), education: text(profile.education, 200), branch: text(profile.branch, 200), experience: text(profile.experience, 700), location: text(profile.location, 160) }
  if (skillsResult.data) context.skills = (skillsResult.data as Array<{ proficiency?: number; skill?: { name?: string } | Array<{ name?: string }> | null }>).flatMap((row) => {
    const skill = Array.isArray(row.skill) ? row.skill[0] : row.skill
    return skill?.name ? [{ name: skill.name.slice(0, 100), proficiency: Number(row.proficiency) || 0 }] : []
  }).slice(0, 50)
  if (goalResult.data) context.careerGoal = goalResult.data
  if (resumeResult.data) context.resume = { ...resumeResult.data, extracted_text: text(resumeResult.data.extracted_text, 2200) }
  if (analysisResult.data) context.careerAnalysis = { ...analysisResult.data, strengths: list(analysisResult.data.strengths, 10), skill_gaps: list(analysisResult.data.skill_gaps, 20), recommended_skills: list(analysisResult.data.recommended_skills, 15), learning_strategy: list(analysisResult.data.learning_strategy, 15) }
  if (roadmapResult.data) context.roadmap = roadmapResult.data
  if (interviewsResult.data) context.interviews = interviewsResult.data
  if (savedJobsResult?.data) context.savedJobs = savedJobsResult.data
  if (careerAppsResult?.data && careerAppsResult.data.length) {
    context.applications = careerAppsResult.data
  } else if (applicationsResult?.data) {
    context.applications = applicationsResult.data
  }
  return context
}

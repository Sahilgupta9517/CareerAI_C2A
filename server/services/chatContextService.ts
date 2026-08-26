import type { SupabaseClient } from '@supabase/supabase-js'

export type ChatContextPage = 'dashboard' | 'resume' | 'career-analysis' | 'skill-gap' | 'roadmap' | 'interviews' | 'jobs' | 'profile' | string

export type ChatContext = {
  page: string | null
  profile?: { name: string | null; education: string | null; branch: string | null; experience: string | null; location: string | null }
  careerGoal?: { target_role: string | null; goal_description: string | null; work_preference: string | null; preferred_location: string | null }
  skills?: Array<{ name: string; proficiency: number }>
  skillGap?: unknown
  resume?: { filename: string; extracted_text: string | null; detected_skills: unknown; strengths: unknown; improvements: unknown; ai_summary: string | null }
  careerAnalysis?: unknown
  roadmap?: unknown
  interviews?: unknown
  jobs?: unknown
}

const text = (value: unknown, limit: number) => typeof value === 'string' ? value.slice(0, limit) : null
const list = (value: unknown, limit: number) => Array.isArray(value) ? value.slice(0, limit) : []

const intentFor = (message: string) => {
  const value = message.toLowerCase()
  return {
    resume: /resume|cv|ats|experience|project|summary/.test(value),
    skillGap: /skill|learn|gap|improve|next|study/.test(value),
    careerAnalysis: /career|score|progress|role|ready|readiness/.test(value),
    roadmap: /roadmap|plan|week|learning/.test(value),
    interviews: /interview|question|answer|prepare/.test(value),
    jobs: /job|jobs|role|company|apply|opportunit/.test(value),
  }
}

export async function buildChatContext(client: SupabaseClient, message: string, page: ChatContextPage | null): Promise<ChatContext> {
  const intent = intentFor(message)
  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('id, name, education, branch, experience, location')
    .limit(1)
    .maybeSingle()
  if (profileError || !profile) throw new Error('Your CareerAI profile could not be loaded.')

  const context: ChatContext = { page: page || null }
  const needsProfile = true
  const needsSkills = needsProfile || intent.skillGap || intent.careerAnalysis || intent.jobs || intent.interviews
  const needsGoal = needsProfile || intent.skillGap || intent.careerAnalysis || intent.jobs || intent.roadmap || intent.interviews
  const needsResume = intent.resume || page === 'resume' || intent.skillGap || intent.interviews
  const needsAnalysis = intent.careerAnalysis || intent.skillGap || intent.roadmap || page === 'career-analysis'
  const needsRoadmap = intent.roadmap || page === 'roadmap'
  const needsInterviews = intent.interviews || page === 'interviews'

  const queries = await Promise.all([
    needsSkills ? client.from('user_skills').select('proficiency, skill:skills(name)').eq('profile_id', profile.id) : Promise.resolve({ data: [], error: null }),
    needsGoal ? client.from('career_goals').select('target_role, goal_description, work_preference, preferred_location').eq('profile_id', profile.id).limit(1).maybeSingle() : Promise.resolve({ data: null, error: null }),
    needsResume ? client.from('resume_analyses').select('filename, extracted_text, detected_skills, strengths, improvements, ai_summary').eq('profile_id', profile.id).order('created_at', { ascending: false }).limit(1).maybeSingle() : Promise.resolve({ data: null, error: null }),
    needsAnalysis ? client.from('career_analyses').select('target_role, career_summary, strengths, skill_gaps, recommended_skills, learning_strategy, interview_preparation').eq('profile_id', profile.id).order('created_at', { ascending: false }).limit(1).maybeSingle() : Promise.resolve({ data: null, error: null }),
    needsRoadmap ? client.from('roadmap_progress').select('roadmap_item_id, status').eq('profile_id', profile.id).limit(40) : Promise.resolve({ data: [], error: null }),
    needsInterviews ? client.from('mock_interviews').select('target_role, interview_type, difficulty, status, overall_score, completed_questions, total_questions').eq('profile_id', profile.id).order('created_at', { ascending: false }).limit(5) : Promise.resolve({ data: [], error: null }),
  ])

  const [skillsResult, goalResult, resumeResult, analysisResult, roadmapResult, interviewsResult] = queries
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
  return context
}

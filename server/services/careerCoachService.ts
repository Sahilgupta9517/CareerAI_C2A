import type { SupabaseClient } from '@supabase/supabase-js'

export interface ServerCareerContext {
  profile: { id: number; name: string | null; education: string | null; branch: string | null; experience: string | null; location: string | null } | null
  careerGoal: { target_role: string | null; goal_description: string | null } | null
  userSkills: Array<{ name: string; proficiency?: number }>
  resumeSummary: { detected_skills: string[]; strengths: string[]; improvements: string[]; ai_summary: string | null } | null
  skillGaps: Array<{ skill: string; priority: string; current_level?: number; target_level?: number }>
  roadmap: Array<{ title: string; status?: string }>
  applications: Array<{ company_name: string; job_title: string; status: string; priority: string }>
  interviews: Array<{ job_role: string; company_name: string; created_at: string }>
}

export async function buildServerCareerContext(client: SupabaseClient): Promise<ServerCareerContext> {
  const { data: profile } = await client
    .from('profiles')
    .select('id, name, education, branch, experience, location')
    .limit(1)
    .maybeSingle()

  if (!profile) {
    return {
      profile: null,
      careerGoal: null,
      userSkills: [],
      resumeSummary: null,
      skillGaps: [],
      roadmap: [],
      applications: [],
      interviews: [],
    }
  }

  const profileId = profile.id

  const [
    goalRes,
    skillsRes,
    resumeRes,
    analysisRes,
    appsRes,
    interviewsRes,
  ] = await Promise.all([
    client.from('career_goals').select('target_role, goal_description').eq('profile_id', profileId).maybeSingle(),
    client.from('user_skills').select('name, proficiency').eq('profile_id', profileId),
    client.from('resume_analyses').select('detected_skills, strengths, improvements, ai_summary').eq('profile_id', profileId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    client.from('career_analyses').select('skill_gaps, learning_strategy').eq('profile_id', profileId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    client.from('career_job_applications').select('company_name, job_title, status, priority').eq('profile_id', profileId),
    client.from('interviews').select('job_role, company_name, created_at').eq('profile_id', profileId).order('created_at', { ascending: false }).limit(5),
  ])

  const skillGaps = Array.isArray(analysisRes.data?.skill_gaps) ? analysisRes.data.skill_gaps : []
  const roadmap = Array.isArray(analysisRes.data?.learning_strategy) ? analysisRes.data.learning_strategy : []

  return {
    profile,
    careerGoal: goalRes.data || null,
    userSkills: skillsRes.data || [],
    resumeSummary: resumeRes.data ? {
      detected_skills: Array.isArray(resumeRes.data.detected_skills) ? resumeRes.data.detected_skills : [],
      strengths: Array.isArray(resumeRes.data.strengths) ? resumeRes.data.strengths : [],
      improvements: Array.isArray(resumeRes.data.improvements) ? resumeRes.data.improvements : [],
      ai_summary: resumeRes.data.ai_summary || null,
    } : null,
    skillGaps,
    roadmap,
    applications: appsRes.data || [],
    interviews: interviewsRes.data || [],
  }
}

import { demoJobs } from '@/data/jobs'
import { roleRequirements } from '@/data/roleRequirements'
import { getProfile, calculateProfileStrength, type ProfileBundle } from '@/lib/profileService'
import { calculateJobMatch, sortJobs } from '@/lib/jobMatching'
import { calculateRoleReadiness, compareRoleSkills } from '@/lib/skillMatching'
import type { SkillComparison, UserSkill } from '@/types/skillGap'
import { supabase } from '@/lib/supabase'
import { fetchApi } from '@/lib/apiClient'
import { getJobApplications, getSavedJobs, getCareerApplications, type JobApplication, type CareerJobApplication } from '@/lib/persistenceService'
import type { CareerIntelligenceData, CareerIntelligenceResponse } from '@/types/careerIntelligence'

export type ActionPriority = 'HIGH' | 'MEDIUM' | 'LOW'

export type ActionItem = {
  id: string
  priority: ActionPriority
  title: string
  reason: string
  estimatedImpact: string
  estimatedEffort: string
  ctaText: string
  to: string
  category: 'skills' | 'resume' | 'interview' | 'jobs' | 'roadmap' | 'profile'
}

export type CareerAlert = {
  id: string
  type: 'critical' | 'warning' | 'info' | 'success'
  title: string
  description: string
  to: string
  action: string
}

export type RecentActivityItem = {
  id: string
  type: 'resume' | 'skill' | 'roadmap' | 'interview' | 'job'
  title: string
  description: string
  timestamp: string
  to: string
}

export type ReadinessBreakdown = {
  overallScore: number
  profileScore: number
  resumeScore: number
  skillScore: number
  projectScore: number
  interviewScore: number
  applicationScore: number
  explanation: string
}

export type DashboardStats = {
  resumeScore: number | null
  interviewScore: number | null
  skillsCount: number
  latestResumeAnalysis: { filename?: string | null; overall_score?: number | null; created_at?: string | null } | null
  interviewHistory: Array<{ id: string | number; job_role?: string | null; score?: number | null; created_at?: string | null }>
  savedJobsCount?: number
  appliedCount?: number
  interviewCount?: number
  offerCount?: number
  rejectedCount?: number
  analytics?: {
    careerReadiness: number | null
    skillCoverage: number | null
    skillGapCount: number | null
    resumeReadiness: number | null
    interviewReadiness: number | null
    jobMatchAverage: number | null
    profileCompleteness: number
    learningProgress: number | null
    interviewPreparationProgress: number | null
    trend: 'available' | 'not_available'
    nextAction: string
  }
}

import type {
  CareerHealthScore,
  CategoryHealth,
  NextBestAction,
  WeeklyCareerPlan,
  ThirtyDayCareerPlan,
  CareerMilestoneItem,
  GoalProgressSummary,
  CareerIntelligenceSummary,
} from '@/types/careerCoach'
import {
  calculateCareerHealthScore,
  getCategoryHealthBreakdown,
  generateNextBestActions,
  generateWeeklyCareerPlan,
  generateThirtyDayCareerPlan,
  evaluateCareerMilestones,
  getGoalProgressSummary,
  getCareerIntelligenceSummary,
} from '@/lib/careerCoachService'
import type {
  CareerReadinessExplanation,
  NextBestActionInsight,
  CareerStrengthItem,
  CareerRiskItem,
  CareerGrowthComparison,
  InterviewReadinessSignal,
} from '@/types/careerInsights'
import {
  calculateCareerReadinessExplanation,
  detectCareerStrengths,
  detectCareerRisks,
  getCareerGrowthComparison,
  calculateInterviewReadinessSignal,
  evaluateNextBestAction,
  type UserCareerContext,
} from '@/lib/careerInsightsService'

export type DashboardOverview = {
  profile: ProfileBundle
  stats: DashboardStats | null
  careerIntelligence: CareerIntelligenceData | null
  role: typeof roleRequirements[number] | null
  readiness: number | null
  readinessBreakdown: ReadinessBreakdown
  skillAverage: number | null
  skillComparisons: SkillComparison[]
  jobs: ReturnType<typeof calculateJobMatch>[]
  roadmap: { total: number; completed: number; inProgress: number } | null
  applications: JobApplication[]
  careerApplications: CareerJobApplication[]
  savedJobIds: string[]
  actions: ActionItem[]
  alerts: CareerAlert[]
  recentActivities: RecentActivityItem[]
  aiInsight: {
    recommendation: string
    reason: string
    whyExplanation: string[]
  }

  // Phase 11 Intelligent Career Coach Properties
  careerHealth: CareerHealthScore
  categoryBreakdown: CategoryHealth[]
  nextBestActions: NextBestAction[]
  weeklyPlan: WeeklyCareerPlan
  thirtyDayPlan: ThirtyDayCareerPlan
  milestones: CareerMilestoneItem[]
  goalProgress: GoalProgressSummary
  careerIntelligenceSummary: CareerIntelligenceSummary

  // Phase 16 AI Quality & Explainable Insights Properties
  insightsReadiness: CareerReadinessExplanation
  primaryNextAction: NextBestActionInsight
  topStrengths: CareerStrengthItem[]
  careerRisks: CareerRiskItem[]
  growthComparison: CareerGrowthComparison
  interviewSignal: InterviewReadinessSignal
}

const averageProficiency = (skills: ProfileBundle['skills']) =>
  skills.length ? Math.round(skills.reduce((sum, skill) => sum + skill.proficiency, 0) / skills.length) : null

const getStats = async (): Promise<DashboardStats | null> => {
  const { data: sessionData, error } = await supabase.auth.getSession()
  if (error || !sessionData.session) return null
  try {
    return await fetchApi<DashboardStats>(
      '/api/dashboard-stats',
      { headers: { Authorization: `Bearer ${sessionData.session.access_token}` } },
      'Dashboard stats'
    )
  } catch (statsError) {
    if (import.meta.env.DEV) console.error('[Dashboard stats] optional stats unavailable', statsError)
    return null
  }
}

const getCareerIntelligence = async (): Promise<CareerIntelligenceData | null> => {
  const { data: sessionData, error } = await supabase.auth.getSession()
  if (error || !sessionData.session) return null
  try {
    const res = await fetchApi<CareerIntelligenceResponse>(
      '/api/career/intelligence',
      { headers: { Authorization: `Bearer ${sessionData.session.access_token}` } },
      'Career intelligence'
    )
    return res.data || null
  } catch (intError) {
    if (import.meta.env.DEV) console.warn('[Career intelligence] optional intelligence unavailable', intError)
    return null
  }
}

export async function getDashboardOverview(): Promise<DashboardOverview> {
  const profile = await getProfile()
  const profileId = profile.profile.id

  const [stats, careerIntelligence, applications, savedJobIds, roadmapRowsResult, recentInterviewsResult, careerAnalysesResult] = await Promise.all([
    getStats(),
    getCareerIntelligence(),
    getJobApplications(profileId).catch(() => [] as JobApplication[]),
    getSavedJobs(profileId).catch(() => [] as string[]),
    supabase.from('roadmap_progress').select('roadmap_item_id, status, updated_at, created_at').eq('profile_id', profileId),
    supabase.from('mock_interviews').select('id, target_role, overall_score, status, completed_at, created_at').eq('profile_id', profileId).order('created_at', { ascending: false }).limit(5),
    supabase.from('career_analyses').select('created_at, recommended_roles, strengths').eq('profile_id', profileId).order('created_at', { ascending: false }).limit(5),
  ])

  const role = roleRequirements.find((item) => item.title === profile.goal?.target_role) ?? null
  const userSkills: UserSkill[] = profile.skills.map((skill) => ({ name: skill.name, proficiency: skill.proficiency }))
  const skillComparisons = role ? compareRoleSkills(role, userSkills) : []
  const roleSkillReadiness = role ? calculateRoleReadiness(role, userSkills) : (averageProficiency(profile.skills) ?? 0)
  const skillNames = profile.skills.map((skill) => skill.name)
  const jobs = profile.goal?.target_role
    ? sortJobs(demoJobs.map((job) => calculateJobMatch(job, skillNames, profile.goal?.target_role ?? '')), 'Best Match').slice(0, 4)
    : []

  const roadmapRows = roadmapRowsResult.data ?? []
  const roadmap = roadmapRows.length
    ? {
        total: roadmapRows.length,
        completed: roadmapRows.filter((row) => row.status === 'completed').length,
        inProgress: roadmapRows.filter((row) => row.status === 'in_progress').length,
      }
    : null

  // 1. Calculate weighted Readiness Score
  const profileStrengthObj = calculateProfileStrength(profile)
  const profileScore = profileStrengthObj.total // 0-100
  const resumeScore = stats?.resumeScore ?? (profile.resume ? 75 : 0) // 0-100
  const skillScore = roleSkillReadiness // 0-100
  const projectScore = Math.min(100, (profile.projects.length >= 3 ? 100 : profile.projects.length * 35))
  const interviewScore = stats?.interviewScore ?? (stats?.interviewHistory?.length ? 65 : 0)
  const applicationScore = Math.min(100, applications.length * 20 + savedJobIds.length * 10)

  const weightedTotal = Math.round(
    profileScore * 0.15 +
    resumeScore * 0.20 +
    skillScore * 0.25 +
    projectScore * 0.15 +
    interviewScore * 0.15 +
    applicationScore * 0.10
  )

  const readinessBreakdown: ReadinessBreakdown = {
    overallScore: Math.min(100, Math.max(0, weightedTotal)),
    profileScore,
    resumeScore,
    skillScore,
    projectScore,
    interviewScore,
    applicationScore,
    explanation: 'Calculated using your weighted profile strength (15%), resume quality (20%), target role skill match (25%), portfolio projects (15%), mock interview performance (15%), and application activity (10%).',
  }

  // 2. Generate Action Center tasks
  const missingSkills = skillComparisons.filter((s) => s.classification === 'MISSING')
  const partialSkills = skillComparisons.filter((s) => s.classification === 'PARTIAL')
  const actions: ActionItem[] = []

  if (!profile.goal?.target_role) {
    actions.push({
      id: 'act-set-role',
      priority: 'HIGH',
      title: 'Set your Target Role',
      reason: 'A defined target role unlocks personalized skill gap comparisons, job matching, and roadmap milestones.',
      estimatedImpact: 'High Impact',
      estimatedEffort: '2 mins',
      ctaText: 'Set Role',
      to: '/profile',
      category: 'profile',
    })
  }

  if (missingSkills.length > 0) {
    const topMissing = missingSkills[0]
    actions.push({
      id: `act-learn-${topMissing.skill.toLowerCase().replace(/\s+/g, '-')}`,
      priority: 'HIGH',
      title: `Close skill gap: ${topMissing.skill}`,
      reason: topMissing.reason || `${topMissing.skill} is a core requirement for ${profile.goal?.target_role ?? 'your target role'}.`,
      estimatedImpact: 'High Impact',
      estimatedEffort: '1-2 weeks',
      ctaText: 'Learn Skill',
      to: '/roadmap',
      category: 'skills',
    })
  }

  if (!profile.resume) {
    actions.push({
      id: 'act-upload-resume',
      priority: 'HIGH',
      title: 'Upload and analyze your resume',
      reason: 'Get instant ATS scoring, keyword detection, and role alignment tailored to your target role.',
      estimatedImpact: 'High Impact',
      estimatedEffort: '3 mins',
      ctaText: 'Analyze Resume',
      to: '/resume-analyzer',
      category: 'resume',
    })
  } else if (resumeScore < 75) {
    actions.push({
      id: 'act-improve-resume',
      priority: 'MEDIUM',
      title: 'Optimize resume for target keywords',
      reason: 'Align extracted technical keywords and project bullet points with your target role expectations.',
      estimatedImpact: 'Medium Impact',
      estimatedEffort: '15 mins',
      ctaText: 'Improve Resume',
      to: '/resume-analyzer',
      category: 'resume',
    })
  }

  if (!stats?.interviewHistory?.length) {
    actions.push({
      id: 'act-mock-interview',
      priority: 'MEDIUM',
      title: `Practice ${profile.goal?.target_role ?? 'Technical'} mock interview`,
      reason: 'Validate your concept clarity and role knowledge with simulated AI interview questions and instant score feedback.',
      estimatedImpact: 'Medium Impact',
      estimatedEffort: '15-20 mins',
      ctaText: 'Start Interview',
      to: '/interview',
      category: 'interview',
    })
  }

  if (jobs.length > 0 && applications.length === 0) {
    actions.push({
      id: 'act-apply-jobs',
      priority: 'LOW',
      title: `Review ${jobs.length} matched role recommendations`,
      reason: `You have strong skill matches for roles like ${jobs[0]?.job.title ?? 'Software Engineer'}. Track your applications directly.`,
      estimatedImpact: 'Medium Impact',
      estimatedEffort: '10 mins',
      ctaText: 'Explore Jobs',
      to: '/jobs',
      category: 'jobs',
    })
  }

  if (partialSkills.length > 0 && actions.length < 4) {
    const topPartial = partialSkills[0]
    actions.push({
      id: `act-strengthen-${topPartial.skill.toLowerCase().replace(/\s+/g, '-')}`,
      priority: 'LOW',
      title: `Strengthen proficiency in ${topPartial.skill}`,
      reason: `Increase your confidence from ${topPartial.proficiency ?? 50}% to 80%+ with practical milestone exercises.`,
      estimatedImpact: 'Low Impact',
      estimatedEffort: '3-5 days',
      ctaText: 'View Roadmap',
      to: '/roadmap',
      category: 'skills',
    })
  }

  // 3. Generate Career Risk & Gap Alerts
  const alerts: CareerAlert[] = []

  if (role && missingSkills.length > 2) {
    alerts.push({
      id: 'alert-core-gaps',
      type: 'warning',
      title: `Missing ${missingSkills.length} key requirements for ${role.title}`,
      description: `Your profile does not yet verify: ${missingSkills.slice(0, 3).map((s) => s.skill).join(', ')}. Focus on closing these to reach 80%+ readiness.`,
      to: '/skills',
      action: 'View Skill Gaps',
    })
  }

  if (!profile.resume) {
    alerts.push({
      id: 'alert-no-resume',
      type: 'critical',
      title: 'No resume analyzed yet',
      description: 'Your career readiness score is missing resume evidence. Upload your resume to calculate your true market readiness.',
      to: '/resume-analyzer',
      action: 'Upload Resume',
    })
  }

  if (roadmap && roadmap.total > 0 && roadmap.completed / roadmap.total < 0.3) {
    alerts.push({
      id: 'alert-roadmap-progress',
      type: 'info',
      title: 'Learning Roadmap in progress',
      description: `You have completed ${roadmap.completed} of ${roadmap.total} roadmap milestones. Complete Phase 1 items to build momentum.`,
      to: '/roadmap',
      action: 'Continue Roadmap',
    })
  }

  if (stats?.interviewHistory?.length && (stats.interviewScore ?? 0) < 65) {
    alerts.push({
      id: 'alert-interview-score',
      type: 'warning',
      title: 'Interview performance needs practice',
      description: `Your average interview score is ${stats.interviewScore}%. Focus on problem-solving structured answers to boost confidence.`,
      to: '/interview',
      action: 'Practice Questions',
    })
  }

  // 4. Build Recent Activities timeline from real persisted records
  const recentActivities: RecentActivityItem[] = []

  if (profile.resume) {
    recentActivities.push({
      id: `act-res-${profile.resume.id}`,
      type: 'resume',
      title: 'Resume Analyzed',
      description: `${profile.resume.filename} analyzed and parsed for technical skills.`,
      timestamp: profile.resume.created_at,
      to: '/resume-analyzer',
    })
  }

  const recentInterviews = (recentInterviewsResult.data ?? []) as Array<{ id: number; target_role: string; overall_score: number | null; created_at: string }>
  recentInterviews.forEach((interview) => {
    recentActivities.push({
      id: `act-int-${interview.id}`,
      type: 'interview',
      title: `Mock Interview: ${interview.target_role}`,
      description: interview.overall_score !== null ? `Completed with score: ${interview.overall_score}%` : 'Interview session started',
      timestamp: interview.created_at,
      to: `/interview/${interview.id}`,
    })
  })

  applications.slice(0, 3).forEach((app) => {
    recentActivities.push({
      id: `act-app-${app.id}`,
      type: 'job',
      title: `Application Tracker: Job #${app.job_id}`,
      description: `Status updated to ${app.status.toUpperCase()}`,
      timestamp: app.updated_at,
      to: '/jobs',
    })
  })

  // Sort activities newest first
  recentActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  // 5. Explainable AI Insight
  const topGap = missingSkills[0] || partialSkills[0]
  const aiInsight = {
    recommendation: topGap
      ? `Prioritize mastering ${topGap.skill} to accelerate your readiness for ${profile.goal?.target_role || 'your target role'}.`
      : `Your profile is strongly aligned for ${profile.goal?.target_role || 'your target role'}. Focus on high-impact mock interviews and active job applications.`,
    reason: topGap
      ? `${topGap.skill} is a core requirement listed across top ${profile.goal?.target_role || 'software'} job descriptions.`
      : `You match the major foundational requirements for ${profile.goal?.target_role || 'your target role'}.`,
    whyExplanation: topGap
      ? [
          `Required for ${profile.goal?.target_role || 'your target role'} based on market requirements.`,
          `Currently missing or below 70% proficiency in your verified skills profile.`,
          `Essential for clearing technical screening assessments in matched roles.`,
          `Unlocks higher match scores on adjacent and exact job opportunities.`,
        ]
      : [
          `All primary required skills are verified on your profile.`,
          `Resume and projects demonstrate required domain competency.`,
          `Next step is interview simulation to practice behavioral and technical articulation.`,
        ],
  }

  let careerApplications: CareerJobApplication[] = []
  try {
    careerApplications = await getCareerApplications(profile.profile.id)
  } catch {
    careerApplications = []
  }

  const rawUserData = {
    profile,
    userSkills: profile.skills || [],
    skillGaps: missingSkills.map((m) => ({ skill: m.skill, priority: 'High' })),
    roadmap: roadmap ? [{ title: `${roadmap.completed}/${roadmap.total} Milestones Completed` }] : [],
    savedJobs: savedJobIds,
    careerApps: careerApplications,
    interviews: stats?.interviewHistory || [],
  }

  const userCareerContext: UserCareerContext = {
    profile: profile.profile,
    targetRole: profile.goal?.target_role || null,
    skills: userSkills,
    resume: profile.resume
      ? {
          overall_score: stats?.resumeScore ?? 75,
          ats_score: stats?.resumeScore ?? 75,
          detected_skills: (profile.resume as { detected_skills?: string[] })?.detected_skills || [],
          missing_skills: (profile.resume as { missing_skills?: string[] })?.missing_skills || [],
          filename: profile.resume.filename,
          extracted_text: profile.resume.extracted_text,
        }
      : null,
    projects: profile.projects || [],
    skillGaps: skillComparisons,
    roadmap,
    interviews: stats?.interviewHistory || [],
    applications: careerApplications,
  }

  const insightsReadiness = calculateCareerReadinessExplanation(userCareerContext)
  const primaryNextAction = evaluateNextBestAction(userCareerContext)
  const topStrengths = detectCareerStrengths(userCareerContext)
  const careerRisks = detectCareerRisks(userCareerContext)
  const growthComparison = getCareerGrowthComparison(
    insightsReadiness.overallScore,
    userSkills.length,
    roadmap?.completed || 0,
    stats?.interviewHistory?.length || 0,
    careerAnalysesResult.data || []
  )
  const interviewSignal = calculateInterviewReadinessSignal(
    stats?.interviewHistory || [],
    profile.goal?.target_role || undefined
  )

  const careerHealth = calculateCareerHealthScore(rawUserData)
  const categoryBreakdown = getCategoryHealthBreakdown(rawUserData)
  const nextBestActions = generateNextBestActions(rawUserData)
  const weeklyPlan = generateWeeklyCareerPlan(rawUserData)
  const thirtyDayPlan = generateThirtyDayCareerPlan(rawUserData)
  const milestones = evaluateCareerMilestones(rawUserData)
  const goalProgress = getGoalProgressSummary(rawUserData)
  const careerIntelligenceSummary = getCareerIntelligenceSummary(rawUserData)

  return {
    profile,
    stats,
    careerIntelligence,
    role,
    readiness: careerIntelligence ? careerIntelligence.careerReadinessScore : weightedTotal,
    readinessBreakdown,
    skillAverage: averageProficiency(profile.skills),
    skillComparisons,
    jobs,
    roadmap,
    applications,
    careerApplications,
    savedJobIds,
    actions,
    alerts,
    recentActivities: recentActivities.slice(0, 6),
    aiInsight,

    // Phase 11 Intelligent Career Coach Properties
    careerHealth,
    categoryBreakdown,
    nextBestActions,
    weeklyPlan,
    thirtyDayPlan,
    milestones,
    goalProgress,
    careerIntelligenceSummary,

    // Phase 16 AI Quality & Explainable Insights Properties
    insightsReadiness,
    primaryNextAction,
    topStrengths,
    careerRisks,
    growthComparison,
    interviewSignal,
  }
}
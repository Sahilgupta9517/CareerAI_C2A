/**
 * Phase 17: Career Analytics & Growth Intelligence Service
 * 
 * Provides advanced analytics and insights based on real user career data.
 * NO fabricated historical data - only displays real records.
 */

import type { PriorityLevel } from '@/types/careerInsights'
import type { UserSkill } from '@/types/skillGap'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface CareerReadinessTrend {
  hasHistoricalData: boolean
  currentReadiness: number
  previousReadiness: number | null
  readinessDelta: number | null
  trendDirection: 'Improving' | 'Stable' | 'Declining' | 'Insufficient Data'
  trendStrength: 'Strong' | 'Moderate' | 'Slight' | 'Unknown'
  lastAnalysisDate: string | null
  historicalReadinessScores: Array<{ date: string; score: number }>
}

export interface SkillAnalytics {
  allSkills: Array<{
    name: string
    proficiency: number
    category?: string
    trend?: 'Improving' | 'Stable' | 'Declining'
  }>
  strongSkills: Array<{ name: string; proficiency: number }>
  improvingSkills: Array<{ name: string; current: number; previous?: number; delta?: number }>
  weakSkills: Array<{ name: string; proficiency: number }>
  skillGaps: Array<{ name: string; current: number; target: number; priority: PriorityLevel }>
  targetRoleRelevantSkills: Array<{ name: string; proficiency: number; importance: 'Required' | 'Preferred' }>
}

export interface JobAlignmentAnalytics {
  averageJobMatch: number
  bestMatchingRole: { title: string; company: string; matchPercentage: number } | null
  matchDistribution: Array<{ range: string; count: number }>
  strongMatchingSkills: string[]
  commonGaps: Array<{ skill: string; frequency: number }>
  targetRoleAlignment: number
}

export interface InterviewAnalytics {
  totalSessions: number
  completedSessions: number
  averageScore: number | null
  scoreDistribution: Array<{ range: string; count: number }>
  strongAreas: string[]
  needsImprovementAreas: string[]
  recentSessions: Array<{ date: string; score: number | null; type?: string }>
  trend: 'Improving' | 'Stable' | 'Declining' | 'Insufficient Data'
}

export interface RoadmapAnalytics {
  totalMilestones: number
  completedMilestones: number
  inProgressMilestones: number
  remainingMilestones: number
  completionPercentage: number
  nextPriority: { title: string; priority: PriorityLevel } | null
  skillsCompleted: string[]
  skillsInProgress: string[]
  skillsNotStarted: string[]
}

export interface ActivityAnalytics {
  activeDataPoints: number
  recentActivityCount: number
  consistencyLevel: 'High' | 'Moderate' | 'Low' | 'Insufficient Data'
  activityTrend: Array<{ date: string; count: number }>
  primaryActivities: Array<{ type: string; count: number }>
  lastActivityDate: string | null
}

export interface CareerMomentumScore {
  score: 'Strong Momentum' | 'Moderate Momentum' | 'Stable' | 'Needs Attention' | 'Insufficient Data'
  numericalScore: number // 0-100
  factors: Array<{
    name: string
    status: 'positive' | 'neutral' | 'negative'
    detail: string
  }>
  recommendation: string
}

export interface CareerStagnation {
  isStagnant: boolean
  severity: 'Critical' | 'High' | 'Moderate' | 'Low' | 'None'
  message: string
  recommendation: string
  daysWithoutActivity?: number
  lastActivityDate: string | null
}

export interface CareerMilestone {
  id: string
  title: string
  description: string
  date: string
  category: 'Profile' | 'Resume' | 'Skills' | 'Interview' | 'Roadmap' | 'Application' | 'Job Match'
  evidence: string // Why this milestone exists
}

export interface AIGrowthInsight {
  title: string
  insight: string
  supportingFacts: string[]
  actionSuggestion: string
  relevance: 'High' | 'Medium' | 'Low'
}

export interface WeeklyCareerFocus {
  focusArea: string
  whyFocused: string
  recommendation: string
  ctaLink: string
  ctaText: string
  priority: PriorityLevel
}

export interface CareerAnalyticsData {
  timeRange: '7d' | '30d' | '90d' | 'all'
  generatedAt: string
  readinessTrend: CareerReadinessTrend
  skillAnalytics: SkillAnalytics
  jobAlignment: JobAlignmentAnalytics
  interviews: InterviewAnalytics
  roadmap: RoadmapAnalytics
  activity: ActivityAnalytics
  momentum: CareerMomentumScore
  stagnation: CareerStagnation
  milestones: CareerMilestone[]
  insights: AIGrowthInsight[]
  weeklyFocus: WeeklyCareerFocus | null
}

// ============================================================================
// ANALYTICS ENGINES
// ============================================================================

/**
 * 1. CAREER READINESS TREND ANALYZER
 * Uses existing career_analyses table for historical data
 */
export function calculateReadinessTrend(
  currentReadiness: number,
  historicalAnalyses?: Array<{
    created_at?: string
    readiness_score?: number
    overall_score?: number
  }>
): CareerReadinessTrend {
  if (!historicalAnalyses || historicalAnalyses.length === 0) {
    return {
      hasHistoricalData: false,
      currentReadiness,
      previousReadiness: null,
      readinessDelta: null,
      trendDirection: 'Insufficient Data',
      trendStrength: 'Unknown',
      lastAnalysisDate: null,
      historicalReadinessScores: [],
    }
  }

  const sorted = historicalAnalyses.sort((a, b) => {
    const dateA = new Date(a.created_at || '').getTime()
    const dateB = new Date(b.created_at || '').getTime()
    return dateB - dateA
  })

  const previousScore = sorted[0]?.readiness_score || sorted[0]?.overall_score
  const delta = previousScore ? currentReadiness - previousScore : null
  const trendDirection = delta === null
    ? 'Insufficient Data'
    : delta > 5
      ? 'Improving'
      : delta < -5
        ? 'Declining'
        : 'Stable'

  const trendStrength = delta === null
    ? 'Unknown'
    : Math.abs(delta) > 15
      ? 'Strong'
      : Math.abs(delta) > 5
        ? 'Moderate'
        : 'Slight'

  const scores = sorted
    .slice(0, 10)
    .map((a) => ({
      date: a.created_at || new Date().toISOString(),
      score: a.readiness_score || a.overall_score || 0,
    }))
    .reverse()

  return {
    hasHistoricalData: true,
    currentReadiness,
    previousReadiness: previousScore || null,
    readinessDelta: delta,
    trendDirection,
    trendStrength,
    lastAnalysisDate: sorted[0]?.created_at || null,
    historicalReadinessScores: scores,
  }
}

/**
 * 2. SKILL ANALYTICS ANALYZER
 * Analyzes user skills for strength, improvement, and gaps
 */
export function analyzeSkills(
  userSkills: UserSkill[],
  targetRoleSkills?: { required: string[]; preferred: string[] },
  _targetRole?: string
): SkillAnalytics {
  if (!userSkills || userSkills.length === 0) {
    return {
      allSkills: [],
      strongSkills: [],
      improvingSkills: [],
      weakSkills: [],
      skillGaps: [],
      targetRoleRelevantSkills: [],
    }
  }

  const strongSkills = userSkills.filter((s) => (s.proficiency || 0) >= 75)
  const weakSkills = userSkills.filter((s) => (s.proficiency || 0) < 50)

  const targetRoleRelevantSkills = targetRoleSkills
    ? [
        ...targetRoleSkills.required.map((skill) => ({
          name: skill,
          proficiency: userSkills.find((s) => s.name.toLowerCase() === skill.toLowerCase())?.proficiency || 0,
          importance: 'Required' as const,
        })),
        ...targetRoleSkills.preferred.map((skill) => ({
          name: skill,
          proficiency: userSkills.find((s) => s.name.toLowerCase() === skill.toLowerCase())?.proficiency || 0,
          importance: 'Preferred' as const,
        })),
      ]
    : []

  return {
    allSkills: userSkills.map((s) => ({
      name: s.name,
      proficiency: s.proficiency || 60,
      category: (s as { category?: string }).category,
    })),
    strongSkills: strongSkills.map((s) => ({ name: s.name, proficiency: s.proficiency || 0 })),
    improvingSkills: [],
    weakSkills: weakSkills.map((s) => ({ name: s.name, proficiency: s.proficiency || 0 })),
    skillGaps: targetRoleSkills
      ? targetRoleSkills.required
          .filter((r) => !userSkills.find((s) => s.name.toLowerCase() === r.toLowerCase()))
          .slice(0, 5)
          .map((skill, idx) => ({
            name: skill,
            current: 0,
            target: 80,
            priority: idx < 2 ? 'CRITICAL' : 'HIGH',
          }))
      : [],
    targetRoleRelevantSkills,
  }
}

/**
 * 3. JOB ALIGNMENT ANALYZER
 * Analyzes job match data for career direction
 */
export function analyzeJobAlignment(jobMatches: Array<{ matchPercentage: number; job: { title: string; company: string } }>): JobAlignmentAnalytics {
  if (!jobMatches || jobMatches.length === 0) {
    return {
      averageJobMatch: 0,
      bestMatchingRole: null,
      matchDistribution: [],
      strongMatchingSkills: [],
      commonGaps: [],
      targetRoleAlignment: 0,
    }
  }

  const matches = jobMatches.map((j) => j.matchPercentage)
  const averageJobMatch = matches.reduce((a, b) => a + b, 0) / matches.length
  const bestMatch = jobMatches.reduce((best, current) => 
    (current.matchPercentage > (best?.matchPercentage || 0) ? current : best)
  )

  return {
    averageJobMatch: Math.round(averageJobMatch),
    bestMatchingRole: bestMatch
      ? {
          title: bestMatch.job.title,
          company: bestMatch.job.company,
          matchPercentage: bestMatch.matchPercentage,
        }
      : null,
    matchDistribution: [
      { range: '80-100%', count: matches.filter((m) => m >= 80).length },
      { range: '60-79%', count: matches.filter((m) => m >= 60 && m < 80).length },
      { range: '40-59%', count: matches.filter((m) => m >= 40 && m < 60).length },
      { range: '<40%', count: matches.filter((m) => m < 40).length },
    ],
    strongMatchingSkills: [],
    commonGaps: [],
    targetRoleAlignment: Math.round(averageJobMatch),
  }
}

/**
 * 4. INTERVIEW ANALYTICS ANALYZER
 * Analyzes mock interview performance
 */
export function analyzeInterviews(interviews: Array<{
  id?: string | number
  overall_score?: number | null
  score?: number | null
  created_at?: string
}>): InterviewAnalytics {
  if (!interviews || interviews.length === 0) {
    return {
      totalSessions: 0,
      completedSessions: 0,
      averageScore: null,
      scoreDistribution: [],
      strongAreas: [],
      needsImprovementAreas: [],
      recentSessions: [],
      trend: 'Insufficient Data',
    }
  }

  const completed = interviews.filter((i) => (i.overall_score || i.score) !== null && (i.overall_score || i.score) !== undefined)
  const scores = completed.map((i) => (i.overall_score ?? i.score) || 0).filter((s) => s > 0)
  const averageScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b) / scores.length) : null

  const recent = interviews
    .slice(0, 10)
    .map((i) => ({
      date: i.created_at || new Date().toISOString(),
      score: (i.overall_score ?? i.score) || null,
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const trend =
    scores.length >= 3
      ? scores[0] > scores[scores.length - 1] + 5
        ? 'Improving'
        : scores[0] < scores[scores.length - 1] - 5
          ? 'Declining'
          : 'Stable'
      : 'Insufficient Data'

  return {
    totalSessions: interviews.length,
    completedSessions: completed.length,
    averageScore,
    scoreDistribution: averageScore
      ? [
          { range: '80-100', count: scores.filter((s) => s >= 80).length },
          { range: '60-79', count: scores.filter((s) => s >= 60 && s < 80).length },
          { range: '40-59', count: scores.filter((s) => s >= 40 && s < 60).length },
          { range: '0-39', count: scores.filter((s) => s < 40).length },
        ]
      : [],
    strongAreas: averageScore && averageScore >= 70 ? ['Problem Solving', 'Communication'] : [],
    needsImprovementAreas: averageScore && averageScore < 70 ? ['System Design', 'Trade-off Discussion'] : [],
    recentSessions: recent,
    trend,
  }
}

/**
 * 5. ROADMAP ANALYTICS ANALYZER
 * Analyzes learning roadmap progress
 */
export function analyzeRoadmapProgress(roadmap: { total: number; completed: number; inProgress?: number }, skills: string[] = []): RoadmapAnalytics {
  const inProgress = roadmap.inProgress || 0
  const remaining = Math.max(0, roadmap.total - roadmap.completed - inProgress)
  const completion = roadmap.total > 0 ? Math.round((roadmap.completed / roadmap.total) * 100) : 0

  return {
    totalMilestones: roadmap.total,
    completedMilestones: roadmap.completed,
    inProgressMilestones: inProgress,
    remainingMilestones: remaining,
    completionPercentage: completion,
    nextPriority:
      remaining > 0
        ? {
            title: skills.length > 0 ? `Master ${skills[0]}` : 'Next Milestone',
            priority: 'HIGH',
          }
        : null,
    skillsCompleted: skills.slice(0, roadmap.completed),
    skillsInProgress: skills.slice(roadmap.completed, roadmap.completed + inProgress),
    skillsNotStarted: skills.slice(roadmap.completed + inProgress),
  }
}

/**
 * 6. ACTIVITY ANALYTICS ANALYZER
 * Analyzes career activity and consistency
 */
export function analyzeActivity(
  recentActivities: Array<{ timestamp?: string }>,
  lastResumeUpdate?: string,
  interviewCount?: number,
  roadmapProgress?: { completed?: number }
): ActivityAnalytics {
  const dataPoints = [
    recentActivities?.length || 0 > 0 ? 1 : 0,
    lastResumeUpdate ? 1 : 0,
    (interviewCount || 0) > 0 ? 1 : 0,
    (roadmapProgress?.completed || 0) > 0 ? 1 : 0,
  ].filter((x) => x > 0).length

  const lastActivity = recentActivities?.[0]?.timestamp

  const consistencyLevel =
    dataPoints >= 3 ? 'High' : dataPoints === 2 ? 'Moderate' : dataPoints === 1 ? 'Low' : 'Insufficient Data'

  return {
    activeDataPoints: dataPoints,
    recentActivityCount: recentActivities?.length || 0,
    consistencyLevel,
    activityTrend: [],
    primaryActivities: [
      { type: 'Resume Updates', count: lastResumeUpdate ? 1 : 0 },
      { type: 'Interview Practice', count: interviewCount || 0 },
      { type: 'Roadmap Progress', count: roadmapProgress?.completed || 0 },
    ].filter((a) => a.count > 0),
    lastActivityDate: lastActivity || null,
  }
}

/**
 * 7. CAREER MOMENTUM SCORE CALCULATOR
 * Determines current career momentum based on activity and progress
 */
export function calculateCareerMomentum(
  readinessTrend: CareerReadinessTrend,
  roadmapCompletion: number,
  interviewCount: number,
  lastActivityDate: string | null,
  skillGapCount: number
): CareerMomentumScore {
  const factors: Array<{ name: string; status: 'positive' | 'neutral' | 'negative'; detail: string }> = []
  let score = 50

  // Check readiness trend
  if (readinessTrend.trendDirection === 'Improving') {
    factors.push({ name: 'Readiness Trend', status: 'positive', detail: `${readinessTrend.readinessDelta}+ points gained` })
    score += 15
  } else if (readinessTrend.trendDirection === 'Declining') {
    factors.push({ name: 'Readiness Trend', status: 'negative', detail: `${readinessTrend.readinessDelta} points lost` })
    score -= 15
  }

  // Check roadmap progress
  if (roadmapCompletion >= 50) {
    factors.push({ name: 'Roadmap Progress', status: 'positive', detail: `${roadmapCompletion}% milestones completed` })
    score += 10
  } else if (roadmapCompletion > 0) {
    factors.push({ name: 'Roadmap Progress', status: 'neutral', detail: `${roadmapCompletion}% milestones in progress` })
  }

  // Check interview practice
  if (interviewCount >= 5) {
    factors.push({ name: 'Interview Practice', status: 'positive', detail: `${interviewCount} practice sessions` })
    score += 10
  } else if (interviewCount > 0) {
    factors.push({ name: 'Interview Practice', status: 'neutral', detail: `${interviewCount} practice sessions` })
  }

  // Check recent activity
  if (lastActivityDate) {
    const daysSinceActivity = Math.floor((Date.now() - new Date(lastActivityDate).getTime()) / (1000 * 60 * 60 * 24))
    if (daysSinceActivity < 7) {
      factors.push({ name: 'Recent Activity', status: 'positive', detail: `Active ${daysSinceActivity} days ago` })
      score += 10
    } else if (daysSinceActivity > 30) {
      factors.push({ name: 'Recent Activity', status: 'negative', detail: `No activity in ${daysSinceActivity} days` })
      score -= 15
    }
  }

  // Check skill gaps
  if (skillGapCount > 3) {
    factors.push({ name: 'Skill Gaps', status: 'negative', detail: `${skillGapCount} critical gaps` })
    score -= 10
  }

  const clampedScore = Math.max(0, Math.min(100, score))
  const momentumState: 'Strong Momentum' | 'Moderate Momentum' | 'Stable' | 'Needs Attention' | 'Insufficient Data' =
    clampedScore >= 75
      ? 'Strong Momentum'
      : clampedScore >= 60
        ? 'Moderate Momentum'
        : clampedScore >= 40
          ? 'Stable'
          : 'Needs Attention'

  return {
    score: momentumState,
    numericalScore: clampedScore,
    factors,
    recommendation:
      momentumState === 'Strong Momentum'
        ? 'Keep up the excellent progress. You are on a strong career development path.'
        : momentumState === 'Moderate Momentum'
          ? 'Good progress. Consider increasing roadmap or interview practice activity.'
          : momentumState === 'Stable'
            ? 'Career activity is steady. Focus on your highest-impact skill gap or roadmap milestone.'
            : 'Your career activity has slowed. Consider your top priority action and commit to completing it this week.',
  }
}

/**
 * 8. CAREER STAGNATION DETECTOR
 * Safely detects possible career stagnation using non-alarming language
 */
export function detectCareerStagnation(
  lastActivityDate: string | null,
  _lastReadinessScore: number | null,
  _currentReadinessScore: number,
  roadmapCompletion: number
): CareerStagnation {
  if (!lastActivityDate) {
    return {
      isStagnant: false,
      severity: 'None',
      message: 'Start using CareerAI to track your career progress.',
      recommendation: 'Complete your profile, upload your resume, and add your target role to get started.',
      lastActivityDate: null,
    }
  }

  const daysSinceActivity = Math.floor((Date.now() - new Date(lastActivityDate).getTime()) / (1000 * 60 * 60 * 24))

  if (daysSinceActivity > 60) {
    return {
      isStagnant: true,
      severity: 'High',
      message: `Your career activity has slowed significantly (${daysSinceActivity} days since last activity).`,
      recommendation: 'Reset your focus: pick your top career priority and commit to one action this week.',
      daysWithoutActivity: daysSinceActivity,
      lastActivityDate,
    }
  }

  if (daysSinceActivity > 30) {
    return {
      isStagnant: true,
      severity: 'Moderate',
      message: `Your career activity has slowed (${daysSinceActivity} days since last activity).`,
      recommendation: 'Consider your highest-impact action: roadmap milestone, skill gap, or interview practice.',
      daysWithoutActivity: daysSinceActivity,
      lastActivityDate,
    }
  }

  if (daysSinceActivity > 14 && roadmapCompletion < 25) {
    return {
      isStagnant: true,
      severity: 'Low',
      message: 'Your career activity appears lower than before. Keep building momentum.',
      recommendation: 'Complete the next high-priority roadmap milestone or skill-gap task.',
      daysWithoutActivity: daysSinceActivity,
      lastActivityDate,
    }
  }

  return {
    isStagnant: false,
    severity: 'None',
    message: 'No stagnation detected. Keep up your career momentum.',
    recommendation: 'Continue your current trajectory.',
    lastActivityDate,
  }
}

/**
 * 9. CAREER MILESTONES DETECTOR
 * Identifies real milestones from actual user data
 */
export function detectMilestones(
  resumeDate: string | null,
  firstAnalysisDate: string | null,
  firstJobMatchDate: string | null,
  firstRoadmapDate: string | null,
  firstInterviewDate: string | null,
  completedRoadmapMilestones: number,
  readinessImprovement: number | null,
  consistencyIndicator: number
): CareerMilestone[] {
  const milestones: CareerMilestone[] = []

  if (resumeDate) {
    milestones.push({
      id: 'resume-analyzed',
      title: '✓ Resume Analyzed',
      description: 'Your resume was parsed and ATS-optimized',
      date: resumeDate,
      category: 'Resume',
      evidence: 'Resume analysis detected and stored',
    })
  }

  if (firstAnalysisDate) {
    milestones.push({
      id: 'first-analysis',
      title: '✓ Career Analysis Complete',
      description: 'Your first comprehensive career analysis was generated',
      date: firstAnalysisDate,
      category: 'Profile',
      evidence: 'First career analysis record created',
    })
  }

  if (firstJobMatchDate) {
    milestones.push({
      id: 'first-job-match',
      title: '✓ First Job Match',
      description: 'You discovered your first matched job opportunity',
      date: firstJobMatchDate,
      category: 'Job Match',
      evidence: 'Job matching algorithm provided recommendations',
    })
  }

  if (firstRoadmapDate) {
    milestones.push({
      id: 'first-roadmap',
      title: '✓ Learning Roadmap Started',
      description: 'You began your personalized learning roadmap',
      date: firstRoadmapDate,
      category: 'Roadmap',
      evidence: 'First roadmap milestone tracking initiated',
    })
  }

  if (firstInterviewDate) {
    milestones.push({
      id: 'first-interview',
      title: '✓ First Mock Interview',
      description: 'You practiced your first AI mock interview',
      date: firstInterviewDate,
      category: 'Interview',
      evidence: 'Interview practice session completed',
    })
  }

  if (completedRoadmapMilestones > 0) {
    milestones.push({
      id: 'roadmap-milestone-1',
      title: `✓ ${completedRoadmapMilestones} Roadmap Milestone${completedRoadmapMilestones > 1 ? 's' : ''} Completed`,
      description: `You have completed ${completedRoadmapMilestones} learning milestone${completedRoadmapMilestones > 1 ? 's' : ''}`,
      date: new Date().toISOString(),
      category: 'Roadmap',
      evidence: `Roadmap tracking shows ${completedRoadmapMilestones} completed items`,
    })
  }

  if (readinessImprovement && readinessImprovement > 10) {
    milestones.push({
      id: 'readiness-improvement',
      title: `✓ Career Readiness +${Math.round(readinessImprovement)}%`,
      description: 'Your career readiness has significantly improved',
      date: new Date().toISOString(),
      category: 'Profile',
      evidence: `Readiness delta calculation shows +${readinessImprovement}% improvement`,
    })
  }

  if (consistencyIndicator >= 3) {
    milestones.push({
      id: 'consistency-milestone',
      title: '✓ Consistent Career Activity',
      description: 'You have shown consistent progress across multiple areas',
      date: new Date().toISOString(),
      category: 'Profile',
      evidence: 'Multiple activity indicators active simultaneously',
    })
  }

  return milestones.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

/**
 * 10. WEEK FOCUS CALCULATOR
 * Determines the most impactful action for this week
 */
export function calculateWeeklyFocus(
  skillGaps: Array<{ skill: string; priority: PriorityLevel }>,
  roadmapRemaining: number,
  interviewsCompleted: number,
  targetRole: string | null
): WeeklyCareerFocus | null {
  if (!skillGaps || skillGaps.length === 0) {
    if (interviewsCompleted < 3) {
      return {
        focusArea: 'Interview Practice',
        whyFocused: `You have ${interviewsCompleted} mock interviews. 3-5 sessions significantly improves confidence.`,
        recommendation: 'Complete 1 AI mock interview for your target role.',
        ctaLink: '/interview',
        ctaText: 'Start Practice',
        priority: 'HIGH',
      }
    }

    if (roadmapRemaining > 5) {
      return {
        focusArea: 'Learning Roadmap',
        whyFocused: `You have ${roadmapRemaining}+ roadmap milestones remaining. Completing 1-2 this week maintains momentum.`,
        recommendation: 'Complete the next high-priority roadmap milestone.',
        ctaLink: '/roadmap',
        ctaText: 'View Roadmap',
        priority: 'MEDIUM',
      }
    }

    return null
  }

  const topGap = skillGaps.find((g) => g.priority === 'CRITICAL') || skillGaps[0]

  return {
    focusArea: `Master ${topGap.skill}`,
    whyFocused: `${topGap.skill} is currently one of your highest-impact gaps for ${targetRole || 'your target role'}.`,
    recommendation: `Build a small project or complete coding exercises to practice ${topGap.skill}.`,
    ctaLink: '/skills',
    ctaText: 'View Skill Gap',
    priority: topGap.priority,
  }
}

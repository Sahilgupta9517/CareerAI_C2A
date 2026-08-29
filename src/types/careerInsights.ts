export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW'
export type PriorityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

export interface CareerScoreBreakdown {
  profileCompleteness: number
  skillAlignment: number
  resumeStrength: number
  projectExperience: number
  targetRoleAlignment: number
  learningProgress: number
  interviewReadiness: number
}

export interface NextBestActionInsight {
  id: string
  action: string
  why: string
  expectedImpact: string
  relatedModule: 'skills' | 'resume' | 'interview' | 'roadmap' | 'jobs' | 'profile'
  ctaText: string
  ctaLink: string
  priority: PriorityLevel
  confidence: ConfidenceLevel
}

export interface CareerReadinessExplanation {
  overallScore: number
  confidence: ConfidenceLevel
  confidenceReason: string
  strongestAreas: string[]
  weakestAreas: string[]
  improvingFactors: string[]
  blockingFactors: string[]
  recommendedNextAction: NextBestActionInsight
  breakdown: CareerScoreBreakdown
  summaryNarrative: string
}

export interface WhyThisJobExplanation {
  jobId: string | number
  roleTitle: string
  company: string
  skillMatchPct: number
  experienceMatchPct: number
  resumeMatchPct: number
  overallFitPct: number
  confidence: ConfidenceLevel
  confidenceEvidence: string
  matchingFactors: string[]
  missingFactors: string[]
  recommendedPreparation: string[]
  whySummary: string
}

export interface SkillGapExplanation {
  skill: string
  currentLevel: number
  targetLevel: number
  importance: 'High' | 'Medium' | 'Low'
  priority: PriorityLevel
  careerImpact: string
  whyItMatters: string
  recommendedAction: string
  estimatedLearningTime: string
  resources: string[]
}

export interface RoadmapMilestoneInsight {
  id: string
  skill: string
  title: string
  priority: PriorityLevel
  estimatedEffort: string
  careerImpact: 'High' | 'Medium' | 'Low'
  dependency: string
  reason: string
  whyThisMilestone: string
  status: 'Not Started' | 'In Progress' | 'Completed'
  prerequisites: string[]
}

export interface CareerStrengthItem {
  id: string
  category: 'Technical Skills' | 'Projects' | 'Resume' | 'Interview Performance' | 'Consistency' | 'Target Role Alignment'
  title: string
  detail: string
  evidence: string
  badgeText?: string
}

export interface CareerRiskItem {
  id: string
  title: string
  impact: string
  severity: PriorityLevel
  suggestedRemedy: string
  link: string
  ctaText: string
}

export interface CareerGrowthComparison {
  hasHistoricalData: boolean
  previousReadiness: number | null
  currentReadiness: number
  readinessDelta: number | null
  previousSkillAvg: number | null
  currentSkillAvg: number
  completedRoadmapItems: number
  completedInterviews: number
  keyImprovements: string[]
  emptyStateMessage?: string
}

export interface InterviewReadinessSignal {
  overallReadinessPct: number
  confidence: ConfidenceLevel
  practiceSessionsCount: number
  averageScore: number | null
  answerQuality: string
  skillCoverage: string
  strengths: string[]
  needsImprovement: string[]
  recommendation: string
}

export interface ExplainabilityContext {
  title: string
  targetRole: string
  dataConsidered: string[]
  matchingFactors: string[]
  missingFactors: string[]
  recommendationReason: string
  confidence: ConfidenceLevel
  confidenceEvidence: string
}

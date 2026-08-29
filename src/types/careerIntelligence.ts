export interface CareerScoreBreakdown {
  profileCompleteness: number
  skillAlignment: number
  resumeStrength: number
  projectExperience: number
  targetRoleAlignment: number
  learningProgress: number
  interviewReadiness: number
}

export interface SkillPriority {
  skill: string
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  reason: string
  impact: 'High' | 'Medium' | 'Low'
  estimatedLearningEffort: 'High' | 'Medium' | 'Low'
  recommendedAction: string
}

export interface RecommendedAction {
  title: string
  reason: string
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  relatedModule: 'skills' | 'resume' | 'interview' | 'roadmap' | 'jobs' | 'profile'
  ctaText: string
  ctaLink: string
}

export interface CareerGrowth {
  previousScore: number
  currentScore: number
  improvement: number
  skillsImprovedCount: number
  milestonesCompletedCount: number
  interviewsCompletedCount: number
}

export interface CareerInsight {
  readiness: string
  topStrength: string
  prioritySkillGap: string
  resumeImprovement: string
  interviewReadiness: string
}

export interface JobMarketFit {
  averageJobMatch: number
  strongMatchesCount: number
  potentialMatchesCount: number
  topMissingSkill: string
  recommendedJobAction: string
}

export interface CareerIntelligenceData {
  careerReadinessScore: number
  breakdown: CareerScoreBreakdown
  strongestArea: string
  weakestArea: string
  confidenceIndicator: 'High' | 'Medium' | 'Low'
  scoreExplanation: string
  insights: CareerInsight
  prioritizedSkills: SkillPriority[]
  recommendedActions: RecommendedAction[]
  growthTrend: CareerGrowth
  jobMarketFit?: JobMarketFit
}

export interface CareerIntelligenceResponse {
  success: boolean
  data: CareerIntelligenceData
  cached?: boolean
  error?: string
}

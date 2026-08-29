export type CareerConfidenceLevel = 'High' | 'Medium' | 'Low'
export type MilestoneStatus = 'Completed' | 'In Progress' | 'Locked'
export type ActionPriority = 'HIGH' | 'MEDIUM' | 'LOW'

export interface CareerScoreFactor {
  category: string
  points: number // e.g. +15 or -10
  reason: string
  isPositive: boolean
}

export interface CareerHealthScore {
  score: number // 0-100
  confidence: CareerConfidenceLevel
  strengths: string[]
  improvementAreas: string[]
  positiveFactors: CareerScoreFactor[]
  negativeFactors: CareerScoreFactor[]
}

export interface CategoryHealth {
  name: 'Profile' | 'Resume' | 'Skills' | 'Projects' | 'Career Goal' | 'Roadmap' | 'Learning' | 'Applications' | 'Interviews'
  score: number // 0-100
  weightPct: number // weight percentage e.g. 15
  status: 'Strong' | 'Needs Attention' | 'Not Enough Data'
  hasEnoughData: boolean
  missingDataReason?: string
  summary: string
}

export interface NextBestAction {
  id: string
  title: string
  reason: string
  priority: ActionPriority
  estimatedEffort: string // e.g. '15 mins', '1 hour', '2 days'
  destinationUrl: string
  category: 'profile' | 'resume' | 'skills' | 'roadmap' | 'learning' | 'jobs' | 'applications' | 'interviews'
}

export interface WeeklyDayPlan {
  dayName: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday'
  category: string
  task: string
  reason: string
  estimatedEffort: string
  destinationUrl: string
}

export interface WeeklyCareerPlan {
  days: WeeklyDayPlan[]
  summary: string
}

export interface ThirtyDayTask {
  dayNumber: number
  weekNumber: 1 | 2 | 3 | 4
  task: string
  reason: string
  estimatedEffort: string
  destinationUrl: string
}

export interface ThirtyDayWeekPlan {
  weekNumber: 1 | 2 | 3 | 4
  title: string // e.g. 'Week 1: Foundation & Audit'
  focusArea: string
  tasks: ThirtyDayTask[]
}

export interface ThirtyDayCareerPlan {
  targetRole: string
  summary: string
  weeks: ThirtyDayWeekPlan[]
}

export interface CareerMilestoneItem {
  key: string
  title: string
  description: string
  category: string
  status: MilestoneStatus
  unlockedAt?: string | null
  iconName?: string
}

export interface CareerTimelineItem {
  id: string | number
  eventType: string
  title: string
  description: string
  category: string
  created_at: string
}

export interface GoalProgressSummary {
  targetRole: string
  overallReadinessPct: number
  profilePct: number
  resumePct: number
  skillsPct: number
  projectsPct: number
  applicationsPct: number
  interviewPct: number
}

export interface CareerIntelligenceSummary {
  healthScore: number
  readinessLabel: string
  strongestAreas: string[]
  biggestRisks: string[]
  growthFocus: string[]
  recommendedNextAction: NextBestAction
}

export type JobMode = 'Remote' | 'Hybrid' | 'On-site'
export type JobType = 'Full-time' | 'Internship' | 'Contract' | 'Part-time'
export type JobCategory = 'Software Development' | 'Frontend' | 'Backend' | 'Full Stack' | 'Data' | 'AI/ML' | 'Testing' | 'Java Development' | 'Python' | 'DevOps' | 'Cloud' | 'Cybersecurity' | 'UI/UX'
export type ApplicationStatus = 'Saved' | 'Applied' | 'Screening' | 'Assessment' | 'Interview' | 'Rejected' | 'Offer'

export type MatchCategory = 'Excellent Match' | 'Strong Match' | 'Potential Match' | 'Low Match' | 'Poor Match' | 'Insufficient Data'

export interface Job {
  id: string
  title: string
  company: string
  location: string
  mode: JobMode
  type: JobType
  category: JobCategory
  description: string
  requiredSkills: string[]
  preferredSkills: string[]
  experience: string
  experienceLevel?: 'intern' | 'junior' | 'mid' | 'senior'
  salary?: string
  salaryValue?: number
  postedAt: string
  postedDaysAgo: number
  source?: string
  externalId?: string
  country?: string
  companyDescription?: string
  industry?: string
  applicationUrl?: string
  companyLogo?: string
  skills?: string[]
  responsibilities?: string[]
  qualifications?: string[]
  benefits?: string[]
  semanticScore?: number
  semanticMatchedSkills?: string[]
  semanticMissingSkills?: string[]
  semanticReason?: string
}

export interface JobMatchBreakdown {
  skillMatchScore: number
  roleAlignmentScore: number
  experienceMatchScore: number
  resumeRelevanceScore: number
  educationMatchScore: number
  preferenceMatchScore: number
  profileCompletenessScore: number
}

export interface MissingSkillDetail {
  skill: string
  importance: 'High' | 'Medium' | 'Low'
  reason: string
  recommendedAction: string
  actionLink: string
}

export type JobSort = 'Best Match' | 'Highest Match' | 'Recently Posted' | 'Role A-Z' | 'Highest Salary' | 'Lowest Skill Gap'
export type ApplicationPriority = 'HIGH' | 'MEDIUM' | 'LOW'

export interface JobMatch {
  job: Job
  matchPercentage: number
  matchCategory: MatchCategory
  priority: ApplicationPriority
  priorityReason: string
  breakdown: JobMatchBreakdown
  matchedSkills: string[]
  partialSkills: string[]
  missingSkills: string[]
  criticalSkills: string[]
  importantSkills: string[]
  niceToHaveSkills: string[]
  missingSkillsWithDetails: MissingSkillDetail[]
  matchedPreferredSkills: string[]
  missingPreferredSkills: string[]
  requiredCoverage: number
  preferredCoverage: number
  roleRelevance: number
  reasons: string[]
  whyMatches: string[]
  howToImprove: string[]
  improvementPlan: string[]
  roleMatch: number
  skillMatch: number
  experienceMatch: number
  locationMatch: number
  workModeMatch: number
  educationMatch: number
  industryMatch: number
  careerGoalAlignment: number
  aiSkillAlignment: number
  roleTier: 'exact' | 'adjacent' | 'growth' | 'other'
  roadmapAlignment?: {
    isAligned: boolean
    alignedSkills: string[]
    outsideSkills: string[]
  }
  hasInsufficientData?: boolean
}

export interface JobCoachPreparation {
  resumeSuggestions: string[]
  skillsToRevise: Array<{ skill: string; reason: string; keyConcepts: string[] }>
  interviewTopics: string[]
  expectedTechnicalQuestions: Array<{ question: string; idealAnswerTip: string }>
  hrQuestions: Array<{ question: string; responseGuidance: string }>
  projectsToHighlight: Array<{ title: string; relevantReason: string }>
  preparationPlan: Array<{ dayOrStep: string; focus: string; action: string }>
}

export interface JobResumeOptimization {
  matchingKeywords: string[]
  missingKeywords: string[]
  keywordMatchScore: number
  weakSections: Array<{ section: string; feedback: string }>
  improvementSuggestions: string[]
  relevantSkillsToEmphasize: string[]
  relevantProjectsToHighlight: string[]
}

export interface JobDescriptionAnalysis {
  role: string
  company: string
  requiredSkills: string[]
  preferredSkills: string[]
  experienceRequirements: string
  educationRequirements: string
  responsibilities: string[]
  keywords: string[]
  keyTechnologies: string[]
  location?: string
  workMode?: string
  salary?: string
}

export interface ResumeJobComparisonResult {
  resumeMatchScore: number
  strongMatches: string[]
  missingKeywords: string[]
  missingSkills: string[]
  experienceGaps: string[]
  tailoredImprovements: string[]
  truthfulnessDisclaimer: string
}

export interface SavedJobAnalysis {
  id: number
  profile_id: number
  job_title: string
  company: string
  job_description?: string
  extracted_skills: string[]
  extracted_responsibilities: string[]
  match_score: number
  analysis_type: 'jd_analysis' | 'resume_comparison'
  result: Record<string, any>
  created_at: string
}

export interface CareerJobApplication {
  id: number
  profile_id: number
  user_id?: string | null
  company_name: string
  job_title: string
  job_url?: string | null
  location?: string | null
  employment_type?: string | null
  salary_text?: string | null
  description?: string | null
  source?: string | null
  status: 'interested' | 'saved' | 'applied' | 'screening' | 'interview' | 'technical_round' | 'final_round' | 'offer' | 'rejected' | 'withdrawn'
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  applied_at?: string | null
  interview_at?: string | null
  notes?: string | null
  recruiter_notes?: string | null
  follow_up_at?: string | null
  created_at: string
  updated_at: string
}

export interface JobApplicationEvent {
  id: number
  application_id: number
  profile_id: number
  event_type: 'created' | 'applied' | 'status_change' | 'follow_up' | 'interview_scheduled' | 'note'
  note?: string
  created_at: string
}

export interface ApplicationAnalytics {
  total: number
  activeCount: number
  interviewsCount: number
  offersCount: number
  responseRatePct: number
  interviewRatePct: number
  offerRatePct: number
  byStatus: Record<string, number>
  byRole: Record<string, number>
  bySource: Record<string, number>
  weeklyCount: number
  monthlyCount: number
  avgDaysToInterview?: number
}

export interface ActionCenterItem {
  id: string
  title: string
  description: string
  category: 'interview' | 'follow_up' | 'skill_gap' | 'application'
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  targetUrl: string
  actionText: string
}

export interface ApplicationAiActionRequest {
  actionType: 'follow_up_message' | 'interview_checklist' | 'resume_suggestions' | 'recruiter_questions'
  companyName: string
  jobTitle: string
  jobDescription?: string
  status?: string
}

export interface ApplicationAiActionResponse {
  actionType: string
  content: string
  bulletPoints?: string[]
  suggestedSubject?: string
}


/**
 * Deterministic Application Readiness Scoring Engine
 * All scores are calculated from actual user data, not random values
 */

import type { Job, JobMatch } from '@/types/jobs'
import type { CareerJobApplication } from '@/types/jobs'
import type { UserSkill } from '@/types/skillGap'

export interface ApplicationReadinessBreakdown {
  resumeMatch: number
  skillsMatch: number
  projectMatch: number
  careerGoalMatch: number
  interviewReadiness: number
  atsOptimization: number
  overallScore: number
}

export interface ResumeOptimizationAnalysis {
  matchingKeywords: string[]
  missingKeywords: string[]
  keywordMatchScore: number
  weakSections: Array<{ section: string; feedback: string }>
  strongSections: string[]
  improvementSuggestions: string[]
  relevantSkillsToEmphasize: string[]
  relevantProjectsToHighlight: string[]
  atsFriendliness: number
  hasInsufficientData: boolean
}

export interface ATSOptimizationScore {
  score: number
  keywordCoverage: number
  skillsAlignment: number
  resumeStructure: number
  relevantExperience: number
  projectRelevance: number
  factors: string[]
  issues: string[]
  hasInsufficientData: boolean
}

export interface SkillGapAnalysisForJob {
  skill: string
  status: 'matched' | 'partial' | 'missing'
  currentLevel?: number
  priority: 'High' | 'Medium' | 'Low'
  reason: string
  recommendedAction: string
}

export interface ProjectRelevanceAnalysis {
  projectTitle: string
  relevanceScore: number
  matchingTechnologies: string[]
  matchingConcepts: string[]
  relevanceReason: string
}

export interface ApplicationStrategy {
  recommendation: 'APPLY_NOW' | 'GOOD_FIT_IMPROVE' | 'MODERATE_FIT_PREPARE' | 'LOW_FIT'
  explanation: string
  keyFactors: string[]
}

/**
 * Calculate Application Readiness Score (0-100)
 * Based on: resume match, skill match, project match, career alignment, and interview readiness
 */
export function calculateApplicationReadinessScore(
  job: Job,
  jobMatch: JobMatch,
  userSkills: UserSkill[],
  resumeText: string | null | undefined,
  careerGoal: { target_role: string | null } | null,
  hasProjects: boolean,
  existingApplication: CareerJobApplication | null,
): ApplicationReadinessBreakdown {
  // Resume Match (25%)
  const resumeScore = calculateResumeMatchScore(job, resumeText, jobMatch)

  // Skills Match (30%)
  const skillsScore = calculateSkillsMatchScore(jobMatch, userSkills)

  // Project Match (15%)
  const projectScore = calculateProjectMatchScore(job, hasProjects)

  // Career Goal Match (15%)
  const careerGoalScore = calculateCareerGoalMatchScore(job, careerGoal)

  // Interview Readiness (10%)
  const interviewScore = calculateInterviewReadinessScore(existingApplication)

  // ATS Optimization (5%)
  const atsScore = calculateATSOptimizationScore(job, resumeText, jobMatch)

  // Weighted overall score
  const overallScore = Math.round(
    resumeScore * 0.25 +
      skillsScore * 0.3 +
      projectScore * 0.15 +
      careerGoalScore * 0.15 +
      interviewScore * 0.1 +
      atsScore * 0.05,
  )

  return {
    resumeMatch: resumeScore,
    skillsMatch: skillsScore,
    projectMatch: projectScore,
    careerGoalMatch: careerGoalScore,
    interviewReadiness: interviewScore,
    atsOptimization: atsScore,
    overallScore: Math.max(0, Math.min(100, overallScore)),
  }
}

function calculateResumeMatchScore(job: Job, resumeText: string | null | undefined, jobMatch: JobMatch): number {
  if (!resumeText) return 20 // Incomplete data penalty

  const resume = resumeText.toLowerCase()

  // Count keyword matches
  const keywords = [
    ...job.requiredSkills,
    ...job.preferredSkills,
    ...(job.skills || []),
    ...(job.responsibilities || []).slice(0, 5),
  ]

  let matches = 0
  keywords.forEach((keyword) => {
    if (resume.includes(keyword.toLowerCase())) matches++
  })

  const keywordScore = keywords.length > 0 ? Math.round((matches / keywords.length) * 100) : 50

  // Check for experience level alignment
  const experienceMatch = jobMatch.experienceMatch >= 70 ? 30 : jobMatch.experienceMatch >= 50 ? 20 : 10

  // Check for role-specific terms
  const roleTerms = [
    job.title.toLowerCase().split(' ').slice(0, 2).join(' '),
    jobMatch.job.category?.toLowerCase() || '',
  ].filter(Boolean)

  let roleMatches = 0
  roleTerms.forEach((term) => {
    if (resume.includes(term)) roleMatches++
  })

  const roleScore = roleTerms.length > 0 ? (roleMatches / roleTerms.length) * 30 : 20

  return Math.round((keywordScore * 0.4 + experienceMatch * 0.3 + roleScore * 0.3))
}

function calculateSkillsMatchScore(jobMatch: JobMatch, _userSkills: UserSkill[]): number {
  if (!jobMatch.matchedSkills.length && !jobMatch.partialSkills.length && !jobMatch.missingSkills.length) {
    return 30 // Insufficient data
  }

  const totalRequired = jobMatch.matchedSkills.length + jobMatch.missingSkills.length
  if (totalRequired === 0) return 50

  const matched = jobMatch.matchedSkills.length
  const partial = jobMatch.partialSkills.length * 0.5

  return Math.round(((matched + partial) / totalRequired) * 100)
}

function calculateProjectMatchScore(_job: Job, hasProjects: boolean): number {
  if (!hasProjects) return 20

  // If user has projects, give partial credit
  // Full credit would require analyzing actual projects against job
  return 60 // Projects exist, but specific matching requires more data
}

function calculateCareerGoalMatchScore(job: Job, careerGoal: { target_role: string | null } | null): number {
  if (!careerGoal?.target_role) return 30 // No career goal defined

  const jobTitle = job.title.toLowerCase()
  const targetRole = careerGoal.target_role.toLowerCase()

  // Exact match
  if (jobTitle === targetRole) return 100

  // Partial match (e.g., "Senior React Developer" vs "React Developer")
  if (jobTitle.includes(targetRole) || targetRole.includes(jobTitle.split(' ').slice(0, 2).join(' '))) return 80

  // Keyword overlap
  const jobWords = jobTitle.split(' ')
  const roleWords = targetRole.split(' ')
  const overlap = jobWords.filter((word) => roleWords.includes(word)).length

  if (overlap > 0) return Math.round((overlap / Math.max(jobWords.length, roleWords.length)) * 100)

  return 40 // Role might be adjacent or growth opportunity
}

function calculateInterviewReadinessScore(existingApplication: CareerJobApplication | null): number {
  if (!existingApplication) return 50 // Not yet applied

  // If in advanced stages, higher readiness assumed
  if (
    existingApplication.status === 'interview' ||
    existingApplication.status === 'technical_round' ||
    existingApplication.status === 'final_round'
  ) {
    return 85
  }

  if (existingApplication.status === 'offer') return 100

  if (existingApplication.status === 'rejected') return 20 // Low readiness

  return 60 // Applied but not yet interviewed
}

function calculateATSOptimizationScore(job: Job, resumeText: string | null | undefined, _jobMatch: JobMatch): number {
  if (!resumeText) return 20

  const resume = resumeText.toLowerCase()

  // Check for ATS-friendly elements
  let score = 50

  // Keyword coverage (30 points)
  const requiredKeywords = job.requiredSkills || []
  const coveredKeywords = requiredKeywords.filter((keyword) => resume.includes(keyword.toLowerCase())).length
  const keywordScore = requiredKeywords.length > 0 ? (coveredKeywords / requiredKeywords.length) * 30 : 15
  score += keywordScore

  // Check for structured format (15 points)
  const hasStructure = resume.includes('experience') || resume.includes('education') || resume.includes('skills')
  if (hasStructure) score += 15

  // Check for quantified achievements (5 points)
  const hasQuantifiers = /\b\d+%|\d+x|increased|improved|optimized|reduced/i.test(resume)
  if (hasQuantifiers) score += 5

  return Math.min(100, score)
}

/**
 * Analyze resume for job-specific optimization
 */
export function analyzeResumeOptimization(
  job: Job,
  resumeText: string | null | undefined,
  jobMatch: JobMatch,
): ResumeOptimizationAnalysis {
  if (!resumeText) {
    return {
      matchingKeywords: [],
      missingKeywords: job.requiredSkills || [],
      keywordMatchScore: 0,
      weakSections: [{ section: 'Resume', feedback: 'No resume uploaded or analyzed yet' }],
      strongSections: [],
      improvementSuggestions: [],
      relevantSkillsToEmphasize: [],
      relevantProjectsToHighlight: [],
      atsFriendliness: 0,
      hasInsufficientData: true,
    }
  }

  const resume = resumeText.toLowerCase()

  // Find matching keywords
  const allKeywords = [...(job.requiredSkills || []), ...(job.preferredSkills || [])]
  const matchingKeywords = allKeywords.filter((keyword) => resume.includes(keyword.toLowerCase()))
  const missingKeywords = allKeywords.filter((keyword) => !resume.includes(keyword.toLowerCase()))

  // Calculate match score
  const keywordMatchScore =
    allKeywords.length > 0 ? Math.round((matchingKeywords.length / allKeywords.length) * 100) : 50

  // Identify weak sections (common resume sections)
  const weakSections: Array<{ section: string; feedback: string }> = []
  if (!resume.includes('project') && !resume.includes('portfolio')) {
    weakSections.push({ section: 'Projects', feedback: 'Consider highlighting relevant projects' })
  }
  if (missingKeywords.length > 3) {
    weakSections.push({ section: 'Skills', feedback: `Add key technologies: ${missingKeywords.slice(0, 3).join(', ')}` })
  }

  // Identify strong sections
  const strongSections = []
  if (matchingKeywords.length >= 5) strongSections.push('Skills')
  if (resume.includes('experience') && matchingKeywords.length >= 3) strongSections.push('Experience')
  if (resume.includes('education')) strongSections.push('Education')

  // Suggestions
  const improvementSuggestions = []
  if (missingKeywords.length > 0) {
    improvementSuggestions.push(`Add missing keywords: ${missingKeywords.slice(0, 3).join(', ')}`)
  }
  if (!resume.includes('quantif') && !resume.includes('metric') && !resume.includes('%')) {
    improvementSuggestions.push('Include quantified achievements and metrics')
  }
  if (matchingKeywords.length > 0) {
    improvementSuggestions.push(`Move ${matchingKeywords.slice(0, 2).join(' and ')} higher in your resume`)
  }

  // Strong matches to emphasize
  const relevantSkillsToEmphasize = matchingKeywords.filter((k) => jobMatch.matchedSkills.includes(k))

  // Relevant projects to highlight
  const relevantProjectsToHighlight = []
  if (resume.includes('project') || resume.includes('built') || resume.includes('developed')) {
    const projectTechs = matchingKeywords.slice(0, 5)
    if (projectTechs.length > 0) {
      relevantProjectsToHighlight.push(`Projects featuring ${projectTechs.join(', ')}`)
    }
  }

  // ATS friendliness
  const atsFriendliness = calculateATSOptimizationScore(job, resumeText, jobMatch)

  return {
    matchingKeywords,
    missingKeywords,
    keywordMatchScore,
    weakSections,
    strongSections,
    improvementSuggestions,
    relevantSkillsToEmphasize,
    relevantProjectsToHighlight: relevantProjectsToHighlight as string[],
    atsFriendliness,
    hasInsufficientData: !resumeText,
  }
}

/**
 * Calculate ATS Optimization Score with detailed breakdown
 */
export function calculateATSOptimization(job: Job, resumeText: string | null | undefined): ATSOptimizationScore {
  if (!resumeText) {
    return {
      score: 0,
      keywordCoverage: 0,
      skillsAlignment: 0,
      resumeStructure: 0,
      relevantExperience: 0,
      projectRelevance: 0,
      factors: [],
      issues: ['Resume not uploaded or analyzed'],
      hasInsufficientData: true,
    }
  }

  const resume = resumeText.toLowerCase()

  // Keyword coverage (25 points)
  const keywords = job.requiredSkills || []
  const covered = keywords.filter((k) => resume.includes(k.toLowerCase())).length
  const keywordCoverage = Math.round((covered / Math.max(keywords.length, 1)) * 25)

  // Skills alignment (25 points)
  const skillsAlignment = keywords.length > 0 && covered > 0 ? 25 : keywords.length > 0 && covered > keywords.length * 0.3 ? 15 : 5

  // Resume structure (20 points)
  let resumeStructure = 0
  const hasGoodStructure = /experience|education|skills|project|certification|summary/i.test(resume)
  if (hasGoodStructure) resumeStructure += 15
  const hasConsistentFormatting = (resume.match(/\n/g) || []).length > 5
  if (hasConsistentFormatting) resumeStructure += 5

  // Relevant experience (15 points)
  const relevantExperience = /year|month|\d+\+|senior|lead|principal|architect|manager|engineer|developer/i.test(resume) ? 15 : 5

  // Project relevance (15 points)
  const projectRelevance = /project|build|develop|design|implement|create/i.test(resume) ? 15 : 5

  const score = Math.min(100, keywordCoverage + skillsAlignment + resumeStructure + relevantExperience + projectRelevance)

  const factors = []
  if (keywordCoverage > 15) factors.push('Good keyword coverage')
  if (hasGoodStructure) factors.push('Well-structured resume')
  if (relevantExperience > 5) factors.push('Clear experience levels')
  if (projectRelevance > 5) factors.push('Project examples included')

  const issues = []
  if (keywordCoverage < 10) issues.push(`Missing key technologies: ${keywords.slice(0, 3).join(', ')}`)
  if (!hasGoodStructure) issues.push('Consider adding standard sections (Skills, Experience, Education)')
  if (relevantExperience < 5) issues.push('Specify years of experience and job titles')

  return {
    score,
    keywordCoverage,
    skillsAlignment,
    resumeStructure,
    relevantExperience,
    projectRelevance,
    factors,
    issues,
    hasInsufficientData: false,
  }
}

/**
 * Analyze skill gaps for job
 */
export function analyzeSkillGapsForJob(jobMatch: JobMatch): SkillGapAnalysisForJob[] {
  const gaps: SkillGapAnalysisForJob[] = []

  // Add matched skills
  jobMatch.matchedSkills.forEach((skill) => {
    gaps.push({
      skill,
      status: 'matched',
      priority: 'Low',
      reason: `You have solid experience with ${skill}`,
      recommendedAction: 'Refresh your understanding and practice relevant coding challenges',
    })
  })

  // Add partial skills
  jobMatch.partialSkills.forEach((skill) => {
    gaps.push({
      skill,
      status: 'partial',
      priority: 'Medium',
      reason: `You have some experience with ${skill}, but the role may require deeper expertise`,
      recommendedAction: `Deepen your knowledge of ${skill} through small projects or coding challenges`,
    })
  })

  // Add missing skills with priority
  jobMatch.missingSkills.forEach((skill, index) => {
    const priority = index < 2 ? ('High' as const) : index < 4 ? ('Medium' as const) : ('Low' as const)
    gaps.push({
      skill,
      status: 'missing',
      priority,
      reason: `${skill} is required by this role and not in your current skill set`,
      recommendedAction: `Learn ${skill} fundamentals and build a small project using it`,
    })
  })

  return gaps
}

/**
 * Calculate application strategy recommendation
 */
export function calculateApplicationStrategy(
  jobMatch: JobMatch,
  readinessScore: number,
  skillGaps: SkillGapAnalysisForJob[],
): ApplicationStrategy {
  const hasInsufficientData = readinessScore < 20

  if (hasInsufficientData) {
    return {
      recommendation: 'MODERATE_FIT_PREPARE',
      explanation: 'Insufficient profile data to assess fit. Complete your profile, resume, and career goals first.',
      keyFactors: ['Complete profile information', 'Upload resume', 'Define career goals'],
    }
  }

  const highPriorityGaps = skillGaps.filter((g) => g.status === 'missing' && g.priority === 'High').length

  // APPLY NOW: Strong match with most skills and high readiness
  if (jobMatch.matchPercentage >= 75 && readinessScore >= 75 && highPriorityGaps <= 1) {
    return {
      recommendation: 'APPLY_NOW',
      explanation: 'Strong match! You have most required skills and solid application readiness.',
      keyFactors: [
        `${jobMatch.matchPercentage}% job match`,
        'Most required skills covered',
        'High application readiness',
      ],
    }
  }

  // GOOD FIT - APPLY AFTER IMPROVEMENTS: Good match but some gaps
  if (jobMatch.matchPercentage >= 60 && readinessScore >= 60 && highPriorityGaps <= 2) {
    return {
      recommendation: 'GOOD_FIT_IMPROVE',
      explanation: `Good fit with ${highPriorityGaps} key skill gaps. Quick improvements will strengthen your application.`,
      keyFactors: [
        `${jobMatch.matchPercentage}% job match`,
        `${highPriorityGaps} priority skill gaps`,
        'Strong fundamentals in place',
        'Resume optimization recommended',
      ],
    }
  }

  // MODERATE FIT - PREPARE FIRST: Decent match but needs preparation
  if (jobMatch.matchPercentage >= 45 && readinessScore >= 40) {
    return {
      recommendation: 'MODERATE_FIT_PREPARE',
      explanation: `Moderate fit with ${highPriorityGaps} significant skill gaps. Preparation recommended before applying.`,
      keyFactors: [
        `${jobMatch.matchPercentage}% job match`,
        `${highPriorityGaps} significant skill gaps to address`,
        'Consider skill gap preparation first',
        'Strong growth opportunity',
      ],
    }
  }

  // LOW FIT: Poor match
  return {
    recommendation: 'LOW_FIT',
    explanation:
      'Limited fit for this role currently. Consider other opportunities or significant skill development first.',
    keyFactors: [
      `${jobMatch.matchPercentage}% job match`,
      `${highPriorityGaps} critical skill gaps`,
      'Consider adjacent roles with better skill alignment',
    ],
  }
}

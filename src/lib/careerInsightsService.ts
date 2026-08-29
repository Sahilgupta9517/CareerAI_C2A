import type {
  ConfidenceLevel,
  PriorityLevel,
  CareerScoreBreakdown,
  NextBestActionInsight,
  CareerReadinessExplanation,
  WhyThisJobExplanation,
  SkillGapExplanation,
  RoadmapMilestoneInsight,
  CareerStrengthItem,
  CareerRiskItem,
  CareerGrowthComparison,
  InterviewReadinessSignal,
  ExplainabilityContext,
} from '@/types/careerInsights'
import type { Job, JobMatch } from '@/types/jobs'
import type { RoleRequirements, SkillComparison, UserSkill } from '@/types/skillGap'
import { normalizeSkill } from './jobMatching'

export interface UserCareerContext {
  profile?: {
    name?: string | null
    education?: string | null
    branch?: string | null
    experience?: string | null
    location?: string | null
    id?: number | string
  } | null
  targetRole?: string | null
  skills?: UserSkill[]
  resume?: {
    overall_score?: number | null
    ats_score?: number | null
    detected_skills?: string[] | null
    missing_skills?: string[] | null
    filename?: string | null
    extracted_text?: string | null
  } | null
  projects?: Array<{ id?: string | number; name?: string; description?: string; technologies?: string[] }>
  skillGaps?: SkillComparison[]
  roadmap?: {
    total: number
    completed: number
    inProgress?: number
  } | null
  interviews?: Array<{
    id?: string | number
    job_role?: string | null
    target_role?: string | null
    score?: number | null
    overall_score?: number | null
    status?: string | null
    created_at?: string | null
  }>
  applications?: Array<{
    id?: string | number
    status?: string
    company_name?: string
    job_title?: string
  }>
  historicalAnalyses?: Array<{
    created_at?: string
    overall_score?: number
    readiness_score?: number
    skills_count?: number
  }>
}

/**
 * Deterministically calculates evidence-based Confidence Level
 */
export function calculateConfidence(evidenceCount: number, minMedium = 3, minHigh = 6): { level: ConfidenceLevel; reason: string } {
  if (evidenceCount >= minHigh) {
    return { level: 'HIGH', reason: `High evidence level with ${evidenceCount} verified career data points.` }
  }
  if (evidenceCount >= minMedium) {
    return { level: 'MEDIUM', reason: `Moderate evidence with ${evidenceCount} verified data points. Add more context to increase accuracy.` }
  }
  return { level: 'LOW', reason: `Preliminary estimation based on ${evidenceCount} data points. Add skills and resume for stronger recommendations.` }
}

/**
 * 1. CAREER READINESS EXPLANATION ENGINE
 */
export function calculateCareerReadinessExplanation(ctx: UserCareerContext): CareerReadinessExplanation {
  const profile = ctx.profile || {}
  const skills = ctx.skills || []
  const resume = ctx.resume || null
  const targetRole = ctx.targetRole || ''
  const projects = ctx.projects || []
  const roadmap = ctx.roadmap || { total: 0, completed: 0 }
  const interviews = ctx.interviews || []

  // Factor 1: Profile Completeness (10%)
  const profileFields = [profile.name, profile.education, profile.branch, profile.experience, profile.location].filter(Boolean)
  const profileCompleteness = Math.round((profileFields.length / 5) * 100)

  // Factor 2: Skill Alignment (25%)
  const skillCount = skills.length
  const avgProficiency = skillCount > 0 ? Math.round(skills.reduce((acc, s) => acc + (s.proficiency || 60), 0) / skillCount) : 0
  const skillAlignment = Math.min(100, Math.round((Math.min(skillCount, 8) / 8) * 60 + (avgProficiency * 0.4)))

  // Factor 3: Resume Strength (20%)
  const hasResume = Boolean(resume && (resume.extracted_text || (resume.detected_skills && resume.detected_skills.length > 0) || resume.overall_score))
  const resumeStrength = (hasResume && resume) ? (resume.overall_score || resume.ats_score || 80) : 0

  // Factor 4: Project Experience (15%)
  const projectExperience = projects.length >= 3 ? 95 : projects.length === 2 ? 80 : projects.length === 1 ? 60 : 25

  // Factor 5: Target Role Alignment (15%)
  const targetRoleAlignment = targetRole ? (skillCount >= 4 ? 85 : 60) : 10

  // Factor 6: Learning Progress / Roadmap (10%)
  const learningProgress = roadmap.total > 0 ? Math.round((roadmap.completed / roadmap.total) * 100) : 20

  // Factor 7: Interview Readiness (5%)
  const completedInterviews = interviews.filter((i) => (i.score !== null && i.score !== undefined) || (i.overall_score !== null && i.overall_score !== undefined))
  const interviewScores = completedInterviews.map((i) => i.score ?? i.overall_score ?? 0).filter((s) => s > 0)
  const avgInterviewScore = interviewScores.length > 0 ? Math.round(interviewScores.reduce((a, b) => a + b, 0) / interviewScores.length) : 0
  const interviewReadiness = completedInterviews.length >= 3 ? Math.max(avgInterviewScore, 85) : completedInterviews.length > 0 ? Math.max(avgInterviewScore, 65) : 20

  const breakdown: CareerScoreBreakdown = {
    profileCompleteness,
    skillAlignment,
    resumeStrength,
    projectExperience,
    targetRoleAlignment,
    learningProgress,
    interviewReadiness,
  }

  // Weighted overall score calculation (0 - 100)
  const overallScore = Math.round(
    profileCompleteness * 0.1 +
    skillAlignment * 0.25 +
    resumeStrength * 0.20 +
    projectExperience * 0.15 +
    targetRoleAlignment * 0.15 +
    learningProgress * 0.10 +
    interviewReadiness * 0.05
  )

  // Evidence calculation for Confidence
  let evidenceCount = 0
  if (profileFields.length >= 3) evidenceCount += 1
  if (skillCount >= 3) evidenceCount += 2
  if (skillCount >= 6) evidenceCount += 1
  if (hasResume) evidenceCount += 2
  if (projects.length > 0) evidenceCount += 1
  if (targetRole) evidenceCount += 1
  if (completedInterviews.length > 0) evidenceCount += 1
  if (roadmap.completed > 0) evidenceCount += 1

  const { level: confidence, reason: confidenceReason } = calculateConfidence(evidenceCount, 4, 7)

  // Determine Strongest & Weakest contributing areas
  const factorList = [
    { name: 'Verified Skills', score: skillAlignment, detail: `${skillCount} skills documented (${avgProficiency}% avg)` },
    { name: 'Resume & ATS', score: resumeStrength, detail: hasResume ? 'Resume uploaded and evaluated' : 'No resume uploaded' },
    { name: 'Profile Information', score: profileCompleteness, detail: `${profileFields.length}/5 standard fields completed` },
    { name: 'Target Role Alignment', score: targetRoleAlignment, detail: targetRole ? `Aligned to ${targetRole}` : 'No target role set' },
    { name: 'Project Evidence', score: projectExperience, detail: `${projects.length} portfolio projects listed` },
    { name: 'Roadmap Execution', score: learningProgress, detail: `${roadmap.completed}/${roadmap.total} milestones finished` },
    { name: 'Interview Preparation', score: interviewReadiness, detail: `${completedInterviews.length} mock interviews practiced` },
  ].sort((a, b) => b.score - a.score)

  const strongestAreas = factorList.slice(0, 3).map((f) => `${f.name} (${f.score}%)`)
  const weakestAreas = factorList.slice(-3).reverse().map((f) => `${f.name} (${f.score}%)`)

  // What is improving vs what is blocking
  const improvingFactors: string[] = []
  const blockingFactors: string[] = []

  if (skillCount >= 4) improvingFactors.push(`Strong core verified skills foundation (${skillCount} skills)`)
  if (hasResume) improvingFactors.push('ATS-parsable resume attached to profile')
  if (roadmap.completed > 0) improvingFactors.push(`${roadmap.completed} roadmap milestone(s) completed`)
  if (completedInterviews.length > 0) improvingFactors.push(`${completedInterviews.length} mock interview session(s) completed`)

  if (!hasResume) blockingFactors.push('No resume uploaded — limits job matching accuracy and ATS scoring')
  if (skillCount < 4) blockingFactors.push('Fewer than 4 verified skills recorded')
  if (!targetRole) blockingFactors.push('Target career role is not defined')
  if (completedInterviews.length === 0) blockingFactors.push('Zero mock interview practice sessions completed')
  if (projects.length === 0) blockingFactors.push('No practical portfolio projects linked to showcase experience')

  // Generate deterministic Next Best Action
  const nextAction = evaluateNextBestAction(ctx)

  const summaryNarrative = targetRole
    ? `Your readiness for ${targetRole} is currently ${overallScore}%. ${strongestAreas[0]} represents your primary advantage, while ${weakestAreas[0]} is your highest potential leverage point.`
    : `Your overall career readiness is currently ${overallScore}%. Set a target role to unlock role-specific career gap insights.`

  return {
    overallScore,
    confidence,
    confidenceReason,
    strongestAreas,
    weakestAreas,
    improvingFactors: improvingFactors.length ? improvingFactors : ['Profile initial setup in progress'],
    blockingFactors: blockingFactors.length ? blockingFactors : ['Continue practicing advanced technical challenges'],
    recommendedNextAction: nextAction,
    breakdown,
    summaryNarrative,
  }
}

/**
 * 2. "WHY THIS JOB?" EXPLANATION ENGINE
 */
export function generateWhyThisJob(
  job: Job,
  match: JobMatch,
  ctx?: Partial<UserCareerContext>
): WhyThisJobExplanation {
  const matchingFactors: string[] = []
  const missingFactors: string[] = []
  const recommendedPreparation: string[] = []

  // Check matching skills
  if (match.matchedSkills.length > 0) {
    matchingFactors.push(`${match.matchedSkills.length} required skill(s) verified: ${match.matchedSkills.slice(0, 4).join(', ')}`)
  }

  // Check experience & education
  if (match.experienceMatch >= 70) {
    matchingFactors.push(`Experience tier matches requirement (${job.experience || 'Entry-Mid Level'})`)
  } else {
    missingFactors.push(`Role requests ${job.experience || 'higher experience'} (${match.experienceMatch}% alignment)`)
  }

  // Check target role alignment
  if (ctx?.targetRole && normalizeSkill(job.title).includes(normalizeSkill(ctx.targetRole))) {
    matchingFactors.push(`Direct alignment with your target goal of ${ctx.targetRole}`)
  }

  // Check resume context
  if (ctx?.resume?.detected_skills?.some((s) => job.requiredSkills.map(normalizeSkill).includes(normalizeSkill(s)))) {
    matchingFactors.push('Resume contains verified keywords and terminology for this role')
  }

  // Check missing skills
  if (match.missingSkills.length > 0) {
    match.missingSkills.slice(0, 3).forEach((skill) => {
      missingFactors.push(`Missing verified skill: ${skill}`)
      recommendedPreparation.push(`Review ${skill} core patterns before applying`)
    })
  }

  // Fallback if empty
  if (matchingFactors.length === 0) {
    matchingFactors.push(`General role category alignment in ${job.category}`)
  }
  if (missingFactors.length === 0) {
    missingFactors.push('No critical skill gaps identified for this posting')
  }
  if (recommendedPreparation.length === 0) {
    recommendedPreparation.push('Conduct 1 AI mock interview tailored to this specific job description')
    recommendedPreparation.push('Tailor resume summary to highlight relevant project metrics')
  }

  // Evidence for confidence
  const evidenceCount = match.matchedSkills.length + (match.experienceMatch >= 60 ? 2 : 1) + (ctx?.resume ? 2 : 0)
  const { level: confidence } = calculateConfidence(evidenceCount, 3, 6)

  const confidenceEvidence = `${match.matchedSkills.length} matched skills, ${match.experienceMatch}% experience match, ${match.missingSkills.length} gaps identified`

  return {
    jobId: job.id,
    roleTitle: job.title,
    company: job.company,
    skillMatchPct: match.skillMatch,
    experienceMatchPct: match.experienceMatch,
    resumeMatchPct: match.breakdown?.resumeRelevanceScore ?? (ctx?.resume ? 85 : 40),
    overallFitPct: match.matchPercentage,
    confidence,
    confidenceEvidence,
    matchingFactors,
    missingFactors,
    recommendedPreparation,
    whySummary: `Matched ${match.matchedSkills.length} core requirements with ${match.matchPercentage}% estimated candidate fit.`,
  }
}

/**
 * 3. "WHY THIS SKILL GAP?" ENGINE
 */
export function generateSkillGapExplanation(
  skillName: string,
  userProficiency: number | undefined,
  requirementType: 'Required' | 'Preferred',
  targetRole: string
): SkillGapExplanation {
  const norm = normalizeSkill(skillName)
  const currentLevel = userProficiency !== undefined ? userProficiency : 0
  const targetLevel = requirementType === 'Required' ? 85 : 70

  let importance: 'High' | 'Medium' | 'Low' = requirementType === 'Required' ? 'High' : 'Medium'
  let priority: PriorityLevel = 'MEDIUM'

  if (requirementType === 'Required') {
    priority = currentLevel === 0 ? 'CRITICAL' : currentLevel < 50 ? 'HIGH' : 'MEDIUM'
  } else {
    priority = currentLevel < 40 ? 'MEDIUM' : 'LOW'
  }

  // Deterministic domain reasoning
  let careerImpact = `Essential requirement for ${targetRole || 'modern engineering'} teams.`
  let whyItMatters = `Required for production workflows, day-to-day code delivery, and technical evaluation.`
  let recommendedAction = `Build one focused application module incorporating ${skillName} with test coverage.`
  let estimatedLearningTime = '1–2 weeks'
  const resources = [
    `Official ${skillName} Documentation & Interactive Tutorials`,
    `${skillName} Practical Production Architecture Guide`,
    `${targetRole || 'Software'} Interview Coding Patterns for ${skillName}`,
  ]

  if (norm.includes('sql') || norm.includes('database') || norm.includes('postgres')) {
    careerImpact = 'Required by relational database design, query optimization, and backend data access layers.'
    whyItMatters = '85%+ of backend and full-stack positions evaluate complex queries, indexes, and transactions.'
    recommendedAction = 'Practice 10 intermediate SQL joins, subqueries, and indexing exercises on real datasets.'
    estimatedLearningTime = '1-2 weeks'
  } else if (norm.includes('docker') || norm.includes('container') || norm.includes('kubernetes')) {
    careerImpact = 'Standard standard across microservices, local containerized setups, and CI/CD pipelines.'
    whyItMatters = 'Eliminates environment discrepancies and is expected in all modern deployment workflows.'
    recommendedAction = 'Containerize an existing backend API using a multi-stage Dockerfile and test locally.'
    estimatedLearningTime = '3–5 days'
  } else if (norm.includes('react') || norm.includes('frontend') || norm.includes('typescript')) {
    careerImpact = 'Primary framework stack for modern interactive client applications and state management.'
    whyItMatters = 'Powers high-performance reactive interfaces and frontend component design systems.'
    recommendedAction = 'Create a responsive component library with strict TypeScript types and unit tests.'
    estimatedLearningTime = '2-3 weeks'
  } else if (norm.includes('system design') || norm.includes('architecture')) {
    careerImpact = 'Decisive factor in mid-to-senior technical interviews and high-scale reliability reasoning.'
    whyItMatters = 'Demonstrates ability to reason about throughput, caching, failure modes, and latency trade-offs.'
    recommendedAction = 'Draft a complete architectural design for a scalable notification or messaging service.'
    estimatedLearningTime = '2–4 weeks'
  }

  return {
    skill: skillName,
    currentLevel,
    targetLevel,
    importance,
    priority,
    careerImpact,
    whyItMatters,
    recommendedAction,
    estimatedLearningTime,
    resources,
  }
}

/**
 * 4. ROADMAP PRIORITY ENGINE
 */
export function evaluateRoadmapMilestones(
  role: RoleRequirements | null,
  userSkills: UserSkill[],
  progressMap: Record<string, 'Not Started' | 'In Progress' | 'Completed'>
): RoadmapMilestoneInsight[] {
  if (!role) return []

  const userSkillMap = new Map(userSkills.map((s) => [normalizeSkill(s.name), s.proficiency || 50]))

  return [
    ...role.requiredSkills.map((skill, index): RoadmapMilestoneInsight => {
      const norm = normalizeSkill(skill)
      const currentProf = userSkillMap.get(norm)
      const isMissing = currentProf === undefined
      const isLow = currentProf !== undefined && currentProf < 70
      const status = progressMap[`req-${skill}`] || (isMissing ? 'Not Started' : isLow ? 'In Progress' : 'Completed')

      const priority: PriorityLevel = isMissing && index < 2 ? 'CRITICAL' : isMissing ? 'HIGH' : isLow ? 'MEDIUM' : 'LOW'
      const estimatedEffort = isMissing ? '2-3 weeks' : '1 week'

      return {
        id: `milestone-${skill.toLowerCase().replace(/\s+/g, '-')}`,
        skill,
        title: `Master ${skill} Core Patterns`,
        priority,
        estimatedEffort,
        careerImpact: 'High',
        dependency: index === 0 ? 'None (Foundational)' : `Foundational ${role.requiredSkills[index - 1]} comprehension`,
        reason: `${skill} is a mandatory requirement for ${role.title}.`,
        whyThisMilestone: `Closing the ${skill} gap directly unlocks higher match percentages on ${role.title} job postings.`,
        status,
        prerequisites: index > 0 ? [role.requiredSkills[index - 1]] : [],
      }
    }),
    ...role.preferredSkills.map((skill): RoadmapMilestoneInsight => {
      const norm = normalizeSkill(skill)
      const currentProf = userSkillMap.get(norm)
      const status = progressMap[`pref-${skill}`] || (currentProf ? 'Completed' : 'Not Started')

      return {
        id: `milestone-pref-${skill.toLowerCase().replace(/\s+/g, '-')}`,
        skill,
        title: `Explore ${skill} Differentiation`,
        priority: 'MEDIUM',
        estimatedEffort: '1-2 weeks',
        careerImpact: 'Medium',
        dependency: 'Core required skills',
        reason: `${skill} provides candidate differentiation for preferred candidate tiers.`,
        whyThisMilestone: `Adding ${skill} distinguishes your application from standard baseline submissions.`,
        status,
        prerequisites: role.requiredSkills.slice(0, 2),
      }
    }),
  ]
}

/**
 * 5. NEXT BEST ACTION ENGINE (Analyzes all signals & picks ONE primary action)
 */
export function evaluateNextBestAction(ctx: UserCareerContext): NextBestActionInsight {
  const resume = ctx.resume || null
  const targetRole = ctx.targetRole || ''
  const skillGaps = ctx.skillGaps || []
  const roadmap = ctx.roadmap || { total: 0, completed: 0 }
  const interviews = ctx.interviews || []
  const applications = ctx.applications || []

  // Check 1: Missing Target Role
  if (!targetRole) {
    return {
      id: 'nba-set-goal',
      action: 'Set your Target Career Role',
      why: 'Your career recommendations, skill gap analysis, and roadmap require a defined target role.',
      expectedImpact: '+15–20 potential readiness points',
      relatedModule: 'profile',
      ctaText: 'Set Target Role',
      ctaLink: '/profile',
      priority: 'CRITICAL',
      confidence: 'HIGH',
    }
  }

  // Check 2: Missing Resume
  if (!resume || (!resume.extracted_text && (!resume.detected_skills || resume.detected_skills.length === 0))) {
    return {
      id: 'nba-upload-resume',
      action: 'Upload & Parse your Resume',
      why: 'Resume verification provides ATS scoring, keyword detection, and validates existing experience.',
      expectedImpact: '+15–20 potential readiness points',
      relatedModule: 'resume',
      ctaText: 'Upload Resume',
      ctaLink: '/resume-analyzer',
      priority: 'CRITICAL',
      confidence: 'HIGH',
    }
  }

  // Check 3: Critical Skill Gap
  const criticalMissingGaps = skillGaps.filter((g) => g.requirement === 'Required' && g.classification === 'MISSING')
  if (criticalMissingGaps.length > 0) {
    const topGap = criticalMissingGaps[0]
    return {
      id: `nba-skill-gap-${normalizeSkill(topGap.skill)}`,
      action: `Close ${topGap.skill} Skill Gap`,
      why: `${topGap.skill} is a core requirement currently missing from your verified profile for ${targetRole}.`,
      expectedImpact: '+8–12 potential readiness points',
      relatedModule: 'skills',
      ctaText: `Learn ${topGap.skill}`,
      ctaLink: `/skills?targetSkill=${encodeURIComponent(topGap.skill)}`,
      priority: 'HIGH',
      confidence: 'HIGH',
    }
  }

  // Check 4: Zero Mock Interviews
  const completedInterviews = interviews.filter((i) => i.score !== null || i.overall_score !== null)
  if (completedInterviews.length === 0) {
    return {
      id: 'nba-first-interview',
      action: `Complete 1 Mock Interview for ${targetRole}`,
      why: 'Simulating behavioral and technical interview questions builds confidence and unlocks interview readiness metrics.',
      expectedImpact: '+10–15 potential readiness points',
      relatedModule: 'interview',
      ctaText: 'Start Mock Interview',
      ctaLink: `/interview?jobRole=${encodeURIComponent(targetRole)}`,
      priority: 'HIGH',
      confidence: 'HIGH',
    }
  }

  // Check 5: Active Roadmap Milestone
  if (roadmap.total > 0 && roadmap.completed < roadmap.total) {
    return {
      id: 'nba-complete-roadmap',
      action: 'Complete Next Roadmap Milestone',
      why: `You have completed ${roadmap.completed} of ${roadmap.total} milestones. Finishing the next phase solidifies key domain skills.`,
      expectedImpact: '+5–8 potential readiness points',
      relatedModule: 'roadmap',
      ctaText: 'View Roadmap',
      ctaLink: '/roadmap',
      priority: 'MEDIUM',
      confidence: 'HIGH',
    }
  }

  // Check 6: Explore Job Opportunities
  if (applications.length === 0) {
    return {
      id: 'nba-apply-jobs',
      action: `Explore Matched ${targetRole} Jobs`,
      why: 'Your profile has solid foundation. Track your target opportunities to manage your pipeline.',
      expectedImpact: '+5–8 potential pipeline points',
      relatedModule: 'jobs',
      ctaText: 'Explore Jobs',
      ctaLink: '/jobs',
      priority: 'MEDIUM',
      confidence: 'HIGH',
    }
  }

  // Check 7: Low interview average
  const avgScore = completedInterviews.reduce((acc, i) => acc + (i.score || i.overall_score || 0), 0) / completedInterviews.length
  if (avgScore < 70) {
    return {
      id: 'nba-practice-interview-score',
      action: 'Practice Technical Screening Questions',
      why: `Your average interview score is currently ${Math.round(avgScore)}%. Aim for 80%+ to maximize live hiring conversion.`,
      expectedImpact: '+5–10 potential readiness points',
      relatedModule: 'interview',
      ctaText: 'Practice Questions',
      ctaLink: `/interview?jobRole=${encodeURIComponent(targetRole)}`,
      priority: 'MEDIUM',
      confidence: 'MEDIUM',
    }
  }

  // Default optimal action
  return {
    id: 'nba-polish-portfolio',
    action: 'Optimize Resume Keywords & Projects',
    why: 'Continuously refining tailored keywords increases ATS match rates across competitive postings.',
    expectedImpact: '+4–6 potential readiness points',
    relatedModule: 'resume',
    ctaText: 'Review Resume',
    ctaLink: '/resume-analyzer',
    priority: 'LOW',
    confidence: 'MEDIUM',
  }
}

/**
 * 6. STRENGTH DETECTION ENGINE (Top 3 strengths based on actual data)
 */
export function detectCareerStrengths(ctx: UserCareerContext): CareerStrengthItem[] {
  const strengths: CareerStrengthItem[] = []
  const skills = ctx.skills || []
  const resume = ctx.resume || null
  const projects = ctx.projects || []
  const interviews = ctx.interviews || []
  const targetRole = ctx.targetRole || ''

  // 1. Technical Skills Strength
  const strongSkills = skills.filter((s) => (s.proficiency || 0) >= 75)
  if (strongSkills.length > 0) {
    strengths.push({
      id: 'str-tech-skills',
      category: 'Technical Skills',
      title: `${strongSkills[0].name} Proficiency`,
      detail: `Verified high competence in ${strongSkills.slice(0, 3).map((s) => s.name).join(', ')}.`,
      evidence: `${strongSkills.length} skills verified at 75%+ proficiency.`,
      badgeText: 'Top Skill',
    })
  } else if (skills.length >= 4) {
    strengths.push({
      id: 'str-skill-breadth',
      category: 'Technical Skills',
      title: 'Broad Technical Repertoire',
      detail: `${skills.length} technical skills recorded in your developer profile.`,
      evidence: `${skills.length} verified technologies listed.`,
      badgeText: 'Breadth',
    })
  }

  // 2. Target Role Alignment Strength
  if (targetRole) {
    strengths.push({
      id: 'str-role-focus',
      category: 'Target Role Alignment',
      title: `${targetRole} Direction`,
      detail: `Clear career trajectory targeted towards ${targetRole}.`,
      evidence: `Target role specified and aligned with roadmap.`,
      badgeText: 'Goal Aligned',
    })
  }

  // 3. Resume / ATS Strength
  if (resume && ((resume.overall_score && resume.overall_score >= 70) || (resume.ats_score && resume.ats_score >= 70))) {
    const score = resume.overall_score || resume.ats_score || 80
    strengths.push({
      id: 'str-resume',
      category: 'Resume',
      title: 'Strong ATS Resume Baseline',
      detail: `Resume evaluated with an overall score of ${score}%.`,
      evidence: `ATS readability & keyword structure parsed successfully.`,
      badgeText: `${score}% ATS`,
    })
  }

  // 4. Practical Projects Strength
  if (projects.length > 0) {
    strengths.push({
      id: 'str-projects',
      category: 'Projects',
      title: 'Practical Project Portfolio',
      detail: `${projects.length} verified project(s) demonstrating hands-on building experience.`,
      evidence: `${projects.length} listed projects in portfolio.`,
      badgeText: 'Portfolio',
    })
  }

  // 5. Interview Performance Strength
  const completedInterviews = interviews.filter((i) => (i.score ?? i.overall_score ?? 0) >= 75)
  if (completedInterviews.length > 0) {
    strengths.push({
      id: 'str-interviews',
      category: 'Interview Performance',
      title: 'Proven Mock Interview Ability',
      detail: `Consistently scored 75%+ in mock technical and behavioral interviews.`,
      evidence: `${completedInterviews.length} high-scoring interview sessions completed.`,
      badgeText: 'Interview Ready',
    })
  }

  // Return top 3 strengths (no fabricated achievements)
  return strengths.slice(0, 3)
}

/**
 * 7. CAREER RISK DETECTION ENGINE
 */
export function detectCareerRisks(ctx: UserCareerContext): CareerRiskItem[] {
  const risks: CareerRiskItem[] = []
  const resume = ctx.resume || null
  const targetRole = ctx.targetRole || ''
  const skillGaps = ctx.skillGaps || []
  const roadmap = ctx.roadmap || { total: 0, completed: 0 }
  const interviews = ctx.interviews || []

  // Risk 1: High Priority Skill Gaps
  const missingRequired = skillGaps.filter((g) => g.requirement === 'Required' && g.classification === 'MISSING')
  if (missingRequired.length > 0) {
    risks.push({
      id: 'risk-missing-skills',
      title: `${missingRequired.length} Core Skill Gap(s) for ${targetRole || 'Target Role'}`,
      impact: `Missing key requirements (${missingRequired.slice(0, 3).map((s) => s.skill).join(', ')}) blocks 75%+ job match tiers.`,
      severity: missingRequired.length >= 3 ? 'CRITICAL' : 'HIGH',
      suggestedRemedy: `Complete roadmap milestones and practical projects for ${missingRequired[0].skill}.`,
      link: '/skills',
      ctaText: 'View Skill Gaps',
    })
  }

  // Risk 2: No Resume
  if (!resume || (!resume.extracted_text && (!resume.detected_skills || resume.detected_skills.length === 0))) {
    risks.push({
      id: 'risk-no-resume',
      title: 'Unverified Resume & ATS Profile',
      impact: 'Without an uploaded resume, recruiter keyword matching and ATS scoring cannot be validated.',
      severity: 'HIGH',
      suggestedRemedy: 'Upload your PDF resume to analyze ATS keyword coverage and formatting.',
      link: '/resume-analyzer',
      ctaText: 'Upload Resume',
    })
  }

  // Risk 3: Low or Zero Interview Practice
  const completedInterviews = interviews.filter((i) => i.score !== null || i.overall_score !== null)
  if (completedInterviews.length === 0) {
    risks.push({
      id: 'risk-no-interviews',
      title: 'Zero Interview Practice Recorded',
      impact: 'Lack of simulated interview practice increases live interview anxiety and reduces communication scores.',
      severity: 'MEDIUM',
      suggestedRemedy: 'Practice 1 interactive AI mock interview to benchmark your responses.',
      link: '/interview',
      ctaText: 'Practice Mock Interview',
    })
  } else {
    const avgScore = completedInterviews.reduce((acc, i) => acc + (i.score || i.overall_score || 0), 0) / completedInterviews.length
    if (avgScore < 60) {
      risks.push({
        id: 'risk-low-interview-score',
        title: 'Interview Performance Below Benchmark',
        impact: `Average score is ${Math.round(avgScore)}%. Focus on structured STAR-method explanations.`,
        severity: 'MEDIUM',
        suggestedRemedy: 'Review answer feedback and retake behavioral and technical questions.',
        link: '/interview',
        ctaText: 'Retake Interview',
      })
    }
  }

  // Risk 4: Incomplete Roadmap
  if (roadmap.total > 0 && roadmap.completed / roadmap.total < 0.25) {
    risks.push({
      id: 'risk-roadmap-lag',
      title: 'Learning Roadmap Incomplete',
      impact: `Only ${roadmap.completed} of ${roadmap.total} milestones finished. Finishing Phase 1 builds foundational momentum.`,
      severity: 'LOW',
      suggestedRemedy: 'Continue the next sequential milestone in your learning roadmap.',
      link: '/roadmap',
      ctaText: 'Open Roadmap',
    })
  }

  return risks
}

/**
 * 8. BEFORE VS AFTER CAREER ANALYSIS
 */
export function getCareerGrowthComparison(
  currentScore: number,
  currentSkillsCount: number,
  completedRoadmap: number,
  completedInterviews: number,
  historicalAnalyses?: Array<{ created_at?: string; readiness_score?: number; overall_score?: number; skills_count?: number }>
): CareerGrowthComparison {
  if (!historicalAnalyses || historicalAnalyses.length < 2) {
    return {
      hasHistoricalData: false,
      previousReadiness: null,
      currentReadiness: currentScore,
      readinessDelta: null,
      previousSkillAvg: null,
      currentSkillAvg: currentSkillsCount > 0 ? 70 : 0,
      completedRoadmapItems: completedRoadmap,
      completedInterviews: completedInterviews,
      keyImprovements: [],
      emptyStateMessage: 'Start tracking your career activity to unlock progress comparison.',
    }
  }

  const oldest = historicalAnalyses[historicalAnalyses.length - 1]
  const previousReadiness = oldest.readiness_score || oldest.overall_score || Math.max(20, currentScore - 12)
  const delta = currentScore - previousReadiness

  const keyImprovements: string[] = []
  if (delta > 0) keyImprovements.push(`+${delta} career readiness points gained`)
  if (completedRoadmap > 0) keyImprovements.push(`${completedRoadmap} roadmap milestones completed`)
  if (completedInterviews > 0) keyImprovements.push(`${completedInterviews} mock interview sessions completed`)
  if (currentSkillsCount > 0) keyImprovements.push(`${currentSkillsCount} verified skills recorded`)

  return {
    hasHistoricalData: true,
    previousReadiness,
    currentReadiness: currentScore,
    readinessDelta: delta,
    previousSkillAvg: Math.max(30, currentScore - 15),
    currentSkillAvg: Math.min(95, currentScore),
    completedRoadmapItems: completedRoadmap,
    completedInterviews: completedInterviews,
    keyImprovements,
  }
}

/**
 * 9. INTERVIEW READINESS SIGNAL
 */
export function calculateInterviewReadinessSignal(
  interviews: Array<{
    id?: string | number
    score?: number | null
    overall_score?: number | null
    technical_score?: number | null
    communication_score?: number | null
    interview_type?: string | null
    target_role?: string | null
  }>,
  targetRole?: string
): InterviewReadinessSignal {
  const completed = interviews.filter((i) => (i.score !== null && i.score !== undefined) || (i.overall_score !== null && i.overall_score !== undefined))
  const scores = completed.map((i) => i.score ?? i.overall_score ?? 0).filter((s) => s > 0)
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null

  if (completed.length === 0 || avgScore === null) {
    return {
      overallReadinessPct: 35,
      confidence: 'LOW',
      practiceSessionsCount: 0,
      averageScore: null,
      answerQuality: 'Not enough data',
      skillCoverage: 'Unverified',
      strengths: ['Interview simulator ready to start'],
      needsImprovement: ['System Design articulation', 'STAR-format behavioral responses'],
      recommendation: `Start your first AI mock interview for ${targetRole || 'your target role'} to generate personal readiness metrics.`,
    }
  }

  const { level: confidence } = calculateConfidence(completed.length, 2, 4)
  const strengths: string[] = []
  const needsImprovement: string[] = []

  if (avgScore >= 75) {
    strengths.push('High technical accuracy across answered prompts')
    strengths.push('Clear problem-solving decomposition')
  } else {
    needsImprovement.push('Technical depth in architectural reasoning')
  }

  if (completed.some((i) => i.interview_type === 'Behavioral')) {
    strengths.push('Completed behavioral scenario questions')
  } else {
    needsImprovement.push('Practice behavioral & leadership questions')
  }

  return {
    overallReadinessPct: avgScore,
    confidence,
    practiceSessionsCount: completed.length,
    averageScore: avgScore,
    answerQuality: avgScore >= 80 ? 'Excellent' : avgScore >= 65 ? 'Good' : 'Needs Practice',
    skillCoverage: completed.length >= 3 ? 'Comprehensive' : 'Developing',
    strengths: strengths.length ? strengths : ['Active practice momentum'],
    needsImprovement: needsImprovement.length ? needsImprovement : ['Keep answers concise under time pressure'],
    recommendation: avgScore >= 75
      ? 'Great performance! Continue fine-tuning advanced edge-case questions.'
      : 'Focus on providing structured answers with concrete metrics and clear trade-off rationale.',
  }
}

/**
 * 10. EXPLAINABILITY "WHY AM I SEEING THIS?" CONTEXT HELPER
 */
export function generateExplainabilityContext(
  title: string,
  targetRole: string,
  dataConsidered: string[],
  matchingFactors: string[],
  missingFactors: string[],
  recommendationReason: string,
  evidenceCount: number
): ExplainabilityContext {
  const { level: confidence } = calculateConfidence(evidenceCount, 3, 6)
  return {
    title,
    targetRole,
    dataConsidered,
    matchingFactors,
    missingFactors,
    recommendationReason,
    confidence,
    confidenceEvidence: `Generated based on ${evidenceCount} verified profile signals and deterministic requirement weights.`,
  }
}

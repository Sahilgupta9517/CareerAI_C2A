import type { Job, JobMatch, JobMatchBreakdown, JobSort, MatchCategory, MissingSkillDetail } from '@/types/jobs'
import { getRoleTier } from './roleNormalization'

export const JOB_MATCHING_WEIGHTS = {
  skillMatch: 0.35,
  roleAlignment: 0.20,
  experienceMatch: 0.15,
  resumeRelevance: 0.10,
  educationMatch: 0.05,
  preferenceMatch: 0.10,
  profileCompleteness: 0.05,
}

const aliases: Record<string, string> = {
  js: 'javascript',
  javascript: 'javascript',
  ts: 'typescript',
  typescript: 'typescript',
  reactjs: 'react',
  'react.js': 'react',
  react: 'react',
  nodejs: 'node.js',
  node: 'node.js',
  'node.js': 'node.js',
  mysql: 'mysql',
  sql: 'sql',
  postgres: 'postgresql',
  postgresql: 'postgresql',
  'scikit learn': 'scikit-learn',
  sklearn: 'scikit-learn',
  'scikit-learn': 'scikit-learn',
  python3: 'python',
  py: 'python',
  python: 'python',
  github: 'git',
  git: 'git',
  'node js': 'node.js',
  'react js': 'react',
  html5: 'html',
  css3: 'css',
  'rest apis': 'rest api',
  'restful api': 'rest api',
  api: 'rest api',
  database: 'databases',
  aws: 'aws',
  'amazon web services': 'aws',
  docker: 'docker',
  k8s: 'kubernetes',
  kubernetes: 'kubernetes',
}

export const normalizeSkill = (skill: string): string => {
  const trimmed = skill.trim().toLowerCase()
  if (!trimmed) return ''
  const normalized = trimmed.replace(/[._-]+/g, ' ').replace(/\s+/g, ' ')
  return aliases[normalized] ?? normalized
}

export const skillsEqual = (left: string, right: string): boolean => {
  const a = normalizeSkill(left)
  const b = normalizeSkill(right)
  if (!a || !b) return false
  // Explicit safety rule: Java must NEVER match JavaScript
  if ((a === 'java' && b === 'javascript') || (a === 'javascript' && b === 'java')) return false
  if (a === b) return true
  if ((a === 'mysql' && b === 'sql') || (a === 'sql' && b === 'mysql')) return true
  return false
}

const relatedSkills: Record<string, string[]> = {
  javascript: ['typescript', 'react', 'node.js'],
  typescript: ['javascript', 'react'],
  python: ['pandas', 'fastapi', 'django'],
  sql: ['mysql', 'postgresql', 'databases'],
  mysql: ['sql', 'databases'],
  postgresql: ['sql', 'databases'],
  react: ['javascript', 'typescript'],
  'node.js': ['javascript'],
  'machine learning': ['scikit-learn', 'python'],
  docker: ['kubernetes', 'aws'],
  kubernetes: ['docker'],
}

const skillsRelated = (left: string, right: string): boolean => {
  const a = normalizeSkill(left)
  const b = normalizeSkill(right)
  if (!a || !b) return false
  if ((a === 'java' && b === 'javascript') || (a === 'javascript' && b === 'java')) return false
  return relatedSkills[a]?.includes(b) || relatedSkills[b]?.includes(a) || false
}

const uniqueSkills = (skills: string[]) => {
  const seen = new Set<string>()
  return skills.filter((skill) => {
    const normalized = normalizeSkill(skill)
    if (!normalized || seen.has(normalized)) return false
    seen.add(normalized)
    return true
  })
}

const parseExperienceYear = (experience: string): number => {
  const match = experience.match(/(\d+)\s*[-+]?\s*(\d+)?/i)
  if (!match) return 2
  return Number(match[1] ?? 2)
}

export const getMatchCategory = (score: number, hasData = true): MatchCategory => {
  if (!hasData) return 'Insufficient Data'
  if (score >= 90) return 'Excellent Match'
  if (score >= 75) return 'Strong Match'
  if (score >= 60) return 'Potential Match'
  if (score >= 40) return 'Low Match'
  return 'Poor Match'
}

export const matchLabel = (score: number): string => {
  return getMatchCategory(score)
}

export const calculateRoleRelevance = (job: Job, targetRole: string): number => {
  if (!targetRole.trim()) return 0
  const tier = getRoleTier(job.title, targetRole)
  return tier === 'exact' ? 1 : tier === 'adjacent' ? 0.6 : tier === 'growth' ? 0.25 : 0
}

export const calculateJobMatch = (
  job: Job,
  userSkills: string[],
  targetRole = '',
  resumeText = '',
  userExperience = '',
  roadmapSkills: string[] = []
): JobMatch => {
  const hasInsufficientData = userSkills.length === 0 && !targetRole.trim() && !resumeText.trim()
  const skills = uniqueSkills(userSkills)

  // 1. Skill Match (35%)
  const matchedSkills = job.requiredSkills.filter((required) => skills.some((skill) => skillsEqual(skill, required)))
  const partialSkills = job.requiredSkills.filter((required) => !matchedSkills.includes(required) && skills.some((skill) => skillsRelated(skill, required)))
  const missingSkills = job.requiredSkills.filter((required) => !matchedSkills.includes(required) && !partialSkills.includes(required))
  const matchedPreferredSkills = job.preferredSkills.filter((preferred) => skills.some((skill) => skillsEqual(skill, preferred)))
  const missingPreferredSkills = job.preferredSkills.filter((preferred) => !matchedPreferredSkills.includes(preferred))

  // Skill Tier Categorization
  const criticalSkills = job.requiredSkills.slice(0, Math.min(3, job.requiredSkills.length))
  const importantSkills = [
    ...job.requiredSkills.slice(3),
    ...job.preferredSkills.slice(0, 2),
  ]
  const niceToHaveSkills = job.preferredSkills.slice(2)

  const requiredCoverage = job.requiredSkills.length ? (matchedSkills.length + partialSkills.length * 0.5) / job.requiredSkills.length : 0
  const preferredCoverage = job.preferredSkills.length ? matchedPreferredSkills.length / job.preferredSkills.length : 0
  const skillMatchScore = Math.round((requiredCoverage * 0.75 + preferredCoverage * 0.25) * 100)

  // 2. Role Alignment (20%)
  const roleRelevance = calculateRoleRelevance(job, targetRole)
  const roleAlignmentScore = Math.round(roleRelevance * 100)
  const roleTier = getRoleTier(job.title, targetRole)

  // 3. Experience Match (15%)
  const jobExpYears = parseExperienceYear(job.experience)
  const userExpYears = parseExperienceYear(userExperience || '2')
  const expDiff = Math.abs(jobExpYears - userExpYears)
  const experienceMatchScore = Math.min(100, Math.max(40, 100 - expDiff * 15))

  // 4. Resume Relevance (10%)
  let resumeRelevanceScore = 50
  if (resumeText) {
    const lowerResume = resumeText.toLowerCase()
    const foundCount = job.requiredSkills.filter((s) => lowerResume.includes(s.toLowerCase())).length
    resumeRelevanceScore = Math.min(100, Math.round((foundCount / (job.requiredSkills.length || 1)) * 100))
  } else if (job.semanticScore !== undefined) {
    resumeRelevanceScore = job.semanticScore
  }

  // 5. Education Match (5%)
  const educationMatchScore = 85

  // 6. Preference Match (10%)
  const workModeScore = job.mode === 'Remote' ? 95 : job.mode === 'Hybrid' ? 85 : 75
  const locationScore = job.location.toLowerCase().includes('remote') ? 95 : 85
  const preferenceMatchScore = Math.round((workModeScore + locationScore) / 2)

  // 7. Profile Completeness (5%)
  const profileCompletenessScore = userSkills.length >= 3 ? 90 : userSkills.length > 0 ? 60 : 20

  // Total Weighted Match Score
  const weightedTotal = Math.round(
    skillMatchScore * JOB_MATCHING_WEIGHTS.skillMatch +
    roleAlignmentScore * JOB_MATCHING_WEIGHTS.roleAlignment +
    experienceMatchScore * JOB_MATCHING_WEIGHTS.experienceMatch +
    resumeRelevanceScore * JOB_MATCHING_WEIGHTS.resumeRelevance +
    educationMatchScore * JOB_MATCHING_WEIGHTS.educationMatch +
    preferenceMatchScore * JOB_MATCHING_WEIGHTS.preferenceMatch +
    profileCompletenessScore * JOB_MATCHING_WEIGHTS.profileCompleteness
  )

  const matchPercentage = Math.max(0, Math.min(100, weightedTotal))
  const matchCategory = getMatchCategory(matchPercentage, !hasInsufficientData)

  // Deterministic Application Priority
  let priority: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW'
  let priorityReason = 'Significant skill or domain experience gap. Prioritize higher tier roles first.'
  if (matchPercentage >= 75 && (roleTier === 'exact' || missingSkills.length <= 1)) {
    priority = 'HIGH'
    priorityReason = 'Strong role alignment & 75%+ profile compatibility with minimal skill gaps.'
  } else if (matchPercentage >= 55 || (roleTier === 'adjacent' && matchPercentage >= 50)) {
    priority = 'MEDIUM'
    priorityReason = 'Good overall match with a few addressable skill gaps before applying.'
  }

  // Roadmap Alignment
  const alignedRoadmapSkills = roadmapSkills.filter((rs) =>
    job.requiredSkills.some((rq) => skillsEqual(rs, rq)) || job.preferredSkills.some((pr) => skillsEqual(rs, pr))
  )
  const outsideRoadmapSkills = missingSkills.filter((ms) =>
    !roadmapSkills.some((rs) => skillsEqual(rs, ms))
  )
  const roadmapAlignment = {
    isAligned: alignedRoadmapSkills.length > 0 || (roadmapSkills.length > 0 && roleTier === 'exact'),
    alignedSkills: alignedRoadmapSkills,
    outsideSkills: outsideRoadmapSkills,
  }

  const breakdown: JobMatchBreakdown = {
    skillMatchScore,
    roleAlignmentScore,
    experienceMatchScore,
    resumeRelevanceScore,
    educationMatchScore,
    preferenceMatchScore,
    profileCompletenessScore,
  }

  // Generate Missing Skill Details with Actions
  const missingSkillsWithDetails: MissingSkillDetail[] = missingSkills.map((skill) => ({
    skill,
    importance: 'High',
    reason: `Core requirement for ${job.title} at ${job.company} missing from your profile.`,
    recommendedAction: `Complete learning modules and build a hands-on project demonstrating ${skill}.`,
    actionLink: `/skills?targetSkill=${encodeURIComponent(skill)}`,
  }))

  missingPreferredSkills.forEach((skill) => {
    missingSkillsWithDetails.push({
      skill,
      importance: 'Medium',
      reason: `Preferred skill for ${job.title} that increases your application competitiveness.`,
      recommendedAction: `Review documentation and incorporate ${skill} in portfolio projects.`,
      actionLink: `/skills?targetSkill=${encodeURIComponent(skill)}`,
    })
  })

  // Data-driven Reasons & Next Steps
  const whyMatches: string[] = []
  if (matchedSkills.length > 0) {
    whyMatches.push(`Matches ${matchedSkills.length} key skills from your verified profile: ${matchedSkills.slice(0, 3).join(', ')}.`)
  }
  if (roleRelevance > 0.5) {
    whyMatches.push(`Target role alignment: Directly matches your "${targetRole || job.category}" goal.`)
  }
  if (resumeText && resumeRelevanceScore >= 60) {
    whyMatches.push(`Resume text contains strong technical evidence and matching keywords.`)
  }
  if (roadmapAlignment.isAligned) {
    whyMatches.push(`Directly connects with your ongoing Career Roadmap skills.`)
  }
  if (whyMatches.length === 0) {
    whyMatches.push(`Matches entry requirements for ${job.category} opportunities.`)
  }

  const howToImprove: string[] = []
  if (missingSkills.length > 0) {
    howToImprove.push(`Close critical skill gap in ${missingSkills[0]} before submitting application.`)
  }
  if (!resumeText) {
    howToImprove.push(`Upload and scan your resume to boost ATS keyword relevance score.`)
  }
  howToImprove.push(`Practice an AI mock interview tailored for ${job.title} at ${job.company}.`)

  return {
    job,
    matchPercentage,
    matchCategory,
    priority,
    priorityReason,
    breakdown,
    matchedSkills,
    partialSkills,
    missingSkills,
    criticalSkills,
    importantSkills,
    niceToHaveSkills,
    missingSkillsWithDetails,
    matchedPreferredSkills,
    missingPreferredSkills,
    requiredCoverage,
    preferredCoverage,
    roleRelevance,
    reasons: whyMatches,
    whyMatches,
    howToImprove,
    improvementPlan: howToImprove,
    roleMatch: roleAlignmentScore,
    skillMatch: skillMatchScore,
    experienceMatch: experienceMatchScore,
    locationMatch: locationScore,
    workModeMatch: workModeScore,
    educationMatch: educationMatchScore,
    industryMatch: 80,
    careerGoalAlignment: Math.round((skillMatchScore * 0.5) + (roleAlignmentScore * 0.5)),
    aiSkillAlignment: skillMatchScore,
    roleTier,
    roadmapAlignment,
    hasInsufficientData,
  }
}

export const filterJobs = (
  matches: JobMatch[],
  query: string,
  mode: string,
  type: string,
  minimumMatch: number | null,
  category = 'All categories'
): JobMatch[] =>
  matches.filter(({ job, matchPercentage }) => {
    const normalizedQuery = query.trim().toLowerCase()
    const matchesQuery =
      !normalizedQuery ||
      `${job.title} ${job.company} ${job.description} ${job.location}`.toLowerCase().includes(normalizedQuery)
    return (
      matchesQuery &&
      (mode === 'All' || job.mode === mode) &&
      (type === 'All' || job.type === type) &&
      (category === 'All categories' || job.category === category) &&
      (minimumMatch === null || matchPercentage >= minimumMatch)
    )
  })

export const sortJobs = (matches: JobMatch[], sort: JobSort): JobMatch[] =>
  [...matches].sort((left, right) => {
    if (sort === 'Highest Match' || sort === 'Best Match') return right.matchPercentage - left.matchPercentage
    if (sort === 'Recently Posted') return left.job.postedDaysAgo - right.job.postedDaysAgo
    if (sort === 'Role A-Z') return left.job.title.localeCompare(right.job.title)
    if (sort === 'Highest Salary') return (right.job.salaryValue ?? 0) - (left.job.salaryValue ?? 0)
    if (sort === 'Lowest Skill Gap') return left.missingSkills.length - right.missingSkills.length
    return right.matchPercentage - left.matchPercentage
  })

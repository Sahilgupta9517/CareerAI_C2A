export type CareerAnalyticsInput = {
  profile: { name: string | null; education: string | null; branch: string | null; experience: string | null; location: string | null }
  targetRole: string | null
  requiredSkillCount: number
  matchedSkillCount: number
  skillCount: number
  resumeScore: number | null
  interviewScore: number | null
  completedRoadmapItems: number
  roadmapItems: number
  jobMatchScores: number[]
  completedInterviews: number
}

export type CareerAnalytics = {
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

const average = (values: number[]) => values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null
const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)))

export const calculateCareerAnalytics = (input: CareerAnalyticsInput): CareerAnalytics => {
  const profileFields = [input.profile.name, input.profile.education || input.profile.branch, input.profile.experience, input.profile.location, input.targetRole]
  const profileCompleteness = Math.round(profileFields.filter(Boolean).length / profileFields.length * 100)
  const skillCoverage = input.requiredSkillCount ? clamp(input.matchedSkillCount / input.requiredSkillCount * 100) : input.skillCount ? 100 : null
  const learningProgress = input.roadmapItems ? clamp(input.completedRoadmapItems / input.roadmapItems * 100) : null
  const interviewPreparationProgress = input.completedInterviews ? clamp(Math.min(100, input.completedInterviews * 20)) : null
  const availableScores = [skillCoverage, input.resumeScore, input.interviewScore, learningProgress, profileCompleteness].filter((value): value is number => value !== null)
  const careerReadiness = availableScores.length ? average(availableScores) : null
  const jobMatchAverage = average(input.jobMatchScores)
  const skillGapCount = input.requiredSkillCount ? Math.max(0, input.requiredSkillCount - input.matchedSkillCount) : null

  return {
    careerReadiness,
    skillCoverage,
    skillGapCount,
    resumeReadiness: input.resumeScore,
    interviewReadiness: input.interviewScore,
    jobMatchAverage,
    profileCompleteness,
    learningProgress,
    interviewPreparationProgress,
    trend: 'not_available',
    nextAction: skillGapCount ? 'Prioritize the highest-impact missing skill in your target role.' : input.resumeScore === null ? 'Upload and analyze your resume to improve career readiness.' : 'Continue your roadmap and interview practice to build stronger evidence.',
  }
}

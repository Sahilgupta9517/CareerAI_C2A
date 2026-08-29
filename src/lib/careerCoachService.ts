import type {
  CareerHealthScore,
  CategoryHealth,
  NextBestAction,
  WeeklyCareerPlan,
  ThirtyDayCareerPlan,
  CareerMilestoneItem,
  GoalProgressSummary,
  CareerIntelligenceSummary,
  CareerScoreFactor,
} from '@/types/careerCoach'

export interface RawUserData {
  profile: any
  resumeText?: string
  userSkills: Array<{ name: string; proficiency?: number }>
  skillGaps: Array<{ skill: string; priority?: string; current_level?: number; target_level?: number }>
  roadmap: Array<{ title: string; status?: string }>
  savedJobs: any[]
  careerApps: any[]
  interviews: any[]
  analysesHistory?: any[]
}

export function calculateCareerHealthScore(data: Partial<RawUserData>): CareerHealthScore {
  const factors: CareerScoreFactor[] = []
  let totalScore = 0

  // 1. Profile Completeness (10%)
  const profile = data.profile?.profile || data.profile || {}
  const profileFields = [profile.name, profile.education, profile.branch, profile.experience, profile.location].filter(Boolean)
  const profileScore = Math.round((profileFields.length / 5) * 100)
  const profileWeighted = Math.round(profileScore * 0.1)
  totalScore += profileWeighted
  if (profileScore >= 80) {
    factors.push({ category: 'Profile', points: 10, reason: 'Profile details fully configured', isPositive: true })
  } else {
    factors.push({ category: 'Profile', points: -5, reason: 'Profile missing key background fields', isPositive: false })
  }

  // 2. Resume (15%)
  const hasResume = Boolean(data.resumeText || data.profile?.resume?.extracted_text || (data.profile?.resume?.detected_skills?.length > 0))
  const resumeScore = hasResume ? 85 : 0
  const resumeWeighted = Math.round(resumeScore * 0.15)
  totalScore += resumeWeighted
  if (hasResume) {
    factors.push({ category: 'Resume', points: 15, reason: 'Resume uploaded & ATS text parsed', isPositive: true })
  } else {
    factors.push({ category: 'Resume', points: -15, reason: 'No parsed resume on file', isPositive: false })
  }

  // 3. Skills Coverage (20%)
  const skills = data.userSkills || []
  const skillsScore = Math.min(100, Math.round((skills.length / 8) * 100))
  const skillsWeighted = Math.round(skillsScore * 0.2)
  totalScore += skillsWeighted
  if (skills.length >= 5) {
    factors.push({ category: 'Skills', points: 20, reason: `${skills.length} verified technical skills listed`, isPositive: true })
  } else {
    factors.push({ category: 'Skills', points: -10, reason: 'Fewer than 5 verified skills recorded', isPositive: false })
  }

  // 4. Skill Gaps & Projects (15%)
  const gaps = data.skillGaps || []
  const highGaps = gaps.filter((g) => g.priority === 'High' || g.priority === 'HIGH')
  const gapScore = Math.max(20, 100 - (highGaps.length * 15 + (gaps.length - highGaps.length) * 5))
  const gapWeighted = Math.round(gapScore * 0.15)
  totalScore += gapWeighted
  if (gaps.length === 0 && skills.length > 0) {
    factors.push({ category: 'Skill Gaps', points: 15, reason: 'Zero critical high-priority skill gaps remaining', isPositive: true })
  } else if (highGaps.length > 0) {
    factors.push({ category: 'Skill Gaps', points: -10, reason: `${highGaps.length} high-priority skill gaps pending resolution`, isPositive: false })
  }

  // 5. Target Career Goal (5%)
  const targetRole = data.profile?.role || data.profile?.careerGoal?.target_role || ''
  const goalScore = targetRole ? 100 : 0
  totalScore += Math.round(goalScore * 0.05)
  if (targetRole) {
    factors.push({ category: 'Career Goal', points: 5, reason: `Target role specified as "${targetRole}"`, isPositive: true })
  } else {
    factors.push({ category: 'Career Goal', points: -5, reason: 'Target role not set', isPositive: false })
  }

  // 6. Roadmap (10%)
  const roadmap = data.roadmap || []
  const roadmapScore = roadmap.length > 0 ? 80 : 0
  totalScore += Math.round(roadmapScore * 0.1)
  if (roadmap.length > 0) {
    factors.push({ category: 'Roadmap', points: 10, reason: `${roadmap.length} learning strategy milestones active`, isPositive: true })
  } else {
    factors.push({ category: 'Roadmap', points: -5, reason: 'Career roadmap not generated yet', isPositive: false })
  }

  // 7. Learning Progress (5%)
  const learningScore = skills.some((s) => (s.proficiency || 0) > 70) ? 90 : 40
  totalScore += Math.round(learningScore * 0.05)

  // 8. Applications Activity (10%)
  const apps = data.careerApps || []
  const appScore = Math.min(100, apps.length * 20)
  totalScore += Math.round(appScore * 0.1)
  if (apps.length >= 3) {
    factors.push({ category: 'Applications', points: 10, reason: `${apps.length} active job applications tracked`, isPositive: true })
  } else {
    factors.push({ category: 'Applications', points: -5, reason: 'Low job application volume', isPositive: false })
  }

  // 9. Interview Readiness (10%)
  const interviews = data.interviews || []
  const interviewScore = interviews.length > 0 ? 85 : 30
  totalScore += Math.round(interviewScore * 0.1)
  if (interviews.length > 0) {
    factors.push({ category: 'Interviews', points: 10, reason: `${interviews.length} mock interview prep session(s) completed`, isPositive: true })
  } else {
    factors.push({ category: 'Interviews', points: -5, reason: 'No mock interview practice recorded', isPositive: false })
  }

  const finalScore = Math.max(10, Math.min(98, totalScore))
  const positiveFactors = factors.filter((f) => f.isPositive)
  const negativeFactors = factors.filter((f) => !f.isPositive)

  const strengths = positiveFactors.map((f) => f.reason)
  const improvementAreas = negativeFactors.map((f) => f.reason)

  const confidence = (hasResume && skills.length >= 3 && Boolean(targetRole)) ? 'High' : (skills.length > 0 || hasResume) ? 'Medium' : 'Low'

  return {
    score: finalScore,
    confidence,
    strengths,
    improvementAreas,
    positiveFactors,
    negativeFactors,
  }
}

export function getCategoryHealthBreakdown(data: Partial<RawUserData>): CategoryHealth[] {
  const profile = data.profile?.profile || data.profile || {}
  const profileFields = [profile.name, profile.education, profile.branch, profile.experience, profile.location].filter(Boolean)
  const hasProfileData = profileFields.length > 0
  const profileScore = hasProfileData ? Math.round((profileFields.length / 5) * 100) : 0

  const hasResume = Boolean(data.resumeText || data.profile?.resume?.extracted_text || (data.profile?.resume?.detected_skills?.length > 0))
  const resumeScore = hasResume ? 85 : 0

  const skills = data.userSkills || []
  const hasSkillsData = skills.length > 0
  const skillsScore = hasSkillsData ? Math.min(100, Math.round((skills.length / 8) * 100)) : 0

  const gaps = data.skillGaps || []
  const hasGapsData = Boolean(data.profile?.careerAnalysis || gaps.length > 0 || skills.length > 0)
  const highGaps = gaps.filter((g) => g.priority === 'High' || g.priority === 'HIGH')
  const projectsScore = hasGapsData ? Math.max(30, 100 - highGaps.length * 20) : 0

  const targetRole = data.profile?.role || data.profile?.careerGoal?.target_role || ''
  const hasGoalData = Boolean(targetRole)
  const goalScore = hasGoalData ? 90 : 0

  const roadmap = data.roadmap || []
  const hasRoadmapData = roadmap.length > 0
  const roadmapScore = hasRoadmapData ? 80 : 0

  const apps = data.careerApps || []
  const hasAppsData = apps.length > 0
  const appsScore = hasAppsData ? Math.min(100, apps.length * 25) : 0

  const interviews = data.interviews || []
  const hasInterviewsData = interviews.length > 0
  const interviewsScore = hasInterviewsData ? Math.min(100, interviews.length * 35) : 0

  return [
    {
      name: 'Profile',
      score: profileScore,
      weightPct: 10,
      status: profileScore >= 80 ? 'Strong' : 'Needs Attention',
      hasEnoughData: hasProfileData,
      missingDataReason: hasProfileData ? undefined : 'Complete your basic profile details',
      summary: `${profileFields.length}/5 profile fields populated`,
    },
    {
      name: 'Resume',
      score: resumeScore,
      weightPct: 15,
      status: hasResume ? 'Strong' : 'Needs Attention',
      hasEnoughData: hasResume,
      missingDataReason: hasResume ? undefined : 'Upload a PDF resume to enable ATS parsing',
      summary: hasResume ? 'ATS text extracted & parsed' : 'No resume uploaded',
    },
    {
      name: 'Skills',
      score: skillsScore,
      weightPct: 20,
      status: skillsScore >= 60 ? 'Strong' : 'Needs Attention',
      hasEnoughData: hasSkillsData,
      missingDataReason: hasSkillsData ? undefined : 'Add technical skills to your profile',
      summary: `${skills.length} verified technical skills`,
    },
    {
      name: 'Projects',
      score: projectsScore,
      weightPct: 15,
      status: (projectsScore >= 70 && hasGapsData) ? 'Strong' : 'Needs Attention',
      hasEnoughData: hasGapsData,
      missingDataReason: hasGapsData ? undefined : 'Complete career analysis to evaluate project alignment',
      summary: `${highGaps.length} priority skill gaps to bridge via projects`,
    },
    {
      name: 'Career Goal',
      score: goalScore,
      weightPct: 5,
      status: hasGoalData ? 'Strong' : 'Needs Attention',
      hasEnoughData: hasGoalData,
      missingDataReason: hasGoalData ? undefined : 'Set a target role in your profile',
      summary: targetRole ? `Target: ${targetRole}` : 'Goal unspecified',
    },
    {
      name: 'Roadmap',
      score: roadmapScore,
      weightPct: 10,
      status: hasRoadmapData ? 'Strong' : 'Needs Attention',
      hasEnoughData: hasRoadmapData,
      missingDataReason: hasRoadmapData ? undefined : 'Generate a career roadmap from Career Analysis',
      summary: hasRoadmapData ? `${roadmap.length} learning strategy milestones` : 'No active roadmap',
    },
    {
      name: 'Applications',
      score: appsScore,
      weightPct: 10,
      status: appsScore >= 50 ? 'Strong' : 'Needs Attention',
      hasEnoughData: hasAppsData,
      missingDataReason: hasAppsData ? undefined : 'Track your active job applications in Job Pipeline',
      summary: hasAppsData ? `${apps.length} applications tracked` : 'No applications tracked',
    },
    {
      name: 'Interviews',
      score: interviewsScore,
      weightPct: 10,
      status: hasInterviewsData ? 'Strong' : 'Needs Attention',
      hasEnoughData: hasInterviewsData,
      missingDataReason: hasInterviewsData ? undefined : 'Practice AI Mock Interviews for target roles',
      summary: hasInterviewsData ? `${interviews.length} practice sessions completed` : 'No interview sessions recorded',
    },
  ]
}

export function generateNextBestActions(data: Partial<RawUserData>): NextBestAction[] {
  const actions: NextBestAction[] = []
  const hasResume = Boolean(data.resumeText || data.profile?.resume?.extracted_text || (data.profile?.resume?.detected_skills?.length > 0))
  const targetRole = data.profile?.role || data.profile?.careerGoal?.target_role || 'Software Engineer'
  const gaps = data.skillGaps || []
  const apps = data.careerApps || []
  const roadmap = data.roadmap || []

  // Deterministic rule 1: Missing Resume
  if (!hasResume) {
    actions.push({
      id: 'action-resume',
      title: 'Upload & Extract PDF Resume',
      reason: 'A parsed resume is essential for ATS job matching and personalized interview questions.',
      priority: 'HIGH',
      estimatedEffort: '5 mins',
      destinationUrl: '/resume-analyzer',
      category: 'resume',
    })
  }

  // Deterministic rule 2: High priority skill gap
  const topGap = gaps.find((g) => g.priority === 'High' || g.priority === 'HIGH') || gaps[0]
  if (topGap) {
    actions.push({
      id: 'action-skill-gap',
      title: `Bridge Critical Skill Gap: ${topGap.skill}`,
      reason: `Required skill for ${targetRole} opportunities with high market demand.`,
      priority: 'HIGH',
      estimatedEffort: '2 hours',
      destinationUrl: `/skill-gap?skill=${encodeURIComponent(topGap.skill)}`,
      category: 'skills',
    })
  }

  // Deterministic rule 3: Stalled applications / follow-up
  const activeApps = apps.filter((a) => a.status === 'applied' || a.status === 'screening')
  if (activeApps.length > 0) {
    actions.push({
      id: 'action-app-followup',
      title: `Follow Up on Application at ${activeApps[0].company_name}`,
      reason: `Application for ${activeApps[0].job_title} is active in ${activeApps[0].status.toUpperCase()} stage.`,
      priority: 'HIGH',
      estimatedEffort: '10 mins',
      destinationUrl: '/jobs?tab=tracker',
      category: 'applications',
    })
  }

  // Deterministic rule 4: Mock Interview practice
  const interviews = data.interviews || []
  if (interviews.length === 0 || activeApps.some((a) => a.status === 'interview')) {
    actions.push({
      id: 'action-interview-prep',
      title: `Practice AI Mock Interview for ${targetRole}`,
      reason: 'Build technical & STAR behavioral confidence before live employer screenings.',
      priority: activeApps.some((a) => a.status === 'interview') ? 'HIGH' : 'MEDIUM',
      estimatedEffort: '20 mins',
      destinationUrl: `/interviews?jobRole=${encodeURIComponent(targetRole)}`,
      category: 'interviews',
    })
  }

  // Deterministic rule 5: Smart Job Matching
  if (apps.length === 0) {
    actions.push({
      id: 'action-explore-jobs',
      title: `Explore Smart Matched Roles for ${targetRole}`,
      reason: 'Find top-ranked opportunities matching your current verified skills.',
      priority: 'MEDIUM',
      estimatedEffort: '15 mins',
      destinationUrl: '/jobs',
      category: 'jobs',
    })
  }

  // Deterministic rule 6: Incomplete Roadmap
  if (roadmap.length > 0) {
    actions.push({
      id: 'action-roadmap-milestone',
      title: `Advance Roadmap Milestone: ${roadmap[0].title || 'Core Foundation'}`,
      reason: `Next planned learning milestone for your ${targetRole} career strategy.`,
      priority: 'MEDIUM',
      estimatedEffort: '1 hour',
      destinationUrl: '/roadmap',
      category: 'roadmap',
    })
  }

  // Fallback default action if fewer than 3
  if (actions.length < 3) {
    actions.push({
      id: 'action-profile-update',
      title: 'Update Profile & Skill Proficiency',
      reason: 'Keep your technical skills list up to date to maintain accurate match scores.',
      priority: 'LOW',
      estimatedEffort: '10 mins',
      destinationUrl: '/profile',
      category: 'profile',
    })
  }

  return actions.slice(0, 5)
}

export function generateWeeklyCareerPlan(data: Partial<RawUserData>): WeeklyCareerPlan {
  const targetRole = data.profile?.role || data.profile?.careerGoal?.target_role || 'Software Engineer'
  const gaps = data.skillGaps || []
  const topGapSkill = gaps[0]?.skill || 'Core Data Structures'
  const secondGapSkill = gaps[1]?.skill || 'System Architecture'
  const activeAppCompany = data.careerApps?.[0]?.company_name || 'Target Employer'

  return {
    summary: `Structured weekly focus tailored for ${targetRole} readiness.`,
    days: [
      {
        dayName: 'Monday',
        category: 'Skill Gap',
        task: `Deep dive into ${topGapSkill} core concepts`,
        reason: `Bridge high-priority skill gap for ${targetRole}`,
        estimatedEffort: '1.5 hrs',
        destinationUrl: `/skill-gap?skill=${encodeURIComponent(topGapSkill)}`,
      },
      {
        dayName: 'Tuesday',
        category: 'Projects',
        task: `Build & document demo module using ${topGapSkill}`,
        reason: 'Demonstrate hands-on practical application on your portfolio',
        estimatedEffort: '2 hrs',
        destinationUrl: '/roadmap',
      },
      {
        dayName: 'Wednesday',
        category: 'Jobs & Pipeline',
        task: `Review high-match ${targetRole} roles & send 2 targeted applications`,
        reason: 'Maintain consistent application momentum',
        estimatedEffort: '45 mins',
        destinationUrl: '/jobs',
      },
      {
        dayName: 'Thursday',
        category: 'Interview Prep',
        task: `Practice AI Mock Interview for ${targetRole} technical questions`,
        reason: 'Master STAR technique and clear technical explanations',
        estimatedEffort: '30 mins',
        destinationUrl: `/interviews?jobRole=${encodeURIComponent(targetRole)}`,
      },
      {
        dayName: 'Friday',
        category: 'Resume & ATS',
        task: `Optimize resume bullet points for ${secondGapSkill} keywords`,
        reason: 'Improve ATS match score for upcoming role scans',
        estimatedEffort: '30 mins',
        destinationUrl: '/resume-analyzer',
      },
      {
        dayName: 'Saturday',
        category: 'Learning Roadmap',
        task: `Complete next roadmap step & study ${secondGapSkill}`,
        reason: 'Solidify backend system architecture fundamentals',
        estimatedEffort: '2 hrs',
        destinationUrl: '/roadmap',
      },
      {
        dayName: 'Sunday',
        category: 'Review & Strategy',
        task: `Review active pipeline status & plan ${activeAppCompany} follow-ups`,
        reason: 'Evaluate weekly progress and set next week targets',
        estimatedEffort: '20 mins',
        destinationUrl: '/jobs?tab=tracker',
      },
    ],
  }
}

export function generateThirtyDayCareerPlan(data: Partial<RawUserData>): ThirtyDayCareerPlan {
  const targetRole = data.profile?.role || data.profile?.careerGoal?.target_role || 'Software Engineer'
  const gaps = data.skillGaps || []
  const topSkill = gaps[0]?.skill || 'Core Technologies'
  const secondSkill = gaps[1]?.skill || 'System Architecture'

  return {
    targetRole,
    summary: `Complete 30-day career strategy to transform profile readiness for ${targetRole}.`,
    weeks: [
      {
        weekNumber: 1,
        title: 'Week 1: Foundation & Resume Optimization',
        focusArea: 'Resume alignment, ATS keywords, and profile configuration',
        tasks: [
          { dayNumber: 1, weekNumber: 1, task: 'Extract and analyze resume with AI ATS scanner', reason: 'Establish baseline ATS match score', estimatedEffort: '15 mins', destinationUrl: '/resume-analyzer' },
          { dayNumber: 3, weekNumber: 1, task: `Audit verified technical skills against ${targetRole} requirements`, reason: 'Identify critical missing keywords', estimatedEffort: '30 mins', destinationUrl: '/skill-gap' },
          { dayNumber: 5, weekNumber: 1, task: 'Rewrite project bullet points using Action Verb + Context + Metric format', reason: 'Enhance resume impact', estimatedEffort: '45 mins', destinationUrl: '/resume-analyzer' },
        ],
      },
      {
        weekNumber: 2,
        title: 'Week 2: Critical Skill Development',
        focusArea: `Bridge high-impact gaps in ${topSkill} and ${secondSkill}`,
        tasks: [
          { dayNumber: 8, weekNumber: 2, task: `Study ${topSkill} architecture & best practices`, reason: 'Resolve top-priority skill gap', estimatedEffort: '2 hrs', destinationUrl: `/skill-gap?skill=${encodeURIComponent(topSkill)}` },
          { dayNumber: 10, weekNumber: 2, task: `Build hands-on demo module showcasing ${topSkill}`, reason: 'Create verifiable proof of work', estimatedEffort: '3 hrs', destinationUrl: '/roadmap' },
          { dayNumber: 12, weekNumber: 2, task: `Study ${secondSkill} design patterns and tradeoff decisions`, reason: 'Prepare for technical interview questions', estimatedEffort: '2 hrs', destinationUrl: `/skill-gap?skill=${encodeURIComponent(secondSkill)}` },
        ],
      },
      {
        weekNumber: 3,
        title: 'Week 3: Portfolio & Job Application Execution',
        focusArea: 'Targeted applications and portfolio presentation',
        tasks: [
          { dayNumber: 15, weekNumber: 3, task: `Filter & rank top 10 matching ${targetRole} roles`, reason: 'Focus on high-probability opportunities', estimatedEffort: '30 mins', destinationUrl: '/jobs' },
          { dayNumber: 17, weekNumber: 3, task: 'Submit tailored applications and track in Job Pipeline', reason: 'Build active pipeline momentum', estimatedEffort: '1 hr', destinationUrl: '/jobs?tab=tracker' },
          { dayNumber: 19, weekNumber: 3, task: 'Generate AI recruiter follow-up messages for active applications', reason: 'Increase response rates', estimatedEffort: '20 mins', destinationUrl: '/jobs?tab=tracker' },
        ],
      },
      {
        weekNumber: 4,
        title: 'Week 4: Mock Interview Mastery & Offer Preparation',
        focusArea: 'Technical mock interviews, STAR responses, and negotiation prep',
        tasks: [
          { dayNumber: 22, weekNumber: 4, task: `Practice technical mock interview session for ${targetRole}`, reason: 'Master technical problem solving under time pressure', estimatedEffort: '30 mins', destinationUrl: `/interviews?jobRole=${encodeURIComponent(targetRole)}` },
          { dayNumber: 25, weekNumber: 4, task: 'Practice behavioral STAR questions & recruiter elevator pitch', reason: 'Ensure confident communication', estimatedEffort: '30 mins', destinationUrl: `/interviews?jobRole=${encodeURIComponent(targetRole)}` },
          { dayNumber: 28, weekNumber: 4, task: 'Review career health score & unlock milestones', reason: 'Evaluate final career readiness score', estimatedEffort: '15 mins', destinationUrl: '/dashboard' },
        ],
      },
    ],
  }
}

export function evaluateCareerMilestones(data: Partial<RawUserData>): CareerMilestoneItem[] {
  const profile = data.profile?.profile || data.profile || {}
  const profileFields = [profile.name, profile.education, profile.branch, profile.experience, profile.location].filter(Boolean)
  const isProfileComplete = profileFields.length >= 4

  const hasResume = Boolean(data.resumeText || data.profile?.resume?.extracted_text || (data.profile?.resume?.detected_skills?.length > 0))
  const skills = data.userSkills || []
  const gaps = data.skillGaps || []
  const roadmap = data.roadmap || []
  const apps = data.careerApps || []
  const interviews = data.interviews || []
  const health = calculateCareerHealthScore(data)

  return [
    {
      key: 'profile_completed',
      title: 'Profile Configured',
      description: 'Set target role, background, location, and experience',
      category: 'Profile',
      status: isProfileComplete ? 'Completed' : 'In Progress',
      unlockedAt: isProfileComplete ? new Date().toISOString() : null,
    },
    {
      key: 'resume_added',
      title: 'Resume Extracted',
      description: 'Uploaded and parsed PDF resume for ATS matching',
      category: 'Resume',
      status: hasResume ? 'Completed' : 'Locked',
      unlockedAt: hasResume ? new Date().toISOString() : null,
    },
    {
      key: 'first_skill_gap',
      title: 'Skill Gap Evaluated',
      description: 'Identified critical missing technical requirements',
      category: 'Skills',
      status: gaps.length > 0 || skills.length >= 5 ? 'Completed' : 'Locked',
      unlockedAt: (gaps.length > 0 || skills.length >= 5) ? new Date().toISOString() : null,
    },
    {
      key: 'roadmap_generated',
      title: 'Roadmap Milestone Active',
      description: 'Generated structured learning strategy',
      category: 'Roadmap',
      status: roadmap.length > 0 ? 'Completed' : 'Locked',
      unlockedAt: roadmap.length > 0 ? new Date().toISOString() : null,
    },
    {
      key: 'first_job_saved',
      title: 'First Job Saved',
      description: 'Bookmarked target opportunity in job workspace',
      category: 'Jobs',
      status: (data.savedJobs && data.savedJobs.length > 0) ? 'Completed' : 'Locked',
      unlockedAt: (data.savedJobs && data.savedJobs.length > 0) ? new Date().toISOString() : null,
    },
    {
      key: 'first_application',
      title: 'First Application Sent',
      description: 'Tracked active job application in Pipeline',
      category: 'Applications',
      status: apps.length > 0 ? 'Completed' : 'Locked',
      unlockedAt: apps.length > 0 ? new Date().toISOString() : null,
    },
    {
      key: 'ten_applications',
      title: '10 Applications Tracked',
      description: 'Built strong application volume in pipeline',
      category: 'Applications',
      status: apps.length >= 10 ? 'Completed' : apps.length > 0 ? 'In Progress' : 'Locked',
      unlockedAt: apps.length >= 10 ? new Date().toISOString() : null,
    },
    {
      key: 'first_interview_prep',
      title: 'AI Mock Interview Practice',
      description: 'Completed interactive practice interview session',
      category: 'Interviews',
      status: interviews.length > 0 ? 'Completed' : 'Locked',
      unlockedAt: interviews.length > 0 ? new Date().toISOString() : null,
    },
    {
      key: 'health_score_80',
      title: 'Career Readiness Master (80+)',
      description: 'Achieved Career Health Score greater than 80',
      category: 'Career Health',
      status: health.score >= 80 ? 'Completed' : health.score >= 50 ? 'In Progress' : 'Locked',
      unlockedAt: health.score >= 80 ? new Date().toISOString() : null,
    },
  ]
}

export function getGoalProgressSummary(data: Partial<RawUserData>): GoalProgressSummary {
  const targetRole = data.profile?.role || data.profile?.careerGoal?.target_role || 'Software Engineer'
  const breakdown = getCategoryHealthBreakdown(data)
  const score = calculateCareerHealthScore(data)

  const getScore = (name: string) => breakdown.find((b) => b.name === name)?.score || 0

  return {
    targetRole,
    overallReadinessPct: score.score,
    profilePct: getScore('Profile'),
    resumePct: getScore('Resume'),
    skillsPct: getScore('Skills'),
    projectsPct: getScore('Projects'),
    applicationsPct: getScore('Applications'),
    interviewPct: getScore('Interviews'),
  }
}

export function getCareerIntelligenceSummary(data: Partial<RawUserData>): CareerIntelligenceSummary {
  const health = calculateCareerHealthScore(data)
  const actions = generateNextBestActions(data)
  const breakdown = getCategoryHealthBreakdown(data)

  const strongest = breakdown.filter((b) => b.score >= 70).map((b) => `${b.name} (${b.score}%)`)
  const risks = breakdown.filter((b) => b.score < 50).map((b) => `${b.name} (${b.score}%)`)

  return {
    healthScore: health.score,
    readinessLabel: health.score >= 80 ? 'High Employer Readiness' : health.score >= 60 ? 'Moderate Readiness' : 'Building Alignment',
    strongestAreas: strongest.length ? strongest : ['Verified Skills List'],
    biggestRisks: risks.length ? risks : ['Mock Interview Practice'],
    growthFocus: health.improvementAreas.slice(0, 3),
    recommendedNextAction: actions[0],
  }
}

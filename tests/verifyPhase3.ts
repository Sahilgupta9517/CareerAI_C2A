import assert from 'node:assert/strict'
import { calculateCareerAnalytics } from '../server/services/careerAnalytics.ts'

const analytics = calculateCareerAnalytics({
  profile: { name: 'Asha', education: 'B.Tech', branch: 'CSE', experience: '1 year', location: 'Remote' },
  targetRole: 'Backend Developer', requiredSkillCount: 4, matchedSkillCount: 3, skillCount: 3,
  resumeScore: 80, interviewScore: 70, completedRoadmapItems: 2, roadmapItems: 4, jobMatchScores: [80, 90], completedInterviews: 2,
})
assert.equal(analytics.skillCoverage, 75)
assert.equal(analytics.jobMatchAverage, 85)
assert.ok((analytics.careerReadiness ?? 0) >= 0 && (analytics.careerReadiness ?? 0) <= 100)
console.log('Phase 3 verification passed')

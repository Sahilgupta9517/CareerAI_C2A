import { useState, useEffect } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import InterviewPageEnhanced from './InterviewPageEnhanced'
import InterviewDashboard from './InterviewDashboard'
import type { InterviewSetup } from '@/lib/interviewWorkflow'

export function InterviewPage() {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const jobRole = searchParams.get('jobRole') || searchParams.get('role')
  const interviewId = location.pathname.match(/^\/(?:interview|interviews)\/(\d+)$/)?.[1]
  const [screen, setScreen] = useState<'dashboard' | 'interview'>(
    interviewId || jobRole ? 'interview' : 'dashboard'
  )
  const [setupOverride, setSetupOverride] = useState<Partial<InterviewSetup> | null>(
    jobRole ? { targetRole: jobRole } : null
  )

  useEffect(() => {
    if (jobRole) {
      setSetupOverride({ targetRole: jobRole })
      setScreen('interview')
    }
  }, [jobRole])

  const handleStartNewInterview = (setup: Partial<InterviewSetup>) => {
    setSetupOverride(setup)
    setScreen('interview')
  }

  if (screen === 'interview') {
    return (
      <InterviewPageEnhanced
        key={interviewId ?? 'new-interview'}
        setupOverride={setupOverride}
        onComplete={() => setScreen('dashboard')}
        initialInterviewId={interviewId ? Number(interviewId) : undefined}
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Interview Preparation"
        description="Practice with AI-powered mock interviews, track your progress, and prepare for real job interviews"
      />
      <InterviewDashboard onStartNewInterview={handleStartNewInterview} />
    </div>
  )
}

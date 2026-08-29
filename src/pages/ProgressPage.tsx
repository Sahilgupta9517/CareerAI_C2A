import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BriefcaseBusiness,
  FileText,
  GraduationCap,
  Loader2,
  MessageSquareText,
  Sparkles,
  Target,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { PageHeader } from '@/components/common/PageHeader'
import { ProgressRing } from '@/components/common/ProgressRing'
import { supabase } from '@/lib/supabase'
import { getJobApplications } from '@/lib/persistenceService'
import { getInterviewHistory } from '@/lib/interviewWorkflow'
import type { MockInterview } from '@/lib/interviewService'

type ProgressData = {
  profile: { id: number; name: string | null; location: string | null }
  targetRole: string
  skills: Array<{ id: number; name: string; proficiency: number }>
  roadmap: Array<{ id: string; status: 'not_started' | 'in_progress' | 'completed'; completed_at?: string | null }>
  applicationsCount: number
  interviews: MockInterview[]
}

const show = (value: unknown) =>
  value === null || value === undefined || value === '' ? 'Not available' : String(value)

function EmptyState({
  title,
  description,
  action,
  to,
  icon: Icon,
}: {
  title: string
  description: string
  action: string
  to: string
  icon: typeof FileText
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/15 p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">{description}</p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link to={to}>
              {action} <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

function MetricCard({
  title,
  value,
  detail,
  icon: Icon,
  to,
  action,
}: {
  title: string
  value: string
  detail: string
  icon: typeof Target
  to: string
  action: string
}) {
  return (
    <Card className="flex flex-col p-5 shadow-sm transition-all hover:border-primary/30">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-foreground truncate">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground truncate">{detail}</p>
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <Button asChild variant="outline" size="sm" className="mt-auto pt-2 w-full text-xs">
        <Link to={to}>
          {action} <ArrowRight className="h-3.5 w-3.5 ml-1" />
        </Link>
      </Button>
    </Card>
  )
}

export function ProgressPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<ProgressData | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const loadProgress = async () => {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser()
        if (userError) throw userError
        if (!userData.user) {
          navigate('/login', { replace: true })
          return
        }
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, name, location')
          .eq('user_id', userData.user.id)
          .limit(1)
          .maybeSingle()
        if (profileError) throw profileError
        if (!profile) throw new Error('Your profile could not be found. Please complete onboarding.')

        const [skillsResult, roadmapResult, goalResult, applications, interviews] = await Promise.all([
          supabase.from('user_skills').select('id, proficiency, skill:skills(id, name)').eq('profile_id', profile.id),
          supabase.from('roadmap_progress').select('roadmap_item_id, status, completed_at').eq('profile_id', profile.id),
          supabase.from('career_goals').select('target_role').eq('profile_id', profile.id).limit(1).maybeSingle(),
          getJobApplications(profile.id).catch(() => []),
          getInterviewHistory().catch(() => []),
        ])

        if (skillsResult.error) throw skillsResult.error
        if (roadmapResult.error && roadmapResult.error.code !== 'PGRST205') throw roadmapResult.error

        const skills = (skillsResult.data ?? []).map((row) => {
          const skill = row.skill as unknown as { id: number; name: string } | null
          return { id: row.id, name: skill?.name ?? 'Unknown skill', proficiency: Number(row.proficiency) || 0 }
        })

        setData({
          profile,
          targetRole: goalResult.data?.target_role ?? 'Software Engineer',
          skills,
          roadmap: (roadmapResult.data ?? []).map((item) => ({
            id: item.roadmap_item_id,
            status: item.status,
            completed_at: item.completed_at,
          })),
          applicationsCount: applications.length,
          interviews,
        })
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'We could not load your progress.')
      } finally {
        setLoading(false)
      }
    }
    void loadProgress()
  }, [navigate])

  const skillAverage = useMemo(
    () => (data?.skills.length ? Math.round(data.skills.reduce((sum, s) => sum + s.proficiency, 0) / data.skills.length) : 0),
    [data]
  )
  const completedRoadmap = data?.roadmap.filter((item) => item.status === 'completed').length ?? 0
  const inProgressRoadmap = data?.roadmap.filter((item) => item.status === 'in_progress').length ?? 0
  const totalRoadmap = data?.roadmap.length ?? 0
  const roadmapProgress = totalRoadmap ? Math.round((completedRoadmap / totalRoadmap) * 100) : 0

  const completedInterviews = data?.interviews.filter((i) => i.status === 'completed' || (i.overall_score ?? 0) > 0) ?? []
  const avgInterviewScore = completedInterviews.length
    ? Math.round(completedInterviews.reduce((sum, i) => sum + (i.overall_score ?? 0), 0) / completedInterviews.length)
    : 0

  // Composite Readiness Calculation
  const readiness = Math.min(
    100,
    Math.round(
      (skillAverage > 0 ? (skillAverage / 100) * 40 : 15) +
        (completedRoadmap > 0 ? Math.min(25, completedRoadmap * 5) : 5) +
        (completedInterviews.length > 0 ? Math.min(20, (avgInterviewScore / 100) * 20) : 0) +
        (data?.applicationsCount ? Math.min(15, data.applicationsCount * 3) : 0)
    )
  )

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Loading career progress" />
      </div>
    )
  }
  if (errorMessage) {
    return (
      <div role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-5 text-sm text-rose-300">
        {errorMessage}
      </div>
    )
  }
  if (!data) {
    return (
      <div role="status" className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
        Progress data is not available yet.
      </div>
    )
  }

  return (
    <div className="space-y-7">
      <PageHeader
        title="Career Progress Analytics"
        description="Comprehensive velocity tracking across verified skills, roadmap milestones, mock interviews, and application pipeline."
        eyebrow={
          <Badge variant="outline" className="border-primary/20 text-primary">
            <Sparkles className="h-3.5 w-3.5 mr-1" /> Career Growth Velocity
          </Badge>
        }
      />

      {/* Hero Overview */}
      <Card className="overflow-hidden p-0">
        <div className="grid lg:grid-cols-[260px_1fr]">
          <div className="flex flex-col items-center justify-center border-b border-border bg-muted/25 p-7 text-center lg:border-b-0 lg:border-r">
            <p className="text-sm font-semibold text-foreground">Overall Readiness</p>
            <ProgressRing value={readiness} size={150} className="my-4" label={`${readiness}%`} />
            <p className="max-w-[180px] text-xs leading-relaxed text-muted-foreground">
              Composite score from skills, roadmap milestones, and interview simulations.
            </p>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-foreground">Weekly Progress Summary</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Your active progress toward your target role <b>{data.targetRole}</b>.
                </p>
              </div>
              <Badge variant="secondary">{show(data.profile.name)}</Badge>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-border/80 bg-muted/15 p-3">
                <p className="text-xs text-muted-foreground">Verified Skills</p>
                <p className="mt-1 text-xl font-bold text-foreground">{data.skills.length}</p>
                <p className="text-[11px] text-cyan-400">Avg Level: {skillAverage}%</p>
              </div>
              <div className="rounded-lg border border-border/80 bg-muted/15 p-3">
                <p className="text-xs text-muted-foreground">Milestones Finished</p>
                <p className="mt-1 text-xl font-bold text-foreground">{completedRoadmap}</p>
                <p className="text-[11px] text-emerald-400">{inProgressRoadmap} in progress</p>
              </div>
              <div className="rounded-lg border border-border/80 bg-muted/15 p-3">
                <p className="text-xs text-muted-foreground">Mock Interviews</p>
                <p className="mt-1 text-xl font-bold text-foreground">{completedInterviews.length}</p>
                <p className="text-[11px] text-purple-400">Avg Score: {avgInterviewScore}%</p>
              </div>
              <div className="rounded-lg border border-border/80 bg-muted/15 p-3">
                <p className="text-xs text-muted-foreground">Tracked Applications</p>
                <p className="mt-1 text-xl font-bold text-foreground">{data.applicationsCount}</p>
                <p className="text-[11px] text-amber-400">Active pipeline</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Module Velocity Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Skill Gap Alignment"
          value={`${data.skills.length} skills`}
          detail={`${data.targetRole} role targets`}
          icon={Target}
          to="/skills"
          action="View Skill Gap"
        />
        <MetricCard
          title="Learning Roadmap"
          value={`${completedRoadmap} of ${totalRoadmap}`}
          detail={`${roadmapProgress}% milestones finished`}
          icon={GraduationCap}
          to="/roadmap"
          action="Continue Roadmap"
        />
        <MetricCard
          title="AI Interview Practice"
          value={completedInterviews.length > 0 ? `${avgInterviewScore}% avg` : 'No sessions'}
          detail={`${completedInterviews.length} completed sessions`}
          icon={MessageSquareText}
          to="/interview"
          action="Practice Interview"
        />
        <MetricCard
          title="Application Funnel"
          value={`${data.applicationsCount} roles`}
          detail="Pipeline & saved tracker"
          icon={BriefcaseBusiness}
          to="/jobs"
          action="Manage Pipeline"
        />
      </div>

      {/* Skill Development Card */}
      <Card className="p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Development</p>
            <h2 className="mt-1 text-lg font-semibold text-foreground">Skill Development</h2>
            <p className="mt-1 text-sm text-muted-foreground">Your saved proficiency, grouped by progress state.</p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/skills">
              View all skills <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </Button>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {data.skills.map((skill) => {
            const status = skill.proficiency >= 70 ? 'Strong' : skill.proficiency >= 40 ? 'Improving' : 'Needs work'
            const tone = skill.proficiency >= 70 ? 'success' : skill.proficiency >= 40 ? 'warning' : 'danger'
            return (
              <div key={skill.id} className="rounded-lg border border-border bg-muted/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-foreground">{skill.name}</span>
                  <Badge variant={tone}>{status}</Badge>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <Progress value={skill.proficiency} className="h-2" />
                  <span className="w-10 text-right text-xs font-semibold text-foreground">{skill.proficiency}%</span>
                </div>
              </div>
            )
          })}
          {data.skills.length === 0 ? (
            <EmptyState
              title="No skills saved yet"
              description="Complete onboarding to start tracking your skill development."
              action="Add skills"
              to="/onboarding"
              icon={Target}
            />
          ) : null}
        </div>
      </Card>
    </div>
  )
}

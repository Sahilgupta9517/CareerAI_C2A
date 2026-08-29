import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Circle,
  FolderGit2,
  HelpCircle,
  Map,
  MessageSquareText,
  Play,
  RotateCcw,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/common/PageHeader'
import { ProgressRing } from '@/components/common/ProgressRing'
import { supabase } from '@/lib/supabase'
import { roleRequirements } from '@/data/roleRequirements'
import {
  generateRoadmap,
  type RoadmapItem,
  type RoadmapPhase,
  type RoadmapStatus,
} from '@/lib/roadmap'
import { calculateRoleReadiness } from '@/lib/skillMatching'
import { normalizeSkill } from '@/lib/jobMatching'
import { sanitizeSkillList } from '@/lib/resumeParser'
import type { UserSkill } from '@/types/skillGap'
import { cn } from '@/lib/utils'

type DatabaseStatus = 'not_started' | 'in_progress' | 'completed'
const toDatabase: Record<RoadmapStatus, DatabaseStatus> = {
  'Not Started': 'not_started',
  'In Progress': 'in_progress',
  Completed: 'completed',
}
const fromDatabase: Record<DatabaseStatus, RoadmapStatus> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Completed',
}
const nextStatus: Record<RoadmapStatus, RoadmapStatus> = {
  'Not Started': 'In Progress',
  'In Progress': 'Completed',
  Completed: 'Not Started',
}
const priorityRank = { High: 3, Medium: 2, Low: 1 }

type SkillRow = { skill?: { name?: string | null } | null; skill_id: number; proficiency?: number | null }

export function RoadmapPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const focusSkill = searchParams.get('skill') || searchParams.get('focusSkill')

  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [profileId, setProfileId] = useState<number | null>(null)
  const [targetRole, setTargetRole] = useState('')
  const [userSkills, setUserSkills] = useState<UserSkill[]>([])
  const [progressMap, setProgressMap] = useState<Record<string, RoadmapStatus>>({})

  useEffect(() => {
    const load = async () => {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser()
        if (userError) throw userError
        if (!userData.user) {
          navigate('/login', { replace: true })
          return
        }
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', userData.user.id)
          .limit(1)
          .maybeSingle()
        if (profileError) throw profileError
        if (!profile) throw new Error('Your profile could not be found. Please complete onboarding.')

        const [goalResult, skillsResult, resumeResult, progressResult] = await Promise.all([
          supabase.from('career_goals').select('target_role').eq('profile_id', profile.id).limit(1).maybeSingle(),
          supabase.from('user_skills').select('skill_id, proficiency, skill:skills(name)').eq('profile_id', profile.id),
          supabase
            .from('resume_analyses')
            .select('extracted_text, structured_resume')
            .eq('profile_id', profile.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase.from('roadmap_progress').select('roadmap_item_id, status').eq('profile_id', profile.id),
        ])

        if (goalResult.error) throw goalResult.error
        if (skillsResult.error) throw skillsResult.error
        if (resumeResult.error) throw resumeResult.error
        if (progressResult.error && progressResult.error.code !== 'PGRST205') throw progressResult.error

        const role = goalResult.data?.target_role?.trim() ?? ''
        const rows = (skillsResult.data ?? []) as unknown as SkillRow[]
        const savedNames = rows.map((row) => row.skill?.name).filter((name): name is string => Boolean(name))
        const savedSkills = sanitizeSkillList(savedNames).map((name) => {
          const row = rows.find((candidate) => candidate.skill?.name && sanitizeSkillList([candidate.skill.name])[0] === name)
          const proficiency = row?.proficiency == null ? undefined : Number(row.proficiency)
          return { name, ...(proficiency !== undefined && Number.isFinite(proficiency) ? { proficiency } : {}) }
        })
        const structured = resumeResult.data?.structured_resume
        const resumeNames =
          structured && typeof structured === 'object' && 'technicalSkills' in structured && Array.isArray(structured.technicalSkills)
            ? sanitizeSkillList(structured.technicalSkills)
            : []

        setProfileId(profile.id)
        setTargetRole(role)
        setUserSkills([
          ...savedSkills,
          ...resumeNames.filter((name) => !savedSkills.some((skill) => skill.name === name)).map((name) => ({ name })),
        ])
        setProgressMap(
          Object.fromEntries(
            (progressResult.data ?? []).map((row) => [
              row.roadmap_item_id,
              fromDatabase[(row.status as DatabaseStatus) ?? 'not_started'] ?? 'Not Started',
            ])
          )
        )
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'We could not load your roadmap data.')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [navigate])

  const role =
    roleRequirements.find((item) => item.title === targetRole) ??
    (targetRole === 'Software Developer' ? roleRequirements.find((item) => item.title === 'Software Engineer') : undefined)

  const phases = useMemo(
    () =>
      role
        ? generateRoadmap(role, userSkills).map((phase) => ({
            ...phase,
            items: phase.items.map((item) => ({ ...item, status: progressMap[item.id] ?? item.status })),
          }))
        : [],
    [role, userSkills, progressMap]
  )

  const allItems = phases.flatMap((phase) => phase.items)
  const completed = allItems.filter((item) => item.status === 'Completed').length
  const overall = allItems.length ? Math.round((completed / allItems.length) * 100) : 0
  const currentReadiness = role ? calculateRoleReadiness(role, userSkills) : 0
  const missingSkills = role
    ? role.requiredSkills.filter((skill) => !userSkills.some((item) => normalizeSkill(item.name) === normalizeSkill(skill))).length
    : 0

  const nextItem = [...allItems]
    .filter((item) => item.status !== 'Completed')
    .sort((left, right) => priorityRank[right.priority] - priorityRank[left.priority])[0]

  const projectItems = phases.find((phase) => phase.name === 'Phase 4 - Project Recommendations')?.items ?? []

  const toggleStatus = async (item: RoadmapItem) => {
    if (profileId === null) return
    const previous = progressMap[item.id] ?? item.status
    const next = nextStatus[previous]
    setProgressMap((current) => ({ ...current, [item.id]: next }))
    const { error } = await supabase.from('roadmap_progress').upsert(
      {
        profile_id: profileId,
        roadmap_item_id: item.id,
        status: toDatabase[next],
        completed_at: next === 'Completed' ? new Date().toISOString() : null,
      },
      { onConflict: 'profile_id,roadmap_item_id' }
    )
    if (error) {
      setProgressMap((current) => ({ ...current, [item.id]: previous }))
      setErrorMessage('Roadmap progress could not be saved. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-36 w-full rounded-2xl" />
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    )
  }

  if (errorMessage && !targetRole) {
    return <div role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-6 text-sm text-rose-300">{errorMessage}</div>
  }
  if (!targetRole) {
    return (
      <EmptyState
        icon={<Target className="h-8 w-8" />}
        title="Set a career goal to build your personalized roadmap."
        action="Choose a target role in your profile to plan your next learning milestones."
        to="/profile"
        button="Set Target Role"
      />
    )
  }
  if (!role) {
    return (
      <EmptyState
        icon={<Target className="h-8 w-8" />}
        title="Choose a supported target role to build your roadmap."
        action="Update your target role in Skill Gap Analysis."
        to="/skills"
        button="Open Skill Gap"
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Personalized Learning Roadmap"
        description={`Dynamic 6-stage roadmap generated for ${targetRole}. Closes verified skill gaps with real projects and interview practice.`}
        eyebrow={
          <Badge variant="outline" className="border-primary/20 text-primary">
            <Map className="h-3.5 w-3.5 mr-1" /> 6-Stage Personalized Path
          </Badge>
        }
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to="/skills">
                View Skill Gaps <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
            <Button asChild>
              <Link to="/interview">
                Practice Interview <MessageSquareText className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        }
      />

      {errorMessage ? (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      {focusSkill ? (
        <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/10 p-3.5 text-xs text-primary-foreground">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            <span>Targeting missing skill: <strong className="text-foreground">{focusSkill}</strong> from matched job requirements. Complete milestones below to build readiness.</span>
          </div>
          <Button size="sm" variant="ghost" asChild className="h-6 text-[11px]">
            <Link to="/jobs">Back to Jobs</Link>
          </Button>
        </div>
      ) : null}

      {/* Roadmap Overview Banner */}
      <Card className="border-primary/15 bg-gradient-to-r from-primary/10 via-card to-background p-6">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <p className="text-xs text-muted-foreground">Target Role</p>
            <p className="mt-1 text-lg font-bold text-foreground">{targetRole}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Role Readiness</p>
            <p className="mt-1 text-lg font-bold text-emerald-400">{currentReadiness}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Verified Skills</p>
            <p className="mt-1 text-lg font-bold text-foreground">{userSkills.length}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Skill Gaps to Close</p>
            <p className="mt-1 text-lg font-bold text-amber-400">{missingSkills}</p>
          </div>
          <div className="flex items-center gap-3">
            <ProgressRing value={overall} size={58} label={`${overall}%`} />
            <div>
              <p className="text-xs text-muted-foreground">Roadmap Progress</p>
              <p className="text-sm font-semibold text-foreground">
                {completed} of {allItems.length} complete
              </p>
            </div>
          </div>
        </div>

        {/* 6-Stage Visual Stepper */}
        <div className="mt-6 border-t border-border/70 pt-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">Roadmap Progression Flow</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 text-xs">
            {[
              { num: '1', name: 'Foundation', desc: 'Core fundamentals' },
              { num: '2', name: 'Core Skills', desc: 'Frameworks & tools' },
              { num: '3', name: 'Advanced Skills', desc: 'Cloud & architecture' },
              { num: '4', name: 'Projects', desc: 'Portfolio evidence' },
              { num: '5', name: 'Interviews', desc: 'Simulated practice' },
              { num: '6', name: 'Job Ready', desc: 'Active pipeline' },
            ].map((step, idx) => {
              const phaseItems = phases[idx]?.items ?? []
              const phaseCompleted = phaseItems.length > 0 && phaseItems.every((i) => i.status === 'Completed')
              const phaseInProgress = phaseItems.some((i) => i.status === 'In Progress')
              return (
                <div
                  key={step.name}
                  className={cn(
                    'rounded-lg border p-2.5 transition-all',
                    phaseCompleted
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                      : phaseInProgress
                      ? 'border-primary/40 bg-primary/10 text-primary'
                      : 'border-border/60 bg-muted/20 text-muted-foreground'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{step.num}. {step.name}</span>
                    {phaseCompleted ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : null}
                  </div>
                  <p className="mt-1 text-[10px] truncate text-muted-foreground">{step.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </Card>

      {/* Recommended Next Step & Featured Project */}
      <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
        <Card className="p-5">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-base font-semibold">Recommended Next Learning Step</h2>
              <p className="text-xs text-muted-foreground">Highest priority incomplete item on your roadmap.</p>
            </div>
          </div>
          {nextItem ? (
            <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-bold text-foreground">{nextItem.skill}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {nextItem.priority} Priority · {nextItem.difficulty} · {nextItem.duration}
                  </p>
                </div>
                <Badge variant={nextItem.status === 'Completed' ? 'success' : nextItem.status === 'In Progress' ? 'warning' : 'secondary'}>
                  {nextItem.status}
                </Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{nextItem.why}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => void toggleStatus(nextItem)}>
                  {nextItem.status === 'Not Started' ? 'Start Learning' : nextItem.status === 'In Progress' ? 'Mark Complete' : 'Reset'}
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link to="/skills">View Skill Gap</Link>
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">All roadmap milestones are complete!</p>
          )}
        </Card>

        {/* Feature #6: Project Recommendation Briefs */}
        <Card className="p-5">
          <div className="flex items-center gap-2.5">
            <FolderGit2 className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-base font-semibold">Recommended Portfolio Projects</h2>
              <p className="text-xs text-muted-foreground">Targeted projects to close your missing skill gaps.</p>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {projectItems.slice(0, 2).map((item) => (
              <div key={item.id} className="rounded-xl border border-border/80 bg-muted/20 p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-sm text-foreground">{item.skill}</p>
                  <Badge variant="outline" className="text-[10px]">{item.difficulty}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">{item.why}</p>
                <div className="mt-2.5 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-cyan-400">{item.duration}</span>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => void toggleStatus(item)}>
                    {item.status === 'Completed' ? 'Completed ✓' : item.status === 'In Progress' ? 'Mark Done' : 'Start Project'}
                  </Button>
                </div>
              </div>
            ))}
            {projectItems.length === 0 && (
              <p className="text-xs text-muted-foreground py-4">No project gaps detected for your current profile.</p>
            )}
          </div>
        </Card>
      </div>

      {/* All 6 Roadmap Phase Cards */}
      <div className="space-y-5">
        {phases.map((phase, index) => (
          <PhaseCard key={phase.name} phase={phase} index={index} onToggle={toggleStatus} />
        ))}
      </div>
    </div>
  )
}

function EmptyState({
  icon,
  title,
  action,
  to,
  button,
}: {
  icon: React.ReactNode
  title: string
  action: string
  to: string
  button: string
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/15 p-8 text-center">
      <span className="mx-auto flex w-fit text-muted-foreground">{icon}</span>
      <h2 className="mt-3 text-base font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{action}</p>
      <Button asChild className="mt-5">
        <Link to={to}>
          {button} <ArrowRight className="h-4 w-4 ml-1" />
        </Link>
      </Button>
    </div>
  )
}

function PhaseCard({
  phase,
  index,
  onToggle,
}: {
  phase: RoadmapPhase
  index: number
  onToggle: (item: RoadmapItem) => void
}) {
  const completed = phase.items.filter((item) => item.status === 'Completed').length
  const progress = phase.items.length ? Math.round((completed / phase.items.length) * 100) : 0

  return (
    <Card className="p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-primary">
              {index + 1}
            </span>
            <h2 className="text-lg font-semibold text-foreground">{phase.name}</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{phase.description}</p>
        </div>
        <Badge variant={progress === 100 ? 'success' : 'secondary'}>{progress}% complete</Badge>
      </div>

      <Progress value={progress} className="mt-4 h-1.5" />

      <div className="mt-5 grid gap-3">
        {phase.items.length ? (
          phase.items.map((item) => <RoadmapItemCard key={item.id} item={item} onToggle={onToggle} />)
        ) : (
          <p className="text-xs text-muted-foreground py-2">No remaining items needed in this phase for your current profile.</p>
        )}
      </div>
    </Card>
  )
}

function RoadmapItemCard({ item, onToggle }: { item: RoadmapItem; onToggle: (item: RoadmapItem) => void }) {
  const [showWhy, setShowWhy] = useState(false)
  const statusVariant = item.status === 'Completed' ? 'success' : item.status === 'In Progress' ? 'warning' : 'secondary'
  const priority = item.priority === 'High' ? 'HIGH' : item.priority === 'Medium' ? 'MEDIUM' : 'LOW'

  return (
    <div className="rounded-xl border border-border/80 bg-muted/15 p-4 transition-all hover:border-primary/30">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-foreground">{item.skill}</h3>
            <Badge variant={priority === 'HIGH' ? 'danger' : priority === 'MEDIUM' ? 'warning' : 'secondary'}>
              {priority} Priority
            </Badge>
            {item.recommendedProject && <Badge variant="outline" className="text-[10px]">Project Brief</Badge>}
            <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> +5–10% readiness
            </span>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{item.why}</p>
        </div>
        <Badge variant={statusVariant} className="shrink-0">
          <span className="flex items-center gap-1">
            {item.status === 'Completed' ? (
              <Check className="h-3 w-3" />
            ) : item.status === 'In Progress' ? (
              <Circle className="h-3 w-3" />
            ) : null}
            {item.status}
          </span>
        </Badge>
      </div>

      <div className="mt-3 grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4 border-t border-border/60 pt-3">
        <div>
          <b className="text-foreground">Difficulty:</b>
          <p className="mt-0.5 text-muted-foreground">{item.difficulty}</p>
        </div>
        <div>
          <b className="text-foreground">Estimated Effort:</b>
          <p className="mt-0.5 text-muted-foreground">{item.duration}</p>
        </div>
        <div>
          <b className="text-foreground">Target Outcome:</b>
          <p className="mt-0.5 text-muted-foreground">{item.outcome}</p>
        </div>
        <div>
          <b className="text-foreground">Prerequisites:</b>
          <p className="mt-0.5 text-muted-foreground">
            {item.prerequisites.length ? item.prerequisites.join(', ') : 'None'}
          </p>
        </div>
      </div>

      <p className="mt-3 rounded-lg bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
        <b className="text-foreground">Practical Task / Deliverable:</b> {item.task}
      </p>

      {showWhy && (
        <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs animate-fade-in space-y-1.5">
          <p className="font-semibold text-primary">Why is this milestone sequenced here?</p>
          <p className="text-muted-foreground leading-relaxed">{item.why}</p>
          <p className="text-[11px] text-foreground font-medium">
            Prerequisites required: {item.prerequisites.length ? item.prerequisites.join(', ') : 'None. You can start immediately.'}
          </p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={item.status === 'Completed' ? 'outline' : 'default'}
            className="text-xs"
            onClick={() => onToggle(item)}
          >
            {item.status === 'Not Started' ? (
              <>Start Learning <Play className="ml-1 h-3.5 w-3.5" /></>
            ) : item.status === 'In Progress' ? (
              <>Mark Complete <Check className="ml-1 h-3.5 w-3.5" /></>
            ) : (
              <>Reset Progress <RotateCcw className="ml-1 h-3.5 w-3.5" /></>
            )}
          </Button>
          <Button asChild size="sm" variant="outline" className="text-xs">
            <Link to="/skills">View Skill Gap</Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="text-xs">
            <Link to={`/interview?jobRole=${encodeURIComponent(item.skill)}`}>Practice Interview</Link>
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setShowWhy(!showWhy)}
          className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
        >
          <HelpCircle className="h-3.5 w-3.5" />
          <span>{showWhy ? 'Hide why' : 'Why this milestone?'}</span>
          {showWhy ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>
    </div>
  )
}


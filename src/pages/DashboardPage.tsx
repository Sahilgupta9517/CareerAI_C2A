import { useEffect, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Award,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  HelpCircle,
  Info,
  Layers,
  Map,
  MessageSquareText,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { ProgressRing } from '@/components/common/ProgressRing'
import { WhyAmISeeingThis } from '@/components/common/WhyAmISeeingThis'
import { getDashboardOverview, type DashboardOverview } from '@/lib/dashboardService'
import { cn } from '@/lib/utils'

export function DashboardPage() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [scoreModalOpen, setScoreModalOpen] = useState(false)
  const [thirtyDayModalOpen, setThirtyDayModalOpen] = useState(false)
  const [showAiReasoning, setShowAiReasoning] = useState(false)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      setOverview(await getDashboardOverview())
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load your career dashboard.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  if (loading) return <DashboardSkeleton />
  if (error || !overview) {
    return (
      <div role="alert" className="space-y-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-6 text-sm text-rose-300">
        <p>{error || 'Unable to load your career dashboard.'}</p>
        <Button variant="outline" onClick={() => void load()}>
          <RefreshCw className="mr-2 h-4 w-4" /> Retry
        </Button>
      </div>
    )
  }

  const {
    profile,
    stats,
    role,
    readinessBreakdown,
    skillComparisons,
    jobs,
    roadmap,
    alerts,
    recentActivities,
    aiInsight,
    careerHealth,
    categoryBreakdown: _categoryBreakdown,
    nextBestActions,
    weeklyPlan,
    thirtyDayPlan,
    milestones,
    goalProgress,
    // Phase 16
    insightsReadiness,
    primaryNextAction,
    topStrengths,
    careerRisks,
    growthComparison,
    interviewSignal,
  } = overview

  const firstName = profile.profile.name?.split(' ')[0] || 'there'
  const requiredSkillComparisons = skillComparisons.filter((item) => item.requirement === 'Required')
  const matched = requiredSkillComparisons.filter((item) => item.classification === 'MATCHED')
  const improving = requiredSkillComparisons.filter((item) => item.classification === 'PARTIAL')
  const missing = requiredSkillComparisons.filter((item) => item.classification === 'MISSING')


  const alertBadge = (type: string) => {
    switch (type) {
      case 'critical':
        return { icon: AlertTriangle, border: 'border-rose-500/30 bg-rose-500/10 text-rose-300', tag: 'High Risk' }
      case 'warning':
        return { icon: AlertTriangle, border: 'border-amber-500/30 bg-amber-500/10 text-amber-300', tag: 'Attention' }
      case 'info':
        return { icon: Info, border: 'border-blue-500/30 bg-blue-500/10 text-blue-300', tag: 'Update' }
      default:
        return { icon: CheckCircle2, border: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300', tag: 'Good' }
    }
  }

  return (
    <div className="space-y-8">
      {/* 1. Career Command Center Hero Banner */}
      <section
        className="relative overflow-hidden rounded-2xl border border-primary/20 p-6 shadow-soft sm:p-8"
        style={{
          background:
            'linear-gradient(120deg, rgba(37,99,235,0.18) 0%, rgba(11,23,40,0.95) 45%, rgba(34,211,238,0.12) 100%)',
        }}
      >
        <div
          className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full blur-3xl opacity-40"
          style={{ background: 'radial-gradient(circle, #2563EB 0%, transparent 70%)' }}
        />
        <div
          className="pointer-events-none absolute -bottom-16 right-1/4 h-56 w-56 rounded-full blur-3xl opacity-25"
          style={{ background: 'radial-gradient(circle, #22D3EE 0%, transparent 70%)' }}
        />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
              <Zap className="mr-1.5 h-3.5 w-3.5" /> CareerAI Insights & Intelligence Engine
            </Badge>
            <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-white sm:text-5xl">
              Welcome back, {firstName}
            </h1>
            <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-slate-300">
              Your real-time personalized career intelligence suite. Tracking target role readiness, verified skills, and next best career execution moves.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary" className="px-3 py-1.5 text-xs font-semibold">
              <Target className="mr-1.5 h-3.5 w-3.5 text-cyan-400" />
              {profile.goal?.target_role || 'Target role not set'}
            </Badge>
            <Button onClick={() => setThirtyDayModalOpen(true)} variant="default" size="sm" className="shadow-glow">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Build 30-Day Career Plan
            </Button>
            <Button asChild variant="outline" size="sm" className="border-primary/30 text-white hover:bg-primary/10">
              <Link to="/career-analysis">
                Full Career Analysis <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* 2. PHASE 16: PROMINENT NEXT BEST ACTION ENGINE */}
      {primaryNextAction && (
        <Card className="relative overflow-hidden border-primary/40 bg-gradient-to-r from-primary/15 via-card to-cyan-500/10 p-6 shadow-glow">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-lift">
                <Zap className="h-6 w-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="border-primary/50 bg-primary/20 text-primary font-bold text-[10px]">
                    NEXT BEST ACTION
                  </Badge>
                  <Badge variant={primaryNextAction.priority === 'CRITICAL' ? 'danger' : primaryNextAction.priority === 'HIGH' ? 'warning' : 'secondary'} className="text-[10px]">
                    {primaryNextAction.priority} PRIORITY
                  </Badge>
                  <Badge variant={primaryNextAction.confidence === 'HIGH' ? 'secondary' : 'outline'} className="text-[10px]">
                    <ShieldCheck className="h-2.5 w-2.5 mr-1" />
                    {primaryNextAction.confidence} CONFIDENCE
                  </Badge>
                  <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> {primaryNextAction.expectedImpact}
                  </span>
                </div>
                <h2 className="mt-1.5 text-xl font-bold text-foreground">
                  {primaryNextAction.action}
                </h2>
                <p className="mt-1 max-w-2xl text-xs text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-foreground">Why: </span>{primaryNextAction.why}
                </p>
              </div>
            </div>
            <Button asChild size="lg" className="shrink-0 shadow-glow">
              <Link to={primaryNextAction.ctaLink}>
                {primaryNextAction.ctaText} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </Card>
      )}

      {/* 3. PHASE 16: CAREER READINESS EXPLANATION & CONFIDENCE */}
      <Card className="border-primary/25 bg-gradient-to-br from-primary/10 via-card to-background p-6 shadow-glow backdrop-blur-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-6">
            <div className="relative shrink-0">
              <ProgressRing
                value={insightsReadiness.overallScore}
                size={136}
                label={`${insightsReadiness.overallScore}%`}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Career Readiness Explanation</span>
                <Badge variant={insightsReadiness.confidence === 'HIGH' ? 'secondary' : insightsReadiness.confidence === 'MEDIUM' ? 'warning' : 'outline'} className="text-[10px]">
                  <ShieldCheck className="h-2.5 w-2.5 mr-1" />
                  {insightsReadiness.confidence} Confidence
                </Badge>
                <button
                  type="button"
                  onClick={() => setScoreModalOpen(true)}
                  className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-primary transition-colors flex items-center gap-1 text-xs"
                >
                  <HelpCircle className="h-4 w-4" />
                  <span className="underline">Score calculation</span>
                </button>
              </div>
              <h2 className="mt-1 font-display text-3xl font-bold text-foreground">
                Career Readiness: {insightsReadiness.overallScore}%
              </h2>
              <p className="mt-1.5 max-w-lg text-xs text-muted-foreground leading-relaxed">
                {insightsReadiness.summaryNarrative}
              </p>

              {/* Contributing Areas */}
              <div className="mt-4 grid gap-3 sm:grid-cols-2 text-xs">
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5">
                  <p className="font-semibold text-emerald-400 text-[11px] uppercase tracking-wider mb-1">Strongest Contributing Areas</p>
                  <ul className="space-y-1 text-muted-foreground text-[11px]">
                    {insightsReadiness.strongestAreas.map((s, idx) => (
                      <li key={idx} className="flex items-center gap-1.5">
                        <Check className="h-3 w-3 text-emerald-400 shrink-0" />
                        <span className="text-foreground/90">{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5">
                  <p className="font-semibold text-amber-400 text-[11px] uppercase tracking-wider mb-1">Needs Attention / Blocking</p>
                  <ul className="space-y-1 text-muted-foreground text-[11px]">
                    {insightsReadiness.weakestAreas.map((w, idx) => (
                      <li key={idx} className="flex items-center gap-1.5">
                        <span className="text-amber-400 font-bold shrink-0">•</span>
                        <span className="text-foreground/90">{w}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* 7-Factor Readiness Breakdown Grid */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:w-[420px]">
            <div className="rounded-lg border border-border/70 bg-muted/20 p-2.5 text-center">
              <p className="text-[10px] uppercase text-muted-foreground font-medium">Profile (10%)</p>
              <p className="mt-0.5 text-sm font-bold text-foreground">{insightsReadiness.breakdown.profileCompleteness}%</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-muted/20 p-2.5 text-center">
              <p className="text-[10px] uppercase text-muted-foreground font-medium">Skills (25%)</p>
              <p className="mt-0.5 text-sm font-bold text-primary">{insightsReadiness.breakdown.skillAlignment}%</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-muted/20 p-2.5 text-center">
              <p className="text-[10px] uppercase text-muted-foreground font-medium">Resume (20%)</p>
              <p className="mt-0.5 text-sm font-bold text-foreground">{insightsReadiness.breakdown.resumeStrength}%</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-muted/20 p-2.5 text-center">
              <p className="text-[10px] uppercase text-muted-foreground font-medium">Projects (15%)</p>
              <p className="mt-0.5 text-sm font-bold text-foreground">{insightsReadiness.breakdown.projectExperience}%</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-muted/20 p-2.5 text-center">
              <p className="text-[10px] uppercase text-muted-foreground font-medium">Role Fit (15%)</p>
              <p className="mt-0.5 text-sm font-bold text-foreground">{insightsReadiness.breakdown.targetRoleAlignment}%</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-muted/20 p-2.5 text-center">
              <p className="text-[10px] uppercase text-muted-foreground font-medium">Interviews (5%)</p>
              <p className="mt-0.5 text-sm font-bold text-foreground">{insightsReadiness.breakdown.interviewReadiness}%</p>
            </div>
          </div>
        </div>

        {/* Explainability expander */}
        <div className="mt-5 pt-4 border-t border-border/60">
          <WhyAmISeeingThis
            title="Why am I seeing this readiness assessment?"
            targetRole={profile.goal?.target_role || undefined}
            confidence={insightsReadiness.confidence}
            confidenceReason={insightsReadiness.confidenceReason}
            matchingFactors={insightsReadiness.improvingFactors}
            missingFactors={insightsReadiness.blockingFactors}
            reason={insightsReadiness.summaryNarrative}
          />
        </div>
      </Card>

      {/* 4. PHASE 16: CAREER STRENGTHS & CAREER RISKS */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Strengths */}
        <Card className="p-6 border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-card to-card shadow-soft">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <Award className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-base font-bold text-foreground">Your Career Strengths</h3>
                <p className="text-[11px] text-muted-foreground">Top detected advantages based on verified profile data.</p>
              </div>
            </div>
            <Badge variant="success" className="text-[10px]">Verified Data</Badge>
          </div>

          <div className="mt-4 space-y-3">
            {topStrengths.map((str) => (
              <div key={str.id} className="rounded-xl border border-emerald-500/15 bg-muted/20 p-3.5 transition-all hover:border-emerald-500/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground">{str.title}</span>
                    <span className="text-[10px] text-muted-foreground">({str.category})</span>
                  </div>
                  {str.badgeText && (
                    <Badge variant="outline" className="text-[9px] border-emerald-500/30 text-emerald-400">
                      {str.badgeText}
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{str.detail}</p>
                <p className="mt-1 text-[11px] text-emerald-400/90 font-medium">✓ {str.evidence}</p>
              </div>
            ))}
            {topStrengths.length === 0 && (
              <div className="p-6 text-center text-xs text-muted-foreground">
                Add skills and project experience to generate detected strengths.
              </div>
            )}
          </div>
        </Card>

        {/* Career Risks / Attention Needed */}
        <Card className="p-6 border-amber-500/20 bg-gradient-to-br from-amber-500/5 via-card to-card shadow-soft">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                <ShieldAlert className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-base font-bold text-foreground">Career Risks & Attention Needed</h3>
                <p className="text-[11px] text-muted-foreground">Constructive gap detection to optimize hiring readiness.</p>
              </div>
            </div>
            <Badge variant="warning" className="text-[10px]">{careerRisks.length} Actionable</Badge>
          </div>

          <div className="mt-4 space-y-3">
            {careerRisks.map((risk) => (
              <div key={risk.id} className="rounded-xl border border-amber-500/15 bg-muted/20 p-3.5 transition-all hover:border-amber-500/30">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-foreground truncate">{risk.title}</span>
                  <Badge variant={risk.severity === 'CRITICAL' ? 'danger' : risk.severity === 'HIGH' ? 'warning' : 'secondary'} className="text-[9px] shrink-0">
                    {risk.severity}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{risk.impact}</p>
                <div className="mt-2.5 flex items-center justify-between border-t border-border/40 pt-2">
                  <span className="text-[11px] text-amber-400 font-medium">Suggestion: {risk.suggestedRemedy}</span>
                  <Button asChild size="sm" variant="outline" className="h-6 text-[10px] px-2 shrink-0">
                    <Link to={risk.link}>{risk.ctaText} <ArrowRight className="ml-1 h-2.5 w-2.5" /></Link>
                  </Button>
                </div>
              </div>
            ))}
            {careerRisks.length === 0 && (
              <div className="p-6 text-center text-xs text-muted-foreground">
                <CheckCircle2 className="mx-auto h-6 w-6 text-emerald-400 mb-1" />
                No critical risks identified. Your career trajectory is well-balanced.
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* 5. PHASE 16: CAREER GROWTH (BEFORE VS CURRENT) & INTERVIEW SIGNAL */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Career Growth Comparison */}
        <Card className="p-6 border-border/80 bg-card/70 shadow-soft">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400">
                <TrendingUp className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-base font-bold text-foreground">Career Growth Comparison</h3>
                <p className="text-[11px] text-muted-foreground">Historical progression tracking across readiness & milestones.</p>
              </div>
            </div>
            {growthComparison.hasHistoricalData ? (
              <Badge variant="success" className="text-[10px]">
                {growthComparison.readinessDelta && growthComparison.readinessDelta > 0 ? `+${growthComparison.readinessDelta} Points` : 'Tracking Active'}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px]">Baseline</Badge>
            )}
          </div>

          <div className="mt-4">
            {growthComparison.hasHistoricalData ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-center">
                    <p className="text-[10px] uppercase text-muted-foreground">Previous Readiness</p>
                    <p className="text-xl font-bold text-foreground mt-0.5">{growthComparison.previousReadiness}%</p>
                  </div>
                  <div className="rounded-lg border border-primary/30 bg-primary/10 p-3 text-center">
                    <p className="text-[10px] uppercase text-primary">Current Readiness</p>
                    <p className="text-xl font-bold text-primary mt-0.5">{growthComparison.currentReadiness}%</p>
                  </div>
                </div>

                <div className="rounded-lg border border-border/60 bg-muted/10 p-3 text-xs">
                  <p className="font-semibold text-foreground mb-1.5">Key Improvements</p>
                  <ul className="space-y-1 text-muted-foreground text-[11px]">
                    {growthComparison.keyImprovements.map((imp, idx) => (
                      <li key={idx} className="flex items-center gap-1.5">
                        <Check className="h-3 w-3 text-emerald-400 shrink-0" />
                        <span>{imp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border/80 p-6 text-center">
                <Activity className="h-8 w-8 text-cyan-400/60 mx-auto mb-2" />
                <p className="text-xs font-semibold text-foreground">Current Readiness: {growthComparison.currentReadiness}%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {growthComparison.emptyStateMessage || 'Start tracking your career activity to unlock progress comparison.'}
                </p>
                <div className="mt-3 flex justify-center gap-2">
                  <Button asChild size="sm" variant="outline" className="text-xs h-7">
                    <Link to="/roadmap">Complete Milestones</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="text-xs h-7">
                    <Link to="/interview">Practice Mock Interview</Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Interview Readiness Signal */}
        <Card className="p-6 border-border/80 bg-card/70 shadow-soft">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
                <MessageSquareText className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-base font-bold text-foreground">Interview Readiness Signal</h3>
                <p className="text-[11px] text-muted-foreground">AI mock interview quality & communication coverage.</p>
              </div>
            </div>
            <Badge variant="secondary" className="text-[10px]">
              {interviewSignal.practiceSessionsCount} Sessions
            </Badge>
          </div>

          <div className="mt-4 space-y-3 text-xs">
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 p-3">
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Estimated Readiness</p>
                <p className="text-lg font-bold text-violet-400">{interviewSignal.overallReadinessPct}%</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Answer Quality</p>
                <p className="text-sm font-semibold text-foreground">{interviewSignal.answerQuality}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Skill Coverage</p>
                <p className="text-sm font-semibold text-foreground">{interviewSignal.skillCoverage}</p>
              </div>
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/10 p-3 text-[11px]">
              <p className="font-semibold text-foreground mb-1">Coach Recommendation</p>
              <p className="text-muted-foreground leading-relaxed">{interviewSignal.recommendation}</p>
            </div>

            <div className="flex justify-end pt-1">
              <Button asChild size="sm" variant="outline" className="text-xs h-7">
                <Link to="/interview">Start Mock Interview <ArrowRight className="ml-1.5 h-3 w-3" /></Link>
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Career Growth Trend */}
      {overview.careerIntelligence?.growthTrend && (
        <Card className="border-border/80 bg-card/60 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Career Growth Trend</p>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">
                    Current Score: {overview.careerIntelligence.growthTrend.currentScore}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    (Previous: {overview.careerIntelligence.growthTrend.previousScore})
                  </span>
                  {overview.careerIntelligence.growthTrend.improvement > 0 ? (
                    <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-300 text-xs">
                      +{overview.careerIntelligence.growthTrend.improvement} improvement
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">Start tracking your career progress to see your growth trend.</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <div>
                <span className="font-semibold text-foreground">
                  {overview.careerIntelligence.growthTrend.skillsImprovedCount}
                </span>{' '}
                skills verified (50%+)
              </div>
              <div>
                <span className="font-semibold text-foreground">
                  {overview.careerIntelligence.growthTrend.milestonesCompletedCount}
                </span>{' '}
                milestones completed
              </div>
              <div>
                <span className="font-semibold text-foreground">
                  {overview.careerIntelligence.growthTrend.interviewsCompletedCount}
                </span>{' '}
                mock interviews
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* CAREER ACTION CENTER */}
      <Card className="relative overflow-hidden border-primary/30 bg-gradient-to-br from-primary/10 via-card to-cyan-500/10 p-6 shadow-glow">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-primary/40 bg-primary/20 text-primary">
                <Zap className="mr-1.5 h-3.5 w-3.5" /> Phase 10 Action Center
              </Badge>
              <h2 className="text-xl font-bold text-foreground">Career Action Center</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Your personal career execution engine. Real-time overview of active applications, upcoming interviews, and high-impact actions.
            </p>
          </div>
          <Button asChild size="sm">
            <Link to="/jobs">
              Go to Application Pipeline <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        {/* Action Center Grid Stats */}
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 my-5">
          <div className="rounded-xl border border-primary/20 bg-background/60 p-3.5">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Active Applications</p>
            <p className="mt-1 text-2xl font-extrabold text-foreground">
              {overview.careerApplications?.filter((a) => ['applied', 'screening', 'interview'].includes(a.status)).length || 0}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">In pipeline</p>
          </div>

          <div className="rounded-xl border border-violet-500/20 bg-background/60 p-3.5">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Upcoming Interviews</p>
            <p className="mt-1 text-2xl font-extrabold text-violet-400">
              {overview.careerApplications?.filter((a) => a.status === 'interview').length || 0}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">Ready to practice</p>
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-background/60 p-3.5">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Priority Skill Gaps</p>
            <p className="mt-1 text-2xl font-extrabold text-amber-400">{missing.length}</p>
            <p className="text-[10px] text-muted-foreground truncate">Require learning</p>
          </div>

          <div className="rounded-xl border border-emerald-500/20 bg-background/60 p-3.5">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">High Match Jobs</p>
            <p className="mt-1 text-2xl font-extrabold text-emerald-400">
              {overview.jobs.filter((j) => j.matchPercentage >= 75).length}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">≥75% compatible</p>
          </div>
        </div>

        {/* Recommended Actions List */}
        <div className="space-y-2.5">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Prioritized Career Execution Moves</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-lg border border-border/80 bg-background/50 p-3 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-violet-500/10 text-violet-400 font-bold">1</div>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">
                    Prepare for {overview.careerApplications?.find((a) => a.status === 'interview')?.job_title || profile.goal?.target_role || 'Technical'} Interview
                  </p>
                  <p className="text-[10px] text-muted-foreground">AI mock practice & STAR answers</p>
                </div>
              </div>
              <Button asChild size="sm" variant="outline" className="h-7 text-[11px] px-2 shrink-0">
                <Link to="/interviews">Prep Now</Link>
              </Button>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border/80 bg-background/50 p-3 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-500/10 text-blue-400 font-bold">2</div>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">
                    Follow up on {overview.careerApplications?.find((a) => a.status === 'applied')?.company_name || 'active'} application
                  </p>
                  <p className="text-[10px] text-muted-foreground">Generate AI follow-up note</p>
                </div>
              </div>
              <Button asChild size="sm" variant="outline" className="h-7 text-[11px] px-2 shrink-0">
                <Link to="/jobs">Track App</Link>
              </Button>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border/80 bg-background/50 p-3 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-amber-500/10 text-amber-400 font-bold">3</div>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">
                    Complete {missing[0]?.skill || 'critical'} skill gap
                  </p>
                  <p className="text-[10px] text-muted-foreground">Unlocks higher match scores</p>
                </div>
              </div>
              <Button asChild size="sm" variant="outline" className="h-7 text-[11px] px-2 shrink-0">
                <Link to="/skills">Close Gap</Link>
              </Button>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border/80 bg-background/50 p-3 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-400 font-bold">4</div>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">
                    Apply to {overview.jobs[0]?.job.title || 'top matched role'}
                  </p>
                  <p className="text-[10px] text-muted-foreground">High compatibility match</p>
                </div>
              </div>
              <Button asChild size="sm" variant="outline" className="h-7 text-[11px] px-2 shrink-0">
                <Link to="/jobs">View Job</Link>
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Job Market Fit Card */}
      {overview.careerIntelligence?.jobMarketFit && (
        <Card className="border-border/80 bg-card/60 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
                <BriefcaseBusiness className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Job Market Fit</p>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">
                    Average Match: {overview.careerIntelligence.jobMarketFit.averageJobMatch}%
                  </span>
                  <Badge variant="secondary" className="bg-cyan-500/15 text-cyan-300 text-xs">
                    {overview.careerIntelligence.jobMarketFit.strongMatchesCount} Strong Matches
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <div>
                Top Missing Skill: <span className="font-semibold text-amber-400">{overview.careerIntelligence.jobMarketFit.topMissingSkill}</span>
              </div>
              <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                <Link to="/jobs">Explore Matched Jobs</Link>
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* 3. Career Risk & Gap Alerts */}
      {alerts.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" /> Career Health Alerts ({alerts.length})
            </h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {alerts.map((alert) => {
              const style = alertBadge(alert.type)
              const Icon = style.icon
              return (
                <div
                  key={alert.id}
                  className={cn(
                    'flex items-start justify-between gap-4 rounded-xl border p-4 transition-all',
                    style.border
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">{alert.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{alert.description}</p>
                    </div>
                  </div>
                  <Button asChild size="sm" variant="outline" className="shrink-0 text-xs">
                    <Link to={alert.to}>{alert.action}</Link>
                  </Button>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* 4. Career Health Overview (6 Cards) */}
      <section>
        <SectionHeader
          title="Career Health Overview"
          description="Core dimensions tracked from real persisted data."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <HealthCard
            title="Profile Strength"
            score={`${readinessBreakdown.profileScore}%`}
            detail={`${overview.profile.skills.length} skills saved`}
            icon={Layers}
            to="/profile"
          />
          <HealthCard
            title="Resume Strength"
            score={stats?.resumeScore ? `${stats.resumeScore}/100` : overview.profile.resume ? 'Analyzed' : 'Missing'}
            detail={stats?.latestResumeAnalysis?.filename ?? 'No resume uploaded'}
            icon={FileText}
            to="/resume-analyzer"
          />
          <HealthCard
            title="Skill Match"
            score={`${matched.length}/${role ? role.requiredSkills.length : overview.profile.skills.length}`}
            detail={`${missing.length} missing gaps`}
            icon={Target}
            to="/skills"
          />
          <HealthCard
            title="Learning Progress"
            score={roadmap ? `${Math.round((roadmap.completed / (roadmap.total || 1)) * 100)}%` : '0%'}
            detail={roadmap ? `${roadmap.completed}/${roadmap.total} milestones` : 'Not started'}
            icon={Map}
            to="/roadmap"
          />
          <HealthCard
            title="Interview Readiness"
            score={stats?.interviewScore ? `${stats.interviewScore}%` : 'Not tested'}
            detail={stats?.interviewHistory?.length ? `${stats.interviewHistory.length} completed` : 'No mock sessions'}
            icon={MessageSquareText}
            to="/interview"
          />
          <HealthCard
            title="Job Match Average"
            score={jobs[0] ? `${jobs[0].matchPercentage}%` : '—'}
            detail={`${overview.applications.length} tracked apps`}
            icon={BriefcaseBusiness}
            to="/jobs"
          />
        </div>
      </section>

      {/* 5. Action Center ("What Should I Do Next?") */}
      <section>
        <SectionHeader
          title="Action Center — What Should I Do Next?"
          description="Prioritized, high-impact tasks calculated to advance your career readiness."
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {nextBestActions.map((action) => (
            <Card
              key={action.id}
              className="flex flex-col justify-between p-5 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lift"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <Badge variant={action.priority === 'HIGH' ? 'danger' : action.priority === 'MEDIUM' ? 'warning' : 'secondary'}>
                    {action.priority} Priority
                  </Badge>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" /> {action.estimatedEffort}
                  </span>
                </div>
                <h3 className="mt-3 text-base font-semibold text-foreground">{action.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{action.reason}</p>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-border/70 pt-4">
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5" /> High Impact
                </span>
                <Button asChild size="sm">
                  <Link to={action.destinationUrl}>
                    Go Now <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </Card>
          ))}
          {nextBestActions.length === 0 && (
            <Card className="col-span-full p-8 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" />
              <h3 className="mt-2 text-base font-semibold">All prioritized tasks complete!</h3>
              <p className="mt-1 text-xs text-muted-foreground">Keep practicing interviews or apply to matching job openings.</p>
            </Card>
          )}
        </div>
      </section>

      {/* 6. Explainable AI Insight */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/10 via-card to-background p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-glow">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-cyan-300">CareerAI Recommendation</span>
                <Badge variant="secondary" className="text-[10px]">Context Aware</Badge>
              </div>
              <p className="mt-1 text-sm font-semibold text-foreground">{aiInsight.recommendation}</p>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{aiInsight.reason}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAiReasoning(!showAiReasoning)}
            className="shrink-0 border-primary/30"
          >
            {showAiReasoning ? (
              <>
                Hide Reason <ChevronUp className="ml-1.5 h-3.5 w-3.5" />
              </>
            ) : (
              <>
                Why this recommendation? <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
              </>
            )}
          </Button>
        </div>

        {showAiReasoning && (
          <div className="mt-4 rounded-xl border border-primary/15 bg-navy-800/80 p-4 animate-fade-in">
            <p className="text-xs font-semibold text-cyan-300 uppercase tracking-wider">Reasoning Breakdown</p>
            <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
              {aiInsight.whyExplanation.map((point, index) => (
                <li key={index} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-400" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* 7. Skill Gap Snapshot & Best Job Matches */}
      <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
        {/* Skill Gap Snapshot */}
        <Card className="p-6">
          <SectionHeader
            title="Skill Gap Snapshot"
            description={`Canonical requirements for ${role?.title ?? 'Target Role'}.`}
            action="Full Skill Gap"
            to="/skills"
          />
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <SkillBucket title="Matched" count={matched.length} tone="success" skills={matched.map((s) => s.skill)} />
            <SkillBucket title="Improving" count={improving.length} tone="warning" skills={improving.map((s) => s.skill)} />
            <SkillBucket title="Missing" count={missing.length} tone="danger" skills={missing.map((s) => s.skill)} />
          </div>
        </Card>

        {/* Recent Career Activity */}
        <Card className="p-6">
          <SectionHeader
            title="Recent Career Activity"
            description="Real-time events from your connected modules."
          />
          <div className="mt-4 space-y-3">
            {recentActivities.map((act) => (
              <Link
                key={act.id}
                to={act.to}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/15 p-3 text-xs transition-colors hover:border-primary/30 hover:bg-muted/30"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <ActivityIcon type={act.type} />
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">{act.title}</p>
                    <p className="text-muted-foreground truncate">{act.description}</p>
                  </div>
                </div>
                <span className="shrink-0 text-muted-foreground font-mono text-[10px]">
                  {new Date(act.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </Link>
            ))}
            {recentActivities.length === 0 && (
              <p className="py-6 text-center text-xs text-muted-foreground">
                No recent activity. Activities will log when you take tests, analyze your resume, or update your roadmap.
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* 8. Best Matches & Learning Roadmap Highlights */}
      <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
        {/* Best Matches */}
        <Card className="p-6">
          <SectionHeader
            title="Top Matched Opportunities"
            description="Scored against your verified profile and target role."
            action="View All Jobs"
            to="/jobs"
          />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {jobs.slice(0, 2).map((match) => (
              <div
                key={match.job.id}
                className="flex flex-col justify-between rounded-xl border border-border/80 bg-muted/15 p-4 transition-all hover:border-primary/30"
              >
                <div>
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-foreground truncate" title={match.job.title}>
                        {match.job.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{match.job.company}</p>
                    </div>
                    <Badge variant="success" className="shrink-0 whitespace-nowrap text-xs font-bold">
                      {match.matchPercentage}% match
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground truncate">
                    {match.job.location} · {match.job.mode}
                  </p>
                </div>
                <Button asChild size="sm" variant="outline" className="mt-3.5 w-full text-xs">
                  <Link to="/jobs">View Job & Match Breakdown</Link>
                </Button>
              </div>
            ))}
            {jobs.length === 0 && (
              <div className="col-span-2 py-6 text-center text-xs text-muted-foreground">
                Set your target role to view matched opportunities.
              </div>
            )}
          </div>
        </Card>

        {/* Roadmap Progress */}
        <Card className="p-6">
          <SectionHeader
            title="Personalized Roadmap"
            description="Milestones to reach 100% role readiness."
            action="Continue Roadmap"
            to="/roadmap"
          />
          {roadmap && roadmap.total > 0 ? (
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{roadmap.completed} of {roadmap.total} milestones completed</span>
                <span className="font-bold text-foreground">{Math.round((roadmap.completed / roadmap.total) * 100)}%</span>
              </div>
              <Progress value={(roadmap.completed / roadmap.total) * 100} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {roadmap.inProgress > 0 ? `${roadmap.inProgress} items currently in progress.` : 'Ready to start your next learning milestone.'}
              </p>
              <Button asChild variant="outline" size="sm" className="w-full text-xs">
                <Link to="/roadmap">Open Interactive Roadmap <ArrowRight className="ml-1 h-3 w-3" /></Link>
              </Button>
            </div>
          ) : (
            <div className="mt-4 py-6 text-center text-xs text-muted-foreground">
              <p>Personalized learning plan ready to generate.</p>
              <Button asChild size="sm" className="mt-3">
                <Link to="/roadmap">Generate Learning Roadmap</Link>
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* WEEKLY CAREER PLAN SECTION */}
      <section className="space-y-4">
        <SectionHeader
          title="Your Weekly Career Plan"
          description="Personalized 7-day execution schedule based on your active skill gaps and career targets."
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {weeklyPlan.days.map((day) => (
            <Card
              key={day.dayName}
              className="flex flex-col justify-between p-4 transition-all hover:border-primary/40 hover:shadow-soft"
            >
              <div>
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <span className="font-bold text-xs text-foreground uppercase tracking-wider">{day.dayName}</span>
                  <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-medium">
                    {day.category}
                  </Badge>
                </div>
                <p className="mt-2.5 text-xs font-semibold text-foreground leading-snug">{day.task}</p>
                <p className="mt-1 text-[11px] text-muted-foreground leading-normal">{day.reason}</p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-2.5 text-[11px]">
                <span className="text-muted-foreground font-mono">{day.estimatedEffort}</span>
                <Button asChild variant="ghost" size="sm" className="h-6 px-1 text-[11px]">
                  <Link to={day.destinationUrl}>Start <ArrowRight className="ml-1 h-3 w-3" /></Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* CAREER MILESTONES & GOAL PROGRESS */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Goal Progress */}
        <Card className="p-6">
          <SectionHeader
            title={`Goal Progress: ${goalProgress.targetRole}`}
            description="Overall readiness breakdown across CareerAI modules."
          />
          <div className="mt-4 space-y-3 text-xs">
            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span>Profile Completeness</span>
                <span>{goalProgress.profilePct}%</span>
              </div>
              <Progress value={goalProgress.profilePct} className="h-2" />
            </div>

            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span>Resume ATS Relevance</span>
                <span>{goalProgress.resumePct}%</span>
              </div>
              <Progress value={goalProgress.resumePct} className="h-2" />
            </div>

            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span>Verified Skills Alignment</span>
                <span>{goalProgress.skillsPct}%</span>
              </div>
              <Progress value={goalProgress.skillsPct} className="h-2" />
            </div>

            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span>Project Proof of Work</span>
                <span>{goalProgress.projectsPct}%</span>
              </div>
              <Progress value={goalProgress.projectsPct} className="h-2" />
            </div>

            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span>Application Pipeline Volume</span>
                <span>{goalProgress.applicationsPct}%</span>
              </div>
              <Progress value={goalProgress.applicationsPct} className="h-2" />
            </div>

            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span>Mock Interview Readiness</span>
                <span>{goalProgress.interviewPct}%</span>
              </div>
              <Progress value={goalProgress.interviewPct} className="h-2" />
            </div>
          </div>
        </Card>

        {/* Milestones */}
        <Card className="p-6">
          <SectionHeader
            title="Career Milestones"
            description="Achieved milestones unlocked by real verified platform activity."
          />
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {milestones.map((ms) => (
              <div
                key={ms.key}
                className={cn(
                  'flex items-center justify-between rounded-lg border p-3 text-xs transition-colors',
                  ms.status === 'Completed'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                    : ms.status === 'In Progress'
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                    : 'border-border/60 bg-muted/20 text-muted-foreground opacity-75'
                )}
              >
                <div className="min-w-0">
                  <p className="font-semibold truncate">{ms.title}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{ms.description}</p>
                </div>
                <Badge
                  variant={ms.status === 'Completed' ? 'success' : ms.status === 'In Progress' ? 'secondary' : 'outline'}
                  className="text-[9px] py-0 shrink-0 ml-2"
                >
                  {ms.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* SCORE EXPLANATION MODAL */}
      {scoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-primary/30 bg-card p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-border/80 pb-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-primary/40 bg-primary/20 text-primary">
                  <HelpCircle className="mr-1.5 h-3.5 w-3.5" /> Score Calculation
                </Badge>
                <h3 className="text-xl font-bold text-foreground">How is my Career Health Score calculated?</h3>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setScoreModalOpen(false)}>✕</Button>
            </div>

            <div className="space-y-4 text-xs text-muted-foreground leading-relaxed">
              <p>
                Your Career Health Score (<span className="font-bold text-foreground">{careerHealth.score}/100</span>) is calculated using a transparent, deterministic algorithm that checks real data across 9 key career readiness dimensions:
              </p>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 space-y-2">
                  <p className="font-bold text-emerald-400 uppercase tracking-wider text-[11px]">Positive Score Factors (+ Points)</p>
                  <ul className="space-y-1 text-emerald-300">
                    {careerHealth.positiveFactors.map((f, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <Check className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <span><b>{f.category} (+{f.points}):</b> {f.reason}</span>
                      </li>
                    ))}
                    {careerHealth.positiveFactors.length === 0 && <li>No major positive factors recorded yet.</li>}
                  </ul>
                </div>

                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 space-y-2">
                  <p className="font-bold text-rose-400 uppercase tracking-wider text-[11px]">Improvement Opportunities (- Points)</p>
                  <ul className="space-y-1 text-rose-300">
                    {careerHealth.negativeFactors.map((f, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <span><b>{f.category} ({f.points}):</b> {f.reason}</span>
                      </li>
                    ))}
                    {careerHealth.negativeFactors.length === 0 && <li>All critical categories are fully optimized!</li>}
                  </ul>
                </div>
              </div>

              <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-2">
                <p className="font-bold text-foreground text-xs uppercase tracking-wider">Weight Breakdown by Category</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                  <div>• Skills Alignment: <b>20%</b></div>
                  <div>• Resume ATS Relevance: <b>15%</b></div>
                  <div>• Projects Evidence: <b>15%</b></div>
                  <div>• Profile Details: <b>10%</b></div>
                  <div>• Roadmap Strategy: <b>10%</b></div>
                  <div>• Job Applications: <b>10%</b></div>
                  <div>• Mock Interviews: <b>10%</b></div>
                  <div>• Career Goal Fit: <b>5%</b></div>
                  <div>• Learning Progress: <b>5%</b></div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => setScoreModalOpen(false)}>Got it</Button>
            </div>
          </div>
        </div>
      )}

      {/* 30-DAY CAREER PLAN MODAL */}
      {thirtyDayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-primary/30 bg-card p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-border/80 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-primary/40 bg-primary/20 text-primary">
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Personalized 30-Day Strategy
                  </Badge>
                  <h3 className="text-xl font-bold text-foreground">30-Day Career Plan for {thirtyDayPlan.targetRole}</h3>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{thirtyDayPlan.summary}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setThirtyDayModalOpen(false)}>✕</Button>
            </div>

            <div className="space-y-6">
              {thirtyDayPlan.weeks.map((week) => (
                <div key={week.weekNumber} className="rounded-xl border border-border/80 bg-muted/15 p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/20 text-primary font-bold text-xs">
                        W{week.weekNumber}
                      </span>
                      <div>
                        <h4 className="font-bold text-sm text-foreground">{week.title}</h4>
                        <p className="text-xs text-muted-foreground">{week.focusArea}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    {week.tasks.map((t) => (
                      <div key={t.dayNumber} className="flex flex-col justify-between rounded-lg border border-border/70 bg-card/80 p-3.5 text-xs">
                        <div>
                          <div className="flex items-center justify-between text-muted-foreground text-[10px] font-mono">
                            <span>Day {t.dayNumber}</span>
                            <span>{t.estimatedEffort}</span>
                          </div>
                          <p className="mt-2 font-semibold text-foreground leading-snug">{t.task}</p>
                          <p className="mt-1 text-[11px] text-muted-foreground leading-normal">{t.reason}</p>
                        </div>
                        <Button asChild size="sm" variant="outline" className="mt-3 text-[11px] h-7 w-full">
                          <Link to={t.destinationUrl} onClick={() => setThirtyDayModalOpen(false)}>
                            Execute Task <ArrowRight className="ml-1 h-3 w-3" />
                          </Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => setThirtyDayModalOpen(false)}>Close 30-Day Plan</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SectionHeader({ title, description, action, to }: { title: string; description: string; action?: string; to?: string }) {
  return (
    <div className="mb-3 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      {action && to ? (
        <Button asChild variant="ghost" size="sm" className="text-xs">
          <Link to={to}>
            {action} <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      ) : null}
    </div>
  )
}



function HealthCard({ title, score, detail, icon: Icon, to }: { title: string; score: string; detail: string; icon: typeof Target; to: string }) {
  return (
    <Card className="p-4 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lift">
      <div className="flex items-start justify-between">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <Button asChild variant="ghost" size="icon" className="h-7 w-7">
          <Link to={to} aria-label={`View ${title}`}>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
      <p className="mt-3 text-xs font-semibold text-muted-foreground">{title}</p>
      <p className="mt-0.5 text-xl font-bold text-foreground">{score}</p>
      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{detail}</p>
    </Card>
  )
}

function SkillBucket({ title, count, tone, skills }: { title: string; count: number; tone: 'success' | 'warning' | 'danger'; skills: string[] }) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground">{title}</span>
        <Badge variant={tone}>{count}</Badge>
      </div>
      <div className="mt-2.5 space-y-1">
        {skills.slice(0, 4).map((s) => (
          <p key={s} className="truncate text-xs text-muted-foreground flex items-center gap-1.5">
            <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', tone === 'success' ? 'bg-emerald-400' : tone === 'warning' ? 'bg-amber-400' : 'bg-rose-400')} />
            {s}
          </p>
        ))}
        {skills.length === 0 && <p className="text-xs text-muted-foreground">None</p>}
      </div>
    </div>
  )
}

function ActivityIcon({ type }: { type: string }) {
  switch (type) {
    case 'resume':
      return <FileText className="h-4 w-4 text-cyan-400 shrink-0" />
    case 'interview':
      return <MessageSquareText className="h-4 w-4 text-violet-400 shrink-0" />
    case 'roadmap':
      return <Map className="h-4 w-4 text-emerald-400 shrink-0" />
    case 'job':
      return <BriefcaseBusiness className="h-4 w-4 text-amber-400 shrink-0" />
    default:
      return <Sparkles className="h-4 w-4 text-primary shrink-0" />
  }
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-44 w-full rounded-2xl" />
      <Skeleton className="h-40 w-full rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-44 rounded-xl" />
        ))}
      </div>
    </div>
  )
}


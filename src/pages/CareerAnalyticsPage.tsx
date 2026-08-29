/**
 * Career Analytics Page (Phase 17)
 * Advanced analytics and career growth intelligence dashboard
 */

import { useEffect, useState } from 'react'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Brain,
  BarChart3,
  Zap,
  Award,
  AlertTriangle,
  BookOpen,
  Users,
  ArrowRight,
  ChevronDown,
  Activity,
  Clock,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { ProgressRing } from '@/components/common/ProgressRing'
import { cn } from '@/lib/utils'
import {
  calculateReadinessTrend,
  analyzeSkills,
  analyzeJobAlignment,
  analyzeInterviews,
  analyzeRoadmapProgress,
  analyzeActivity,
  calculateCareerMomentum,
  detectCareerStagnation,
  detectMilestones,
  calculateWeeklyFocus,
  type CareerAnalyticsData,
} from '@/lib/careerAnalyticsService'
import { getDashboardOverview } from '@/lib/dashboardService'

type TimeRange = '7d' | '30d' | '90d' | 'all'

export function CareerAnalyticsPage() {
  const [analytics, setAnalytics] = useState<CareerAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [timeRange, setTimeRange] = useState<TimeRange>('30d')
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})

  const loadAnalytics = async () => {
    setLoading(true)
    setError('')
    try {
      const overview = await getDashboardOverview()

      // Build analytics data from available information
      const ov = overview as any
      const readinessTrend = calculateReadinessTrend(
        overview.insightsReadiness?.breakdown?.profileCompleteness || 0,
        ov.historicalAnalyses
      )
      const skillAnalytics = analyzeSkills(overview.profile?.skills || [])
      const jobAlignment = analyzeJobAlignment(overview.jobs?.map((_j: unknown) => ({
        matchPercentage: 70, // placeholder
        job: { title: 'Role', company: 'Company' },
      })) || [])
      const interviews = analyzeInterviews(ov.interviews || [])
      const roadmapAnalytics = analyzeRoadmapProgress({
        total: overview.roadmap?.total || 0,
        completed: overview.roadmap?.completed || 0,
      })
      const activity = analyzeActivity(overview.recentActivities || [])
      const momentum = calculateCareerMomentum(
        readinessTrend,
        roadmapAnalytics.completionPercentage,
        interviews.totalSessions,
        activity.lastActivityDate,
        skillAnalytics.skillGaps.length
      )
      const stagnation = detectCareerStagnation(activity.lastActivityDate, null, readinessTrend.currentReadiness, roadmapAnalytics.completionPercentage)
      const milestones = detectMilestones(
        overview.profile?.resume ? new Date().toISOString() : null,
        ov.firstAnalysisDate || null,
        ov.firstJobMatchDate || null,
        ov.firstRoadmapDate || null,
        interviews.recentSessions[0]?.date || null,
        roadmapAnalytics.completedMilestones,
        readinessTrend.readinessDelta,
        activity.activeDataPoints
      )
      const weeklyFocus = calculateWeeklyFocus(
        skillAnalytics.skillGaps.map((g) => ({ skill: g.name, priority: g.priority as any })),
        roadmapAnalytics.remainingMilestones,
        interviews.completedSessions,
        overview.role?.title || null
      )

      setAnalytics({
        timeRange,
        generatedAt: new Date().toISOString(),
        readinessTrend,
        skillAnalytics,
        jobAlignment,
        interviews,
        roadmap: roadmapAnalytics,
        activity,
        momentum,
        stagnation,
        milestones,
        insights: [],
        weeklyFocus,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load analytics data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadAnalytics()
  }, [timeRange])

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  if (loading) return <CareerAnalyticsSkeleton />

  if (error || !analytics) {
    return (
      <div className="space-y-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-6 text-sm text-rose-300">
        <p>{error || 'Unable to load analytics.'}</p>
        <Button variant="outline" onClick={() => void loadAnalytics()}>
          <RefreshCw className="mr-2 h-4 w-4" /> Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">Career Analytics</h1>
            <p className="mt-1 text-sm text-slate-400">Advanced growth intelligence and career momentum tracking</p>
          </div>
          <div className="flex gap-2">
            {(['7d', '30d', '90d', 'all'] as TimeRange[]).map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange(range)}
                className={cn(
                  'text-xs uppercase tracking-wider',
                  timeRange === range ? 'bg-cyan-500/90 text-slate-900' : 'text-slate-400'
                )}
              >
                {range === '7d' ? '7D' : range === '30d' ? '30D' : range === '90d' ? '90D' : 'All'}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Current Readiness */}
        <Card className="border-slate-700/50 bg-slate-800/30 p-6 hover:border-slate-600/50">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Current Readiness</p>
              <p className="mt-2 text-3xl font-bold text-cyan-400">{Math.round(analytics.readinessTrend.currentReadiness)}%</p>
              {analytics.readinessTrend.previousReadiness !== null && (
                <p className={cn('mt-2 text-xs', analytics.readinessTrend.readinessDelta! > 0 ? 'text-emerald-400' : 'text-rose-400')}>
                  {analytics.readinessTrend.readinessDelta! > 0 ? '↑' : '↓'} {Math.abs(analytics.readinessTrend.readinessDelta!)}% vs previous
                </p>
              )}
            </div>
            <Target className="h-5 w-5 text-cyan-500/60" />
          </div>
        </Card>

        {/* Career Momentum */}
        <Card className="border-slate-700/50 bg-slate-800/30 p-6 hover:border-slate-600/50">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Career Momentum</p>
              <p className="mt-2 font-bold text-slate-200">{analytics.momentum.score}</p>
              <p className="mt-2 text-xs text-slate-400">{analytics.momentum.numericalScore}/100</p>
            </div>
            <Zap className={cn('h-5 w-5', analytics.momentum.numericalScore > 70 ? 'text-amber-500/60' : 'text-slate-500/60')} />
          </div>
        </Card>

        {/* Skills Analysis */}
        <Card className="border-slate-700/50 bg-slate-800/30 p-6 hover:border-slate-600/50">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Skills Progress</p>
              <p className="mt-2 text-3xl font-bold text-emerald-400">{analytics.skillAnalytics.strongSkills.length}</p>
              <p className="mt-2 text-xs text-slate-400">strong skills</p>
            </div>
            <Brain className="h-5 w-5 text-emerald-500/60" />
          </div>
        </Card>

        {/* Job Market Fit */}
        <Card className="border-slate-700/50 bg-slate-800/30 p-6 hover:border-slate-600/50">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Job Market Fit</p>
              <p className="mt-2 text-3xl font-bold text-blue-400">{analytics.jobAlignment.averageJobMatch}%</p>
              <p className="mt-2 text-xs text-slate-400">avg match</p>
            </div>
            <BarChart3 className="h-5 w-5 text-blue-500/60" />
          </div>
        </Card>
      </div>

      {/* Career Momentum Deep Dive */}
      <Card className="border-slate-700/50 bg-slate-800/30 p-6">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-100">
            <Zap className="h-5 w-5 text-amber-500" />
            Career Momentum Analysis
          </h2>
          <button
            onClick={() => toggleSection('momentum')}
            className="p-1 hover:bg-slate-700/50 rounded"
          >
            <ChevronDown
              className={cn('h-4 w-4 text-slate-400 transition-transform', expandedSections.momentum && 'rotate-180')}
            />
          </button>
        </div>

        {expandedSections.momentum && (
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <ProgressRing value={analytics.momentum.numericalScore} size={80} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-200">{analytics.momentum.score}</p>
                <p className="mt-1 text-sm text-slate-400">{analytics.momentum.recommendation}</p>
              </div>
            </div>

            <div className="space-y-2 border-t border-slate-700/50 pt-4">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Contributing Factors</p>
              {analytics.momentum.factors.map((factor, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className={cn('mt-1 h-2 w-2 rounded-full flex-shrink-0', 
                    factor.status === 'positive' ? 'bg-emerald-500' : factor.status === 'negative' ? 'bg-rose-500' : 'bg-slate-500'
                  )} />
                  <div>
                    <p className="text-sm text-slate-200">{factor.name}</p>
                    <p className="text-xs text-slate-400">{factor.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Readiness Trend */}
      <Card className="border-slate-700/50 bg-slate-800/30 p-6">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-100">
            <TrendingUp className="h-5 w-5 text-cyan-500" />
            Career Readiness Trend
          </h2>
          <Badge variant={analytics.readinessTrend.trendDirection === 'Improving' ? 'default' : 'secondary'}>
            {analytics.readinessTrend.trendDirection}
          </Badge>
        </div>

        {expandedSections.readiness && analytics.readinessTrend.historicalReadinessScores.length > 0 && (
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              {analytics.readinessTrend.historicalReadinessScores.map((score, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">{new Date(score.date).toLocaleDateString()}</span>
                  <div className="flex items-center gap-2">
                    <Progress value={score.score} className="h-2 w-32" />
                    <span className="text-xs font-medium text-slate-300">{score.score}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!expandedSections.readiness && (
          <button
            onClick={() => toggleSection('readiness')}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-700/20 py-2 text-sm text-slate-400 hover:bg-slate-700/40"
          >
            <ChevronDown className="h-4 w-4" />
            View Historical Trend
          </button>
        )}
      </Card>

      {/* Skills Analysis */}
      <Card className="border-slate-700/50 bg-slate-800/30 p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-100">
          <Brain className="h-5 w-5 text-emerald-500" />
          Skills Analysis
        </h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {/* Strong Skills */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-emerald-400">Strong Skills</h3>
            {analytics.skillAnalytics.strongSkills.length > 0 ? (
              analytics.skillAnalytics.strongSkills.slice(0, 5).map((skill, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">{skill.name}</span>
                  <Badge variant="default" className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30">
                    {skill.proficiency}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500">No strong skills yet. Keep building!</p>
            )}
          </div>

          {/* Skill Gaps */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-rose-400">Top Gaps</h3>
            {analytics.skillAnalytics.skillGaps.length > 0 ? (
              analytics.skillAnalytics.skillGaps.slice(0, 5).map((gap, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">{gap.name}</span>
                  <Badge
                    variant="default"
                    className={cn(
                      gap.priority === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                    )}
                  >
                    {gap.priority}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500">No skill gaps identified. Excellent!</p>
            )}
          </div>
        </div>
      </Card>

      {/* Interview Analytics */}
      <Card className="border-slate-700/50 bg-slate-800/30 p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-100">
          <Users className="h-5 w-5 text-purple-500" />
          Interview Practice Analytics
        </h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Total Sessions</p>
            <p className="mt-2 text-2xl font-bold text-purple-400">{analytics.interviews.totalSessions}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Completed</p>
            <p className="mt-2 text-2xl font-bold text-emerald-400">{analytics.interviews.completedSessions}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Avg Score</p>
            <p className="mt-2 text-2xl font-bold text-blue-400">{analytics.interviews.averageScore || '—'}%</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Trend</p>
            <p className="mt-2 flex items-center gap-1 text-sm font-semibold text-slate-200">
              {analytics.interviews.trend === 'Improving' ? (
                <>
                  <TrendingUp className="h-4 w-4 text-emerald-500" /> Improving
                </>
              ) : analytics.interviews.trend === 'Declining' ? (
                <>
                  <TrendingDown className="h-4 w-4 text-rose-500" /> Declining
                </>
              ) : (
                <>
                  <Minus className="h-4 w-4 text-slate-500" /> Stable
                </>
              )}
            </p>
          </div>
        </div>
      </Card>

      {/* Roadmap Progress */}
      <Card className="border-slate-700/50 bg-slate-800/30 p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-100">
          <BookOpen className="h-5 w-5 text-cyan-500" />
          Learning Roadmap Progress
        </h2>

        <div className="mt-4 space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Overall Completion</span>
              <span className="text-sm font-semibold text-cyan-400">{analytics.roadmap.completionPercentage}%</span>
            </div>
            <Progress value={analytics.roadmap.completionPercentage} className="mt-2 h-2" />
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-slate-700/20 p-3">
              <p className="text-xs text-slate-400">Completed</p>
              <p className="mt-1 text-2xl font-bold text-emerald-400">{analytics.roadmap.completedMilestones}</p>
            </div>
            <div className="rounded-lg bg-slate-700/20 p-3">
              <p className="text-xs text-slate-400">In Progress</p>
              <p className="mt-1 text-2xl font-bold text-amber-400">{analytics.roadmap.inProgressMilestones}</p>
            </div>
            <div className="rounded-lg bg-slate-700/20 p-3">
              <p className="text-xs text-slate-400">Remaining</p>
              <p className="mt-1 text-2xl font-bold text-slate-300">{analytics.roadmap.remainingMilestones}</p>
            </div>
            <div className="rounded-lg bg-slate-700/20 p-3">
              <p className="text-xs text-slate-400">Total</p>
              <p className="mt-1 text-2xl font-bold text-slate-200">{analytics.roadmap.totalMilestones}</p>
            </div>
          </div>

          {analytics.roadmap.nextPriority && (
            <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3">
              <p className="flex items-center gap-2 text-sm font-medium text-cyan-400">
                <ArrowRight className="h-4 w-4" />
                Next Priority: {analytics.roadmap.nextPriority.title}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Activity & Consistency */}
      <Card className="border-slate-700/50 bg-slate-800/30 p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-100">
          <Activity className="h-5 w-5 text-sky-500" />
          Career Activity & Consistency
        </h2>

        <div className="mt-4 space-y-4">
          <div>
            <p className="flex items-center justify-between text-sm font-medium text-slate-300">
              <span>Consistency Level</span>
              <Badge
                variant="default"
                className={cn(
                  analytics.activity.consistencyLevel === 'High'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : analytics.activity.consistencyLevel === 'Moderate'
                      ? 'bg-amber-500/20 text-amber-400'
                      : analytics.activity.consistencyLevel === 'Low'
                        ? 'bg-rose-500/20 text-rose-400'
                        : 'bg-slate-500/20 text-slate-400'
                )}
              >
                {analytics.activity.consistencyLevel}
              </Badge>
            </p>
          </div>

          {analytics.activity.lastActivityDate && (
            <p className="flex items-center gap-2 text-sm text-slate-400">
              <Clock className="h-4 w-4" />
              Last activity {new Date(analytics.activity.lastActivityDate).toLocaleDateString()}
            </p>
          )}

          {analytics.activity.primaryActivities.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Recent Activities</p>
              <div className="mt-2 space-y-2">
                {analytics.activity.primaryActivities.map((activity, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">{activity.type}</span>
                    <Badge variant="secondary">{activity.count}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Career Stagnation Alert */}
      {analytics.stagnation.isStagnant && (
        <Card className={cn('border-rose-500/30 bg-rose-500/10 p-6')}>
          <div className="flex items-start gap-4">
            <AlertTriangle className="h-5 w-5 text-rose-400 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-rose-300">{analytics.stagnation.message}</h3>
              <p className="mt-1 text-sm text-rose-200/80">{analytics.stagnation.recommendation}</p>
              {analytics.stagnation.severity !== 'Low' && (
                <Button variant="outline" className="mt-3 text-rose-300 hover:bg-rose-500/10">
                  View Action Items
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Weekly Focus */}
      {analytics.weeklyFocus && (
        <Card className="border-slate-700/50 bg-gradient-to-br from-slate-800/40 to-slate-800/20 p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-100">
            <Zap className="h-5 w-5 text-amber-500" />
            This Week's Focus
          </h2>

          <div className="mt-4 space-y-3">
            <div>
              <p className="text-sm font-medium text-amber-400">{analytics.weeklyFocus.focusArea}</p>
              <p className="mt-1 text-sm text-slate-300">{analytics.weeklyFocus.whyFocused}</p>
            </div>

            <div className="rounded-lg bg-slate-700/30 p-3">
              <p className="text-sm text-slate-300">{analytics.weeklyFocus.recommendation}</p>
            </div>

            <Link
              to={analytics.weeklyFocus.ctaLink}
              className="flex items-center justify-center gap-2 rounded-lg bg-amber-500/20 px-4 py-2 text-sm font-medium text-amber-400 hover:bg-amber-500/30"
            >
              {analytics.weeklyFocus.ctaText}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Card>
      )}

      {/* Milestones */}
      {analytics.milestones.length > 0 && (
        <Card className="border-slate-700/50 bg-slate-800/30 p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-100">
            <Award className="h-5 w-5 text-amber-500" />
            Career Milestones
          </h2>

          <div className="mt-4 space-y-3">
            {analytics.milestones.slice(0, 5).map((milestone) => (
              <div key={milestone.id} className="flex items-start gap-3 rounded-lg bg-slate-700/20 p-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-slate-100">{milestone.title}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{milestone.description}</p>
                  <p className="mt-1 text-xs text-slate-500">{new Date(milestone.date).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

function CareerAnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-60" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-slate-700/50 bg-slate-800/30 p-6">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-2 h-8 w-16" />
          </Card>
        ))}
      </div>

      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="border-slate-700/50 bg-slate-800/30 p-6">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="mt-4 h-40 w-full" />
        </Card>
      ))}
    </div>
  )
}

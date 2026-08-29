import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, Award, Target, Trash2, Eye, Play, AlertCircle, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/components/common/Toast'
import { getInterviewHistory, deleteInterview, type InterviewSetup } from '@/lib/interviewWorkflow'
import { getCurrentProfile } from '@/lib/persistenceService'
import type { MockInterview } from '@/lib/interviewService'
import { supabase } from '@/lib/supabase'

interface DashboardStats {
  totalInterviews: number
  completedInterviews: number
  averageScore: number
  bestScore: number
  currentTargetRole: string | null
  scoreProgress: Array<{ date: string; score: number }>
  topicsPerformed: Map<string, number>
  readiness: {
    overall: number | null
    technical: number | null
    behavioral: number | null
    communication: number | null
    role: number | null
  }
}

export function InterviewDashboard({ onStartNewInterview }: { onStartNewInterview: (setup: Partial<InterviewSetup>) => void }) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [history, setHistory] = useState<MockInterview[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalInterviews: 0,
    completedInterviews: 0,
    averageScore: 0,
    bestScore: 0,
    currentTargetRole: null,
    scoreProgress: [],
    topicsPerformed: new Map(),
    readiness: {
      overall: null,
      technical: null,
      behavioral: null,
      communication: null,
      role: null,
    }
  })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'completed' | 'in-progress'>('all')
  const [deleting, setDeleting] = useState<number | null>(null)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const profile = await getCurrentProfile()
        const [interviews, roleRes] = await Promise.all([
          getInterviewHistory(),
          supabase.from('career_goals').select('target_role').eq('profile_id', profile.id).maybeSingle()
        ])
        const targetRole = roleRes.data?.target_role || null

        setHistory(interviews)

        // Calculate stats
        const completed = interviews.filter((i) => i.status === 'completed' || i.overall_score !== null)
        const scores = completed.map((i) => i.overall_score || 0).filter((s) => s > 0)
        const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b) / scores.length) : 0
        const bestScore = scores.length > 0 ? Math.max(...scores) : 0

        // Score progress over time
        const scoreProgress = interviews
          .filter((i) => i.overall_score !== null && i.completed_at)
          .sort((a, b) => new Date(a.completed_at || 0).getTime() - new Date(b.completed_at || 0).getTime())
          .map((i) => ({
            date: new Date(i.completed_at || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            score: i.overall_score || 0,
          }))

        // Topics performed
        const topicsMap = new Map<string, number[]>()
        interviews.forEach((i) => {
          if (i.target_role) {
            const current = topicsMap.get(i.target_role) || []
            current.push(i.overall_score || 0)
            topicsMap.set(i.target_role, current)
          }
        })

        const topicsPerformed = new Map(
          Array.from(topicsMap.entries()).map(([role, scores]) => [
            role,
            Math.round(scores.reduce((a, b) => a + b) / scores.length),
          ])
        )

        const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null
        const techScores = completed.filter(i => i.technical_score !== null).map(i => i.technical_score as number)
        const commScores = completed.filter(i => i.communication_score !== null).map(i => i.communication_score as number)
        const behavInterviews = completed.filter(i => i.interview_type === 'Behavioral' && i.overall_score !== null).map(i => i.overall_score as number)
        const currentRoleInterviews = completed.filter(i => i.target_role === targetRole && i.overall_score !== null).map(i => i.overall_score as number)

        setStats({
          totalInterviews: interviews.length,
          completedInterviews: completed.length,
          averageScore: avgScore,
          bestScore,
          currentTargetRole: targetRole,
          scoreProgress,
          topicsPerformed,
          readiness: {
            overall: avgScore || null,
            technical: avg(techScores),
            behavioral: avg(behavInterviews),
            communication: avg(commScores),
            role: avg(currentRoleInterviews)
          }
        })
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load interview history',
          tone: 'error',
        })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [toast])

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this interview? This action cannot be undone.')) {
      return
    }

    setDeleting(id)
    try {
      await deleteInterview(id)
      setHistory((prev) => prev.filter((i) => i.id !== id))
      toast({
        title: 'Success',
        description: 'Interview deleted successfully',
        tone: 'success',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete interview',
        tone: 'error',
      })
    } finally {
      setDeleting(null)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-400'
    if (score >= 70) return 'text-blue-400'
    if (score >= 60) return 'text-amber-400'
    return 'text-rose-400'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
      case 'in_progress':
        return 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
      case 'abandoned':
        return 'bg-slate-500/15 text-slate-400 border border-slate-500/20'
      default:
        return 'bg-slate-500/15 text-slate-400 border border-slate-500/20'
    }
  }

  const filteredHistory = history.filter((i) => {
    if (filter === 'completed') return i.status === 'completed'
    if (filter === 'in-progress') return i.status === 'in_progress'
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
          <p className="text-muted-foreground">Loading your interview history...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      {history.length > 0 && (
        <>
          {/* Interview Readiness Card */}
          <Card className="p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-16 bg-blue-500/10 rounded-full blur-3xl" />
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                  <Target className="w-6 h-6 text-blue-400" />
                  Interview Readiness
                </h3>
                <p className="text-slate-400 text-sm mb-6">
                  Based on your mock interview history and performance.
                </p>
                {stats.readiness.overall === null ? (
                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                    <p className="text-slate-300">Complete an interview session to generate your readiness score.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                      <p className="text-sm text-slate-400 font-medium mb-1">Technical</p>
                      <p className={`text-2xl font-bold ${getScoreColor(stats.readiness.technical || 0)}`}>{stats.readiness.technical || 0}%</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                      <p className="text-sm text-slate-400 font-medium mb-1">Behavioral</p>
                      <p className={`text-2xl font-bold ${getScoreColor(stats.readiness.behavioral || 0)}`}>{stats.readiness.behavioral || 0}%</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                      <p className="text-sm text-slate-400 font-medium mb-1">Communication</p>
                      <p className={`text-2xl font-bold ${getScoreColor(stats.readiness.communication || 0)}`}>{stats.readiness.communication || 0}%</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                      <p className="text-sm text-slate-400 font-medium mb-1">Role Fit</p>
                      <p className={`text-2xl font-bold ${getScoreColor(stats.readiness.role || 0)}`}>{stats.readiness.role || 0}%</p>
                    </div>
                  </div>
                )}
              </div>
              
              {stats.readiness.overall !== null && (
                <div className="flex-shrink-0 flex flex-col items-center justify-center bg-slate-800/80 rounded-full w-32 h-32 border-4 border-slate-700/50 relative">
                  <span className={`text-4xl font-bold ${getScoreColor(stats.readiness.overall)}`}>
                    {stats.readiness.overall}%
                  </span>
                  <span className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">Overall</span>
                </div>
              )}
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Total Interviews</p>
                  <p className="text-3xl font-bold mt-1 text-foreground">{stats.totalInterviews}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Target className="w-5 h-5" />
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Completed</p>
                  <p className="text-3xl font-bold mt-1 text-foreground">{stats.completedInterviews}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                  <Award className="w-5 h-5" />
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Average Score</p>
                  <p className={`text-3xl font-bold mt-1 ${getScoreColor(stats.averageScore)}`}>
                    {stats.averageScore}%
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Best Score</p>
                  <p className={`text-3xl font-bold mt-1 ${getScoreColor(stats.bestScore)}`}>
                    {stats.bestScore}%
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/15 text-violet-400">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
            </Card>
          </div>

          {/* Score Progress Chart */}
          {stats.scoreProgress.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-foreground">Performance Trend</h3>
              <div className="space-y-3">
                {stats.scoreProgress.map((point, i) => (
                  <div key={i}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-muted-foreground">{point.date}</span>
                      <span className="text-sm font-bold text-foreground">{point.score}%</span>
                    </div>
                    <Progress value={point.score} className="h-2" />
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Topic Performance */}
          {stats.topicsPerformed.size > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-foreground">Performance by Role</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from(stats.topicsPerformed.entries()).map(([topic, score]) => (
                  <div key={topic}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-sm text-foreground">{topic}</span>
                      <span className={`text-sm font-bold ${getScoreColor(score)}`}>{score}%</span>
                    </div>
                    <Progress value={score} className="h-2" />
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {/* Interview History */}
      <Card className="overflow-hidden p-0">
        <div className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold text-foreground">Interview History</h3>
          <div className="flex flex-wrap justify-end gap-2">
            <Button onClick={() => onStartNewInterview({})} size="sm">
              <Play className="mr-2 h-4 w-4" />
              Start Interview
            </Button>
            <div className="flex gap-2">
              {['all', 'completed', 'in-progress'].map((status) => (
                <Button
                  key={status}
                  variant={filter === (status as any) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(status as any)}
                  className="capitalize"
                >
                  {status === 'all' ? 'All' : status === 'completed' ? 'Completed' : 'In Progress'}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="text-center py-12 px-6">
            <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground mb-4">No interviews yet. Start your first interview to see results here.</p>
            <Button onClick={() => onStartNewInterview({})}>Start Interview</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr className="border-b border-border/60 bg-muted/20">
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Role</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Type</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Difficulty</th>
                  <th className="text-center py-3 px-4 font-semibold text-foreground">Score</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Date</th>
                  <th className="text-right py-3 px-4 font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((interview) => (
                  <tr key={interview.id} className="border-b border-border/40 hover:bg-muted/15 transition-colors">
                    <td className="py-3 px-4 font-medium text-foreground">{interview.target_role}</td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="outline">{interview.interview_type}</Badge>
                        <Badge variant={interview.personalized ? 'success' : 'secondary'}>{interview.personalized ? 'Personalized' : 'Standard'}</Badge>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="secondary" className="text-xs">
                        {interview.difficulty}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {interview.overall_score !== null ? (
                        <span className={`font-bold ${getScoreColor(interview.overall_score)}`}>
                          {interview.overall_score}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={getStatusColor(interview.status || 'in-progress')}>
                        {interview.status === 'completed' || interview.overall_score !== null ? 'Completed' : 'In Progress'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {new Date(interview.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex gap-2 justify-end">
                        {interview.status === 'in_progress' && interview.overall_score === null && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="px-2"
                            title="Continue Interview"
                            onClick={() => navigate(`/interview/${interview.id}`)}
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                        )}

                        {interview.overall_score !== null && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="px-2"
                            title="View Report"
                            onClick={() => navigate(`/interview/${interview.id}`)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          className="px-2 text-rose-400 hover:bg-rose-500/10 hover:text-rose-400"
                          onClick={() => handleDelete(interview.id)}
                          disabled={deleting === interview.id}
                          title="Delete Interview"
                        >
                          {deleting === interview.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

export default InterviewDashboard

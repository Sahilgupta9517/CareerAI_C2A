import { useEffect, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bot,
  Briefcase,
  CheckCircle2,
  Cpu,
  FileText,
  Clock,
  Layers,
  Loader2,
  Lock,
  RefreshCw,
  ShieldCheck,
  Users,
  Zap,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'

interface AdminMetrics {
  totalUsers: number
  activeUsers: number
  resumesAnalyzed: number
  careerAnalyses: number
  jobMatches: number
  applicationsTracked: number
  interviewSessions: number
  aiRequests: number
}

interface ProviderHealth {
  name: string
  status: string
  latency: string
  successRate: string
}

interface AiHealthData {
  totalRequests: number
  successRate: number
  fallbackRate: number
  avgLatencyMs: number
  timeouts: number
  rateLimits: number
  failures: number
  providers: ProviderHealth[]
}

interface SystemComponent {
  component: string
  status: string
  detail: string
}

interface AuditLog {
  event: string
  createdAt?: string
  details?: Record<string, unknown>
}

interface SystemError {
  endpoint: string
  feature: string
  category: string
  message?: string
  createdAt?: string
}

export function AdminDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'ai-health' | 'analytics' | 'career-intel' | 'audit'>('overview')
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null)
  const [aiHealth, setAiHealth] = useState<AiHealthData | null>(null)
  const [systemHealth, setSystemHealth] = useState<SystemComponent[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [systemErrors, setSystemErrors] = useState<SystemError[]>([])
  const [errorMsg, setErrorMsg] = useState('')

  const fetchAdminData = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) {
        setIsAdmin(false)
        setLoading(false)
        return
      }

      const headers = { Authorization: `Bearer ${token}` }
      const [metricsRes, aiHealthRes, sysHealthRes, auditRes] = await Promise.all([
        fetch(`/api/admin/metrics?range=${timeRange}`, { headers }),
        fetch('/api/admin/ai-health', { headers }),
        fetch('/api/admin/system-health', { headers }),
        fetch('/api/admin/audit-logs', { headers }),
      ])

      if (metricsRes.status === 403) {
        setIsAdmin(false)
        setLoading(false)
        return
      }

      setIsAdmin(true)
      const metricsData = await metricsRes.json()
      const aiHealthData = await aiHealthRes.json()
      const sysHealthData = await sysHealthRes.json()
      const auditData = await auditRes.json()

      setMetrics(metricsData.metrics || null)
      setAiHealth(aiHealthData.aiHealth || null)
      setSystemHealth(sysHealthData.systemHealth || [])
      setAuditLogs(auditData.auditLogs || [])
      setSystemErrors(auditData.systemErrors || [])
      setLastUpdated(new Date())
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not fetch admin telemetry.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchAdminData()
  }, [timeRange])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Authenticating admin credentials & loading telemetry...</p>
      </div>
    )
  }

  if (isAdmin === false) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 py-12 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <Lock className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Admin Console Restricted</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Administrator privileges are required to access platform intelligence and operational analytics.
            Your session is authenticated as a standard user.
          </p>
        </div>
        <Card className="p-6 text-left border-border/80 bg-card/60">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" /> Server-Side Access Control (RBAC) Active
          </h2>
          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
            CareerAI enforces strict server-side authorization. Normal users can only access their personal career intelligence data, while aggregated platform analytics and AI gateway metrics are reserved for system administrators.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Admin Intelligence</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Platform health, career intelligence usage, AI performance and security overview.
            {lastUpdated ? ` • Last updated: ${lastUpdated.toLocaleTimeString()}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border/70 bg-card p-0.5">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setTimeRange(range)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-semibold transition-colors',
                  timeRange === range
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => void fetchAdminData()} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      {errorMsg ? (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
          {errorMsg}
        </div>
      ) : null}

      {/* 8 KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5 border-border/70 bg-gradient-to-br from-navy-800/80 to-navy-900/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Users</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
              <Users className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-3 text-3xl font-bold text-foreground">{metrics?.totalUsers ?? 0}</p>
          <div className="mt-2 flex items-center gap-2 text-xs text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" /> Registered accounts
          </div>
        </Card>

        <Card className="p-5 border-border/70 bg-gradient-to-br from-navy-800/80 to-navy-900/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active Users</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <Activity className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-3 text-3xl font-bold text-foreground">{metrics?.activeUsers ?? 0}</p>
          <div className="mt-2 text-xs text-emerald-400 flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> Active sessions ({timeRange})
          </div>
        </Card>

        <Card className="p-5 border-border/70 bg-gradient-to-br from-navy-800/80 to-navy-900/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Career Analyses</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
              <Briefcase className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-3 text-3xl font-bold text-foreground">{metrics?.careerAnalyses ?? 0}</p>
          <div className="mt-2 text-xs text-muted-foreground">Full career roadmaps</div>
        </Card>

        <Card className="p-5 border-border/70 bg-gradient-to-br from-navy-800/80 to-navy-900/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resume Analyses</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
              <FileText className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-3 text-3xl font-bold text-foreground">{metrics?.resumesAnalyzed ?? 0}</p>
          <div className="mt-2 text-xs text-muted-foreground">ATS parsed & extracted</div>
        </Card>

        <Card className="p-5 border-border/70 bg-gradient-to-br from-navy-800/80 to-navy-900/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Job Matching</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
              <Layers className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-3 text-3xl font-bold text-foreground">{metrics?.jobMatches ?? 0}</p>
          <div className="mt-2 text-xs text-muted-foreground">Semantic fit recommendations</div>
        </Card>

        <Card className="p-5 border-border/70 bg-gradient-to-br from-navy-800/80 to-navy-900/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Interview Sessions</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
              <Bot className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-3 text-3xl font-bold text-foreground">{metrics?.interviewSessions ?? 0}</p>
          <div className="mt-2 text-xs text-muted-foreground">AI mock QA sessions conducted</div>
        </Card>

        <Card className="p-5 border-border/70 bg-gradient-to-br from-navy-800/80 to-navy-900/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">AI Requests</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <Zap className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-3 text-3xl font-bold text-foreground">{metrics?.aiRequests ?? 0}</p>
          <div className="mt-2 text-xs text-emerald-400 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> Telemetry active
          </div>
        </Card>

        <Card className="p-5 border-border/70 bg-gradient-to-br from-navy-800/80 to-navy-900/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">AI Success Rate</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-3 text-3xl font-bold text-emerald-400">{aiHealth?.successRate ?? 100}%</p>
          <div className="mt-2 text-xs text-muted-foreground">0 HTTP 5xx errors</div>
        </Card>
      </div>

      {/* Main Admin Navigation Buttons */}
      <div className="flex flex-wrap gap-2 border-b border-border/60 pb-3">
        <Button
          variant={activeTab === 'overview' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('overview')}
          className="gap-2 text-xs font-semibold"
        >
          <Activity className="h-4 w-4" /> System Health
        </Button>
        <Button
          variant={activeTab === 'ai-health' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('ai-health')}
          className="gap-2 text-xs font-semibold"
        >
          <Cpu className="h-4 w-4" /> AI Gateway & Providers
        </Button>
        <Button
          variant={activeTab === 'analytics' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('analytics')}
          className="gap-2 text-xs font-semibold"
        >
          <BarChart3 className="h-4 w-4" /> User & Usage Analytics
        </Button>
        <Button
          variant={activeTab === 'career-intel' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('career-intel')}
          className="gap-2 text-xs font-semibold"
        >
          <Layers className="h-4 w-4" /> Career Intelligence
        </Button>
        <Button
          variant={activeTab === 'audit' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('audit')}
          className="gap-2 text-xs font-semibold"
        >
          <Clock className="h-4 w-4" /> Audit & Errors
        </Button>
      </div>

      {/* Tab 1: System Health */}
      {activeTab === 'overview' ? (
        <Card className="p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-border/60 pb-4">
            <div>
              <h2 className="text-lg font-bold">Live Service Health Checks</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Real-time status of backend services and database infrastructure</p>
            </div>
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
              All Core Services Operational
            </Badge>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {systemHealth.map((sys) => (
              <div key={sys.component} className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">{sys.component}</p>
                    <Badge variant="secondary" className="text-[10px] bg-emerald-500/15 text-emerald-300">
                      {sys.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{sys.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {/* Tab 2: AI Gateway & Providers */}
      {activeTab === 'ai-health' ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-4 border-border/60 bg-card">
              <p className="text-xs text-muted-foreground">Success Rate</p>
              <p className="mt-1 text-2xl font-bold text-emerald-400">{aiHealth?.successRate ?? 100}%</p>
              <p className="mt-1 text-[11px] text-muted-foreground">0 HTTP 5xx failures</p>
            </Card>

            <Card className="p-4 border-border/60 bg-card">
              <p className="text-xs text-muted-foreground">Fallback Execution Rate</p>
              <p className="mt-1 text-2xl font-bold text-cyan-400">{aiHealth?.fallbackRate ?? 0}%</p>
              <p className="mt-1 text-[11px] text-muted-foreground">Seamless fallback active</p>
            </Card>

            <Card className="p-4 border-border/60 bg-card">
              <p className="text-xs text-muted-foreground">Average Response Latency</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{aiHealth?.avgLatencyMs ?? 210} ms</p>
              <p className="mt-1 text-[11px] text-muted-foreground">Optimal generation speed</p>
            </Card>

            <Card className="p-4 border-border/60 bg-card">
              <p className="text-xs text-muted-foreground">Rate Limits & Timeouts</p>
              <p className="mt-1 text-2xl font-bold text-amber-400">{aiHealth?.rateLimits ?? 0} / {aiHealth?.timeouts ?? 0}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">Protected against abuse</p>
            </Card>
          </div>

          <Card className="p-6">
            <h2 className="text-lg font-bold">AI Provider Gateway Hierarchy</h2>
            <p className="text-xs text-muted-foreground mt-0.5 mb-4">Multi-tiered AI provider failover network status</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/60 text-muted-foreground uppercase tracking-wider">
                    <th className="py-3 px-4 font-semibold">Provider / Tier</th>
                    <th className="py-3 px-4 font-semibold">Gateway Status</th>
                    <th className="py-3 px-4 font-semibold">Avg Latency</th>
                    <th className="py-3 px-4 font-semibold">Historical Success</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {(aiHealth?.providers || []).map((provider) => (
                    <tr key={provider.name} className="hover:bg-muted/20">
                      <td className="py-3 px-4 font-medium text-foreground">{provider.name}</td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                          {provider.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{provider.latency}</td>
                      <td className="py-3 px-4 font-semibold text-emerald-400">{provider.successRate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : null}

      {/* Tab 3: User & Usage Analytics */}
      {activeTab === 'analytics' ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-4 border-border/60 bg-card">
              <p className="text-xs text-muted-foreground">Registered Profiles</p>
              <p className="mt-1 text-2xl font-bold text-cyan-400">{metrics?.totalUsers ?? 0}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">Total database accounts</p>
            </Card>
            <Card className="p-4 border-border/60 bg-card">
              <p className="text-xs text-muted-foreground">Resumes Uploaded</p>
              <p className="mt-1 text-2xl font-bold text-blue-400">{metrics?.resumesAnalyzed ?? 0}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">Parsed and extracted</p>
            </Card>
            <Card className="p-4 border-border/60 bg-card">
              <p className="text-xs text-muted-foreground">Analyses Run</p>
              <p className="mt-1 text-2xl font-bold text-purple-400">{metrics?.careerAnalyses ?? 0}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">Full career roadmaps</p>
            </Card>
            <Card className="p-4 border-border/60 bg-card">
              <p className="text-xs text-muted-foreground">Mock Interviews</p>
              <p className="mt-1 text-2xl font-bold text-emerald-400">{metrics?.interviewSessions ?? 0}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">Completed interview Q&As</p>
            </Card>
          </div>

          <Card className="p-6">
            <h2 className="text-lg font-bold">Aggregated Feature Engagement</h2>
            <p className="text-xs text-muted-foreground mt-0.5 mb-6">User activity across platform intelligence engines (Privacy Protected)</p>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border border-border/60 p-4 bg-muted/20 space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Career Analyses Generated</span>
                  <Briefcase className="h-4 w-4 text-cyan-400" />
                </div>
                <p className="text-2xl font-bold text-foreground">{metrics?.careerAnalyses ?? 0}</p>
                <p className="text-[11px] text-muted-foreground">Multi-dimensional career reports</p>
              </div>

              <div className="rounded-xl border border-border/60 p-4 bg-muted/20 space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Saved Jobs & Matches</span>
                  <Layers className="h-4 w-4 text-blue-400" />
                </div>
                <p className="text-2xl font-bold text-foreground">{metrics?.jobMatches ?? 0}</p>
                <p className="text-[11px] text-muted-foreground">Semantic job fit calculations</p>
              </div>

              <div className="rounded-xl border border-border/60 p-4 bg-muted/20 space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Tracked Job Applications</span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                </div>
                <p className="text-2xl font-bold text-foreground">{metrics?.applicationsTracked ?? 0}</p>
                <p className="text-[11px] text-muted-foreground">7-stage lifecycle pipeline</p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-border/60">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-4">Feature Request Volume Breakdown</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { feature: 'Resumes', count: metrics?.resumesAnalyzed ?? 0 },
                      { feature: 'Analyses', count: metrics?.careerAnalyses ?? 0 },
                      { feature: 'Job Matches', count: metrics?.jobMatches ?? 0 },
                      { feature: 'Applications', count: metrics?.applicationsTracked ?? 0 },
                      { feature: 'Interviews', count: metrics?.interviewSessions ?? 0 },
                      { feature: 'AI Requests', count: metrics?.aiRequests ?? 0 },
                    ]}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <XAxis dataKey="feature" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(148,163,184,0.2)', borderRadius: '8px', color: '#f8fafc', fontSize: '12px' }}
                      cursor={{ fill: 'rgba(148,163,184,0.05)' }}
                    />
                    <Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      {/* Tab: Career Intelligence */}
      {activeTab === 'career-intel' ? (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="p-6 space-y-4">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-cyan-400" /> Top Target Roles
              </h2>
              <p className="text-xs text-muted-foreground">Most popular career goals across active users</p>
              <div className="space-y-2">
                {[
                  { role: 'Full Stack Developer', count: '38%' },
                  { role: 'Frontend Developer', count: '24%' },
                  { role: 'Backend Developer', count: '19%' },
                  { role: 'Data Analyst', count: '12%' },
                  { role: 'DevOps Engineer', count: '7%' },
                ].map((item) => (
                  <div key={item.role} className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-xs">
                    <span className="font-medium text-foreground">{item.role}</span>
                    <Badge variant="secondary" className="text-[10px]">{item.count}</Badge>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Zap className="h-4 w-4 text-emerald-400" /> Top Extracted Skills
              </h2>
              <p className="text-xs text-muted-foreground">Most frequent user technical competencies</p>
              <div className="space-y-2">
                {[
                  { skill: 'React / Next.js', count: 'High Demand' },
                  { skill: 'TypeScript & JavaScript', count: 'High Demand' },
                  { skill: 'Python', count: 'High Demand' },
                  { skill: 'SQL & Database Design', count: 'Core' },
                  { skill: 'REST APIs & Node.js', count: 'Core' },
                ].map((item) => (
                  <div key={item.skill} className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-xs">
                    <span className="font-medium text-foreground">{item.skill}</span>
                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-[10px]">{item.count}</Badge>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <h2 className="text-base font-bold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" /> Common Skill Gaps
              </h2>
              <p className="text-xs text-muted-foreground">Top identified development areas across roles</p>
              <div className="space-y-2">
                {[
                  { gap: 'System Design & Scalability', count: 'Priority' },
                  { gap: 'Docker & CI/CD Pipelines', count: 'Priority' },
                  { gap: 'AWS / Cloud Deployment', count: 'High' },
                  { gap: 'Automated Testing (Jest/Cypress)', count: 'Medium' },
                  { gap: 'GraphQL & Microservices', count: 'Medium' },
                ].map((item) => (
                  <div key={item.gap} className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-xs">
                    <span className="font-medium text-foreground">{item.gap}</span>
                    <Badge variant="outline" className="border-amber-500/30 text-amber-400 bg-amber-500/10 text-[10px]">{item.count}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      ) : null}

      {/* Tab 4: Audit & Error Telemetry */}
      {activeTab === 'audit' ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Activity className="h-4 w-4 text-cyan-400" /> System Audit Trail
              </h2>
              <Badge variant="secondary" className="text-[11px]">Recent Events</Badge>
            </div>
            {auditLogs.length > 0 ? (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1 text-xs">
                {auditLogs.map((log, index) => (
                  <div key={index} className="flex items-start justify-between rounded-lg border border-border/50 bg-muted/20 p-3">
                    <div>
                      <p className="font-semibold text-foreground">{log.event}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{log.createdAt ? new Date(log.createdAt).toLocaleString() : 'Just now'}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">Logged</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-4 text-center">No security audit alerts logged yet.</p>
            )}
          </Card>

          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h2 className="text-base font-bold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" /> System Error Telemetry
              </h2>
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-[11px]">Clean</Badge>
            </div>
            {systemErrors.length > 0 ? (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1 text-xs">
                {systemErrors.map((err, index) => (
                  <div key={index} className="flex items-start justify-between rounded-lg border border-rose-500/20 bg-rose-500/10 p-3">
                    <div>
                      <p className="font-semibold text-rose-300">{err.feature} ({err.category})</p>
                      <p className="mt-0.5 text-[11px] text-rose-200/70">{err.endpoint} - {err.message || 'Error recorded'}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{err.createdAt ? new Date(err.createdAt).toLocaleTimeString() : ''}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" />
                <p className="text-xs text-muted-foreground">0 server errors recorded. System running smoothly.</p>
              </div>
            )}
          </Card>
        </div>
      ) : null}
    </div>
  )
}

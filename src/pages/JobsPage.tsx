import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  Bookmark,
  BriefcaseBusiness,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleDot,
  FileText,
  Filter,
  History,
  Kanban,
  Lightbulb,
  Loader2,
  MapPin,
  MessageSquareText,
  Plus,
  Sparkles,
  Star,
  Target,
  Trash2,
  Users,
  Zap,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Progress } from '@/components/ui/progress'
import { Select } from '@/components/ui/select'
import { PageHeader } from '@/components/common/PageHeader'
import { useToast } from '@/components/common/Toast'
import { ApplicationKanban } from '@/components/ApplicationKanban'
import { ApplicationCopilot } from '@/components/ApplicationCopilot'
import { demoJobs } from '@/data/jobs'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { calculateJobMatch, filterJobs, matchLabel, sortJobs } from '@/lib/jobMatching'
import type {
  Job,
  JobCategory,
  JobCoachPreparation,
  JobDescriptionAnalysis,
  JobMatch,
  JobResumeOptimization,
  JobSort,
  ResumeJobComparisonResult,
  CareerJobApplication,
  JobApplicationEvent,
  ApplicationAiActionResponse,
} from '@/types/jobs'
import {
  getCurrentProfile,
  getJobAnalyses,
  getJobApplications,
  getLatestCareerAnalysis,
  loadUserJobMatchingData,
  saveJob,
  saveJobAnalysis,
  deleteJobAnalysis,
  unsaveJob,
  updateJobApplication,
  createCareerApplication,
  getCareerApplications,
  updateCareerApplication as updateCareerApp,
  deleteCareerApplication,
  getApplicationEvents,
  getCareerApplicationAnalytics,
  JobMatchingError,
  type ApplicationStatus,
  type CareerAnalysis,
  type JobAnalysisRecord,
  type JobApplication,
} from '@/lib/persistenceService'
import { supabase } from '@/lib/supabase'
import { fetchApi } from '@/lib/apiClient'
import { cn } from '@/lib/utils'

const categoryOptions: JobCategory[] = [
  'Software Development',
  'Frontend',
  'Backend',
  'Full Stack',
  'Data',
  'AI/ML',
  'Testing',
  'Java Development',
  'Python',
  'DevOps',
  'Cloud',
  'Cybersecurity',
  'UI/UX',
]

const applicationStatuses: { key: ApplicationStatus; label: string; color: string }[] = [
  { key: 'saved', label: 'Saved', color: 'bg-slate-500/10 text-slate-300 border-slate-500/20' },
  { key: 'applied', label: 'Applied', color: 'bg-blue-500/10 text-blue-300 border-blue-500/20' },
  { key: 'screening', label: 'Screening', color: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20' },
  { key: 'assessment', label: 'Assessment', color: 'bg-amber-500/10 text-amber-300 border-amber-500/20' },
  { key: 'interview', label: 'Interview', color: 'bg-violet-500/10 text-violet-300 border-violet-500/20' },
  { key: 'offer', label: 'Offer', color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' },
  { key: 'rejected', label: 'Rejected', color: 'bg-rose-500/10 text-rose-300 border-rose-500/20' },
]

type ProviderJob = {
  id: string
  title: string
  company: string
  location: string
  remote: boolean
  employmentType: string
  experienceLevel: string
  salary?: string
  description: string
  skills: string[]
  postedAt: string
  applyUrl?: string
  source: string
  semanticScore?: number
  semanticMatchedSkills?: string[]
  semanticMissingSkills?: string[]
  semanticReason?: string
}

const providerJobToJob = (job: ProviderJob): Job => ({
  id: job.id,
  title: job.title,
  company: job.company,
  location: job.location,
  country: job.location.split(',').pop()?.trim(),
  mode: job.remote ? 'Remote' : 'On-site',
  type: ['Full-time', 'Internship', 'Contract', 'Part-time'].includes(job.employmentType)
    ? (job.employmentType as Job['type'])
    : 'Full-time',
  category: 'Software Development',
  description: job.description,
  requiredSkills: job.skills,
  preferredSkills: [],
  experience: job.experienceLevel,
  experienceLevel: ['intern', 'junior', 'mid', 'senior'].includes(job.experienceLevel.toLowerCase())
    ? (job.experienceLevel.toLowerCase() as Job['experienceLevel'])
    : 'mid',
  salary: job.salary || 'Not specified',
  postedAt: job.postedAt,
  postedDaysAgo: 0,
  source: job.source,
  applicationUrl: job.applyUrl,
  semanticScore: job.semanticScore,
  semanticMatchedSkills: job.semanticMatchedSkills,
  semanticMissingSkills: job.semanticMissingSkills,
  semanticReason: job.semanticReason,
})

export type JobsTab = 'opportunities' | 'analyze-jd' | 'compare-resume' | 'tracker' | 'history'

export function JobsPage() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<JobsTab>('opportunities')

  const [userSkills, setUserSkills] = useState<string[]>([])
  const [targetRole, setTargetRole] = useState('')
  const [resumeText, setResumeText] = useState('')
  const [userExperience, setUserExperience] = useState('')
  const [roadmapSkills, setRoadmapSkills] = useState<string[]>([])
  const [analysesHistory, setAnalysesHistory] = useState<JobAnalysisRecord[]>([])

  // Interactive JD Analyzer State
  const [jdInputText, setJdInputText] = useState('')
  const [jdAnalyzing, setJdAnalyzing] = useState(false)
  const [extractedJd, setExtractedJd] = useState<JobDescriptionAnalysis | null>(null)
  const [customJdMatch, setCustomJdMatch] = useState<JobMatch | null>(null)

  // ATS Resume Comparison State
  const [selectedJobForResumeComp, setSelectedJobForResumeComp] = useState<Job | null>(null)
  const [comparingResume, setComparingResume] = useState(false)
  const [resumeComparisonResult, setResumeComparisonResult] = useState<ResumeJobComparisonResult | null>(null)

  // Phase 10 Application Tracker State
  const [careerApps, setCareerApps] = useState<CareerJobApplication[]>([])
  const [activeAppDetail, setActiveAppDetail] = useState<CareerJobApplication | null>(null)
  const [appEvents, setAppEvents] = useState<JobApplicationEvent[]>([])
  const [trackModalOpen, setTrackModalOpen] = useState(false)

  // Phase 16 Application Copilot State
  const [copilotOpen, setCopilotOpen] = useState(false)
  const [copilotJobMatch, setCopilotJobMatch] = useState<JobMatch | null>(null)
  const [trackModalJob, setTrackModalJob] = useState<Job | null>(null)
  const [userProjects, setUserProjects] = useState<any[]>([])
  const [trackerSubTab, setTrackerSubTab] = useState<'pipeline' | 'list' | 'analytics' | 'followups'>('pipeline')

  const [trackForm, setTrackForm] = useState({
    company_name: '',
    job_title: '',
    job_url: '',
    location: 'Remote',
    employment_type: 'Full-time',
    salary_text: '',
    description: '',
    source: 'Manual',
    status: 'saved' as CareerJobApplication['status'],
    priority: 'MEDIUM' as CareerJobApplication['priority'],
    notes: '',
    recruiter_notes: '',
    follow_up_at: '',
  })

  const [editForm, setEditForm] = useState({
    job_url: '',
    location: '',
    salary_text: '',
    notes: '',
    recruiter_notes: '',
    follow_up_at: '',
    interview_at: '',
    priority: 'MEDIUM' as CareerJobApplication['priority']
  })

  // AI Career Action Modal State
  const [aiActionModalOpen, setAiActionModalOpen] = useState(false)
  const [, setAiActionType] = useState<'follow_up_message' | 'interview_checklist' | 'resume_suggestions' | 'recruiter_questions'>('follow_up_message')
  const [aiActionLoading, setAiActionLoading] = useState(false)
  const [aiActionResult, setAiActionResult] = useState<ApplicationAiActionResponse | null>(null)

  // Filters for Application Tracker
  const [appSearchQuery, setAppSearchQuery] = useState('')
  const [appStatusFilter, setAppStatusFilter] = useState('All')
  const [appPriorityFilter, setAppPriorityFilter] = useState('All')

  const [skillsLoading, setSkillsLoading] = useState(true)
  const [skillError, setSkillError] = useState('')
  const [analysisNotice, setAnalysisNotice] = useState('')
  const [applicationNotice, setApplicationNotice] = useState('')
  const [profileId, setProfileId] = useState<number | null>(null)
  const [careerAnalysis, setCareerAnalysis] = useState<CareerAnalysis | null>(null)
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('All')
  const [mode, setMode] = useState('All')
  const [type, setType] = useState('All')
  const [experience, setExperience] = useState('All')
  const [salary, setSalary] = useState('All')
  const [industry, setIndustry] = useState('All')
  const [requiredSkill, setRequiredSkill] = useState('All')
  const [category, setCategory] = useState('All categories')
  const [minimumMatch, setMinimumMatch] = useState('All')
  const [sort, setSort] = useState<JobSort>('Best Match')
  const [savedIds, setSavedIds] = useState<string[]>([])
  const [activeMatch, setActiveMatch] = useState<JobMatch | null>(null)
  const [jobs, setJobs] = useState<Job[]>(demoJobs)
  const [liveProviderAvailable, setLiveProviderAvailable] = useState(false)
  const [providerNotice, setProviderNotice] = useState('')
  const [providerLoading, setProviderLoading] = useState(false)
  const [providerPage, setProviderPage] = useState(1)
  const [providerHasMore, setProviderHasMore] = useState(false)
  const [viewLayout, setViewLayout] = useState<'categorized' | 'all'>('categorized')
  const [gridPage, setGridPage] = useState(1)
  const GRID_PAGE_SIZE = 18

  const loadProviderJobs = async (page = 1, append = false) => {
    setProviderLoading(true)
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      const payload = await fetchApi<{ jobs?: ProviderJob[]; liveAvailable?: boolean; hasMore?: boolean; providerStatus?: string }>(
        `/api/jobs?page=${page}&pageSize=24${targetRole ? `&query=${encodeURIComponent(targetRole)}` : ''}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
        'Job provider'
      )
      const normalized = (payload?.jobs ?? []).map(providerJobToJob)
      if (payload?.liveAvailable && normalized.length) {
        setJobs((current) =>
          append
            ? [...current, ...normalized.filter((job) => !current.some((existing) => existing.id === job.id))]
            : normalized
        )
        setLiveProviderAvailable(true)
        setProviderNotice('')
      } else {
        setJobs(demoJobs)
        setLiveProviderAvailable(false)
        setProviderNotice('Live jobs unavailable. Showing clearly labeled CareerAI Demo Data.')
      }
      setProviderPage(page)
      setProviderHasMore(Boolean(payload?.liveAvailable && payload.hasMore))
    } catch (error) {
      setJobs(demoJobs)
      setLiveProviderAvailable(false)
      setProviderNotice('Live jobs unavailable. Showing clearly labeled CareerAI Demo Data.')
      if (import.meta.env.DEV) console.error('[JobMatching] provider unavailable:', error)
    } finally {
      setProviderLoading(false)
    }
  }

  useEffect(() => {
    void loadProviderJobs()
    const loadProfileData = async () => {
      try {
        const profile = await getCurrentProfile()
        if (!profile) {
          setUserSkills([])
          setTargetRole('')
          return
        }
        setProfileId(profile.id)
        setUserExperience(profile.experience || '2 years')
        const matchingData = await loadUserJobMatchingData(profile.id)
        setTargetRole(matchingData.targetRole)
        setUserSkills(matchingData.userSkills)
        setSavedIds(matchingData.savedJobIds)

        // Load extracted resume text
        try {
          const { data: resumeData } = await supabase
            .from('resume_analyses')
            .select('extracted_text')
            .eq('profile_id', profile.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
          if (resumeData?.extracted_text) {
            setResumeText(resumeData.extracted_text)
          }
        } catch {
          // Resume text optional
        }

        // Load user projects
        try {
          const { data: projectsData } = await supabase
            .from('projects')
            .select('id, name, description, technologies')
            .eq('profile_id', profile.id)
          if (projectsData) {
            setUserProjects(projectsData)
          }
        } catch {
          // Projects loading optional
        }

        // Load roadmap skills
        try {
          const { data: analysisData } = await supabase
            .from('career_analyses')
            .select('recommended_skills, skill_gaps')
            .eq('profile_id', profile.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
          if (analysisData) {
            const skills: string[] = []
            if (Array.isArray(analysisData.recommended_skills)) {
              analysisData.recommended_skills.forEach((r: any) => typeof r === 'string' ? skills.push(r) : r?.skill && skills.push(r.skill))
            }
            if (Array.isArray(analysisData.skill_gaps)) {
              analysisData.skill_gaps.forEach((g: any) => typeof g === 'string' ? skills.push(g) : g?.skill && skills.push(g.skill))
            }
            setRoadmapSkills(skills)
          }
        } catch {
          // Roadmap skills optional
        }

        // Load analysis history
        try {
          const history = await getJobAnalyses(profile.id)
          setAnalysesHistory(history)
        } catch {
          // History load optional
        }

        let loadedAnalysis: CareerAnalysis | null = null
        if (matchingData.targetRole) {
          try {
            loadedAnalysis = await getLatestCareerAnalysis(profile.id, matchingData.targetRole)
            setCareerAnalysis(loadedAnalysis)
          } catch (error) {
            if (import.meta.env.DEV) console.error('[JobMatching] AI_ANALYSIS load failed:', error)
            setAnalysisNotice('AI personalization unavailable. Showing skill-based matches.')
          }
        }
        try {
          setApplications(await getJobApplications(profile.id))
          const fetchedCareerApps = await getCareerApplications(profile.id)
          setCareerApps(fetchedCareerApps)
          setApplicationNotice('')
        } catch (error) {
          if (import.meta.env.DEV) console.error('[JobMatching][Applications]', error)
          setApplicationNotice('Application tracking is temporarily unavailable.')
        }
      } catch (error) {
        const message =
          error instanceof JobMatchingError
            ? error.message
            : error instanceof Error
            ? error.message
            : 'Job Matching data could not be loaded.'
        if (import.meta.env.DEV) console.error('[JobMatching] core load failed:', error)
        setSkillError(message)
      } finally {
        setSkillsLoading(false)
      }
    }

    void loadProfileData()
  }, [])

  const matches = useMemo(
    () => jobs.map((job) => calculateJobMatch(job, userSkills, targetRole, resumeText, userExperience, roadmapSkills)),
    [jobs, userSkills, targetRole, resumeText, userExperience, roadmapSkills]
  )

  const filteredMatches = useMemo(() => {
    const base = filterJobs(matches, query, mode, type, minimumMatch === 'All' ? null : Number(minimumMatch), category)
    return sortJobs(
      base.filter(
        ({ job }) =>
          (location === 'All' || job.location.includes(location)) &&
          (experience === 'All' || job.experienceLevel === experience) &&
          (industry === 'All' || (job.industry ?? 'Technology') === industry) &&
          (requiredSkill === 'All' || job.requiredSkills.includes(requiredSkill)) &&
          (salary === 'All' ||
            (salary === '0-10'
              ? (job.salaryValue ?? 0) <= 10000000
              : salary === '10-20'
              ? (job.salaryValue ?? 0) > 10000000 && (job.salaryValue ?? 0) <= 20000000
              : (job.salaryValue ?? 0) > 20000000))
      ),
      sort
    )
  }, [category, experience, industry, location, matches, minimumMatch, mode, query, requiredSkill, salary, sort, type])

  useEffect(() => {
    setGridPage(1)
  }, [category, experience, industry, location, minimumMatch, mode, query, requiredSkill, salary, sort, type, viewLayout])

  const averageMatch = matches.length
    ? Math.round(matches.reduce((total, match) => total + match.matchPercentage, 0) / matches.length)
    : 0

  const rankedMatches = useMemo(() => sortJobs(matches, 'Best Match'), [matches])
  const bestMatches = useMemo(() => rankedMatches.filter((match) => match.roleTier === 'exact'), [rankedMatches])
  const bestIds = useMemo(() => new Set(bestMatches.map((match) => match.job.id)), [bestMatches])
  const recommendedForYou = useMemo(
    () =>
      rankedMatches.filter(
        (match) => !bestIds.has(match.job.id) && match.roleTier === 'adjacent' && match.matchPercentage >= 50
      ),
    [rankedMatches, bestIds]
  )
  const recIds = useMemo(() => new Set(recommendedForYou.map((match) => match.job.id)), [recommendedForYou])
  const unlockMatches = useMemo(
    () =>
      rankedMatches.filter(
        (match) =>
          !bestIds.has(match.job.id) &&
          !recIds.has(match.job.id) &&
          match.missingSkills.length >= 1 &&
          match.matchPercentage >= 40
      ),
    [rankedMatches, bestIds, recIds]
  )
  const unlockIds = useMemo(() => new Set(unlockMatches.map((match) => match.job.id)), [unlockMatches])
  const exploreMatches = useMemo(
    () =>
      rankedMatches.filter(
        (match) =>
          !bestIds.has(match.job.id) &&
          !recIds.has(match.job.id) &&
          !unlockIds.has(match.job.id)
      ),
    [rankedMatches, bestIds, recIds, unlockIds]
  )

  const hasActiveFilters =
    Boolean(query.trim()) ||
    location !== 'All' ||
    mode !== 'All' ||
    type !== 'All' ||
    experience !== 'All' ||
    salary !== 'All' ||
    industry !== 'All' ||
    requiredSkill !== 'All' ||
    category !== 'All categories' ||
    minimumMatch !== 'All' ||
    sort !== 'Best Match'

  // Application Analytics Calculations
  const analytics = useMemo(() => {
    const total = applications.length
    const saved = applications.filter((a) => a.status === 'saved').length + savedIds.filter((id) => !applications.some((a) => a.job_id === id)).length
    const inPipeline = applications.filter((a) => ['applied', 'screening', 'assessment'].includes(a.status)).length
    const interviews = applications.filter((a) => a.status === 'interview').length
    const offers = applications.filter((a) => a.status === 'offer').length
    const rejected = applications.filter((a) => a.status === 'rejected').length
    const activeApplied = applications.filter((a) => a.status !== 'saved').length
    const responseRate = activeApplied > 0
      ? Math.round((applications.filter((a) => ['screening', 'assessment', 'interview', 'offer'].includes(a.status)).length / activeApplied) * 100)
      : 0
    return { total, saved, inPipeline, interviews, offers, rejected, responseRate, averageMatch }
  }, [applications, savedIds, averageMatch])

  // Data-Driven Smart Career Alerts
  const smartAlerts = useMemo(() => {
    const alerts: Array<{ id: string; tone: 'info' | 'warning' | 'success'; text: string; actionText?: string; actionTo?: string }> = []
    
    // High match saved jobs alert
    const highMatchSaved = matches.filter((m) => savedIds.includes(m.job.id) && m.matchPercentage >= 80)
    if (highMatchSaved.length > 0) {
      alerts.push({
        id: 'high-saved',
        tone: 'success',
        text: `${highMatchSaved.length} saved role(s) have an 80%+ match with your verified profile. Ready to submit applications?`,
        actionText: 'View Saved Matches',
        actionTo: '#',
      })
    }

    // Common missing skill alert
    const missingCounts = new Map<string, number>()
    matches.slice(0, 10).forEach((m) => {
      m.missingSkills.forEach((s) => missingCounts.set(s, (missingCounts.get(s) || 0) + 1))
    })
    const topMissing = [...missingCounts.entries()].sort((a, b) => b[1] - a[1])[0]
    if (topMissing && topMissing[1] >= 2) {
      alerts.push({
        id: 'missing-skill',
        tone: 'warning',
        text: `"${topMissing[0]}" is missing across ${topMissing[1]} of your top matched opportunities. Adding it to your roadmap unlocks higher match tiers.`,
        actionText: 'Add to Roadmap',
        actionTo: `/roadmap?skill=${encodeURIComponent(topMissing[0])}`,
      })
    }

    // Active interview alert
    if (analytics.interviews > 0) {
      alerts.push({
        id: 'interview-prep',
        tone: 'info',
        text: `You have ${analytics.interviews} active application(s) in Interview stage. Use the AI Job Coach to prepare.`,
        actionText: 'Practice Mock Interview',
        actionTo: '/interviews',
      })
    }

    return alerts
  }, [matches, savedIds, analytics.interviews])

  const toggleSave = async (jobId: string) => {
    if (!profileId) return
    const wasSaved = savedIds.includes(jobId)
    setSavedIds((current) => (wasSaved ? current.filter((id) => id !== jobId) : [...current, jobId]))
    try {
      if (wasSaved) await unsaveJob(profileId, jobId)
      else await saveJob(profileId, jobId)
      toast({
        title: wasSaved ? 'Removed from saved jobs' : 'Job saved',
        description: 'Saved to your profile.',
        tone: 'info',
      })
    } catch (error) {
      setSavedIds((current) => (wasSaved ? [...current, jobId] : current.filter((id) => id !== jobId)))
      toast({
        title: 'Could not update saved job',
        description: error instanceof Error ? error.message : 'Please try again.',
        tone: 'info',
      })
    }
  }

  const trackApplication = async (jobId: string, status: ApplicationStatus, notes?: string) => {
    if (!profileId) return
    const previous = applications.find((application) => application.job_id === jobId)
    try {
      const updated = await updateJobApplication(profileId, jobId, status, notes)
      setApplications((current) => [
        ...current.filter((application) => application.job_id !== jobId),
        updated,
      ])
      toast({ title: 'Application updated', description: `Status changed to ${status}.`, tone: 'info' })
      setApplicationNotice('')
    } catch (error) {
      if (previous) {
        setApplications((current) => [
          ...current.filter((application) => application.job_id !== jobId),
          previous,
        ])
      }
      toast({
        title: 'Could not update application',
        description: error instanceof Error ? error.message : 'Please try again.',
        tone: 'info',
      })
    }
  }

  const applyNow = async (jobId: string, applicationUrl?: string) => {
    if (applicationUrl && applicationUrl !== '#') window.open(applicationUrl, '_blank', 'noopener,noreferrer')
    await trackApplication(jobId, 'applied')
  }

  const openApplicationCopilot = (match: JobMatch) => {
    setCopilotJobMatch(match)
    setCopilotOpen(true)
  }

  const resetFilters = () => {
    setQuery('')
    setLocation('All')
    setMode('All')
    setType('All')
    setExperience('All')
    setSalary('All')
    setIndustry('All')
    setRequiredSkill('All')
    setCategory('All categories')
    setMinimumMatch('All')
    setSort('Best Match')
  }

  const handleAnalyzeJd = async (textToAnalyze?: string) => {
    const text = textToAnalyze || jdInputText
    if (!text.trim()) {
      toast({ title: 'Input required', description: 'Please paste a job description to analyze.', tone: 'info' })
      return
    }
    setJdAnalyzing(true)
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      const result = await fetchApi<JobDescriptionAnalysis>(
        '/api/jobs/analyze-jd',
        {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: JSON.stringify({ text }),
        },
        'Job Description Analysis'
      )
      setExtractedJd(result)

      const tempJob: Job = {
        id: `custom-jd-${Date.now()}`,
        title: result.role || 'Analyzed Position',
        company: result.company || 'Target Employer',
        location: result.location || 'Remote / Flexible',
        mode: (result.workMode as any) || 'Remote',
        type: 'Full-time',
        category: 'Software Development',
        description: text,
        requiredSkills: result.requiredSkills,
        preferredSkills: result.preferredSkills,
        experience: result.experienceRequirements || '2+ years',
        postedAt: 'Just now',
        postedDaysAgo: 0,
      }

      const match = calculateJobMatch(tempJob, userSkills, targetRole || result.role, resumeText, userExperience, roadmapSkills)
      setCustomJdMatch(match)
      setSelectedJobForResumeComp(tempJob)

      toast({ title: 'Job description analyzed', description: `Identified ${result.requiredSkills.length} required skills.`, tone: 'success' })
    } catch (error) {
      toast({
        title: 'Analysis failed',
        description: error instanceof Error ? error.message : 'Could not analyze job description.',
        tone: 'error',
      })
    } finally {
      setJdAnalyzing(false)
    }
  }

  const handleSaveJdAnalysis = async () => {
    if (!profileId || !extractedJd || !customJdMatch) return
    try {
      const saved = await saveJobAnalysis(profileId, {
        job_title: extractedJd.role,
        company: extractedJd.company,
        job_description: jdInputText,
        extracted_skills: extractedJd.requiredSkills,
        extracted_responsibilities: extractedJd.responsibilities,
        match_score: customJdMatch.matchPercentage,
        analysis_type: 'jd_analysis',
        result: {
          extractedJd,
          match: {
            matchPercentage: customJdMatch.matchPercentage,
            matchedSkills: customJdMatch.matchedSkills,
            missingSkills: customJdMatch.missingSkills,
            priority: customJdMatch.priority,
          },
        },
      })
      setAnalysesHistory((prev) => [saved, ...prev.filter((p) => p.id !== saved.id)])
      toast({ title: 'Analysis saved', description: 'Saved to your analysis history.', tone: 'success' })
    } catch {
      toast({ title: 'Save failed', description: 'Could not save analysis.', tone: 'error' })
    }
  }

  const handleCompareResume = async (jobToCompare?: Job) => {
    const job = jobToCompare || selectedJobForResumeComp || (customJdMatch?.job) || matches[0]?.job
    if (!job) {
      toast({ title: 'Job required', description: 'Please select or analyze a job first.', tone: 'info' })
      return
    }
    setSelectedJobForResumeComp(job)
    setComparingResume(true)
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      const result = await fetchApi<ResumeJobComparisonResult>(
        '/api/jobs/compare-resume',
        {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: JSON.stringify({
            job: {
              title: job.title,
              company: job.company,
              description: job.description,
              requiredSkills: job.requiredSkills,
              preferredSkills: job.preferredSkills,
            },
          }),
        },
        'Resume Comparison'
      )
      setResumeComparisonResult(result)

      if (profileId) {
        const saved = await saveJobAnalysis(profileId, {
          job_title: job.title,
          company: job.company,
          job_description: job.description,
          extracted_skills: job.requiredSkills,
          extracted_responsibilities: job.responsibilities || [],
          match_score: result.resumeMatchScore,
          analysis_type: 'resume_comparison',
          result: { result, job: { title: job.title, company: job.company } },
        })
        setAnalysesHistory((prev) => [saved, ...prev.filter((p) => p.id !== saved.id)])
      }

      toast({ title: 'Resume scanned', description: `ATS Resume Match: ${result.resumeMatchScore}%`, tone: 'success' })
    } catch (error) {
      toast({
        title: 'Comparison failed',
        description: error instanceof Error ? error.message : 'Could not compare resume.',
        tone: 'error',
      })
    } finally {
      setComparingResume(false)
    }
  }

  const handleDeleteAnalysis = async (id: number) => {
    if (!profileId) return
    try {
      await deleteJobAnalysis(profileId, id)
      setAnalysesHistory((prev) => prev.filter((item) => item.id !== id))
      toast({ title: 'Deleted', description: 'Analysis removed from history.', tone: 'info' })
    } catch {
      toast({ title: 'Error', description: 'Could not delete record.', tone: 'error' })
    }
  }

  // Phase 10 Application Tracker Handlers
  const handleOpenTrackModal = (job?: Job) => {
    if (job) {
      setTrackModalJob(job)
      setTrackForm({
        company_name: job.company,
        job_title: job.title,
        job_url: job.applicationUrl || '',
        location: job.location || 'Remote',
        employment_type: job.type || 'Full-time',
        salary_text: job.salary || '',
        description: job.description || '',
        source: job.source || 'Matched Jobs',
        status: 'saved',
        priority: 'MEDIUM',
        notes: '',
        recruiter_notes: '',
        follow_up_at: '',
      })
    } else {
      setTrackModalJob(null)
      setTrackForm({
        company_name: '',
        job_title: '',
        job_url: '',
        location: 'Remote',
        employment_type: 'Full-time',
        salary_text: '',
        description: '',
        source: 'Manual',
        status: 'saved',
        priority: 'MEDIUM',
        notes: '',
        recruiter_notes: '',
        follow_up_at: '',
      })
    }
    setTrackModalOpen(true)
  }

  const handleSaveCareerApp = async () => {
    if (!profileId) return
    if (!trackForm.company_name.trim() || !trackForm.job_title.trim()) {
      toast({ title: 'Validation Error', description: 'Company name and job title are required.', tone: 'info' })
      return
    }

    try {
      const created = await createCareerApplication(profileId, {
        ...trackForm,
        follow_up_at: trackForm.follow_up_at ? new Date(trackForm.follow_up_at).toISOString() : null
      })
      setCareerApps((prev) => [created, ...prev.filter((p) => p.id !== created.id)])
      setTrackModalOpen(false)
      toast({ title: 'Application Tracked', description: `Saved "${created.job_title}" at ${created.company_name}.`, tone: 'success' })
    } catch (error) {
      toast({
        title: 'Could not track application',
        description: error instanceof Error ? error.message : 'Please check your inputs and try again.',
        tone: 'info',
      })
    }
  }

  const handleUpdateCareerAppStatus = async (id: number, newStatus: CareerJobApplication['status']) => {
    if (!profileId) return
    try {
      const updated = await updateCareerApp(profileId, id, { status: newStatus })
      setCareerApps((prev) => prev.map((app) => (app.id === id ? updated : app)))
      if (activeAppDetail?.id === id) {
        setActiveAppDetail(updated)
        setEditForm((prev) => ({ ...prev, priority: updated.priority }))
      }
      toast({ title: 'Status Updated', description: `Moved to ${newStatus.toUpperCase()}`, tone: 'info' })
    } catch {
      toast({ title: 'Update Error', description: 'Could not update status.', tone: 'error' })
    }
  }

  const handleDeleteCareerApp = async (id: number) => {
    if (!profileId) return
    try {
      await deleteCareerApplication(profileId, id)
      setCareerApps((prev) => prev.filter((app) => app.id !== id))
      if (activeAppDetail?.id === id) setActiveAppDetail(null)
      toast({ title: 'Removed', description: 'Application deleted from tracker.', tone: 'info' })
    } catch {
      toast({ title: 'Error', description: 'Could not delete application.', tone: 'error' })
    }
  }

  const handleSelectAppDetail = async (app: CareerJobApplication) => {
    setActiveAppDetail(app)
    setEditForm({
      job_url: app.job_url || '',
      location: app.location || '',
      salary_text: app.salary_text || '',
      notes: app.notes || '',
      recruiter_notes: app.recruiter_notes || '',
      follow_up_at: app.follow_up_at ? new Date(app.follow_up_at).toISOString().substring(0, 16) : '',
      interview_at: app.interview_at ? new Date(app.interview_at).toISOString().substring(0, 16) : '',
      priority: app.priority
    })
    if (profileId) {
      try {
        const events = await getApplicationEvents(profileId, app.id)
        setAppEvents(events)
      } catch {
        setAppEvents([])
      }
    }
  }

  const handleSaveAppEdits = async () => {
    if (!profileId || !activeAppDetail) return
    try {
      const updated = await updateCareerApp(profileId, activeAppDetail.id, {
        job_url: editForm.job_url,
        location: editForm.location,
        salary_text: editForm.salary_text,
        notes: editForm.notes,
        recruiter_notes: editForm.recruiter_notes,
        follow_up_at: editForm.follow_up_at ? new Date(editForm.follow_up_at).toISOString() : null,
        interview_at: editForm.interview_at ? new Date(editForm.interview_at).toISOString() : null,
        priority: editForm.priority
      })
      setCareerApps((prev) => prev.map((app) => (app.id === activeAppDetail.id ? updated : app)))
      setActiveAppDetail(updated)
      const events = await getApplicationEvents(profileId, activeAppDetail.id)
      setAppEvents(events)
      toast({ title: 'Changes Saved', description: 'Application details updated successfully.', tone: 'success' })
    } catch {
      toast({ title: 'Update Error', description: 'Could not save updates.', tone: 'error' })
    }
  }

  const handleTriggerAiAction = async (type: 'follow_up_message' | 'interview_checklist' | 'resume_suggestions' | 'recruiter_questions') => {
    if (!activeAppDetail) return
    setAiActionType(type)
    setAiActionLoading(true)
    setAiActionModalOpen(true)
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      const result = await fetchApi<ApplicationAiActionResponse>(
        '/api/jobs/application-ai-action',
        {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: JSON.stringify({
            actionType: type,
            companyName: activeAppDetail.company_name,
            jobTitle: activeAppDetail.job_title,
            jobDescription: activeAppDetail.description,
            status: activeAppDetail.status,
          }),
        },
        'AI Career Action'
      )
      setAiActionResult(result)
    } catch (error) {
      toast({ title: 'AI Action Error', description: error instanceof Error ? error.message : 'Could not generate AI action.', tone: 'error' })
    } finally {
      setAiActionLoading(false)
    }
  }

  const getAppMatchPercentage = (app: CareerJobApplication) => {
    const match = matches.find(
      (m) =>
        m.job.title.toLowerCase() === app.job_title.toLowerCase() &&
        m.job.company.toLowerCase() === app.company_name.toLowerCase()
    ) || matches.find((m) => m.job.title.toLowerCase() === app.job_title.toLowerCase())
    if (match) return match.matchPercentage

    // Dynamic fallback when description is present
    if (app.description) {
      const skillsToFind = [...userSkills, ...roadmapSkills]
      const reqSkills = skillsToFind.filter((s) => app.description!.toLowerCase().includes(s.toLowerCase()))
      const tempJob: Job = {
        id: `temp-${app.id}`,
        title: app.job_title,
        company: app.company_name,
        location: app.location || 'Remote',
        mode: (app.location?.toLowerCase().includes('remote') ? 'Remote' : 'On-site') as any,
        type: (app.employment_type || 'Full-time') as any,
        category: 'Software Development',
        description: app.description,
        requiredSkills: reqSkills.length > 0 ? reqSkills : [targetRole || 'Software Engineer'],
        preferredSkills: [],
        experience: '2+ years',
        postedAt: 'Just now',
        postedDaysAgo: 0,
      }
      return calculateJobMatch(tempJob, userSkills, targetRole, resumeText, userExperience, roadmapSkills).matchPercentage
    }
    return 75 // Default matching score fallback
  }

  const getSmartNextAction = (app: CareerJobApplication, matchPct?: number): { action: string; badge: string; type: 'warning' | 'info' | 'success' } => {
    const now = new Date()
    const updatedDate = new Date(app.updated_at)
    const daysSinceUpdate = Math.floor((now.getTime() - updatedDate.getTime()) / (1000 * 60 * 60 * 24))

    // 1. Upcoming Interview Check
    if (app.interview_at) {
      const interviewDate = new Date(app.interview_at)
      const diffTime = interviewDate.getTime() - now.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      if (diffDays >= 0 && diffDays <= 2) {
        return {
          action: `Practice top mock interview questions tailored for ${app.company_name} before your session.`,
          badge: `Interview in ${diffDays === 0 ? 'today' : diffDays === 1 ? 'tomorrow' : `${diffDays} days`}`,
          type: 'warning',
        }
      }
    }

    // 2. Follow-Up Schedule Check
    if (app.follow_up_at) {
      const followUpDate = new Date(app.follow_up_at)
      if (followUpDate.getTime() <= now.getTime()) {
        return {
          action: `Scheduled follow-up date reached. Send a follow-up or update the status.`,
          badge: `Follow-up Overdue`,
          type: 'warning',
        }
      } else {
        const diffDays = Math.ceil((followUpDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        if (diffDays <= 2) {
          return {
            action: `Prepare follow-up message draft to check status with the recruiter.`,
            badge: `Follow-up in ${diffDays} days`,
            type: 'info',
          }
        }
      }
    }

    // 3. Status Rules
    if (app.status === 'applied' && daysSinceUpdate >= 5) {
      return {
        action: `It's been ${daysSinceUpdate} days since you applied. Consider sending a recruiter check-in.`,
        badge: `Stalled Application`,
        type: 'warning',
      }
    }

    if (app.status === 'saved' || app.status === 'interested') {
      const score = matchPct || getAppMatchPercentage(app)
      if (score < 60) {
        return {
          action: `Align skill gaps first. Study recommended roadmap concepts before applying.`,
          badge: `Skill Gap Alert`,
          type: 'warning',
        }
      }
      return {
        action: `Complete resume optimization and scan ATS keyword matches.`,
        badge: `Ready to Prepare`,
        type: 'info',
      }
    }

    if (app.status === 'screening') {
      return {
        action: `Review job requirements and prepare 3 questions to ask the recruiter.`,
        badge: `Prepare for call`,
        type: 'info',
      }
    }

    if (app.status === 'interview' || app.status === 'technical_round') {
      return {
        action: `Start simulated mock interview prep focusing on missing skills.`,
        badge: `Interview Practice`,
        type: 'warning',
      }
    }

    if (app.status === 'final_round') {
      return {
        action: `Conduct final system review and align values with target role company goals.`,
        badge: `Final Prep`,
        type: 'warning',
      }
    }

    if (app.status === 'offer') {
      return {
        action: `Evaluate compensation details and prepare response or counter-offer strategy.`,
        badge: `Offer Pending`,
        type: 'success',
      }
    }

    return {
      action: `Application is currently up to date. Explore additional opportunities.`,
      badge: `Up to Date`,
      type: 'success',
    }
  }

  const appAnalytics = useMemo(() => getCareerApplicationAnalytics(careerApps), [careerApps])


  return (
    <div className="space-y-6">
      <PageHeader
        title="Smart Job Matching & Opportunity Intelligence"
        description={
          targetRole
            ? `AI-ranked opportunities and application intelligence workspace for ${targetRole}.`
            : 'Find roles that match your skills, goals and preferences.'
        }
        eyebrow={
          <Badge variant="outline" className="border-primary/20 text-primary">
            <BriefcaseBusiness className="h-3.5 w-3.5" /> Semantic + deterministic matching
          </Badge>
        }
        actions={
          <div className="flex flex-wrap gap-1.5 rounded-lg border border-border bg-card/60 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('opportunities')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all',
                activeTab === 'opportunities'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Target className="h-3.5 w-3.5" /> Matched Roles
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('analyze-jd')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all',
                activeTab === 'analyze-jd'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <FileText className="h-3.5 w-3.5" /> Analyze Job Description
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('compare-resume')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all',
                activeTab === 'compare-resume'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Sparkles className="h-3.5 w-3.5" /> Compare My Resume
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tracker')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all',
                activeTab === 'tracker'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Kanban className="h-3.5 w-3.5" /> Pipeline ({careerApps.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all',
                activeTab === 'history'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <History className="h-3.5 w-3.5" /> History ({analysesHistory.length})
            </button>
          </div>
        }
      />

      {/* Top Opportunity Intelligence Metrics Bar */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        <Card className="p-3.5 border-primary/10">
          <p className="text-[11px] text-muted-foreground font-medium">Recommended Opportunities</p>
          <p className="mt-1 text-xl font-bold text-cyan-400">{filteredMatches.length}</p>
          <p className="text-[10px] text-muted-foreground">Active inventory matches</p>
        </Card>
        <Card className="p-3.5 border-primary/10">
          <p className="text-[11px] text-muted-foreground font-medium">Saved Jobs</p>
          <p className="mt-1 text-xl font-bold text-violet-400">{savedIds.length}</p>
          <p className="text-[10px] text-muted-foreground">Bookmarked opportunities</p>
        </Card>
        <Card className="p-3.5 border-primary/10">
          <p className="text-[11px] text-muted-foreground font-medium">Applications</p>
          <p className="mt-1 text-xl font-bold text-blue-400">{careerApps.filter(a => !['saved', 'interested'].includes(a.status)).length}</p>
          <p className="text-[10px] text-muted-foreground">Active submissions</p>
        </Card>
        <Card className="p-3.5 border-primary/10">
          <p className="text-[11px] text-muted-foreground font-medium">Interviews</p>
          <p className="mt-1 text-xl font-bold text-violet-400">{appAnalytics.interviewsCount}</p>
          <p className="text-[10px] text-muted-foreground">Rate: {appAnalytics.interviewRatePct}%</p>
        </Card>
        <Card className="p-3.5 border-primary/10">
          <p className="text-[11px] text-muted-foreground font-medium">Offers</p>
          <p className="mt-1 text-xl font-bold text-emerald-400">{appAnalytics.offersCount}</p>
          <p className="text-[10px] text-muted-foreground">Conversion: {appAnalytics.offerRatePct}%</p>
        </Card>
        <Card className="p-3.5 border-primary/10">
          <p className="text-[11px] text-muted-foreground font-medium">Average Match Score</p>
          <p className="mt-1 text-xl font-bold text-primary">{averageMatch}%</p>
          <p className="text-[10px] text-muted-foreground">Verified profile alignment</p>
        </Card>
      </div>

      {skillsLoading ? (
        <Card className="flex min-h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Loading job recommendations" />
        </Card>
      ) : null}

      {skillError ? (
        <div role="alert" className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-xs text-destructive">
          {skillError}
        </div>
      ) : null}

      {providerNotice ? (
        <div className="rounded-lg border border-primary/20 bg-brand-soft p-3 text-xs text-muted-foreground">
          {providerNotice}
        </div>
      ) : null}

      {analysisNotice ? (
        <div className="rounded-lg border border-primary/20 bg-brand-soft p-3 text-xs text-muted-foreground">
          {analysisNotice}
        </div>
      ) : null}

      {applicationNotice ? (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-300">
          {applicationNotice}
        </div>
      ) : null}

      {/* Smart Career Alerts Banner */}
      {smartAlerts.length > 0 && (
        <div className="space-y-2">
          {smartAlerts.map((alert) => (
            <div
              key={alert.id}
              className={cn(
                'flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-xl border p-3.5 text-xs',
                alert.tone === 'success' && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
                alert.tone === 'warning' && 'border-amber-500/30 bg-amber-500/10 text-amber-300',
                alert.tone === 'info' && 'border-primary/30 bg-primary/10 text-primary-foreground'
              )}
            >
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 shrink-0" />
                <span>{alert.text}</span>
              </div>
              {alert.actionText && alert.actionTo && alert.actionTo !== '#' && (
                <Button asChild size="sm" variant="outline" className="h-7 text-xs shrink-0 self-start sm:self-auto">
                  <Link to={alert.actionTo}>{alert.actionText}</Link>
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* TAB 1: MATCHED OPPORTUNITIES */}
      {activeTab === 'opportunities' && (
        <>
          {/* Filters Card */}
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Filter className="h-4 w-4 text-muted-foreground" /> Filter & Sort Roles
              </div>
              {hasActiveFilters && (
                <Button size="sm" variant="ghost" onClick={resetFilters} className="text-xs text-primary">
                  Clear Filters
                </Button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Input
                placeholder="Search jobs, companies or skills..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <Select value={location} onChange={(event) => setLocation(event.target.value)} aria-label="Location">
                <option>All</option>
                {['Bengaluru', 'Hyderabad', 'Pune', 'Mumbai', 'Chennai', 'Remote'].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </Select>
              <Select value={mode} onChange={(event) => setMode(event.target.value)} aria-label="Work mode">
                <option>All</option>
                <option>Remote</option>
                <option>Hybrid</option>
                <option>On-site</option>
              </Select>
              <Select value={type} onChange={(event) => setType(event.target.value)} aria-label="Job type">
                <option>All</option>
                <option>Full-time</option>
                <option>Internship</option>
                <option>Contract</option>
                <option>Part-time</option>
              </Select>
              <Select value={experience} onChange={(event) => setExperience(event.target.value)} aria-label="Experience level">
                <option>All</option>
                <option value="intern">Intern</option>
                <option value="junior">Junior</option>
                <option value="mid">Mid</option>
                <option value="senior">Senior</option>
              </Select>
              <Select value={salary} onChange={(event) => setSalary(event.target.value)} aria-label="Salary">
                <option>All</option>
                <option value="0-10">Up to ₹10 LPA</option>
                <option value="10-20">₹10-20 LPA</option>
                <option value="20+">₹20 LPA+</option>
              </Select>
              <Select value={minimumMatch} onChange={(event) => setMinimumMatch(event.target.value)} aria-label="Minimum match">
                <option value="All">All match scores</option>
                <option value="90">90%+ Excellent Match</option>
                <option value="75">75%+ Strong Match</option>
                <option value="60">60%+ Potential Match</option>
                <option value="40">40%+ Low Match</option>
              </Select>
              <Select value={sort} onChange={(event) => setSort(event.target.value as JobSort)} aria-label="Sort jobs">
                <option>Best Match</option>
                <option>Highest Match</option>
                <option>Recently Posted</option>
                <option>Role A-Z</option>
                <option>Highest Salary</option>
                <option>Lowest Skill Gap</option>
              </Select>
              <Select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Category">
                <option>All categories</option>
                {categoryOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </Select>
            </div>
          </Card>

          {careerAnalysis?.skill_gaps?.length ? (
            <div className="rounded-lg border border-primary/20 bg-brand-soft p-3.5 text-xs text-muted-foreground">
              <span className="font-semibold text-primary mr-1">AI Career Intelligence Tip:</span>
              Focus on closing <b className="text-foreground">{careerAnalysis.skill_gaps.slice(0, 3).map((g) => g.skill).join(', ')}</b> to unlock 90%+ match tiers for {targetRole}.
            </div>
          ) : null}

          {/* Browsing Layout & Overview */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/40 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Browsing:</span>
              <div className="inline-flex rounded-lg border border-border/60 bg-muted/20 p-0.5">
                <Button
                  type="button"
                  size="sm"
                  variant={viewLayout === 'categorized' && !hasActiveFilters ? 'default' : 'ghost'}
                  className="h-7 text-xs px-3"
                  onClick={() => setViewLayout('categorized')}
                  disabled={hasActiveFilters}
                >
                  AI Curated Categories
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={viewLayout === 'all' || hasActiveFilters ? 'default' : 'ghost'}
                  className="h-7 text-xs px-3"
                  onClick={() => setViewLayout('all')}
                >
                  All Matched Roles ({filteredMatches.length})
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{filteredMatches.length}</span> recommended roles for <span className="text-primary font-medium">{targetRole || 'your profile'}</span>
            </p>
          </div>

          {!hasActiveFilters && viewLayout === 'categorized' ? (
            <div className="space-y-8">
              <RecommendationSection
                title="Best Matches"
                matches={bestMatches}
                savedIds={savedIds}
                onSave={toggleSave}
                onView={setActiveMatch}
                onApply={applyNow}
                onTrackApp={handleOpenTrackModal}
                trackedJobIds={careerApps.map((a) => a.job_title)}
                applications={applications}
                initialCount={6}
              />
              <RecommendationSection
                title="Adjacent Roles"
                matches={recommendedForYou}
                savedIds={savedIds}
                onSave={toggleSave}
                onView={setActiveMatch}
                onApply={applyNow}
                onTrackApp={handleOpenTrackModal}
                trackedJobIds={careerApps.map((a) => a.job_title)}
                applications={applications}
                initialCount={6}
              />
              <RecommendationSection
                title="Unlock Higher Match"
                matches={unlockMatches}
                savedIds={savedIds}
                onSave={toggleSave}
                onView={setActiveMatch}
                onApply={applyNow}
                onTrackApp={handleOpenTrackModal}
                trackedJobIds={careerApps.map((a) => a.job_title)}
                applications={applications}
                initialCount={6}
              />
              <RecommendationSection
                title="Explore Opportunities"
                matches={exploreMatches}
                savedIds={savedIds}
                onSave={toggleSave}
                onView={setActiveMatch}
                onApply={applyNow}
                onTrackApp={handleOpenTrackModal}
                trackedJobIds={careerApps.map((a) => a.job_title)}
                applications={applications}
                initialCount={6}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filteredMatches.slice(0, gridPage * GRID_PAGE_SIZE).map((match) => (
                  <JobMatchCard
                    key={match.job.id}
                    match={match}
                    saved={savedIds.includes(match.job.id)}
                    onSave={() => toggleSave(match.job.id)}
                    onView={() => setActiveMatch(match)}
                    onApply={applyNow}
                    onTrackApp={handleOpenTrackModal}
                    isTracked={careerApps.some((a) => a.company_name.toLowerCase() === match.job.company.toLowerCase() && a.job_title.toLowerCase() === match.job.title.toLowerCase())}
                    applicationStatus={applications.find((item) => item.job_id === match.job.id)?.status}
                  />
                ))}
              </div>
              {filteredMatches.length > gridPage * GRID_PAGE_SIZE && (
                <div className="flex justify-center pt-4 pb-2">
                  <Button
                    variant="outline"
                    onClick={() => setGridPage((p) => p + 1)}
                    className="text-xs"
                  >
                    Load More Roles ({filteredMatches.length - gridPage * GRID_PAGE_SIZE} remaining)
                  </Button>
                </div>
              )}
            </div>
          )}

          {liveProviderAvailable && providerHasMore ? (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void loadProviderJobs(providerPage + 1, true)}
                disabled={providerLoading}
              >
                {providerLoading ? 'Loading more jobs...' : 'Load More Jobs'}
              </Button>
            </div>
          ) : null}
        </>
      )}

      {/* TAB 2: ANALYZE JOB DESCRIPTION */}
      {activeTab === 'analyze-jd' && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" /> Paste & Analyze Any Job Description
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Our industrial intelligence parser extracts role requirements, required/preferred skills, responsibilities, and computes instant match against your verified profile.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setJdInputText(`Senior Backend Engineer at CloudScale
Location: Bengaluru / Remote | Full-time
Salary: ₹24-32 LPA

About the Role:
We are seeking an experienced Backend Engineer to lead API architecture and high-throughput microservices.

Key Responsibilities:
- Design, build, and deploy resilient RESTful and gRPC APIs using Python (FastAPI/Django) and Go.
- Architect high-performance database layers with PostgreSQL and Redis caching.
- Build event-driven streaming pipelines using Apache Kafka or RabbitMQ.
- Deploy and orchestrate scalable workloads in AWS with Docker and Kubernetes (EKS).

Requirements:
- 3+ years of production experience in Python, FastAPI, or Go.
- Strong knowledge of relational databases (PostgreSQL/MySQL) and query optimization.
- Experience with Docker, Kubernetes, and AWS cloud infrastructure.
- Solid understanding of CI/CD, Git workflows, and automated testing.

Preferred Qualifications:
- Familiarity with Redis, Kafka, and distributed system design.
- Previous experience in a fast-paced SaaS scale-up.`)
                }}
                className="text-xs shrink-0"
              >
                Load Sample Job Description
              </Button>
            </div>

            <textarea
              rows={8}
              value={jdInputText}
              onChange={(e) => setJdInputText(e.target.value)}
              placeholder="Paste raw job description text from LinkedIn, Indeed, Naukri, or company career page here..."
              className="w-full rounded-lg border border-border bg-background/50 p-3 text-xs leading-relaxed placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">
                {jdInputText.length > 0 ? `${jdInputText.length} characters` : 'Paste text above to start'}
              </span>
              <Button
                onClick={() => void handleAnalyzeJd()}
                disabled={jdAnalyzing || !jdInputText.trim()}
                className="text-xs"
              >
                {jdAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Analyzing with AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-3.5 w-3.5" /> Analyze Job & Calculate Fit
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Analysis Results Display */}
          {extractedJd && customJdMatch && (
            <div className="space-y-6 animate-in fade-in-50">
              <div className="grid gap-6 lg:grid-cols-3">
                {/* Extracted Details Card */}
                <Card className="p-5 lg:col-span-2 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-3">
                    <div>
                      <h4 className="text-lg font-bold text-foreground">{extractedJd.role}</h4>
                      <p className="text-xs text-muted-foreground">{extractedJd.company} · {extractedJd.location} · {extractedJd.workMode}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {extractedJd.experienceRequirements}
                    </Badge>
                  </div>

                  {/* Required Skills */}
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-2">Required Skills ({extractedJd.requiredSkills.length}):</p>
                    <div className="flex flex-wrap gap-1.5">
                      {extractedJd.requiredSkills.map((skill) => {
                        const isMatched = customJdMatch.matchedSkills.includes(skill)
                        return (
                          <Badge
                            key={skill}
                            variant={isMatched ? 'success' : 'secondary'}
                            className={cn('text-xs py-0.5', !isMatched && 'text-amber-300 border-amber-500/30')}
                          >
                            {isMatched ? '✓' : '○'} {skill}
                          </Badge>
                        )
                      })}
                    </div>
                  </div>

                  {/* Preferred Skills */}
                  {extractedJd.preferredSkills.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-foreground mb-2">Preferred Skills:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {extractedJd.preferredSkills.map((skill) => (
                          <Badge key={skill} variant="outline" className="text-xs py-0.5">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Key Responsibilities */}
                  {extractedJd.responsibilities.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-foreground mb-2">Key Responsibilities:</p>
                      <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
                        {extractedJd.responsibilities.slice(0, 4).map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* ATS Keywords */}
                  {extractedJd.keywords.length > 0 && (
                    <div className="border-t border-border/40 pt-3">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">ATS Keywords Extracted:</p>
                      <div className="flex flex-wrap gap-1">
                        {extractedJd.keywords.map((kw) => (
                          <span key={kw} className="rounded bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground font-mono">
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>

                {/* Instant Match & Actions Card */}
                <Card className="p-5 flex flex-col justify-between space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Your Match Score</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-extrabold text-emerald-400">{customJdMatch.matchPercentage}%</span>
                      <Badge variant={customJdMatch.priority === 'HIGH' ? 'success' : customJdMatch.priority === 'MEDIUM' ? 'warning' : 'secondary'} className="text-xs">
                        {customJdMatch.priority} PRIORITY
                      </Badge>
                    </div>
                    <Progress value={customJdMatch.matchPercentage} className="mt-2 h-2" />
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                      {customJdMatch.priorityReason}
                    </p>

                    <div className="mt-4 space-y-2 text-xs border-t border-border/60 pt-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Matched Skills:</span>
                        <strong className="text-emerald-400">{customJdMatch.matchedSkills.length}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Missing Skills:</span>
                        <strong className="text-amber-400">{customJdMatch.missingSkills.length}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Role Fit:</span>
                        <strong className="text-foreground">{customJdMatch.roleMatch}%</strong>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-border/60">
                    <Button
                      onClick={() => void handleSaveJdAnalysis()}
                      className="w-full text-xs"
                      variant="default"
                    >
                      <Bookmark className="mr-1.5 h-3.5 w-3.5" /> Save to Analysis History
                    </Button>
                    <Button
                      onClick={() => {
                        setActiveTab('compare-resume')
                        void handleCompareResume(customJdMatch.job)
                      }}
                      className="w-full text-xs"
                      variant="outline"
                    >
                      <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Compare My Resume for This Role
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: COMPARE RESUME VS JOB */}
      {activeTab === 'compare-resume' && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" /> ATS Resume vs Job Intelligence Scanner
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Performs a deep ATS comparison of your saved resume against any target opportunity to reveal missing keywords, gaps, and ethical improvements.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Select Opportunity to Compare:
                </label>
                <Select
                  value={selectedJobForResumeComp?.id || matches[0]?.job.id}
                  onChange={(e) => {
                    const found = jobs.find((j) => j.id === e.target.value) || (customJdMatch?.job.id === e.target.value ? customJdMatch.job : null)
                    if (found) setSelectedJobForResumeComp(found)
                  }}
                  className="w-full text-xs"
                >
                  {customJdMatch && (
                    <option value={customJdMatch.job.id}>[Custom Pasted JD] {customJdMatch.job.title} - {customJdMatch.job.company}</option>
                  )}
                  {matches.slice(0, 20).map((m) => (
                    <option key={m.job.id} value={m.job.id}>
                      {m.job.title} · {m.job.company} ({m.matchPercentage}% match)
                    </option>
                  ))}
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  onClick={() => void handleCompareResume()}
                  disabled={comparingResume}
                  className="w-full text-xs"
                >
                  {comparingResume ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Scanning Resume with AI...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-3.5 w-3.5" /> Run ATS Resume Comparison
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>

          {/* Resume Comparison Results Display */}
          {resumeComparisonResult && (
            <div className="space-y-6 animate-in fade-in-50">
              {/* ATS Score & Disclaimer */}
              <div className="rounded-xl border border-primary/30 bg-primary/10 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="font-bold text-base text-primary flex items-center gap-2">
                      <Sparkles className="h-5 w-5" /> ATS Resume Match Score
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Target Role: <strong>{selectedJobForResumeComp?.title || targetRole}</strong> at <strong>{selectedJobForResumeComp?.company || 'Target Employer'}</strong>
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-extrabold text-3xl text-emerald-400">{resumeComparisonResult.resumeMatchScore}%</span>
                  </div>
                </div>
                <Progress value={resumeComparisonResult.resumeMatchScore} className="mt-3 h-2" />

                <div className="mt-3.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300 flex items-start gap-2">
                  <Lightbulb className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{resumeComparisonResult.truthfulnessDisclaimer}</span>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Strong Matches */}
                <Card className="p-5 space-y-3">
                  <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                    <Check className="h-4 w-4" /> Strong Resume Matches ({resumeComparisonResult.strongMatches.length})
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {resumeComparisonResult.strongMatches.map((kw) => (
                      <Badge key={kw} variant="success" className="text-xs py-0.5">
                        ✓ {kw}
                      </Badge>
                    ))}
                    {resumeComparisonResult.strongMatches.length === 0 && (
                      <p className="text-xs text-muted-foreground">No direct keyword matches detected. Update resume content.</p>
                    )}
                  </div>
                </Card>

                {/* Missing Keywords */}
                <Card className="p-5 space-y-3">
                  <h4 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                    <CircleDot className="h-4 w-4" /> Missing ATS Keywords ({resumeComparisonResult.missingKeywords.length})
                  </h4>
                  <p className="text-[11px] text-muted-foreground">Add only if you genuinely have this experience:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {resumeComparisonResult.missingKeywords.map((kw) => (
                      <Badge key={kw} variant="secondary" className="text-xs py-0.5 text-amber-300 border-amber-500/20">
                        ○ {kw}
                      </Badge>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Experience Gaps & Tailored Improvements */}
              <div className="grid gap-6 md:grid-cols-2">
                {resumeComparisonResult.experienceGaps.length > 0 && (
                  <Card className="p-5 space-y-3">
                    <h4 className="text-sm font-bold text-foreground">Identified Experience Gaps</h4>
                    <ul className="space-y-2 text-xs text-muted-foreground list-disc list-inside">
                      {resumeComparisonResult.experienceGaps.map((gap, i) => (
                        <li key={i} className="leading-relaxed">{gap}</li>
                      ))}
                    </ul>
                  </Card>
                )}

                <Card className="p-5 space-y-3">
                  <h4 className="text-sm font-bold text-foreground">Tailored Resume Improvement Actions</h4>
                  <ul className="space-y-2 text-xs text-muted-foreground">
                    {resumeComparisonResult.tailoredImprovements.map((imp, i) => (
                      <li key={i} className="flex gap-2 items-start leading-relaxed">
                        <ArrowRight className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                        <span>{imp}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: ANALYSIS HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <History className="h-5 w-5 text-primary" /> Your Job & Resume Analysis History
            </h3>
            <span className="text-xs text-muted-foreground">{analysesHistory.length} saved analyses</span>
          </div>

          {analysesHistory.length === 0 ? (
            <Card className="p-12 text-center">
              <FileText className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
              <h4 className="text-sm font-semibold text-foreground">No analyses saved yet</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                Analyze job descriptions or run resume comparisons to keep an audit trail of your career opportunities.
              </p>
              <Button size="sm" onClick={() => setActiveTab('analyze-jd')} className="text-xs">
                Analyze a Job Description
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {analysesHistory.map((item) => (
                <Card key={item.id} className="p-5 flex flex-col justify-between space-y-4 hover:border-primary/40 transition-colors">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-foreground">{item.job_title}</h4>
                        <p className="text-xs text-muted-foreground">{item.company}</p>
                      </div>
                      <Badge variant={item.analysis_type === 'jd_analysis' ? 'secondary' : 'outline'} className="text-[10px]">
                        {item.analysis_type === 'jd_analysis' ? 'JD Parse' : 'Resume Scan'}
                      </Badge>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xl font-extrabold text-emerald-400">{item.match_score}%</span>
                      <span className="text-[11px] text-muted-foreground">Match Score</span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1">
                      {item.extracted_skills.slice(0, 3).map((s) => (
                        <span key={s} className="rounded bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {s}
                        </span>
                      ))}
                      {item.extracted_skills.length > 3 && (
                        <span className="text-[10px] text-muted-foreground">+{item.extracted_skills.length - 3} more</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
                    <span>{new Date(item.created_at).toLocaleDateString()}</span>
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void handleDeleteAnalysis(item.id)}
                        className="h-7 px-2 text-rose-400 hover:bg-rose-500/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: APPLICATION PIPELINE & CAREER ACTION CENTER */}
      {activeTab === 'tracker' && (
        <div className="space-y-6">
          {/* Real Application Analytics Bar */}
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
            <Card className="p-4 border-primary/10">
              <p className="text-xs text-muted-foreground font-medium">Total Tracked</p>
              <p className="mt-1 text-2xl font-extrabold text-foreground">{appAnalytics.total}</p>
              <p className="text-[10px] text-muted-foreground">{appAnalytics.weeklyCount} this week · {appAnalytics.monthlyCount} this month</p>
            </Card>
            <Card className="p-4 border-primary/10">
              <p className="text-xs text-muted-foreground font-medium">Active Pipeline</p>
              <p className="mt-1 text-2xl font-extrabold text-cyan-400">{appAnalytics.activeCount}</p>
              <p className="text-[10px] text-muted-foreground">Applied → Final Round</p>
            </Card>
            <Card className="p-4 border-primary/10">
              <p className="text-xs text-muted-foreground font-medium">Interviews</p>
              <p className="mt-1 text-2xl font-extrabold text-violet-400">{appAnalytics.interviewsCount}</p>
              <p className="text-[10px] text-muted-foreground">Rate: {appAnalytics.interviewRatePct}%{appAnalytics.avgDaysToInterview != null ? ` · ~${appAnalytics.avgDaysToInterview}d avg` : ''}</p>
            </Card>
            <Card className="p-4 border-primary/10">
              <p className="text-xs text-muted-foreground font-medium">Offers</p>
              <p className="mt-1 text-2xl font-extrabold text-emerald-400">{appAnalytics.offersCount}</p>
              <p className="text-[10px] text-muted-foreground">Conversion: {appAnalytics.offerRatePct}%</p>
            </Card>
            <Card className="p-4 border-primary/10">
              <p className="text-xs text-muted-foreground font-medium">Response Rate</p>
              <p className="mt-1 text-2xl font-extrabold text-primary">{appAnalytics.responseRatePct}%</p>
              <p className="text-[10px] text-muted-foreground">Screening+ responses</p>
            </Card>
            <Card className="p-4 border-primary/10">
              <p className="text-xs text-muted-foreground font-medium">Interested / Saved</p>
              <p className="mt-1 text-2xl font-extrabold text-slate-300">{(appAnalytics.byStatus.interested || 0) + (appAnalytics.byStatus.saved || 0)}</p>
              <p className="text-[10px] text-muted-foreground">Ready to prepare</p>
            </Card>
          </div>

          {/* Sub-Tab Navigation */}
          <div className="flex items-center gap-1 border-b border-border/60 pb-0">
            {([
              { key: 'pipeline' as const, label: 'Kanban Pipeline', icon: <Kanban className="h-3.5 w-3.5" /> },
              { key: 'list' as const, label: 'List View', icon: <BriefcaseBusiness className="h-3.5 w-3.5" /> },
              { key: 'analytics' as const, label: 'Analytics', icon: <Target className="h-3.5 w-3.5" /> },
              { key: 'followups' as const, label: 'Follow-Ups', icon: <Calendar className="h-3.5 w-3.5" /> },
            ]).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setTrackerSubTab(tab.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors border-b-2 -mb-[1px]',
                  trackerSubTab === tab.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
            <div className="flex-1" />
            <Button size="sm" onClick={() => handleOpenTrackModal()} className="text-xs mb-1">
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Track New
            </Button>
          </div>

          {/* KANBAN PIPELINE SUB-TAB */}
          {trackerSubTab === 'pipeline' && (
            <div className="space-y-4">
              {careerApps.length === 0 ? (
                <Card className="p-12 text-center">
                  <BriefcaseBusiness className="mx-auto h-10 w-10 text-muted-foreground/60 mb-3" />
                  <h3 className="text-base font-bold text-foreground">No applications tracked yet</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                    Track your active job search, organize recruiters, and get intelligent next actions for every pipeline stage.
                  </p>
                  <Button size="sm" onClick={() => handleOpenTrackModal()} className="text-xs">
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> Track First Application
                  </Button>
                </Card>
              ) : (
                <>
                  <ApplicationKanban
                    applications={careerApps}
                    onStatusChange={async (appId, newStatus) => {
                      await updateCareerApp(profileId || 0, appId, { status: newStatus })
                      const updated = await getCareerApplications(profileId || 0)
                      setCareerApps(updated)
                    }}
                    onDelete={async (appId) => {
                      await deleteCareerApplication(profileId || 0, appId)
                      const updated = await getCareerApplications(profileId || 0)
                      setCareerApps(updated)
                    }}
                    onSelect={handleSelectAppDetail}
                    loading={false}
                  />

                  {/* Pipeline Analytics Footer */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground border-t border-border/40 pt-4">
                    <span>Rejected: <strong className="text-rose-400">{appAnalytics.byStatus.rejected || 0}</strong></span>
                    <span>Withdrawn: <strong className="text-zinc-400">{appAnalytics.byStatus.withdrawn || 0}</strong></span>
                    <span className="ml-auto">Funnel Conversion: <strong className="text-emerald-400">{appAnalytics.offerRatePct}%</strong></span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* LIST VIEW SUB-TAB */}
          {trackerSubTab === 'list' && (
            <div className="space-y-4">
              {/* Search & Filters */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    placeholder="Search company or role..."
                    value={appSearchQuery}
                    onChange={(e) => setAppSearchQuery(e.target.value)}
                    className="w-full sm:w-64 h-9 text-xs"
                  />
                  <Select value={appStatusFilter} onChange={(e) => setAppStatusFilter(e.target.value)} className="h-9 text-xs w-40">
                    <option value="All">All Statuses</option>
                    <option value="interested">Interested</option>
                    <option value="saved">Saved</option>
                    <option value="applied">Applied</option>
                    <option value="screening">Screening</option>
                    <option value="interview">Interview</option>
                    <option value="technical_round">Technical Round</option>
                    <option value="final_round">Final Round</option>
                    <option value="offer">Offer</option>
                    <option value="rejected">Rejected</option>
                    <option value="withdrawn">Withdrawn</option>
                  </Select>
                  <Select value={appPriorityFilter} onChange={(e) => setAppPriorityFilter(e.target.value)} className="h-9 text-xs w-36">
                    <option value="All">All Priorities</option>
                    <option value="HIGH">HIGH Priority</option>
                    <option value="MEDIUM">MEDIUM Priority</option>
                    <option value="LOW">LOW Priority</option>
                  </Select>
                </div>
              </div>

              {/* Application Cards Grid */}
              {careerApps.length === 0 ? (
                <Card className="p-12 text-center">
                  <BriefcaseBusiness className="mx-auto h-10 w-10 text-muted-foreground/60 mb-3" />
                  <h3 className="text-base font-bold text-foreground">No applications tracked yet</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                    Track your active job search, organize recruiters, and get recommended next actions for every stage.
                  </p>
                  <Button size="sm" onClick={() => handleOpenTrackModal()} className="text-xs">
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> Track First Application
                  </Button>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {careerApps
                    .filter(
                      (app) =>
                        (appStatusFilter === 'All' || app.status === appStatusFilter) &&
                        (appPriorityFilter === 'All' || app.priority === appPriorityFilter) &&
                        (!appSearchQuery ||
                          app.company_name.toLowerCase().includes(appSearchQuery.toLowerCase()) ||
                          app.job_title.toLowerCase().includes(appSearchQuery.toLowerCase()))
                    )
                    .map((app) => {
                      const matchPct = getAppMatchPercentage(app)
                      const smartAction = getSmartNextAction(app, matchPct)
                      return (
                        <Card key={app.id} className="p-5 flex flex-col justify-between space-y-4 hover:border-primary/40 transition-all">
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="text-base font-bold text-foreground truncate">{app.job_title}</h4>
                                <p className="text-xs text-muted-foreground truncate">{app.company_name} · {app.location}</p>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <Badge variant={app.priority === 'HIGH' ? 'success' : app.priority === 'MEDIUM' ? 'warning' : 'secondary'} className="text-[10px]">
                                  {app.priority}
                                </Badge>
                                <span className={cn('text-[10px] font-bold', matchPct >= 75 ? 'text-emerald-400' : matchPct >= 60 ? 'text-cyan-400' : 'text-amber-400')}>
                                  {matchPct}% match
                                </span>
                              </div>
                            </div>

                            <div className="mt-3 flex items-center justify-between gap-2 border-t border-b border-border/40 py-2">
                              <Select
                                value={app.status}
                                onChange={(e) => void handleUpdateCareerAppStatus(app.id, e.target.value as CareerJobApplication['status'])}
                                className="h-7 text-xs font-semibold w-40"
                              >
                                <option value="interested">Interested</option>
                                <option value="saved">Saved</option>
                                <option value="applied">Applied</option>
                                <option value="screening">Screening</option>
                                <option value="interview">Interview</option>
                                <option value="technical_round">Technical Round</option>
                                <option value="final_round">Final Round</option>
                                <option value="offer">Offer</option>
                                <option value="rejected">Rejected</option>
                                <option value="withdrawn">Withdrawn</option>
                              </Select>
                              <span className="text-[11px] text-muted-foreground">{app.source}</span>
                            </div>

                            {/* Smart Next Action */}
                            <div className={cn(
                              'mt-3 rounded-lg border p-2.5 text-xs flex items-start gap-2',
                              smartAction.type === 'warning' ? 'border-amber-500/30 bg-amber-500/5' :
                              smartAction.type === 'success' ? 'border-emerald-500/30 bg-emerald-500/5' :
                              'border-primary/20 bg-primary/5'
                            )}>
                              <Lightbulb className={cn('h-4 w-4 shrink-0 mt-0.5',
                                smartAction.type === 'warning' ? 'text-amber-400' :
                                smartAction.type === 'success' ? 'text-emerald-400' : 'text-primary'
                              )} />
                              <div>
                                <Badge variant={smartAction.type === 'warning' ? 'warning' : smartAction.type === 'success' ? 'success' : 'secondary'} className="text-[9px] mb-1">
                                  {smartAction.badge}
                                </Badge>
                                <p className="leading-relaxed text-[11px] text-muted-foreground">{smartAction.action}</p>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between border-t border-border/60 pt-3 text-xs">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => void handleSelectAppDetail(app)}
                              className="text-xs flex-1 mr-2"
                            >
                              View Details & Actions
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => void handleDeleteCareerApp(app.id)}
                              className="h-8 px-2 text-rose-400 hover:bg-rose-500/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </Card>
                      )
                    })}
                </div>
              )}
            </div>
          )}

          {/* ANALYTICS SUB-TAB */}
          {trackerSubTab === 'analytics' && (
            <div className="space-y-5">
              {/* Visual Funnel */}
              <Card className="p-5 border-primary/20 bg-card/80">
                <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                  <Kanban className="h-4 w-4 text-primary" /> Pipeline Funnel
                </h3>
                <div className="grid gap-2 grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 text-center">
                  {([
                    { label: 'Interested', count: appAnalytics.byStatus.interested || 0, border: 'border-indigo-500/30', bg: 'bg-indigo-500/10', text: 'text-indigo-300' },
                    { label: 'Saved', count: appAnalytics.byStatus.saved || 0, border: 'border-slate-500/30', bg: 'bg-slate-500/10', text: 'text-slate-300' },
                    { label: 'Applied', count: appAnalytics.byStatus.applied || 0, border: 'border-blue-500/30', bg: 'bg-blue-500/10', text: 'text-blue-300' },
                    { label: 'Screening', count: appAnalytics.byStatus.screening || 0, border: 'border-cyan-500/30', bg: 'bg-cyan-500/10', text: 'text-cyan-300' },
                    { label: 'Interview', count: appAnalytics.byStatus.interview || 0, border: 'border-violet-500/30', bg: 'bg-violet-500/10', text: 'text-violet-300' },
                    { label: 'Technical', count: appAnalytics.byStatus.technical_round || 0, border: 'border-amber-500/30', bg: 'bg-amber-500/10', text: 'text-amber-300' },
                    { label: 'Final', count: appAnalytics.byStatus.final_round || 0, border: 'border-orange-500/30', bg: 'bg-orange-500/10', text: 'text-orange-300' },
                    { label: 'Offer', count: appAnalytics.byStatus.offer || 0, border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', text: 'text-emerald-300' },
                  ]).map((item) => (
                    <div key={item.label} className={cn('rounded-lg border p-2.5', item.border, item.bg)}>
                      <p className={cn('text-[9px] font-semibold uppercase tracking-wider', item.text)}>{item.label}</p>
                      <p className="text-lg font-bold text-foreground mt-0.5">{item.count}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between text-xs text-muted-foreground border-t border-border/40 pt-2.5">
                  <div className="flex gap-3">
                    <span>Rejected: <strong className="text-rose-400">{appAnalytics.byStatus.rejected || 0}</strong></span>
                    <span>Withdrawn: <strong className="text-zinc-400">{appAnalytics.byStatus.withdrawn || 0}</strong></span>
                  </div>
                  <span>Overall Conversion: <strong className="text-emerald-400">{appAnalytics.offerRatePct}%</strong></span>
                </div>
              </Card>

              {/* Recharts Bar Chart */}
              {appAnalytics.total > 0 && (
                <Card className="p-5 border-primary/10">
                  <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" /> Pipeline Distribution
                  </h3>
                  <div className="h-64">
                    {(() => {
                      const chartData = [
                        { name: 'Interested', count: appAnalytics.byStatus.interested || 0, fill: '#818cf8' },
                        { name: 'Saved', count: appAnalytics.byStatus.saved || 0, fill: '#94a3b8' },
                        { name: 'Applied', count: appAnalytics.byStatus.applied || 0, fill: '#60a5fa' },
                        { name: 'Screening', count: appAnalytics.byStatus.screening || 0, fill: '#22d3ee' },
                        { name: 'Interview', count: appAnalytics.byStatus.interview || 0, fill: '#a78bfa' },
                        { name: 'Technical', count: appAnalytics.byStatus.technical_round || 0, fill: '#fbbf24' },
                        { name: 'Final', count: appAnalytics.byStatus.final_round || 0, fill: '#fb923c' },
                        { name: 'Offer', count: appAnalytics.byStatus.offer || 0, fill: '#34d399' },
                        { name: 'Rejected', count: appAnalytics.byStatus.rejected || 0, fill: '#f87171' },
                        { name: 'Withdrawn', count: appAnalytics.byStatus.withdrawn || 0, fill: '#71717a' },
                      ]
                      return (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                            <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                            <YAxis allowDecimals={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                            <Tooltip
                              contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                              labelStyle={{ color: 'hsl(var(--foreground))' }}
                            />
                            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                              {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      )
                    })()}
                  </div>
                </Card>
              )}

              {/* Source Distribution */}
              {Object.keys(appAnalytics.bySource).length > 0 && (
                <Card className="p-5 border-primary/10">
                  <h3 className="text-sm font-bold text-foreground mb-3">Applications by Source</h3>
                  <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
                    {Object.entries(appAnalytics.bySource).sort((a, b) => b[1] - a[1]).map(([source, count]) => (
                      <div key={source} className="rounded-lg border border-border/40 bg-muted/10 p-3 text-center">
                        <p className="text-lg font-bold text-foreground">{count}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{source}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* FOLLOW-UPS SUB-TAB */}
          {trackerSubTab === 'followups' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" /> Upcoming Follow-Ups & Interviews
                </h3>
              </div>
              {(() => {
                const now = new Date()
                const upcomingFollowUps = careerApps
                  .filter((a) => a.follow_up_at || a.interview_at)
                  .map((a) => {
                    const followDate = a.follow_up_at ? new Date(a.follow_up_at) : null
                    const intDate = a.interview_at ? new Date(a.interview_at) : null
                    const nextDate = [followDate, intDate].filter(Boolean).sort((x, y) => (x as Date).getTime() - (y as Date).getTime())[0] as Date
                    const isOverdue = nextDate.getTime() < now.getTime()
                    const daysUntil = Math.ceil((nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                    return { app: a, nextDate, isOverdue, daysUntil, type: nextDate === followDate ? 'follow_up' : 'interview' }
                  })
                  .sort((a, b) => a.nextDate.getTime() - b.nextDate.getTime())

                if (upcomingFollowUps.length === 0) {
                  return (
                    <Card className="p-10 text-center">
                      <Calendar className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-foreground">No follow-ups or interviews scheduled</p>
                      <p className="text-xs text-muted-foreground mt-1">Set follow-up dates on your tracked applications to see them here.</p>
                    </Card>
                  )
                }
                return (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {upcomingFollowUps.map(({ app, nextDate, isOverdue, daysUntil, type }) => (
                      <Card
                        key={app.id}
                        className={cn('p-4 cursor-pointer hover:border-primary/40 transition-colors', isOverdue ? 'border-rose-500/30' : 'border-border')}
                        onClick={() => void handleSelectAppDetail(app)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-bold text-foreground truncate">{app.job_title}</p>
                            <p className="text-xs text-muted-foreground">{app.company_name}</p>
                          </div>
                          <Badge variant={isOverdue ? 'danger' : daysUntil <= 2 ? 'warning' : 'secondary'} className="text-[9px] shrink-0">
                            {isOverdue ? 'Overdue' : daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil}d`}
                          </Badge>
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{type === 'interview' ? 'Interview' : 'Follow-up'}: {nextDate.toLocaleString()}</span>
                        </div>
                        <div className="mt-2">
                          <Badge variant="outline" className="text-[9px]">{app.status.replace(/_/g, ' ').toUpperCase()}</Badge>
                        </div>
                      </Card>
                    ))}
                  </div>
                )
              })()}
            </div>
          )}
        </div>
      )}

      {/* JOB DETAILS & JOB READINESS MODAL */}
      <Modal
        open={Boolean(activeMatch)}
        onOpenChange={(open) => !open && setActiveMatch(null)}
        title={activeMatch?.job.title ?? 'Job details'}
        description={activeMatch ? `${activeMatch.job.company} · ${activeMatch.job.location}` : undefined}
        size="3xl"
        footer={<Button variant="outline" onClick={() => setActiveMatch(null)}>Back to Jobs</Button>}
      >
        {activeMatch ? (
          <JobDetails
            match={activeMatch}
            saved={savedIds.includes(activeMatch.job.id)}
            onSave={() => void toggleSave(activeMatch.job.id)}
            onApply={applyNow}
            onTrack={trackApplication}
            status={applications.find((item) => item.job_id === activeMatch.job.id)?.status}
            onPrepare={(match) => openApplicationCopilot(match)}
          />
        ) : null}
      </Modal>

      {/* PHASE 10: TRACK APPLICATION MODAL */}
      <Modal
        open={trackModalOpen}
        onOpenChange={(open) => setTrackModalOpen(open)}
        title={trackModalJob ? `Track Application: ${trackModalJob.title}` : 'Track New Application'}
        description={trackModalJob ? `${trackModalJob.company} · ${trackModalJob.location}` : 'Add a new opportunity to your career pipeline'}
        size="2xl"
      >
        <div className="space-y-4 text-xs">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Company Name *</label>
              <Input
                value={trackForm.company_name}
                onChange={(e) => setTrackForm({ ...trackForm, company_name: e.target.value })}
                placeholder="e.g. Google, Amazon, Scale AI"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Job Title *</label>
              <Input
                value={trackForm.job_title}
                onChange={(e) => setTrackForm({ ...trackForm, job_title: e.target.value })}
                placeholder="e.g. Senior Frontend Engineer"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Job URL</label>
              <Input
                value={trackForm.job_url}
                onChange={(e) => setTrackForm({ ...trackForm, job_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Location</label>
              <Input
                value={trackForm.location}
                onChange={(e) => setTrackForm({ ...trackForm, location: e.target.value })}
                placeholder="Bengaluru / Remote"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Status</label>
              <Select
                value={trackForm.status}
                onChange={(e) => setTrackForm({ ...trackForm, status: e.target.value as any })}
              >
                <option value="interested">Interested</option>
                <option value="saved">Saved</option>
                <option value="applied">Applied</option>
                <option value="screening">Screening</option>
                <option value="interview">Interview</option>
                <option value="technical_round">Technical Round</option>
                <option value="final_round">Final Round</option>
                <option value="offer">Offer</option>
                <option value="rejected">Rejected</option>
                <option value="withdrawn">Withdrawn</option>
              </Select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Priority</label>
              <Select
                value={trackForm.priority}
                onChange={(e) => setTrackForm({ ...trackForm, priority: e.target.value as any })}
              >
                <option value="HIGH">HIGH Priority</option>
                <option value="MEDIUM">MEDIUM Priority</option>
                <option value="LOW">LOW Priority</option>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Salary Text</label>
              <Input
                value={trackForm.salary_text}
                onChange={(e) => setTrackForm({ ...trackForm, salary_text: e.target.value })}
                placeholder="e.g. ₹20-28 LPA"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Source</label>
              <Input
                value={trackForm.source}
                onChange={(e) => setTrackForm({ ...trackForm, source: e.target.value })}
                placeholder="LinkedIn / Referral / CareerAI"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Recruiter Notes / Contact Info</label>
              <Input
                value={trackForm.recruiter_notes}
                onChange={(e) => setTrackForm({ ...trackForm, recruiter_notes: e.target.value })}
                placeholder="Name, email, phone, referral name..."
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Next Follow-Up Date</label>
              <input
                type="datetime-local"
                value={trackForm.follow_up_at}
                onChange={(e) => setTrackForm({ ...trackForm, follow_up_at: e.target.value })}
                className="w-full h-10 rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Job Description / Requirements</label>
            <textarea
              rows={4}
              value={trackForm.description}
              onChange={(e) => setTrackForm({ ...trackForm, description: e.target.value })}
              placeholder="Paste key responsibilities or job description text..."
              className="w-full rounded-lg border border-border bg-background p-2.5 text-xs outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
            <Button variant="outline" size="sm" onClick={() => setTrackModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => void handleSaveCareerApp()}>
              Track Application
            </Button>
          </div>
        </div>
      </Modal>

      {/* PHASE 15: APPLICATION DETAILS SLIDE-OVER MODAL */}
      <Modal
        open={Boolean(activeAppDetail)}
        onOpenChange={(open) => !open && setActiveAppDetail(null)}
        title={activeAppDetail ? `${activeAppDetail.job_title} at ${activeAppDetail.company_name}` : 'Application Details'}
        description={activeAppDetail ? `${activeAppDetail.location} · ${activeAppDetail.employment_type || 'Full-time'}` : undefined}
        size="3xl"
      >
        {activeAppDetail && (
          <div className="space-y-6 text-xs">
            {/* Header Status & Smart Next Action */}
            <div className="rounded-xl border border-primary/30 bg-primary/10 p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Current Application Stage</span>
                  <div className="mt-1 flex items-center gap-2">
                    <Select
                      value={activeAppDetail.status}
                      onChange={(e) => void handleUpdateCareerAppStatus(activeAppDetail.id, e.target.value as any)}
                      className="h-8 text-xs font-bold w-44"
                    >
                      <option value="interested">Interested</option>
                      <option value="saved">Saved</option>
                      <option value="applied">Applied</option>
                      <option value="screening">Screening</option>
                      <option value="interview">Interview</option>
                      <option value="technical_round">Technical Round</option>
                      <option value="final_round">Final Round</option>
                      <option value="offer">Offer</option>
                      <option value="rejected">Rejected</option>
                      <option value="withdrawn">Withdrawn</option>
                    </Select>
                    <Badge variant={activeAppDetail.priority === 'HIGH' ? 'success' : activeAppDetail.priority === 'MEDIUM' ? 'warning' : 'secondary'}>
                      {activeAppDetail.priority} PRIORITY
                    </Badge>
                    <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', getAppMatchPercentage(activeAppDetail) >= 75 ? 'bg-emerald-500/20 text-emerald-400' : getAppMatchPercentage(activeAppDetail) >= 60 ? 'bg-cyan-500/20 text-cyan-400' : 'bg-amber-500/20 text-amber-400')}>
                      {getAppMatchPercentage(activeAppDetail)}% Match
                    </span>
                  </div>
                </div>
                <div className="text-right text-[11px] text-muted-foreground">
                  <p>Applied: <strong>{activeAppDetail.applied_at ? new Date(activeAppDetail.applied_at).toLocaleDateString() : 'Not applied yet'}</strong></p>
                  <p className="mt-0.5">Source: <strong>{activeAppDetail.source || 'Manual'}</strong></p>
                  {activeAppDetail.salary_text && <p className="mt-0.5">Salary: <strong>{activeAppDetail.salary_text}</strong></p>}
                </div>
              </div>

              {/* Smart Next Action */}
              {(() => {
                const smartAction = getSmartNextAction(activeAppDetail)
                return (
                  <div className={cn(
                    'rounded-lg border p-3 text-xs flex items-start gap-2.5',
                    smartAction.type === 'warning' ? 'border-amber-500/30 bg-amber-500/5' :
                    smartAction.type === 'success' ? 'border-emerald-500/30 bg-emerald-500/5' :
                    'border-border/80 bg-background/80'
                  )}>
                    <Lightbulb className={cn('h-4 w-4 shrink-0 mt-0.5',
                      smartAction.type === 'warning' ? 'text-amber-400' :
                      smartAction.type === 'success' ? 'text-emerald-400' : 'text-primary'
                    )} />
                    <div>
                      <Badge variant={smartAction.type === 'warning' ? 'warning' : smartAction.type === 'success' ? 'success' : 'secondary'} className="text-[9px] mb-1">
                        {smartAction.badge}
                      </Badge>
                      <p className="font-bold text-foreground">Smart Next Action:</p>
                      <p className="text-muted-foreground mt-0.5 leading-relaxed">{smartAction.action}</p>
                    </div>
                  </div>
                )
              })()}
            </div>

            {/* Editable Application Details */}
            <Card className="p-4 border-border">
              <p className="font-bold text-foreground mb-3 flex items-center gap-1.5 text-sm">
                <FileText className="h-4 w-4 text-primary" /> Application Details
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Job URL</label>
                  <Input
                    value={editForm.job_url}
                    onChange={(e) => setEditForm({ ...editForm, job_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Location</label>
                  <Input
                    value={editForm.location}
                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                    placeholder="City / Remote"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Salary</label>
                  <Input
                    value={editForm.salary_text}
                    onChange={(e) => setEditForm({ ...editForm, salary_text: e.target.value })}
                    placeholder="e.g. ₹20-28 LPA"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Priority</label>
                  <Select value={editForm.priority} onChange={(e) => setEditForm({ ...editForm, priority: e.target.value as any })}>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </Select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Interview Date</label>
                  <input
                    type="datetime-local"
                    value={editForm.interview_at}
                    onChange={(e) => setEditForm({ ...editForm, interview_at: e.target.value })}
                    className="w-full h-10 rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Next Follow-Up</label>
                  <input
                    type="datetime-local"
                    value={editForm.follow_up_at}
                    onChange={(e) => setEditForm({ ...editForm, follow_up_at: e.target.value })}
                    className="w-full h-10 rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none"
                  />
                </div>
              </div>
              <div className="mt-3">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  placeholder="Personal notes about this application..."
                  className="w-full rounded-lg border border-border bg-background p-2.5 text-xs outline-none"
                />
              </div>
              <div className="mt-3">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Recruiter Notes / Contact Info</label>
                <textarea
                  rows={2}
                  value={editForm.recruiter_notes}
                  onChange={(e) => setEditForm({ ...editForm, recruiter_notes: e.target.value })}
                  placeholder="Recruiter name, email, phone, referral details..."
                  className="w-full rounded-lg border border-border bg-background p-2.5 text-xs outline-none"
                />
              </div>
              <div className="flex justify-end mt-3">
                <Button size="sm" onClick={() => void handleSaveAppEdits()} className="text-xs">
                  Save Changes
                </Button>
              </div>
            </Card>

            {/* AI Career Action Trigger Buttons */}
            <Card className="p-4 bg-muted/20 border-border">
              <p className="font-bold text-foreground mb-2 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-primary" /> AI Career Action Generator
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => void handleTriggerAiAction('follow_up_message')} className="text-xs">
                  Generate Follow-Up Message
                </Button>
                <Button size="sm" variant="outline" onClick={() => void handleTriggerAiAction('interview_checklist')} className="text-xs">
                  Generate Interview Checklist
                </Button>
                <Button size="sm" variant="outline" onClick={() => void handleTriggerAiAction('resume_suggestions')} className="text-xs">
                  Resume Bullet Suggestions
                </Button>
                <Button size="sm" variant="outline" onClick={() => void handleTriggerAiAction('recruiter_questions')} className="text-xs">
                  Recruiter Questions to Ask
                </Button>
              </div>
            </Card>

            {/* Preparation CTAs */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="p-4 border-emerald-500/20 bg-emerald-500/5 flex flex-col justify-between">
                <div>
                  <p className="font-bold text-emerald-400 mb-1 flex items-center gap-1.5 text-sm">
                    <CheckCircle2 className="h-4 w-4" /> Job-Specific Resume Prep
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Review matching keywords and tailor your bullet points for {activeAppDetail.job_title}.
                  </p>
                </div>
                <Button asChild size="sm" variant="outline" className="mt-3 text-xs w-full">
                  <Link to="/resume-analyzer">Scan Resume for Role</Link>
                </Button>
              </Card>

              <Card className="p-4 border-violet-500/20 bg-violet-500/5 flex flex-col justify-between">
                <div>
                  <p className="font-bold text-violet-400 mb-1 flex items-center gap-1.5 text-sm">
                    <Sparkles className="h-4 w-4" /> Prepare for Interview
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Practice custom AI mock interview questions pre-filled with {activeAppDetail.company_name} context.
                  </p>
                </div>
                <Button asChild size="sm" className="mt-3 text-xs w-full">
                  <Link to={`/interviews?jobRole=${encodeURIComponent(activeAppDetail.job_title)}&company=${encodeURIComponent(activeAppDetail.company_name)}`}>
                    Start Practice Interview
                  </Link>
                </Button>
              </Card>
            </div>

            {/* Activity Timeline */}
            <Card className="p-5">
              <p className="font-bold text-foreground text-sm mb-3 flex items-center gap-2">
                <History className="h-4 w-4 text-primary" /> Activity Timeline
              </p>
              <div className="space-y-3">
                {appEvents.map((evt) => {
                  const iconMap: Record<string, React.ReactNode> = {
                    status_change: <ArrowRight className="h-3.5 w-3.5 text-cyan-400" />,
                    note: <MessageSquareText className="h-3.5 w-3.5 text-amber-400" />,
                    follow_up: <Calendar className="h-3.5 w-3.5 text-violet-400" />,
                    interview_scheduled: <Users className="h-3.5 w-3.5 text-emerald-400" />,
                  }
                  return (
                    <div key={evt.id} className="flex items-start gap-3 text-xs border-l-2 border-primary/40 pl-3">
                      <div className="mt-0.5">{iconMap[evt.event_type] || <CircleDot className="h-3.5 w-3.5 text-primary" />}</div>
                      <div>
                        <p className="font-semibold text-foreground">{evt.event_type.replace(/_/g, ' ').toUpperCase()}</p>
                        {evt.note && <p className="text-muted-foreground text-[11px] mt-0.5">{evt.note}</p>}
                        <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(evt.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  )
                })}
                {appEvents.length === 0 && (
                  <p className="text-xs text-muted-foreground">Created on {new Date(activeAppDetail.created_at).toLocaleDateString()}</p>
                )}
              </div>
            </Card>
          </div>
        )}
      </Modal>

      {/* PHASE 10: AI CAREER ACTION OUTPUT MODAL */}
      <Modal
        open={aiActionModalOpen}
        onOpenChange={(open) => setAiActionModalOpen(open)}
        title="AI Career Action Result"
        description="Generated server-side with your verified career context"
        size="2xl"
      >
        {aiActionLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-xs">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
            <p className="font-semibold text-foreground">Generating personalized action asset with AI...</p>
          </div>
        ) : aiActionResult ? (
          <div className="space-y-4 text-xs">
            {aiActionResult.suggestedSubject && (
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Suggested Subject Line:</p>
                <Input value={aiActionResult.suggestedSubject} readOnly className="text-xs font-semibold" />
              </div>
            )}

            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Generated Output:</p>
              <div className="rounded-lg border border-border bg-muted/20 p-3.5 whitespace-pre-line text-xs text-foreground leading-relaxed">
                {aiActionResult.content}
              </div>
            </div>

            {aiActionResult.bulletPoints && aiActionResult.bulletPoints.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Key Action Takeaways:</p>
                <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
                  {aiActionResult.bulletPoints.map((bp, i) => (
                    <li key={i}>{bp}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      {/* PHASE 16: APPLICATION COPILOT MODAL */}
      <Modal
        open={copilotOpen}
        onOpenChange={(open) => setCopilotOpen(open)}
        size="5xl"
        title={copilotJobMatch ? `Application Copilot: ${copilotJobMatch.job.title} at ${copilotJobMatch.job.company}` : 'Application Copilot'}
        description="Comprehensive application readiness, AI resume tailoring, cover letter & interview preparation workspace"
      >
        {copilotJobMatch ? (
          <ApplicationCopilot
            job={copilotJobMatch.job}
            jobMatch={copilotJobMatch}
            userSkills={userSkills.map((s) => ({ name: s, proficiency: 70 }))}
            resumeText={resumeText}
            careerGoal={targetRole ? { target_role: targetRole } : null}
            hasProjects={userProjects && userProjects.length > 0}
            existingApplication={careerApps.find((app) => app.job_title === copilotJobMatch.job.title && app.company_name === copilotJobMatch.job.company) || null}
            onApplyNow={() => {
              void applyNow(copilotJobMatch.job.id)
              setCopilotOpen(false)
            }}
            onClose={() => setCopilotOpen(false)}
          />
        ) : null}
      </Modal>
    </div>
  )
}

function RecommendationSection({
  title,
  matches,
  savedIds,
  onSave,
  onView,
  onApply,
  onTrackApp,
  trackedJobIds = [],
  applications,
  initialCount = 6,
}: {
  title: string
  matches: JobMatch[]
  savedIds: string[]
  onSave: (id: string) => void
  onView: (match: JobMatch) => void
  onApply: (id: string, url?: string) => Promise<void>
  onTrackApp?: (job: Job) => void
  trackedJobIds?: string[]
  applications: JobApplication[]
  initialCount?: number
}) {
  const [expanded, setExpanded] = useState(false)
  if (!matches.length) return null

  const displayedMatches = expanded ? matches : matches.slice(0, initialCount)
  const hasMore = matches.length > initialCount

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold">{title}</h2>
          <Badge variant="secondary" className="text-xs font-medium">
            {matches.length} roles
          </Badge>
        </div>
        {hasMore && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-primary hover:text-primary/80"
          >
            {expanded ? 'Show Less' : `View All ${matches.length} Roles`}
          </Button>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {displayedMatches.map((match) => (
          <JobMatchCard
            key={`${title}-${match.job.id}`}
            match={match}
            saved={savedIds.includes(match.job.id)}
            onSave={() => onSave(match.job.id)}
            onView={() => onView(match)}
            onApply={onApply}
            onTrackApp={onTrackApp}
            isTracked={trackedJobIds.includes(match.job.title)}
            applicationStatus={applications.find((item) => item.job_id === match.job.id)?.status}
          />
        ))}
      </div>
      {hasMore && !expanded && (
        <div className="flex justify-center pt-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setExpanded(true)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Show {matches.length - initialCount} More {title} Roles
          </Button>
        </div>
      )}
    </section>
  )
}

function JobMatchCard({
  match,
  saved,
  onSave,
  onView,
  onApply,
  onTrackApp,
  isTracked,
  applicationStatus,
}: {
  match: JobMatch
  saved: boolean
  onSave: () => void
  onView: () => void
  onApply?: (id: string, url?: string) => Promise<void>
  onTrackApp?: (job: Job) => void
  isTracked?: boolean
  applicationStatus?: string
}) {
  const [whyOpen, setWhyOpen] = useState(false)
  const initials = match.job.company
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <Card className="flex h-full flex-col p-5 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lift">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white shadow-glow">
            {initials}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold">{match.job.title}</h2>
            <p className="truncate text-sm text-muted-foreground">{match.job.company}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onSave}
          aria-label={saved ? 'Remove saved job' : 'Save job'}
          className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
        >
          <Bookmark className={saved ? 'h-4 w-4 fill-current text-primary' : 'h-4 w-4'} />
        </button>
      </div>

      {/* Priority, Confidence & Roadmap Badges */}
      <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
        <Badge
          variant={match.priority === 'HIGH' ? 'success' : match.priority === 'MEDIUM' ? 'warning' : 'secondary'}
          className="text-[10px] py-0 font-semibold"
        >
          {match.priority} PRIORITY
        </Badge>
        <Badge
          variant={match.matchPercentage >= 75 ? 'secondary' : match.matchPercentage >= 55 ? 'outline' : 'outline'}
          className="text-[10px] py-0"
        >
          {match.matchPercentage >= 75 ? 'HIGH' : match.matchPercentage >= 55 ? 'MEDIUM' : 'LOW'} CONFIDENCE
        </Badge>
        {match.roadmapAlignment?.isAligned && (
          <Badge variant="outline" className="text-[10px] py-0 text-cyan-400 border-cyan-500/30">
            Roadmap Aligned
          </Badge>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5 text-cyan-400" />
          {match.job.location}
        </span>
        <span>{match.job.mode} · {match.job.type}</span>
      </div>

      <div className="mt-3.5 flex items-center justify-between gap-2">
        <div>
          <span className="text-xl font-bold text-emerald-400">{match.matchPercentage}%</span>
          <span className="ml-2 text-xs font-semibold text-muted-foreground">{matchLabel(match.matchPercentage)}</span>
        </div>
        <span className="text-xs text-muted-foreground">{match.job.postedAt}</span>
      </div>
      <Progress value={match.matchPercentage} className="mt-2 h-1.5" />

      {/* Description */}
      <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
        {match.job.description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()}
      </p>

      {/* Strong match vs Skill Gap badges */}
      <div className="mt-3 space-y-1.5">
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[10px] text-muted-foreground font-semibold mr-1">Strong Match:</span>
          {match.matchedSkills.slice(0, 3).map((skill) => (
            <Badge key={skill} variant="success" className="text-[10px] py-0">
              <Check className="h-2.5 w-2.5 mr-0.5" /> {skill}
            </Badge>
          ))}
          {match.matchedSkills.length === 0 && <span className="text-[10px] text-muted-foreground">Building alignment</span>}
        </div>

        {match.missingSkills.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[10px] text-muted-foreground font-semibold mr-1">Skill Gap:</span>
            {match.missingSkills.slice(0, 2).map((skill) => (
              <Badge key={skill} variant="secondary" className="text-[10px] py-0 text-amber-400 border-amber-500/20">
                {skill}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Why this job accordion */}
      <div className="mt-3">
        <button
          type="button"
          onClick={() => setWhyOpen(!whyOpen)}
          className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
        >
          {whyOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          Why this job recommendation?
        </button>
        {whyOpen && (
          <div className="mt-2 rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-[11px] text-muted-foreground space-y-1.5 animate-in fade-in-50">
            <p className="font-semibold text-foreground text-[11px]">
              Recommendation Score: {match.matchPercentage}% ({match.matchPercentage >= 75 ? 'High' : match.matchPercentage >= 55 ? 'Medium' : 'Low'} Confidence)
            </p>
            {match.reasons.slice(0, 2).map((r) => (
              <p key={r} className="flex gap-1.5">
                <Star className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                <span>{r}</span>
              </p>
            ))}
            {match.missingSkills.length > 0 && (
              <p className="text-amber-400/90 text-[10px] pt-1 border-t border-border/40">
                <strong>Recommended prep: </strong>Review {match.missingSkills[0]} before submitting application.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Dimensional Breakdown & Action CTAs */}
      <div className="mt-auto space-y-2 border-t border-border/70 pt-3 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-muted-foreground">
          <span>Role: <strong className="text-foreground">{match.roleMatch}%</strong></span>
          <span>Skills: <strong className="text-foreground">{match.skillMatch}%</strong></span>
          <span>Exp: <strong className="text-foreground">{match.experienceMatch}%</strong></span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pt-2">
          <Button size="sm" onClick={onView} className="text-xs flex-1">
            View Details
          </Button>
          {onTrackApp ? (
            <Button
              size="sm"
              variant={isTracked ? 'secondary' : 'outline'}
              onClick={() => onTrackApp(match.job)}
              className="text-xs"
            >
              {isTracked ? 'Tracked ✓' : '+ Track App'}
            </Button>
          ) : null}
          {onApply ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => void onApply(match.job.id, match.job.applicationUrl)}
              className="text-xs"
            >
              {applicationStatus === 'applied' ? 'Applied ✓' : 'Apply'}
            </Button>
          ) : null}
          {match.missingSkills.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              asChild
              className="text-xs text-amber-400 hover:text-amber-300"
            >
              <Link to={`/skills?jobRole=${encodeURIComponent(match.job.title)}&skill=${encodeURIComponent(match.missingSkills[0] || '')}`}>
                Close Gap
              </Link>
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            asChild
            className="text-xs text-primary"
          >
            <Link to={`/interviews?jobRole=${encodeURIComponent(match.job.title)}`}>
              Prep
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  )
}

function JobDetails({
  match,
  saved,
  onSave,
  onApply,
  onTrack,
  status,
  onPrepare,
}: {
  match: JobMatch
  saved: boolean
  onSave: () => void
  onApply: (id: string, url?: string) => Promise<void>
  onTrack: (id: string, status: ApplicationStatus) => Promise<void>
  status?: string
  onPrepare?: (match: JobMatch) => void
}) {
  const { job } = match
  const [detailTab, setDetailTab] = useState<'overview' | 'coach' | 'optimize'>('overview')

  // AI Job Coach State
  const [coachData, setCoachData] = useState<JobCoachPreparation | null>(null)
  const [coachLoading, setCoachLoading] = useState(false)
  const [coachError, setCoachError] = useState('')

  // Resume Optimizer State
  const [resumeData, setResumeData] = useState<JobResumeOptimization | null>(null)
  const [resumeLoading, setResumeLoading] = useState(false)
  const [resumeError, setResumeError] = useState('')

  const fetchJobCoach = async () => {
    setCoachLoading(true)
    setCoachError('')
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      const result = await fetchApi<JobCoachPreparation>(
        '/api/jobs/coach',
        {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: JSON.stringify({
            job: {
              title: job.title,
              company: job.company,
              description: job.description,
              requiredSkills: job.requiredSkills,
              preferredSkills: job.preferredSkills,
            },
          }),
        },
        'Job Coach'
      )
      setCoachData(result)
    } catch (err) {
      setCoachError(err instanceof Error ? err.message : 'Could not generate job coach preparation.')
    } finally {
      setCoachLoading(false)
    }
  }

  const fetchResumeOptimizer = async () => {
    setResumeLoading(true)
    setResumeError('')
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      const result = await fetchApi<JobResumeOptimization>(
        '/api/jobs/optimize-resume',
        {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: JSON.stringify({
            job: {
              title: job.title,
              company: job.company,
              description: job.description,
              requiredSkills: job.requiredSkills,
              preferredSkills: job.preferredSkills,
            },
          }),
        },
        'Resume Optimizer'
      )
      setResumeData(result)
    } catch (err) {
      setResumeError(err instanceof Error ? err.message : 'Could not optimize resume for job.')
    } finally {
      setResumeLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Modal Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-border/80 pb-1">
        <button
          type="button"
          onClick={() => setDetailTab('overview')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all',
            detailTab === 'overview'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <Zap className="h-4 w-4" /> Overview & Match
        </button>
        <button
          type="button"
          onClick={() => {
            setDetailTab('coach')
            if (!coachData && !coachLoading) void fetchJobCoach()
          }}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all',
            detailTab === 'coach'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <Sparkles className="h-4 w-4" /> AI Job Coach
        </button>
        <button
          type="button"
          onClick={() => {
            setDetailTab('optimize')
            if (!resumeData && !resumeLoading) void fetchResumeOptimizer()
          }}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all',
            detailTab === 'optimize'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <FileText className="h-4 w-4" /> Optimize Resume
        </button>
      </div>

      {/* TAB 1: OVERVIEW & MATCH */}
      {detailTab === 'overview' && (
        <div className="space-y-6">
          {/* Section 1: Overall Match Score & Category */}
          <div className="rounded-xl border border-primary/30 bg-primary/10 p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="font-bold text-base text-primary flex items-center gap-2">
                  <Zap className="h-5 w-5" /> Overall Job Match
                </span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Calculated against your verified skills, resume, target role, and career preferences.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={match.matchCategory === 'Excellent Match' ? 'success' : match.matchCategory === 'Strong Match' ? 'secondary' : match.matchCategory === 'Potential Match' ? 'warning' : 'danger'} className="text-xs py-1 px-3">
                  {match.matchCategory}
                </Badge>
                <span className="font-extrabold text-3xl text-emerald-400">{match.matchPercentage}%</span>
              </div>
            </div>
            <Progress value={match.matchPercentage} className="mt-3 h-2.5" />
          </div>

          {/* Phase 16: Prepare Me for This Job CTA */}
          {onPrepare && (
            <div className="rounded-xl border border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-6 w-6 text-cyan-400 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-cyan-300 text-base">Prepare Me for This Job</p>
                    <p className="text-xs text-cyan-200/70 mt-1">Get a personalized application strategy, optimize your resume, and prepare for interviews</p>
                  </div>
                </div>
                <Button
                  onClick={() => onPrepare(match)}
                  className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border-0 flex-shrink-0"
                >
                  Launch Copilot →
                </Button>
              </div>
            </div>
          )}

          {/* Section 2: 7-Factor Weighted Breakdown */}
          <div className="rounded-xl border border-border/80 bg-muted/20 p-5">
            <p className="text-base font-semibold text-foreground mb-4">Multi-Dimensional Match Breakdown</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ['Skill Fit (35%)', match.breakdown?.skillMatchScore ?? match.skillMatch],
                ['Role Alignment (20%)', match.breakdown?.roleAlignmentScore ?? match.roleMatch],
                ['Experience Match (15%)', match.breakdown?.experienceMatchScore ?? match.experienceMatch],
                ['Resume Relevance (10%)', match.breakdown?.resumeRelevanceScore ?? 75],
                ['Education Match (5%)', match.breakdown?.educationMatchScore ?? match.educationMatch],
                ['Preference Match (10%)', match.breakdown?.preferenceMatchScore ?? Math.round((match.locationMatch + match.workModeMatch) / 2)],
                ['Profile Completeness (5%)', match.breakdown?.profileCompletenessScore ?? 85],
              ].map(([label, val]) => (
                <div key={label as string} className="space-y-1.5 rounded-lg border border-border/60 bg-background/50 p-3">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-muted-foreground">{label}</span>
                    <strong className="text-foreground">{val}%</strong>
                  </div>
                  <Progress value={val as number} className="h-1.5" />
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Matched Skills */}
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <p className="font-semibold text-emerald-400 mb-3 flex items-center gap-2 text-base">
              <Check className="h-5 w-5" /> Verified Matched Skills ({match.matchedSkills.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {match.matchedSkills.map((s) => (
                <Badge key={s} variant="success" className="text-xs py-1 px-2.5">
                  ✓ {s}
                </Badge>
              ))}
              {match.matchedSkills.length === 0 && (
                <p className="text-xs text-muted-foreground">No core skills matched yet. Update your profile skills to increase fit.</p>
              )}
            </div>
          </div>

          {/* Section 4: Missing Skills & Detailed Actions */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
            <p className="font-semibold text-amber-400 mb-3 flex items-center gap-2 text-base">
              <CircleDot className="h-5 w-5" /> Skills To Improve ({match.missingSkillsWithDetails?.length || match.missingSkills.length})
            </p>
            <div className="space-y-3">
              {(match.missingSkillsWithDetails || []).map((item) => (
                <div key={item.skill} className="rounded-lg border border-border/80 bg-background/60 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-foreground text-sm">{item.skill}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant={item.importance === 'High' ? 'danger' : 'warning'} className="text-[10px]">
                        {item.importance} Priority
                      </Badge>
                      <Button asChild size="sm" variant="outline" className="h-6 text-[11px] px-2">
                        <Link to={item.actionLink}>Learn Skill</Link>
                      </Button>
                    </div>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{item.reason}</p>
                  <p className="mt-1 text-xs text-primary font-medium">Recommended action: {item.recommendedAction}</p>
                </div>
              ))}
              {(!match.missingSkillsWithDetails || match.missingSkillsWithDetails.length === 0) && (
                <p className="text-xs text-emerald-400">Awesome! You possess all primary required skills for this job.</p>
              )}
            </div>
          </div>

          {/* Section 5 & 6 & 7: Experience, Education, & Preferences */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-border/80 bg-muted/20 p-4 text-xs">
              <p className="font-semibold text-foreground mb-1">Experience Verification</p>
              <p className="text-muted-foreground">Required: {job.experience || '2+ years'}</p>
              <p className="text-emerald-400 font-medium mt-1">Match Score: {match.breakdown?.experienceMatchScore ?? match.experienceMatch}%</p>
            </div>
            <div className="rounded-xl border border-border/80 bg-muted/20 p-4 text-xs">
              <p className="font-semibold text-foreground mb-1">Education Alignment</p>
              <p className="text-muted-foreground">Degree & Branch verified</p>
              <p className="text-emerald-400 font-medium mt-1">Match Score: {match.breakdown?.educationMatchScore ?? 85}%</p>
            </div>
            <div className="rounded-xl border border-border/80 bg-muted/20 p-4 text-xs">
              <p className="font-semibold text-foreground mb-1">Preference Fit</p>
              <p className="text-muted-foreground">{job.mode} · {job.location}</p>
              <p className="text-emerald-400 font-medium mt-1">Match Score: {match.breakdown?.preferenceMatchScore ?? 90}%</p>
            </div>
          </div>

          {/* Section 8: Why This Job Matches */}
          <div className="rounded-xl border border-border/80 bg-muted/20 p-5">
            <p className="text-base font-semibold text-foreground">Why this job matches you</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {(match.whyMatches || match.reasons).map((reason) => (
                <li key={reason} className="flex gap-2.5">
                  <Star className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="leading-relaxed">{reason}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Section 9: How to Improve Match */}
          <div className="rounded-xl border border-border/80 bg-muted/20 p-5">
            <p className="text-base font-semibold text-foreground">How to improve your match score</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {(match.howToImprove || match.improvementPlan).map((step) => (
                <li key={step} className="flex gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Section 10: Recommended Next Actions */}
          <div className="rounded-xl border border-primary/20 bg-brand-soft p-5 text-sm">
            <p className="font-semibold text-foreground mb-2">Recommended Next Actions for this Role</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {match.missingSkills[0] && (
                <Button asChild size="sm" variant="outline">
                  <Link to={`/skills?targetSkill=${encodeURIComponent(match.missingSkills[0])}`}>
                    Learn {match.missingSkills[0]}
                  </Link>
                </Button>
              )}
              <Button asChild size="sm" variant="outline">
                <Link to="/resume-analyzer">
                  Scan Resume for {job.title}
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to={`/interview?jobRole=${encodeURIComponent(job.title)}`}>
                  Start AI Practice Interview
                </Link>
              </Button>
            </div>
          </div>

          {/* Description */}
          <div className="rounded-xl border border-border/80 bg-muted/20 p-5">
            <p className="font-semibold text-base text-foreground mb-2">Job Description</p>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
              {job.description}
            </p>
          </div>
        </div>
      )}

      {/* TAB 2: AI APPLICATION COACH */}
      {detailTab === 'coach' && (
        <div className="space-y-6 text-sm">
          {coachLoading && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="mt-4 font-semibold text-base text-foreground">Analyzing job & generating tailored preparation plan...</p>
              <p className="mt-1 text-sm text-muted-foreground">Synthesizing interview questions, resume tips, and revision topics.</p>
            </div>
          )}

          {coachError && (
            <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-5 text-destructive">
              <p className="font-medium">{coachError}</p>
              <Button size="sm" onClick={() => void fetchJobCoach()} className="mt-4">
                Try Again
              </Button>
            </div>
          )}

          {coachData && !coachLoading && (
            <div className="space-y-6 animate-in fade-in-50">
              {/* Resume Suggestions */}
              <Card className="p-5 bg-muted/20 border-border">
                <div className="flex items-center gap-2 font-bold text-base text-primary mb-3">
                  <FileText className="h-5 w-5" /> Tailored Resume Recommendations
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {coachData.resumeSuggestions.map((sug, i) => (
                    <li key={i} className="flex gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{sug}</span>
                    </li>
                  ))}
                </ul>
              </Card>

              {/* Skills to Revise */}
              <Card className="p-5 bg-muted/20 border-border">
                <div className="flex items-center gap-2 font-bold text-base text-primary mb-3">
                  <Target className="h-5 w-5" /> Key Skills & Concepts to Revise
                </div>
                <div className="space-y-3">
                  {coachData.skillsToRevise.map((item, i) => (
                    <div key={i} className="rounded-lg border border-border/80 bg-background/60 p-4">
                      <div className="flex items-center justify-between font-semibold text-foreground text-sm">
                        <span>{item.skill}</span>
                        <Badge variant="warning" className="text-xs">Priority Gap</Badge>
                      </div>
                      <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{item.reason}</p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {item.keyConcepts.map((concept, cIdx) => (
                          <Badge key={cIdx} variant="secondary" className="text-xs">{concept}</Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Expected Technical Questions */}
              <Card className="p-5 bg-muted/20 border-border">
                <div className="flex items-center gap-2 font-bold text-base text-primary mb-3">
                  <MessageSquareText className="h-5 w-5" /> Expected Technical Questions
                </div>
                <div className="space-y-3">
                  {coachData.expectedTechnicalQuestions.map((q, i) => (
                    <div key={i} className="rounded-lg border border-border/80 bg-background/60 p-4">
                      <p className="font-semibold text-foreground text-sm">Q{i + 1}: {q.question}</p>
                      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                        <strong className="text-primary font-medium">Answer Strategy:</strong> {q.idealAnswerTip}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* HR / Behavioral Questions */}
              <Card className="p-5 bg-muted/20 border-border">
                <div className="flex items-center gap-2 font-bold text-base text-primary mb-3">
                  <Users className="h-5 w-5" /> Company & Behavioral Questions
                </div>
                <div className="space-y-3">
                  {coachData.hrQuestions.map((q, i) => (
                    <div key={i} className="rounded-lg border border-border/80 bg-background/60 p-4">
                      <p className="font-semibold text-foreground text-sm">Q: {q.question}</p>
                      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                        <strong className="text-primary font-medium">Response Tip:</strong> {q.responseGuidance}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* 3-Step Preparation Plan */}
              <Card className="p-5 bg-muted/20 border-border">
                <div className="flex items-center gap-2 font-bold text-base text-primary mb-3">
                  <Calendar className="h-5 w-5" /> Structured Preparation Plan
                </div>
                <div className="space-y-3">
                  {coachData.preparationPlan.map((plan, i) => (
                    <div key={i} className="flex gap-4 items-start border-b border-border/50 pb-3 last:border-0 last:pb-0">
                      <span className="font-bold text-primary shrink-0 w-28 text-sm">{plan.dayOrStep}</span>
                      <div>
                        <p className="font-semibold text-foreground text-sm">{plan.focus}</p>
                        <p className="text-muted-foreground text-sm leading-relaxed mt-0.5">{plan.action}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: RESUME OPTIMIZER */}
      {detailTab === 'optimize' && (
        <div className="space-y-6 text-sm">
          {resumeLoading && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="mt-4 font-semibold text-base text-foreground">Comparing your resume against job keywords...</p>
              <p className="mt-1 text-sm text-muted-foreground">Checking ATS keyword coverage, weak sections, and alignment.</p>
            </div>
          )}

          {resumeError && (
            <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-5 text-destructive">
              <p className="font-medium">{resumeError}</p>
              <Button size="sm" onClick={() => void fetchResumeOptimizer()} className="mt-4">
                Try Again
              </Button>
            </div>
          )}

          {resumeData && !resumeLoading && (
            <div className="space-y-6 animate-in fade-in-50">
              {/* ATS Keyword Score Header */}
              <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/10 p-5">
                <div>
                  <h3 className="font-bold text-base text-foreground">ATS Keyword Alignment Score</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">Percentage of job-specific keywords detected in your resume.</p>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-extrabold text-emerald-400">{resumeData.keywordMatchScore}%</span>
                </div>
              </div>

              {/* Keywords Match Breakdown */}
              <div className="grid gap-4 sm:grid-cols-2">
                <Card className="p-5 bg-muted/20">
                  <p className="font-semibold text-emerald-400 mb-3 flex items-center gap-1.5">
                    <Check className="h-4 w-4" /> Matching Keywords ({resumeData.matchingKeywords.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {resumeData.matchingKeywords.map((kw) => (
                      <Badge key={kw} variant="success" className="text-xs">{kw}</Badge>
                    ))}
                    {resumeData.matchingKeywords.length === 0 && <span className="text-muted-foreground text-xs">None</span>}
                  </div>
                </Card>

                <Card className="p-5 bg-muted/20">
                  <p className="font-semibold text-amber-400 mb-3 flex items-center gap-1.5">
                    <CircleDot className="h-4 w-4" /> Missing High-Priority Keywords ({resumeData.missingKeywords.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {resumeData.missingKeywords.map((kw) => (
                      <Badge key={kw} variant="warning" className="text-xs">{kw}</Badge>
                    ))}
                    {resumeData.missingKeywords.length === 0 && <span className="text-muted-foreground text-xs">Great job! All keywords present.</span>}
                  </div>
                </Card>
              </div>

              {/* Weak Sections Feedback */}
              {resumeData.weakSections.length > 0 && (
                <Card className="p-5 bg-muted/20">
                  <div className="font-bold text-base text-foreground mb-3">Section Improvement Notes</div>
                  <div className="space-y-3">
                    {resumeData.weakSections.map((sec, i) => (
                      <div key={i} className="rounded-lg border border-border/80 bg-background/60 p-4">
                        <span className="font-bold text-amber-400 text-sm">{sec.section}:</span>
                        <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{sec.feedback}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Actionable Bullet Point Improvements */}
              <Card className="p-5 bg-muted/20">
                <div className="font-bold text-base text-foreground mb-3">Actionable Resume Suggestions</div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {resumeData.improvementSuggestions.map((sug, i) => (
                    <li key={i} className="flex gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{sug}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border">
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={onSave}>
            {saved ? 'Saved ✓' : 'Save Job'}
          </Button>
          <Button variant="outline" onClick={() => void onApply(job.id, job.applicationUrl)}>
            Apply Now
          </Button>
          <Button variant="outline" asChild>
            <Link to={`/interviews?jobRole=${encodeURIComponent(job.title)}`}>
              Practice Interview
            </Link>
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={status ?? 'saved'}
            onChange={(event) => void onTrack(job.id, event.target.value as ApplicationStatus)}
            aria-label="Track application status"
            className="h-10 text-xs w-44"
          >
            <option value="saved">Track Application</option>
            {applicationStatuses.filter((item) => item.key !== 'saved').map((item) => (
              <option key={item.key} value={item.key}>{item.label}</option>
            ))}
          </Select>
        </div>
      </div>
    </div>
  )
}


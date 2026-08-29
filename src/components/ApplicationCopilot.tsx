import { useEffect, useState } from 'react'
import {
  AlertCircle,
  BookOpen,
  Brain,
  CheckCircle2,
  ClipboardList,
  Copy,
  ExternalLink,
  FileText,
  Lightbulb,
  Loader2,
  MessageSquare,
  RotateCcw,
  Sparkles,
  Target,
  Trash2,
  Zap,
  CheckSquare,
  Square,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/common/Toast'
import type { Job, JobMatch, CareerJobApplication } from '@/types/jobs'
import type { UserSkill } from '@/types/skillGap'
import {
  calculateApplicationReadinessScore,
  analyzeResumeOptimization,
  calculateATSOptimization,
  analyzeSkillGapsForJob,
  calculateApplicationStrategy,
  type ApplicationReadinessBreakdown,
  type ResumeOptimizationAnalysis,
  type ATSOptimizationScore,
  type ApplicationStrategy,
} from '@/lib/applicationScoringEngine'
import { cn } from '@/lib/utils'

interface ApplicationCopilotProps {
  job: Job
  jobMatch: JobMatch
  userSkills: UserSkill[]
  resumeText: string | null | undefined
  careerGoal: { target_role: string | null } | null
  hasProjects: boolean
  existingApplication: CareerJobApplication | null
  onApplyNow?: () => void
  onClose?: () => void
}

type ApplicationCopilotTab =
  | 'overview'
  | 'readiness'
  | 'resume'
  | 'ats'
  | 'letter'
  | 'questions'
  | 'interview'
  | 'skills'
  | 'projects'
  | 'checklist'

interface ApplicationChecklist {
  items: Array<{ id: string; label: string; completed: boolean }>
}

export function ApplicationCopilot({
  job,
  jobMatch,
  userSkills,
  resumeText,
  careerGoal,
  hasProjects,
  existingApplication,
  onApplyNow,
  onClose,
}: ApplicationCopilotProps) {
  const [activeTab, setActiveTab] = useState<ApplicationCopilotTab>('overview')

  // Scoring state
  const [readinessScore, setReadinessScore] = useState<ApplicationReadinessBreakdown | null>(null)
  const [resumeOptimization, setResumeOptimization] = useState<ResumeOptimizationAnalysis | null>(null)
  const [atsScore, setAtsScore] = useState<ATSOptimizationScore | null>(null)
  const [skillGaps, setSkillGaps] = useState<ReturnType<typeof analyzeSkillGapsForJob> | null>(null)
  const [strategy, setStrategy] = useState<ApplicationStrategy | null>(null)

  // Generated content state
  const [coverLetter, setCoverLetter] = useState('')
  const [coverLetterGenerating, setCoverLetterGenerating] = useState(false)
  const [coverLetterEdited, setCoverLetterEdited] = useState(false)

  // Application answers state
  const [applicationAnswers, setApplicationAnswers] = useState<Record<string, string>>({})
  const [answerGenerating, setAnswerGenerating] = useState<Record<string, boolean>>({})

  // Checklist state
  const [checklist, setChecklist] = useState<ApplicationChecklist>({
    items: [
      { id: 'resume', label: 'Resume optimized', completed: false },
      { id: 'requirements', label: 'Job requirements reviewed', completed: false },
      { id: 'skills', label: 'Skill gaps reviewed', completed: false },
      { id: 'projects', label: 'Relevant projects selected', completed: false },
      { id: 'cover', label: 'Cover letter prepared', completed: false },
      { id: 'answers', label: 'Application answers prepared', completed: false },
      { id: 'interview', label: 'Interview preparation started', completed: false },
    ],
  })

  // Initialize scores on mount
  useEffect(() => {
    if (!readinessScore) {
      const scores = calculateApplicationReadinessScore(job, jobMatch, userSkills, resumeText, careerGoal, hasProjects, existingApplication)
      setReadinessScore(scores)
    }
  }, [job, jobMatch, userSkills, resumeText, careerGoal, hasProjects, existingApplication, readinessScore])

  useEffect(() => {
    if (!resumeOptimization) {
      const analysis = analyzeResumeOptimization(job, resumeText, jobMatch)
      setResumeOptimization(analysis)
    }
  }, [job, resumeText, jobMatch, resumeOptimization])

  useEffect(() => {
    if (!atsScore) {
      const score = calculateATSOptimization(job, resumeText)
      setAtsScore(score)
    }
  }, [job, resumeText, atsScore])

  useEffect(() => {
    if (!skillGaps) {
      const gaps = analyzeSkillGapsForJob(jobMatch)
      setSkillGaps(gaps)
    }
  }, [jobMatch, skillGaps])

  useEffect(() => {
    if (!strategy && readinessScore && skillGaps) {
      const strat = calculateApplicationStrategy(jobMatch, readinessScore.overallScore, skillGaps)
      setStrategy(strat)
    }
  }, [jobMatch, readinessScore, skillGaps, strategy])

  const toggleChecklist = (id: string) => {
    setChecklist((prev) => ({
      items: prev.items.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item)),
    }))
  }

  const completionRate = Math.round((checklist.items.filter((i) => i.completed).length / checklist.items.length) * 100)

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-900/40 via-slate-950 to-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Prepare Me for This Job</h2>
            <p className="text-sm text-slate-400 mt-1">
              {job.company} • {job.title}
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="sticky top-[65px] z-30 border-b border-slate-700/50 bg-slate-900/60 backdrop-blur-sm overflow-x-auto">
        <div className="flex gap-1 px-6 py-2 min-w-max">
          {[
            { id: 'overview', label: 'Overview', icon: Target },
            { id: 'readiness', label: 'Readiness', icon: Zap },
            { id: 'resume', label: 'Resume', icon: FileText },
            { id: 'ats', label: 'ATS', icon: CheckCircle2 },
            { id: 'letter', label: 'Cover Letter', icon: MessageSquare },
            { id: 'questions', label: 'Questions', icon: Brain },
            { id: 'interview', label: 'Interview', icon: BookOpen },
            { id: 'skills', label: 'Skills', icon: Zap },
            { id: 'projects', label: 'Projects', icon: Lightbulb },
            { id: 'checklist', label: 'Checklist', icon: ClipboardList },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as ApplicationCopilotTab)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium whitespace-nowrap rounded-t border-b-2 transition-all',
                activeTab === id
                  ? 'border-cyan-500 text-cyan-300 bg-slate-800/50'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30',
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Application Readiness Score */}
              {readinessScore && (
                <Card className="bg-gradient-to-br from-slate-800/40 via-slate-800/20 to-slate-800/10 border-slate-700/50">
                  <div className="p-6">
                    <div className="text-center mb-8">
                      <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br from-cyan-500/30 via-cyan-500/10 to-transparent border border-cyan-500/30 mb-4">
                        <div className="text-center">
                          <div className="text-5xl font-bold text-cyan-300">{readinessScore.overallScore}</div>
                          <div className="text-sm text-slate-300 mt-2">Application Ready</div>
                        </div>
                      </div>
                      <Progress
                        value={readinessScore.overallScore}
                        className="mt-4 h-2 bg-slate-700/50"
                      />
                    </div>

                    {/* Score Breakdown Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/50">
                        <div className="text-sm text-slate-400 mb-2">Resume Match</div>
                        <div className="text-2xl font-bold text-cyan-300">{readinessScore.resumeMatch}%</div>
                      </div>
                      <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/50">
                        <div className="text-sm text-slate-400 mb-2">Skills Match</div>
                        <div className="text-2xl font-bold text-cyan-300">{readinessScore.skillsMatch}%</div>
                      </div>
                      <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/50">
                        <div className="text-sm text-slate-400 mb-2">Project Match</div>
                        <div className="text-2xl font-bold text-cyan-300">{readinessScore.projectMatch}%</div>
                      </div>
                      <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/50">
                        <div className="text-sm text-slate-400 mb-2">Career Alignment</div>
                        <div className="text-2xl font-bold text-cyan-300">{readinessScore.careerGoalMatch}%</div>
                      </div>
                      <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/50">
                        <div className="text-sm text-slate-400 mb-2">Interview Ready</div>
                        <div className="text-2xl font-bold text-cyan-300">{readinessScore.interviewReadiness}%</div>
                      </div>
                      <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/50">
                        <div className="text-sm text-slate-400 mb-2">ATS Friendly</div>
                        <div className="text-2xl font-bold text-cyan-300">{readinessScore.atsOptimization}%</div>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Application Strategy */}
              {strategy && (
                <Card className="bg-gradient-to-br from-slate-800/40 via-slate-800/20 to-slate-800/10 border-slate-700/50">
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Application Strategy</h3>

                    <div
                      className={cn(
                        'rounded-lg p-4 mb-4 border',
                        strategy.recommendation === 'APPLY_NOW'
                          ? 'bg-emerald-500/10 border-emerald-500/30'
                          : strategy.recommendation === 'GOOD_FIT_IMPROVE'
                            ? 'bg-blue-500/10 border-blue-500/30'
                            : strategy.recommendation === 'MODERATE_FIT_PREPARE'
                              ? 'bg-amber-500/10 border-amber-500/30'
                              : 'bg-red-500/10 border-red-500/30',
                      )}
                    >
                      <div
                        className={cn(
                          'text-sm font-semibold mb-2',
                          strategy.recommendation === 'APPLY_NOW'
                            ? 'text-emerald-300'
                            : strategy.recommendation === 'GOOD_FIT_IMPROVE'
                              ? 'text-blue-300'
                              : strategy.recommendation === 'MODERATE_FIT_PREPARE'
                                ? 'text-amber-300'
                                : 'text-red-300',
                        )}
                      >
                        {strategy.recommendation === 'APPLY_NOW'
                          ? '✓ Apply Now'
                          : strategy.recommendation === 'GOOD_FIT_IMPROVE'
                            ? '→ Good Fit - Apply After Improvements'
                            : strategy.recommendation === 'MODERATE_FIT_PREPARE'
                              ? '◐ Moderate Fit - Prepare First'
                              : '✗ Low Fit - Consider Other Roles'}
                      </div>
                      <p className="text-sm text-slate-300 mb-3">{strategy.explanation}</p>

                      <div className="space-y-1">
                        {strategy.keyFactors.map((factor, idx) => (
                          <div key={idx} className="text-xs text-slate-400 flex items-center gap-2">
                            <span className="w-1 h-1 rounded-full bg-slate-500" />
                            {factor}
                          </div>
                        ))}
                      </div>
                    </div>

                    {onApplyNow && (strategy.recommendation === 'APPLY_NOW' || strategy.recommendation === 'GOOD_FIT_IMPROVE') && (
                      <Button
                        onClick={onApplyNow}
                        className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border-0"
                      >
                        Apply for This Job
                      </Button>
                    )}
                  </div>
                </Card>
              )}

              {/* Quick Tips */}
              <Card className="bg-slate-800/30 border-slate-700/50">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-amber-400" />
                    Next Steps
                  </h3>
                  <ul className="space-y-2 text-sm text-slate-300">
                    <li>✓ Review your resume against this job's requirements</li>
                    <li>✓ Generate a tailored cover letter</li>
                    <li>✓ Prepare answers to common application questions</li>
                    <li>✓ Study the job-specific technical interview topics</li>
                    <li>✓ Complete the pre-application checklist</li>
                  </ul>
                </div>
              </Card>
            </div>
          )}

          {/* READINESS TAB */}
          {activeTab === 'readiness' && readinessScore && (
            <div className="space-y-6">
              <Card className="bg-gradient-to-br from-slate-800/40 via-slate-800/20 to-slate-800/10 border-slate-700/50">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-6">Detailed Readiness Analysis</h3>

                  {[
                    { name: 'Resume Match', score: readinessScore.resumeMatch, desc: 'How well your resume aligns with job requirements' },
                    { name: 'Skills Match', score: readinessScore.skillsMatch, desc: 'Coverage of required and preferred skills' },
                    { name: 'Project Match', score: readinessScore.projectMatch, desc: 'Relevance of your projects to this role' },
                    { name: 'Career Alignment', score: readinessScore.careerGoalMatch, desc: 'How this job aligns with your career goals' },
                    { name: 'Interview Readiness', score: readinessScore.interviewReadiness, desc: 'Preparation level for technical and behavioral interviews' },
                    { name: 'ATS Optimization', score: readinessScore.atsOptimization, desc: 'Resume optimization for applicant tracking systems' },
                  ].map(({ name, score, desc }) => (
                    <div key={name} className="mb-6 last:mb-0">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-white">{name}</h4>
                          <p className="text-xs text-slate-400 mt-1">{desc}</p>
                        </div>
                        <div className="text-2xl font-bold text-cyan-300">{score}%</div>
                      </div>
                      <Progress value={score} className="h-2 bg-slate-700/50" />
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* RESUME TAB */}
          {activeTab === 'resume' && resumeOptimization && (
            <ResumeOptimizationSection analysis={resumeOptimization} />
          )}

          {/* ATS TAB */}
          {activeTab === 'ats' && atsScore && <ATSOptimizationSection score={atsScore} />}

          {/* COVER LETTER TAB */}
          {activeTab === 'letter' && (
            <CoverLetterSection
              job={job}
              coverLetter={coverLetter}
              setCoverLetter={setCoverLetter}
              generating={coverLetterGenerating}
              setGenerating={setCoverLetterGenerating}
              edited={coverLetterEdited}
              setEdited={setCoverLetterEdited}
            />
          )}

          {/* QUESTIONS TAB */}
          {activeTab === 'questions' && (
            <ApplicationQuestionsSection
              answers={applicationAnswers}
              setAnswers={setApplicationAnswers}
              answerGenerating={answerGenerating}
              setAnswerGenerating={setAnswerGenerating}
            />
          )}

          {/* INTERVIEW TAB */}
          {activeTab === 'interview' && <InterviewPrepSection job={job} />}

          {/* SKILLS TAB */}
          {activeTab === 'skills' && skillGaps && <SkillGapSection skillGaps={skillGaps} />}

          {/* PROJECTS TAB */}
          {activeTab === 'projects' && (
            <Card className="bg-gradient-to-br from-slate-800/40 via-slate-800/20 to-slate-800/10 border-slate-700/50">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Projects That Strengthen Your Application</h3>

                {hasProjects ? (
                  <div className="space-y-4">
                    <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/50">
                      <p className="text-sm text-slate-300">
                        You have projects that could strengthen this application. Navigate to your profile to highlight projects relevant to:
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {jobMatch.matchedSkills.slice(0, 5).map((skill) => (
                          <Badge key={skill} className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                    <p className="text-sm text-amber-300">No projects found yet. Building relevant projects is crucial for strengthening your application.</p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* CHECKLIST TAB */}
          {activeTab === 'checklist' && (
            <Card className="bg-gradient-to-br from-slate-800/40 via-slate-800/20 to-slate-800/10 border-slate-700/50">
              <div className="p-6">
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-white">Before Applying</h3>
                    <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30">{completionRate}% Complete</Badge>
                  </div>
                  <Progress value={completionRate} className="h-3 bg-slate-700/50" />
                </div>

                <div className="space-y-3">
                  {checklist.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => toggleChecklist(item.id)}
                      className="flex items-center gap-3 w-full p-3 rounded-lg bg-slate-700/20 hover:bg-slate-700/30 border border-slate-600/30 text-left transition-colors"
                    >
                      {item.completed ? (
                        <CheckSquare className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-500 flex-shrink-0" />
                      )}
                      <span className={cn('flex-1 text-sm', item.completed ? 'text-slate-400 line-through' : 'text-slate-200')}>
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Footer CTA */}
      <div className="sticky bottom-0 z-20 border-t border-slate-700/50 bg-slate-900/80 backdrop-blur-sm px-6 py-4">
        <div className="flex gap-3 justify-end">
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          )}
          {onApplyNow && strategy?.recommendation === 'APPLY_NOW' && (
            <Button
              onClick={onApplyNow}
              className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border-0"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Apply Now
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// Sub-components

function ResumeOptimizationSection({ analysis }: { analysis: ResumeOptimizationAnalysis }) {
  if (analysis.hasInsufficientData) {
    return (
      <Card className="bg-amber-500/10 border-amber-500/30">
        <div className="p-6">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-white mb-2">Resume Not Available</h3>
              <p className="text-sm text-amber-200">Upload and analyze your resume to see job-specific optimization suggestions.</p>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-slate-800/40 via-slate-800/20 to-slate-800/10 border-slate-700/50">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Resume Optimization</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h4 className="font-semibold text-emerald-300 mb-3">Matching Keywords ({analysis.matchingKeywords.length})</h4>
              <div className="flex flex-wrap gap-2">
                {analysis.matchingKeywords.slice(0, 8).map((kw) => (
                  <Badge key={kw} className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                    {kw}
                  </Badge>
                ))}
                {analysis.matchingKeywords.length > 8 && (
                  <Badge className="bg-slate-500/20 text-slate-300 border-slate-500/30">
                    +{analysis.matchingKeywords.length - 8} more
                  </Badge>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-amber-300 mb-3">Missing Keywords ({analysis.missingKeywords.length})</h4>
              <div className="flex flex-wrap gap-2">
                {analysis.missingKeywords.slice(0, 8).map((kw) => (
                  <Badge key={kw} className="bg-amber-500/20 text-amber-300 border-amber-500/30">
                    {kw}
                  </Badge>
                ))}
                {analysis.missingKeywords.length > 8 && (
                  <Badge className="bg-slate-500/20 text-slate-300 border-slate-500/30">
                    +{analysis.missingKeywords.length - 8} more
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="mb-6 p-4 bg-slate-700/30 rounded-lg border border-slate-600/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-white">Keyword Match Score</span>
              <span className="text-2xl font-bold text-cyan-300">{analysis.keywordMatchScore}%</span>
            </div>
            <Progress value={analysis.keywordMatchScore} className="h-2 bg-slate-700/50" />
          </div>

          {analysis.weakSections.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold text-white mb-3">Areas to Improve</h4>
              <div className="space-y-2">
                {analysis.weakSections.map((section, idx) => (
                  <div key={idx} className="bg-slate-700/20 rounded-lg p-3 border border-slate-600/30">
                    <p className="font-medium text-slate-200">{section.section}</p>
                    <p className="text-sm text-slate-400 mt-1">{section.feedback}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {analysis.improvementSuggestions.length > 0 && (
            <div>
              <h4 className="font-semibold text-white mb-3">Suggestions</h4>
              <ul className="space-y-2">
                {analysis.improvementSuggestions.map((suggestion, idx) => (
                  <li key={idx} className="text-sm text-slate-300 flex gap-2">
                    <span className="text-cyan-400">→</span>
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

function ATSOptimizationSection({ score }: { score: ATSOptimizationScore }) {
  if (score.hasInsufficientData) {
    return (
      <Card className="bg-amber-500/10 border-amber-500/30">
        <div className="p-6">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-white mb-2">Resume Not Available</h3>
              <p className="text-sm text-amber-200">Upload your resume to analyze ATS (Applicant Tracking System) compatibility.</p>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="bg-gradient-to-br from-slate-800/40 via-slate-800/20 to-slate-800/10 border-slate-700/50">
      <div className="p-6">
        <h3 className="text-lg font-semibold text-white mb-6">ATS Compatibility</h3>

        <div className="mb-6 p-4 bg-slate-700/30 rounded-lg border border-slate-600/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-white">ATS Readiness</span>
            <span className="text-3xl font-bold text-cyan-300">{score.score}%</span>
          </div>
          <Progress value={score.score} className="h-3 bg-slate-700/50" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {[
            { label: 'Keyword Coverage', value: score.keywordCoverage },
            { label: 'Skills Alignment', value: score.skillsAlignment },
            { label: 'Resume Structure', value: score.resumeStructure },
            { label: 'Experience Details', value: score.relevantExperience },
            { label: 'Project Relevance', value: score.projectRelevance },
          ].map(({ label, value }) => (
            <div key={label} className="bg-slate-700/20 rounded-lg p-4 border border-slate-600/30">
              <div className="text-sm text-slate-400 mb-2">{label}</div>
              <div className="text-2xl font-bold text-cyan-300">{value}%</div>
            </div>
          ))}
        </div>

        {score.factors.length > 0 && (
          <div className="mb-6">
            <h4 className="font-semibold text-emerald-300 mb-3">Strengths</h4>
            <ul className="space-y-2">
              {score.factors.map((factor, idx) => (
                <li key={idx} className="text-sm text-slate-300 flex gap-2">
                  <span className="text-emerald-400">✓</span>
                  {factor}
                </li>
              ))}
            </ul>
          </div>
        )}

        {score.issues.length > 0 && (
          <div>
            <h4 className="font-semibold text-amber-300 mb-3">Issues</h4>
            <ul className="space-y-2">
              {score.issues.map((issue, idx) => (
                <li key={idx} className="text-sm text-slate-300 flex gap-2">
                  <span className="text-amber-400">!</span>
                  {issue}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  )
}

function CoverLetterSection({
  job,
  coverLetter,
  setCoverLetter,
  generating,
  setGenerating,
  edited,
  setEdited,
}: {
  job: Job
  coverLetter: string
  setCoverLetter: (letter: string) => void
  generating: boolean
  setGenerating: (generating: boolean) => void
  edited: boolean
  setEdited: (edited: boolean) => void
}) {
  const { toast } = useToast()

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      // Simulated generation - in real app would call AI service
      await new Promise((resolve) => setTimeout(resolve, 1500))
      const template = `Dear Hiring Manager,

I am writing to express my strong interest in the ${job.title} position at ${job.company}. With my background in ${job.category} and proven track record in delivering high-quality solutions, I am confident in my ability to contribute significantly to your team.

In my professional experience, I have developed deep expertise in the technologies and practices essential to this role. I am particularly drawn to this opportunity because of your company's reputation for innovation and excellence.

I would welcome the opportunity to discuss how my skills and experience align with your team's needs. Thank you for considering my application.

Best regards`

      setCoverLetter(template)
      setEdited(false)
      toast({ title: 'Cover letter generated successfully', tone: 'success' })
    } catch {
      toast({ title: 'Failed to generate cover letter', tone: 'error' })
    } finally {
      setGenerating(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(coverLetter)
    toast({ title: 'Copied to clipboard', tone: 'success' })
  }

  return (
    <Card className="bg-gradient-to-br from-slate-800/40 via-slate-800/20 to-slate-800/10 border-slate-700/50">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Generate Cover Letter</h3>
          {coverLetter && (
            <Badge className={edited ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'}>
              {edited ? 'Edited' : 'Generated'}
            </Badge>
          )}
        </div>

        {!coverLetter ? (
          <Button onClick={handleGenerate} disabled={generating} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white">
            {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Generate Cover Letter
          </Button>
        ) : (
          <div className="space-y-4">
            <Textarea
              value={coverLetter}
              onChange={(e) => {
                setCoverLetter(e.target.value)
                setEdited(true)
              }}
              className="min-h-80 bg-slate-700/20 border-slate-600/50 text-slate-100 rounded-lg"
              placeholder="Cover letter will appear here..."
            />

            <div className="flex flex-wrap gap-3">
              <Button onClick={handleCopy} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white" size="sm">
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
              <Button onClick={handleGenerate} disabled={generating} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white" size="sm">
                {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-2" />}
                Regenerate
              </Button>
              <Button onClick={() => setCoverLetter('')} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white" size="sm">
                <Trash2 className="w-4 h-4 mr-2" />
                Clear
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

function ApplicationQuestionsSection({
  answers,
  setAnswers,
  answerGenerating,
  setAnswerGenerating,
}: {
  answers: Record<string, string>
  setAnswers: (answers: Record<string, string>) => void
  answerGenerating: Record<string, boolean>
  setAnswerGenerating: (generating: Record<string, boolean>) => void
}) {
  const { toast } = useToast()

  const questions = [
    'Why should we hire you?',
    'Why do you want this role?',
    'Tell us about yourself.',
    'Why are you interested in this company?',
    'Describe your relevant experience.',
    'What is your biggest strength?',
  ]

  const handleGenerateAnswer = async (question: string) => {
    setAnswerGenerating({ ...answerGenerating, [question]: true })
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      const template = `This is a strong answer showcasing relevant experience and skills. In a real implementation, this would be generated by the AI service based on your profile, resume, and the job requirements.`
      setAnswers({ ...answers, [question]: template })
      toast({ title: 'Answer generated', tone: 'success' })
    } catch {
      toast({ title: 'Failed to generate answer', tone: 'error' })
    } finally {
      setAnswerGenerating({ ...answerGenerating, [question]: false })
    }
  }

  return (
    <div className="space-y-4">
      {questions.map((question) => (
        <Card key={question} className="bg-gradient-to-br from-slate-800/40 via-slate-800/20 to-slate-800/10 border-slate-700/50">
          <div className="p-6">
            <h3 className="font-semibold text-white mb-4">{question}</h3>

            {!answers[question] ? (
              <Button
                onClick={() => handleGenerateAnswer(question)}
                disabled={answerGenerating[question]}
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white"
              >
                {answerGenerating[question] ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Generate Answer
              </Button>
            ) : (
              <div className="space-y-4">
                <Textarea
                  value={answers[question]}
                  onChange={(e) => setAnswers({ ...answers, [question]: e.target.value })}
                  className="min-h-40 bg-slate-700/20 border-slate-600/50 text-slate-100 rounded-lg"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(answers[question])
                      toast({ title: 'Copied to clipboard', tone: 'success' })
                    }}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white"
                    size="sm"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                  <Button
                    onClick={() => handleGenerateAnswer(question)}
                    disabled={answerGenerating[question]}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white"
                    size="sm"
                  >
                    {answerGenerating[question] ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-2" />}
                    Regenerate
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  )
}

function InterviewPrepSection({ job }: { job: Job }) {
  return (
    <div className="space-y-4">
      {['Technical', 'Behavioral', 'HR', 'Project-based'].map((category) => (
        <Card key={category} className="bg-gradient-to-br from-slate-800/40 via-slate-800/20 to-slate-800/10 border-slate-700/50">
          <div className="p-6">
            <h3 className="font-semibold text-white mb-4">{category} Interview Topics</h3>

            <div className="space-y-3">
              {['Topic 1', 'Topic 2', 'Topic 3'].map((topic) => (
                <div key={topic} className="bg-slate-700/20 rounded-lg p-4 border border-slate-600/30">
                  <p className="font-medium text-slate-200 mb-2">{topic}</p>
                  <p className="text-sm text-slate-400">Recommended preparation for {job.title} role</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

function SkillGapSection({ skillGaps }: { skillGaps: any }) {
  return (
    <div className="space-y-4">
      {skillGaps &&
        skillGaps.slice(0, 10).map((gap: any, idx: number) => (
          <Card key={idx} className="bg-gradient-to-br from-slate-800/40 via-slate-800/20 to-slate-800/10 border-slate-700/50">
            <div className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-white">{gap.skill}</h3>
                  <p className="text-sm text-slate-400 mt-1">{gap.reason}</p>
                </div>
                <Badge
                  className={
                    gap.priority === 'High'
                      ? 'bg-red-500/20 text-red-300 border-red-500/30'
                      : gap.priority === 'Medium'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        : 'bg-slate-500/20 text-slate-300 border-slate-500/30'
                  }
                >
                  {gap.priority} Priority
                </Badge>
              </div>

              {gap.status !== 'matched' && (
                <div className="bg-slate-700/20 rounded-lg p-3 border border-slate-600/30 text-sm text-slate-300">
                  {gap.recommendedAction}
                </div>
              )}
            </div>
          </Card>
        ))}
    </div>
  )
}

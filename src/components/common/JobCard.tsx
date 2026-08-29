import { AlertCircle, Bookmark, BriefcaseBusiness, CheckCircle2, MapPin, Sparkles } from 'lucide-react'
import type { JobListing } from '@/data/mock'
import type { JobMatch, MatchCategory } from '@/types/jobs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { getMatchCategory } from '@/lib/jobMatching'

interface JobCardProps {
  jobMatch?: JobMatch
  job?: JobListing
  saved?: boolean
  onSave?: () => void
  onView?: () => void
  onViewMatchDetails?: () => void
}

export function JobCard({ jobMatch, job: mockJob, saved, onSave, onView, onViewMatchDetails }: JobCardProps) {
  const matchPercentage = jobMatch ? jobMatch.matchPercentage : mockJob?.match ?? 75
  const matchCategory: MatchCategory = jobMatch ? jobMatch.matchCategory : getMatchCategory(matchPercentage)
  const title = jobMatch ? jobMatch.job.title : mockJob?.title ?? 'Software Role'
  const company = jobMatch ? jobMatch.job.company : mockJob?.company ?? 'Tech Company'
  const location = jobMatch ? jobMatch.job.location : mockJob?.location ?? 'Remote'
  const mode = jobMatch ? jobMatch.job.mode : mockJob?.mode ?? 'Remote'
  const type = jobMatch ? jobMatch.job.type : mockJob?.type ?? 'Full-time'
  const salary = jobMatch ? (jobMatch.job.salary || 'Competitive') : mockJob?.salary ?? 'Competitive'
  const posted = jobMatch ? `${jobMatch.job.postedDaysAgo}d ago` : mockJob?.posted ?? 'Recently'

  const matchedSkills = jobMatch ? jobMatch.matchedSkills : mockJob?.matchedSkills ?? []
  const missingSkills = jobMatch ? jobMatch.missingSkills : mockJob?.missingSkills ?? []

  const whyText = jobMatch?.whyMatches?.[0] || (matchedSkills.length ? `${matchedSkills.slice(0, 3).join(', ')} align with your verified profile.` : 'Matches core entry requirements.')

  const categoryBadgeVariant = (cat: MatchCategory) => {
    switch (cat) {
      case 'Excellent Match':
        return 'success'
      case 'Strong Match':
        return 'secondary'
      case 'Potential Match':
        return 'warning'
      case 'Low Match':
      case 'Poor Match':
        return 'danger'
      default:
        return 'outline'
    }
  }

  return (
    <Card className="group flex h-full flex-col p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lift">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-cyan-500/20 text-sm font-bold text-primary border border-primary/20 shadow-sm">
            {company.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-foreground">{title}</h3>
            <p className="truncate text-xs text-muted-foreground">{company}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onSave}
          aria-label={saved ? 'Remove from saved jobs' : 'Save job'}
          className={cn(
            'rounded-full p-2 transition-colors shrink-0',
            saved ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <Bookmark className={cn('h-4 w-4', saved && 'fill-current')} />
        </button>
      </div>

      <div className="mt-3.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5 text-cyan-400" />
          {location}
        </span>
        <span className="inline-flex items-center gap-1">
          <BriefcaseBusiness className="h-3.5 w-3.5 text-primary" />
          {type} · {mode}
        </span>
      </div>

      {/* Match Score & Category */}
      <div className="mt-4 rounded-xl border border-border/70 bg-muted/20 p-3">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="inline-flex items-center gap-1 font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" /> {matchPercentage}% Match
          </span>
          <Badge variant={categoryBadgeVariant(matchCategory)} className="text-[10px] py-0">
            {matchCategory}
          </Badge>
        </div>
        <Progress value={matchPercentage} className="h-1.5" />

        <div className="mt-2.5 flex items-center justify-between text-[11px]">
          <span className="text-emerald-400 font-medium flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> {matchedSkills.length} matched skills
          </span>
          {missingSkills.length > 0 ? (
            <span className="text-amber-400 font-medium flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> {missingSkills.length} missing
            </span>
          ) : (
            <span className="text-emerald-400 font-medium">Full skill match</span>
          )}
        </div>
      </div>

      {/* Why This Job Matches snippet */}
      <p className="mt-3.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
        <span className="font-semibold text-foreground">Why it matches: </span>
        {whyText}
      </p>

      {/* Matched & Missing skill tags */}
      <div className="mt-3.5 flex flex-wrap gap-1.5">
        {matchedSkills.slice(0, 3).map((skill) => (
          <Badge key={skill} variant="success" className="text-[10px]">
            ✓ {skill}
          </Badge>
        ))}
        {missingSkills.slice(0, 2).map((skill) => (
          <Badge key={skill} variant="warning" className="text-[10px]">
            ! {skill}
          </Badge>
        ))}
      </div>

      <div className="mt-auto pt-4 flex items-center justify-between gap-2 border-t border-border/70">
        <div>
          <p className="text-xs font-semibold text-foreground">{salary}</p>
          <p className="text-[10px] text-muted-foreground">Posted {posted}</p>
        </div>
        <div className="flex items-center gap-2">
          {onViewMatchDetails && (
            <Button size="sm" variant="outline" onClick={onViewMatchDetails} className="text-xs">
              Match Details
            </Button>
          )}
          <Button size="sm" onClick={onView} className="text-xs">
            View Job
          </Button>
        </div>
      </div>
    </Card>
  )
}

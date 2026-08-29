import { useState } from 'react'
import {
  Check,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Info,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ConfidenceLevel } from '@/types/careerInsights'

interface WhyAmISeeingThisProps {
  title?: string
  targetRole?: string
  confidence?: ConfidenceLevel
  confidenceReason?: string
  dataConsidered?: string[]
  matchingFactors?: string[]
  missingFactors?: string[]
  reason?: string
  className?: string
  defaultOpen?: boolean
}

export function WhyAmISeeingThis({
  title = 'Why am I seeing this?',
  targetRole,
  confidence = 'HIGH',
  confidenceReason,
  dataConsidered = [
    'Your target career goal',
    'Verified skills profile & proficiencies',
    'Uploaded resume text & ATS analysis',
    'Completed roadmap milestones',
    'Mock interview performance history',
  ],
  matchingFactors = [],
  missingFactors = [],
  reason,
  className,
  defaultOpen = false,
}: WhyAmISeeingThisProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const confidenceBadgeVariant =
    confidence === 'HIGH' ? 'secondary' : confidence === 'MEDIUM' ? 'warning' : 'outline'

  return (
    <div
      className={cn(
        'rounded-xl border border-primary/20 bg-muted/20 text-xs transition-all duration-200',
        className
      )}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-3 text-left font-medium text-foreground hover:text-primary transition-colors"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-primary shrink-0" />
          <span className="font-semibold">{title}</span>
          {targetRole && (
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              for {targetRole}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={confidenceBadgeVariant} className="text-[9px] uppercase font-bold tracking-wider">
            <ShieldCheck className="h-2.5 w-2.5 mr-1" />
            {confidence} Confidence
          </Badge>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-border/50 p-4 space-y-4 animate-fade-in text-muted-foreground">
          {reason && (
            <div className="rounded-lg border border-primary/15 bg-primary/5 p-3 text-foreground">
              <div className="flex items-center gap-1.5 font-semibold text-primary mb-1">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Recommendation Context</span>
              </div>
              <p className="text-xs leading-relaxed text-foreground/90">{reason}</p>
            </div>
          )}

          {confidenceReason && (
            <div className="text-[11px] flex items-start gap-1.5 text-muted-foreground">
              <Info className="h-3.5 w-3.5 shrink-0 text-cyan-400 mt-0.5" />
              <span>{confidenceReason}</span>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Matching Factors */}
            {matchingFactors.length > 0 && (
              <div>
                <p className="font-semibold text-foreground text-[11px] uppercase tracking-wider mb-2 text-emerald-400 flex items-center gap-1">
                  <Check className="h-3 w-3" /> Positive Matching Factors
                </p>
                <ul className="space-y-1.5">
                  {matchingFactors.map((factor, idx) => (
                    <li key={idx} className="flex items-start gap-1.5 text-[11px] leading-snug">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>{factor}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Missing Factors */}
            {missingFactors.length > 0 && (
              <div>
                <p className="font-semibold text-foreground text-[11px] uppercase tracking-wider mb-2 text-amber-400">
                  Areas For Improvement
                </p>
                <ul className="space-y-1.5">
                  {missingFactors.map((factor, idx) => (
                    <li key={idx} className="flex items-start gap-1.5 text-[11px] leading-snug">
                      <span className="text-amber-400 font-bold">•</span>
                      <span>{factor}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Data Signals Considered */}
          {dataConsidered.length > 0 && (
            <div className="pt-2 border-t border-border/40">
              <p className="text-[10px] uppercase font-semibold text-muted-foreground/80 mb-1.5 tracking-wider">
                Signals Evaluated:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {dataConsidered.map((signal, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center rounded-md bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground border border-border/40"
                  >
                    {signal}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

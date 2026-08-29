import { useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  GripVertical,
  Trash2,
  ChevronRight,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import type { CareerJobApplication } from '@/types/jobs'
import { cn } from '@/lib/utils'

export type KanbanColumn = 'Interested' | 'Applied' | 'Screening' | 'Interview' | 'Final Round' | 'Offer' | 'Closed'

interface ApplicationKanbanProps {
  applications: CareerJobApplication[]
  onStatusChange: (appId: number, newStatus: CareerJobApplication['status']) => Promise<void>
  onDelete: (appId: number) => Promise<void>
  onSelect: (app: CareerJobApplication) => void
  loading?: boolean
}

const statusToColumn = (status: CareerJobApplication['status']): KanbanColumn => {
  switch (status) {
    case 'interested':
      return 'Interested'
    case 'saved':
      return 'Interested'
    case 'applied':
      return 'Applied'
    case 'screening':
      return 'Screening'
    case 'interview':
    case 'technical_round':
      return 'Interview'
    case 'final_round':
      return 'Final Round'
    case 'offer':
      return 'Offer'
    case 'rejected':
    case 'withdrawn':
      return 'Closed'
    default:
      return 'Interested'
  }
}

const columnToStatuses = (column: KanbanColumn): CareerJobApplication['status'][] => {
  switch (column) {
    case 'Interested':
      return ['interested', 'saved']
    case 'Applied':
      return ['applied']
    case 'Screening':
      return ['screening']
    case 'Interview':
      return ['interview', 'technical_round']
    case 'Final Round':
      return ['final_round']
    case 'Offer':
      return ['offer']
    case 'Closed':
      return ['rejected', 'withdrawn']
    default:
      return []
  }
}

const columnOrder: KanbanColumn[] = ['Interested', 'Applied', 'Screening', 'Interview', 'Final Round', 'Offer', 'Closed']

const priorityColor = (priority: string) => {
  switch (priority) {
    case 'HIGH':
      return 'border-rose-500/50 bg-rose-500/10'
    case 'MEDIUM':
      return 'border-amber-500/50 bg-amber-500/10'
    case 'LOW':
      return 'border-slate-500/50 bg-slate-500/10'
    default:
      return 'border-slate-500/30 bg-slate-500/5'
  }
}

export function ApplicationKanban({ applications, onStatusChange, onDelete, onSelect, loading }: ApplicationKanbanProps) {
  const [draggedCard, setDraggedCard] = useState<CareerJobApplication | null>(null)
  const [droppingColumn, setDroppingColumn] = useState<KanbanColumn | null>(null)
  const [updatingIds, setUpdatingIds] = useState<Set<number>>(new Set())

  const groupedByColumn: Record<KanbanColumn, CareerJobApplication[]> = {
    'Interested': [],
    'Applied': [],
    'Screening': [],
    'Interview': [],
    'Final Round': [],
    'Offer': [],
    'Closed': [],
  }

  applications.forEach((app) => {
    const col = statusToColumn(app.status)
    groupedByColumn[col].push(app)
  })

  const handleDragStart = (app: CareerJobApplication) => {
    setDraggedCard(app)
  }

  const handleDragOver = (column: KanbanColumn) => {
    setDroppingColumn(column)
  }

  const handleDragLeave = () => {
    setDroppingColumn(null)
  }

  const handleDrop = async (targetColumn: KanbanColumn) => {
    if (!draggedCard) return

    const currentColumn = statusToColumn(draggedCard.status)
    if (currentColumn === targetColumn) {
      setDraggedCard(null)
      setDroppingColumn(null)
      return
    }

    const newStatuses = columnToStatuses(targetColumn)
    const newStatus = newStatuses[0]

    setUpdatingIds((prev) => new Set([...prev, draggedCard.id]))
    try {
      await onStatusChange(draggedCard.id, newStatus)
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev)
        next.delete(draggedCard.id)
        return next
      })
    }

    setDraggedCard(null)
    setDroppingColumn(null)
  }

  const handleStatusSelectChange = async (appId: number, newStatus: CareerJobApplication['status']) => {
    setUpdatingIds((prev) => new Set([...prev, appId]))
    try {
      await onStatusChange(appId, newStatus)
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev)
        next.delete(appId)
        return next
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-2">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-sm text-muted-foreground">Loading pipeline...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex gap-4 min-w-full p-2 pb-6">
        {columnOrder.map((column) => {
          const cards = groupedByColumn[column]
          const isSuccess = column === 'Offer'
          const isRejected = column === 'Closed'

          return (
            <div
              key={column}
              className={cn(
                'flex flex-col gap-3 w-80 shrink-0 p-4 rounded-xl border-2 transition-all',
                droppingColumn === column
                  ? 'border-primary/80 bg-primary/5'
                  : 'border-border/40 bg-card/50'
              )}
              onDragOver={(e) => {
                e.preventDefault()
                handleDragOver(column)
              }}
              onDragLeave={handleDragLeave}
              onDrop={(e) => {
                e.preventDefault()
                void handleDrop(column)
              }}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm text-foreground">{column}</h3>
                  <Badge variant="secondary" className="text-xs py-0.5 px-1.5">
                    {cards.length}
                  </Badge>
                </div>
                {isSuccess && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                {isRejected && <AlertTriangle className="h-4 w-4 text-amber-400" />}
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-3 min-h-96">
                {cards.length === 0 ? (
                  <div className="flex items-center justify-center h-32 rounded-lg border-2 border-dashed border-border/20 text-center">
                    <p className="text-xs text-muted-foreground">No applications</p>
                  </div>
                ) : (
                  cards.map((app) => (
                    <Card
                      key={app.id}
                      draggable
                      onDragStart={() => handleDragStart(app)}
                      className={cn(
                        'p-4 cursor-grab active:cursor-grabbing transition-all border-l-4',
                        priorityColor(app.priority),
                        updatingIds.has(app.id) && 'opacity-50'
                      )}
                    >
                      <div className="space-y-2">
                        {/* Title & Company */}
                        <div className="flex items-start gap-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-foreground truncate">
                              {app.job_title}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {app.company_name}
                            </p>
                          </div>
                        </div>

                        {/* Location & Type */}
                        {app.location && (
                          <p className="text-xs text-muted-foreground">
                            📍 {app.location} • {app.employment_type}
                          </p>
                        )}

                        {/* Priority Badge */}
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px] py-0.5',
                              app.priority === 'HIGH'
                                ? 'border-rose-500/50 text-rose-400'
                                : app.priority === 'MEDIUM'
                                ? 'border-amber-500/50 text-amber-400'
                                : 'border-slate-500/50 text-slate-400'
                            )}
                          >
                            {app.priority}
                          </Badge>
                          {app.follow_up_at && (
                            <div className="flex items-center gap-0.5 text-[10px] text-cyan-400">
                              <Clock className="h-3 w-3" />
                              <span>Follow-up: {new Date(app.follow_up_at).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>

                        {/* Status Select */}
                        <div className="flex items-center gap-2 pt-2">
                          <Select
                            value={app.status}
                            onChange={(e) => void handleStatusSelectChange(app.id, e.target.value as CareerJobApplication['status'])}
                            className="text-xs"
                            disabled={updatingIds.has(app.id)}
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

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1 pt-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs flex-1"
                            onClick={() => onSelect(app)}
                            disabled={updatingIds.has(app.id)}
                          >
                            <ChevronRight className="h-3 w-3 mr-1" /> Details
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                            onClick={() => void onDelete(app.id)}
                            disabled={updatingIds.has(app.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Bot, Loader2, Send, Sparkles, X } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

type ChatMessage = { id: number; role: 'user' | 'assistant'; content: string }

const quickActions = [
  { label: 'What should I do today?', message: 'What should I do today to improve my career readiness?' },
  { label: 'What should I focus on this week?', message: 'What should I focus on this week based on my skill gaps?' },
  { label: 'Am I job ready?', message: 'Am I ready for my target role jobs right now?' },
  { label: 'Build my 30-day plan', message: 'Build me a structured 30-day career plan.' },
  { label: 'Which jobs should I prioritize?', message: 'Which job openings should I prioritize applying to?' },
  { label: 'Improve my Resume', message: 'How can I improve my resume for my target role?' },
  { label: 'Explain my Skill Gap', message: 'Explain my biggest skill gaps and what I should learn next.' },
  { label: 'Prepare for Interview', message: 'Help me prepare for an interview for my target role.' },
]

const pageName = (pathname: string) => pathname.replace(/^\//, '').replace(/\//g, '-') || 'dashboard'

type StructuredResponse = Record<string, unknown>

const asRecord = (value: unknown): StructuredResponse | null => value && typeof value === 'object' && !Array.isArray(value) ? value as StructuredResponse : null
const asRecords = (value: unknown) => Array.isArray(value) ? value.map(asRecord).filter((item): item is StructuredResponse => item !== null) : []
const textValue = (value: unknown) => typeof value === 'string' ? value : value === null || value === undefined ? '' : String(value)
const titleCase = (value: string) => value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
const readableValue = (value: unknown): string => {
  if (typeof value !== 'object' || value === null) return textValue(value)
  if (Array.isArray(value)) return value.map(readableValue).filter(Boolean).join(' - ')
  return Object.entries(value as StructuredResponse).map(([key, item]) => `${titleCase(key)}: ${readableValue(item)}`).filter(Boolean).join(' · ')
}

const parseStructuredResponse = (content: string): StructuredResponse | null => {
  const trimmed = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return null
  try { return asRecord(JSON.parse(trimmed)) } catch { return null }
}

function MarkdownText({ content }: { content: string }) {
  const lines = content.split(/\r?\n/)
  return <div className="space-y-2">{lines.map((line, index) => {
    const trimmed = line.trim()
    if (!trimmed) return <div key={`${index}-space`} className="h-1" />
    if (/^#{1,3}\s/.test(trimmed)) return <p key={index} className="font-semibold text-foreground">{trimmed.replace(/^#{1,3}\s+/, '')}</p>
    if (/^[-*]\s/.test(trimmed)) return <p key={index} className="flex gap-2"><span className="text-cyan-300">•</span><span>{trimmed.replace(/^[-*]\s+/, '')}</span></p>
    return <p key={index}>{trimmed}</p>
  })}</div>
}

function StructuredCard({ index, title, description, children }: { index?: number; title: string; description?: string; children?: ReactNode }) {
  return <div className="rounded-xl border border-border bg-navy-700/70 p-3.5"><div className="flex items-start gap-3">{index !== undefined ? <span className="pt-0.5 text-xs font-bold tracking-wider text-cyan-300">{String(index).padStart(2, '0')}</span> : null}<div className="min-w-0 flex-1"><p className="font-semibold leading-5 text-foreground">{title}</p>{description ? <p className="mt-2 text-xs leading-5 text-muted-foreground">{description}</p> : null}{children}</div></div></div>
}

function StructuredResponseView({ data }: { data: StructuredResponse }) {
  const steps = asRecords(data.improvement_steps)
  if (steps.length) return <div className="space-y-3"><p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">AI Insight</p><p className="text-sm">Here are the best ways to improve your resume:</p>{steps.map((item, index) => <StructuredCard key={index} index={Number(item.step) || index + 1} title={textValue(item.title) || 'Recommended improvement'} description={textValue(item.description)} />)}</div>

  const gaps = asRecords(data.skill_gaps)
  if (gaps.length) return <div className="space-y-3"><p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">AI Insight</p><p className="text-sm">Here are the skill gaps to focus on:</p>{gaps.map((item, index) => <StructuredCard key={index} title={textValue(item.skill) || 'Skill gap'} description={textValue(item.reason)}><Badge className="mt-2" variant={String(item.priority).toLowerCase() === 'high' ? 'danger' : String(item.priority).toLowerCase() === 'medium' ? 'warning' : 'secondary'}>{textValue(item.priority) || 'Priority'}</Badge></StructuredCard>)}</div>

  const weeks = asRecords(data.learning_plan)
  if (weeks.length) return <div className="space-y-3"><p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">AI Insight</p><p className="text-sm">Your suggested learning plan:</p>{weeks.map((item, index) => <StructuredCard key={index} index={Number(item.week) || index + 1} title={textValue(item.topic) || `Week ${index + 1}`}><div className="mt-2 space-y-1 text-xs leading-5 text-muted-foreground">{Array.isArray(item.tasks) ? item.tasks.map((task, taskIndex) => <p key={taskIndex}>• {textValue(task)}</p>) : null}</div></StructuredCard>)}</div>

  const questions = asRecords(data.questions)
  if (questions.length) return <div className="space-y-3"><p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">AI Insight</p>{questions.map((item, index) => <StructuredCard key={index} index={index + 1} title={textValue(item.question) || 'Interview question'}>{item.difficulty ? <Badge className="mt-2" variant="secondary">{textValue(item.difficulty)}</Badge> : null}</StructuredCard>)}</div>

  const jobs = asRecords(data.jobs)
  if (jobs.length) return <div className="space-y-3"><p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">AI Insight</p>{jobs.map((item, index) => <StructuredCard key={index} index={index + 1} title={textValue(item.title) || 'Recommended role'} description={textValue(item.reason)} />)}</div>

  const projects = asRecords(data.project_recommendations)
  if (projects.length) return <div className="space-y-3"><p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">AI Insight</p><p className="text-sm">Project ideas to strengthen your profile:</p>{projects.map((item, index) => <StructuredCard key={index} index={index + 1} title={textValue(item.title) || textValue(item.project) || 'Recommended project'} description={textValue(item.description) || textValue(item.reason)} />)}</div>

  const sections = Object.entries(data).filter(([key, value]) => key !== 'type' && value !== null && value !== undefined && value !== '')
  return <div className="space-y-3"><p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">AI Insight</p>{sections.map(([key, value]) => <div key={key}><p className="text-xs font-semibold text-cyan-300">{titleCase(key)}</p>{Array.isArray(value) ? <div className="mt-1 space-y-1 text-sm">{value.map((item, index) => <p key={index}>{readableValue(item)}</p>)}</div> : <p className="mt-1 text-sm leading-6">{readableValue(value)}</p>}</div>)}</div>
}

function AssistantResponse({ content }: { content: string }) {
  const structured = parseStructuredResponse(content)
  return <div className="min-w-0 break-words">{structured ? <StructuredResponseView data={structured} /> : <MarkdownText content={content} />}</div>
}

export function CareerAICopilot({ open, onClose }: { open: boolean; onClose: () => void }) {
  const location = useLocation()
  const endRef = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, pending])

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  const sendMessage = async (value = draft) => {
    const message = value.trim()
    if (!message || pending) return
    setDraft('')
    setError('')
    setMessages((current) => [...current, { id: Date.now(), role: 'user', content: message }])
    setPending(true)
    let requestTimeout: number | undefined
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      if (!token) throw new Error('Your session has expired. Please sign in again.')
      const controller = new AbortController()
      requestTimeout = window.setTimeout(() => controller.abort(), 20000)
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, conversationId: null, page: pageName(location.pathname) }),
        signal: controller.signal,
      })
      const result = await response.json().catch(() => null) as { answer?: string; error?: string } | null
      if (!response.ok || !result?.answer) throw new Error(result?.error || 'Chat response unavailable.')
      setMessages((current) => [...current, { id: Date.now() + 1, role: 'assistant', content: result.answer! }])
    } catch (sendError) {
      setError(sendError instanceof DOMException && sendError.name === 'AbortError' ? 'I\'m temporarily unable to generate an AI response. Your CareerAI data is safe. Please try again.' : sendError instanceof Error ? sendError.message : 'I\'m temporarily unable to generate an AI response. Please try again.')
    } finally {
      if (requestTimeout !== undefined) window.clearTimeout(requestTimeout)
      setPending(false)
    }
  }

  return (
    <>
      {open ? <button type="button" aria-label="Close CareerAI Copilot" onClick={onClose} className="fixed inset-0 z-40 bg-navy-900/60 backdrop-blur-sm" /> : null}
      <aside className={cn('fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-white/10 bg-navy-800 shadow-lift transition-transform duration-300 sm:w-[min(440px,100vw)]', open ? 'translate-x-0' : 'translate-x-full')} aria-hidden={!open}>
        <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gradient text-white"><Sparkles className="h-5 w-5" /></span>
            <div><p className="font-semibold">CareerAI Copilot</p><p className="flex items-center gap-1.5 text-xs text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Available</p></div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close CareerAI Copilot" className="rounded-lg p-2 text-muted-foreground hover:bg-white/5 hover:text-foreground"><X className="h-5 w-5" /></button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {!messages.length ? <div className="rounded-xl border border-primary/15 bg-brand-soft p-4"><div className="flex items-start gap-3"><Bot className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" /><p className="text-sm leading-6">Hi! I&apos;m CareerAI Copilot. I can help you with your resume, skills, career roadmap, jobs and interview preparation.</p></div></div> : null}
          {!messages.length ? <div className="mt-5 flex flex-wrap gap-2">{quickActions.map((action) => <button key={action.label} type="button" onClick={() => void sendMessage(action.message)} disabled={pending} className="rounded-lg border border-border bg-secondary/70 px-3 py-2 text-left text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-50">{action.label}</button>)}</div> : null}
          <div className="mt-5 space-y-4">{messages.map((message) => <div key={message.id} className={cn('flex min-w-0 gap-2', message.role === 'user' ? 'justify-end' : 'justify-start')}><div className={cn('max-w-[85%] min-w-0 overflow-hidden rounded-2xl px-4 py-3 text-sm leading-6', message.role === 'user' ? 'whitespace-pre-wrap rounded-br-md bg-brand-gradient text-white' : 'rounded-bl-md border border-border bg-secondary text-foreground')}>{message.role === 'user' ? message.content : <AssistantResponse content={message.content} />}</div></div>)}{pending ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin text-primary" />Thinking...</div> : null}<div ref={endRef} /></div>
          {error ? <div role="alert" className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-xs leading-5 text-rose-300"><span>{error}</span><button type="button" className="shrink-0 font-semibold text-rose-200 underline underline-offset-2 hover:text-white" onClick={() => { const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user'); if (lastUserMessage) void sendMessage(lastUserMessage.content) }}>Retry</button></div> : null}
        </div>

        <form className="shrink-0 border-t border-white/10 p-4" onSubmit={(event) => { event.preventDefault(); void sendMessage() }}>
          <div className="flex items-end gap-2 rounded-xl border border-border bg-input/80 p-2"><textarea value={draft} onChange={(event) => setDraft(event.target.value.slice(0, 4000))} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void sendMessage() } }} placeholder="Ask about your career..." rows={2} disabled={pending} className="min-h-10 flex-1 resize-none bg-transparent px-2 py-1 text-sm text-foreground outline-none placeholder:text-muted-foreground" /><Button type="submit" size="icon" aria-label="Send message" disabled={pending || !draft.trim()}><Send className="h-4 w-4" /></Button></div>
          <p className="mt-2 text-[11px] text-muted-foreground">CareerAI Copilot uses your connected career data.</p>
        </form>
      </aside>
    </>
  )
}

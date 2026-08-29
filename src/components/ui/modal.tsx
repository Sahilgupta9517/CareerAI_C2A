import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children?: React.ReactNode
  footer?: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl'
  position?: 'center' | 'top'
}

const sizeClasses: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
}

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
  size = 'lg',
  position = 'top',
}: ModalProps) {
  const positionClass =
    position === 'top'
      ? 'top-6 md:top-8 left-1/2 -translate-x-1/2 max-h-[92vh]'
      : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-h-[90vh]'

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md data-[state=open]:animate-fade-in" />
        <DialogPrimitive.Content
          className={cn(
            'fixed z-50 flex w-[calc(100%-2rem)] flex-col overflow-hidden rounded-2xl border border-border/80 bg-card p-6 shadow-2xl data-[state=open]:animate-scale-in',
            positionClass,
            sizeClasses[size] || sizeClasses.lg,
            className
          )}
          style={{ borderColor: 'rgba(148,163,184,0.2)' }}
        >
          <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-3 pr-8">
            <div>
              <DialogPrimitive.Title className="text-xl font-bold text-foreground">
                {title}
              </DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">
                  {description}
                </DialogPrimitive.Description>
              ) : null}
            </div>
          </div>
          <div className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 pb-1">
            {children}
          </div>
          {footer ? (
            <div className="mt-4 flex shrink-0 justify-end gap-3 border-t border-border/60 pt-4">
              {footer}
            </div>
          ) : null}
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}


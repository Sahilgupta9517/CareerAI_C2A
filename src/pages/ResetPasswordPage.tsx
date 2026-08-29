import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Logo } from '@/components/common/Logo'
import { useToast } from '@/components/common/Toast'
import { supabase } from '@/lib/supabase'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isValidToken, setIsValidToken] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const verifyRecoverySession = async () => {
      // 1. Check URL hash (e.g. #access_token=XXX&type=recovery)
      const hash = window.location.hash
      const hashParams = new URLSearchParams(hash.replace('#', '?'))
      const hashType = hashParams.get('type')
      const hashAccessToken = hashParams.get('access_token')

      // 2. Check query params (e.g. ?code=XXX for PKCE flow)
      const searchParams = new URLSearchParams(window.location.search)
      const code = searchParams.get('code')

      if (hashType === 'recovery' && hashAccessToken) {
        try {
          const { error } = await supabase.auth.setSession({
            access_token: hashAccessToken,
            refresh_token: hashParams.get('refresh_token') ?? '',
          })
          if (error) throw error
          setIsValidToken(true)
        } catch {
          setErrorMessage('This reset link is invalid or has expired. Please request a new one.')
        }
      } else if (code) {
        try {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
          setIsValidToken(true)
        } catch {
          setErrorMessage('This reset link is invalid or has expired. Please request a new one.')
        }
      } else {
        // 3. Check if an active authenticated session already exists
        const { data } = await supabase.auth.getSession()
        if (data.session) {
          setIsValidToken(true)
        } else {
          setErrorMessage('This reset link is invalid. Please request a new password reset from the login page.')
        }
      }
      setChecking(false)
    }

    void verifyRecoverySession()
  }, [])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setErrorMessage('')

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.')
      return
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      toast({ title: 'Password updated', description: 'You can now sign in with your new password.', tone: 'success' })
      await supabase.auth.signOut()
      navigate('/login')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not update password. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md animate-fade-up rounded-2xl border border-border/70 bg-card/70 p-6 shadow-lift backdrop-blur-sm sm:p-8">
        <div className="mb-8">
          <Logo />
        </div>

        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Set new password</h1>
        <p className="mt-2 text-sm text-muted-foreground">Enter a new password for your account.</p>

        {checking ? (
          <div className="mt-10 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Verifying reset link" />
          </div>
        ) : !isValidToken ? (
          <div className="mt-6 space-y-4">
            {errorMessage ? (
              <p role="alert" className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
                {errorMessage}
              </p>
            ) : null}
            <Button className="w-full" onClick={() => navigate('/login')}>
              Back to Login
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="new-password">New password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="Min. 6 characters"
                  className="pl-10 pr-11"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-new-password">Confirm new password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="confirm-new-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  className="pl-10"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </div>
            </div>

            {errorMessage ? (
              <p role="alert" className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
                {errorMessage}
              </p>
            ) : null}

            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {submitting ? 'Updating password...' : 'Set New Password'}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}

import { createClient } from '@supabase/supabase-js'

export const getSupabaseClient = (authHeader: string | undefined) => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!supabaseUrl || !supabaseAnonKey) throw new Error('Supabase server configuration is missing.')

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: authHeader ? { Authorization: authHeader } : {},
    },
    auth: {
      persistSession: false,
    }
  })
}

export interface ProfileDetails {
  id: number
  user_id: string
  name: string | null
  education: string | null
  branch: string | null
  graduation_year: string | null
  experience: string | null
  location: string | null
  is_admin?: boolean | null
}

export interface AiTelemetryInput {
  profileId?: number | null
  feature: string
  provider: string
  model?: string
  status: 'success' | 'failure' | 'fallback' | 'timeout' | 'rate_limit'
  statusCode?: number
  durationMs: number
  fallbackUsed?: boolean
}

export interface AuditLogInput {
  profileId?: number | null
  event: string
  details?: Record<string, unknown>
}

export interface SystemErrorInput {
  endpoint: string
  feature: string
  category: '429' | '500' | 'timeout' | 'malformed_response' | 'auth_error'
  message?: string
}

// In-memory telemetry fallback buffer in case DB table is unreachable
const memoryTelemetryLogs: AiTelemetryInput[] = []
const memoryAuditLogs: (AuditLogInput & { createdAt: string })[] = []
const memorySystemErrors: (SystemErrorInput & { createdAt: string })[] = []

export const dbService = {
  async getUserAndProfile(authHeader: string | undefined): Promise<{ userId: string; profile: ProfileDetails }> {
    if (!authHeader) throw new Error('Authorization header is missing.')
    
    const supabase = getSupabaseClient(authHeader)
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user) {
      throw new Error(userError?.message || 'Invalid user session.')
    }

    const userId = userData.user.id

    // Fetch profile
    let { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle()

    if (profileError) {
      console.error('getUserAndProfile database fetch error:', profileError)
    }

    // Auto-create profile if missing
    if (!profile) {
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({ user_id: userId })
        .select('*')
        .single()

      if (insertError) {
        throw new Error(`Failed to create user profile: ${insertError.message}`)
      }
      profile = newProfile
    }

    return { userId, profile: profile as ProfileDetails }
  },

  async checkIsAdmin(authHeader: string | undefined): Promise<boolean> {
    try {
      if (!authHeader) return false
      const supabase = getSupabaseClient(authHeader)
      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user || !userData.user.email) return false

      const targetAdminEmail = (process.env.ADMIN_EMAIL || 'familystudio790@gmail.com').trim().toLowerCase()
      const userEmail = userData.user.email.trim().toLowerCase()

      if (userEmail !== targetAdminEmail) {
        return false
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('user_id', userData.user.id)
        .limit(1)
        .maybeSingle()

      if (profile && profile.is_admin === false) {
        return false
      }

      return true
    } catch {
      return false
    }
  },

  async logAiRequest(authHeader: string | undefined, telemetry: AiTelemetryInput) {
    memoryTelemetryLogs.push(telemetry)
    if (memoryTelemetryLogs.length > 500) memoryTelemetryLogs.shift()

    try {
      const supabase = getSupabaseClient(authHeader)
      await supabase.from('ai_request_logs').insert({
        profile_id: telemetry.profileId ?? null,
        feature: telemetry.feature,
        provider: telemetry.provider,
        model: telemetry.model ?? null,
        status: telemetry.status,
        status_code: telemetry.statusCode ?? null,
        duration_ms: telemetry.durationMs,
        fallback_used: Boolean(telemetry.fallbackUsed),
      })
    } catch (err) {
      if (process.env.NODE_ENV === 'development') console.warn('[Telemetry] DB insert skipped:', err)
    }
  },

  async logAuditEvent(authHeader: string | undefined, audit: AuditLogInput) {
    memoryAuditLogs.push({ ...audit, createdAt: new Date().toISOString() })
    if (memoryAuditLogs.length > 200) memoryAuditLogs.shift()

    try {
      const supabase = getSupabaseClient(authHeader)
      await supabase.from('audit_logs').insert({
        profile_id: audit.profileId ?? null,
        event: audit.event,
        details: audit.details ?? null,
      })
    } catch (err) {
      if (process.env.NODE_ENV === 'development') console.warn('[Audit] DB insert skipped:', err)
    }
  },

  async logSystemError(authHeader: string | undefined, sysErr: SystemErrorInput) {
    memorySystemErrors.push({ ...sysErr, createdAt: new Date().toISOString() })
    if (memorySystemErrors.length > 200) memorySystemErrors.shift()

    try {
      const supabase = getSupabaseClient(authHeader)
      await supabase.from('system_errors').insert({
        endpoint: sysErr.endpoint,
        feature: sysErr.feature,
        category: sysErr.category,
        message: sysErr.message ?? null,
      })
    } catch (err) {
      if (process.env.NODE_ENV === 'development') console.warn('[SystemErrors] DB insert skipped:', err)
    }
  },

  getMemoryTelemetryLogs() {
    return memoryTelemetryLogs
  },

  getMemoryAuditLogs() {
    return memoryAuditLogs
  },

  getMemorySystemErrors() {
    return memorySystemErrors
  }
}


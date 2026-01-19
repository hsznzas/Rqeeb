import { 
  createContext, 
  useContext, 
  useEffect, 
  useState, 
  useCallback, 
  useRef,
  type ReactNode 
} from 'react'
import { supabase } from '@/services/supabase'
import type { User, Session, AuthError } from '@supabase/supabase-js'
import type { Profile } from '@/types/database'
import type { Currency } from '@/lib/currency'

// Auth loading phases for debugging
type LoadingPhase = 
  | 'initializing'
  | 'checking_session' 
  | 'fetching_profile'
  | 'ready'

// Auth state interface
interface AuthState {
  user: User | null
  session: Session | null
  profile: Profile | null
  isLoading: boolean
  isAuthenticated: boolean
  loadingPhase: LoadingPhase
}

// Auth context interface
interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
  signInWithDemo: () => Promise<{ error: AuthError | null }>
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>
  refreshProfile: () => Promise<void>
  defaultCurrency: Currency
  loadingPhaseText: string  // Human-readable loading status
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Demo credentials
const DEMO_EMAIL = 'demo@rqeeb.app'
const DEMO_PASSWORD = 'demo123456'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    isLoading: true,
    isAuthenticated: false,
    loadingPhase: 'initializing',
  })
  
  // Track initialization and mount status
  const initializedRef = useRef(false)
  const mountedRef = useRef(true)

  // Safe setState that checks if component is still mounted
  const safeSetState = useCallback((newState: AuthState | ((prev: AuthState) => AuthState)) => {
    if (mountedRef.current) {
      setState(newState)
    }
  }, [])

  // Fetch user profile (non-blocking, with error handling)
  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.warn('Profile fetch warning:', error.message)
        return null
      }

      return data as Profile
    } catch (error) {
      console.warn('Profile fetch failed:', error)
      return null
    }
  }, [])

  // Initialize auth state - runs ONCE on mount
  useEffect(() => {
    // Prevent double initialization (React StrictMode)
    if (initializedRef.current) {
      return
    }
    initializedRef.current = true
    mountedRef.current = true

    console.log('[Auth] Initializing...')
    
    // Update phase to show we're checking session
    safeSetState(prev => ({ ...prev, loadingPhase: 'checking_session' }))

    const initAuth = async () => {
      try {
        // Get current session
        console.log('[Auth] Checking session with Supabase...')
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (!mountedRef.current) return // Component unmounted
        
        if (error) {
          console.error('[Auth] Session error:', error.message)
          safeSetState({
            user: null,
            session: null,
            profile: null,
            isLoading: false,
            isAuthenticated: false,
            loadingPhase: 'ready',
          })
          return
        }

        if (session?.user) {
          console.log('[Auth] Session found, user:', session.user.email)
          
          // Set authenticated immediately (don't wait for profile)
          safeSetState({
            user: session.user,
            session: session,
            profile: null,
            isLoading: false,
            isAuthenticated: true,
            loadingPhase: 'fetching_profile',
          })
          
          // Fetch profile in background
          fetchProfile(session.user.id).then(profile => {
            if (mountedRef.current) {
              setState(prev => ({ ...prev, profile, loadingPhase: 'ready' }))
            }
          })
        } else {
          console.log('[Auth] No session found')
          safeSetState({
            user: null,
            session: null,
            profile: null,
            isLoading: false,
            isAuthenticated: false,
            loadingPhase: 'ready',
          })
        }
      } catch (error) {
        console.error('[Auth] Init error:', error)
        safeSetState({
          user: null,
          session: null,
          profile: null,
          isLoading: false,
          isAuthenticated: false,
          loadingPhase: 'ready',
        })
      }
    }

    initAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] Event:', event, session?.user?.email || 'no user')
        
        if (!mountedRef.current) return
        
        // Handle specific events only
        switch (event) {
          case 'SIGNED_IN':
            if (session?.user) {
              safeSetState({
                user: session.user,
                session: session,
                profile: null,
                isLoading: false,
                isAuthenticated: true,
                loadingPhase: 'fetching_profile',
              })
              // Fetch profile in background
              fetchProfile(session.user.id).then(profile => {
                if (mountedRef.current) {
                  setState(prev => ({ ...prev, profile, loadingPhase: 'ready' }))
                }
              })
            }
            break
            
          case 'SIGNED_OUT':
            safeSetState({
              user: null,
              session: null,
              profile: null,
              isLoading: false,
              isAuthenticated: false,
              loadingPhase: 'ready',
            })
            break
            
          case 'TOKEN_REFRESHED':
            // Only update session, keep everything else
            if (session) {
              setState(prev => ({
                ...prev,
                session: session,
                user: session.user,
              }))
            }
            break
            
          case 'INITIAL_SESSION':
            // Ignore - we handle this in initAuth
            break
            
          case 'USER_UPDATED':
            // Update user object
            if (session?.user) {
              setState(prev => ({
                ...prev,
                user: session.user,
              }))
            }
            break
            
          default:
            // Ignore unknown events
            console.log('[Auth] Unhandled event:', event)
        }
      }
    )

    return () => {
      console.log('[Auth] Cleanup')
      mountedRef.current = false
      initializedRef.current = false  // Reset for StrictMode re-mount
      subscription.unsubscribe()
    }
  }, [fetchProfile, safeSetState])

  // Sign in with email/password
  const signIn = useCallback(async (email: string, password: string) => {
    console.log('[Auth] Signing in:', email)
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error('[Auth] Sign in error:', error.message)
    }
    // onAuthStateChange will handle state update on success

    return { error }
  }, [])

  // Sign up with email/password
  const signUp = useCallback(async (email: string, password: string) => {
    console.log('[Auth] Signing up:', email)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
      },
    })

    if (error) {
      console.error('[Auth] Sign up error:', error.message)
    }

    return { error }
  }, [])

  // Sign out
  const signOut = useCallback(async () => {
    console.log('[Auth] Signing out')
    
    // Clear state immediately for instant UI feedback
    safeSetState({
      user: null,
      session: null,
      profile: null,
      isLoading: false,
      isAuthenticated: false,
      loadingPhase: 'ready',
    })
    
    // Then tell Supabase (don't await - fire and forget)
    supabase.auth.signOut().catch(err => {
      console.error('[Auth] Sign out error:', err)
    })
  }, [safeSetState])

  // Sign in with demo account
  const signInWithDemo = useCallback(async () => {
    console.log('[Auth] Demo login')
    return signIn(DEMO_EMAIL, DEMO_PASSWORD)
  }, [signIn])

  // Refresh profile from database
  const refreshProfile = useCallback(async () => {
    if (!state.user) return
    
    const profile = await fetchProfile(state.user.id)
    if (mountedRef.current) {
      setState(prev => ({ ...prev, profile }))
    }
  }, [state.user, fetchProfile])

  // Update user profile
  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!state.user) {
      return { error: new Error('Not authenticated') }
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates as never)
        .eq('id', state.user.id)

      if (error) {
        return { error: new Error(error.message) }
      }

      // Update local state immediately
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          profile: prev.profile ? { ...prev.profile, ...updates } : null
        }))
      }

      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }, [state.user])

  // Get default currency from profile, fallback to SAR
  const defaultCurrency: Currency = (state.profile?.default_currency as Currency) || 'SAR'

  // Human-readable loading phase text for debugging
  const loadingPhaseText = {
    initializing: 'Starting up...',
    checking_session: 'Connecting to Supabase...',
    fetching_profile: 'Loading your profile...',
    ready: 'Ready',
  }[state.loadingPhase]

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signIn,
        signUp,
        signOut,
        signInWithDemo,
        updateProfile,
        refreshProfile,
        defaultCurrency,
        loadingPhaseText,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

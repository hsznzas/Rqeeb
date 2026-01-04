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

// Auth state interface
interface AuthState {
  user: User | null
  session: Session | null
  profile: Profile | null
  isLoading: boolean
  isAuthenticated: boolean
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
  })
  
  // Track if initial auth check is done
  const initializedRef = useRef(false)

  // Fetch user profile (non-blocking)
  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        // Profile might not exist yet or missing columns - that's okay
        console.warn('Profile fetch warning:', error.message)
        return null
      }

      return data as Profile
    } catch (error) {
      // Network error - don't block auth
      console.warn('Profile fetch failed:', error)
      return null
    }
  }, [])

  // Initialize auth state - runs once on mount
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth initialization error:', error)
          setState({
            user: null,
            session: null,
            profile: null,
            isLoading: false,
            isAuthenticated: false,
          })
          return
        }

        if (session?.user) {
          // User is logged in - fetch profile in background
          const profile = await fetchProfile(session.user.id)
          setState({
            user: session.user,
            session: session,
            profile,
            isLoading: false,
            isAuthenticated: true,
          })
        } else {
          // No session
          setState({
            user: null,
            session: null,
            profile: null,
            isLoading: false,
            isAuthenticated: false,
          })
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        setState({
          user: null,
          session: null,
          profile: null,
          isLoading: false,
          isAuthenticated: false,
        })
      }
    }

    initAuth()

    // Listen for auth changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event)
        
        // Only handle actual auth state changes, not token refreshes
        if (event === 'SIGNED_IN') {
          if (session?.user) {
            const profile = await fetchProfile(session.user.id)
            setState({
              user: session.user,
              session: session,
              profile,
              isLoading: false,
              isAuthenticated: true,
            })
          }
        } else if (event === 'SIGNED_OUT') {
          setState({
            user: null,
            session: null,
            profile: null,
            isLoading: false,
            isAuthenticated: false,
          })
        } else if (event === 'TOKEN_REFRESHED' && session) {
          // Just update session, don't refetch profile or change loading state
          setState(prev => ({
            ...prev,
            session: session,
            user: session.user,
          }))
        }
        // Ignore INITIAL_SESSION - we handle that in initAuth
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  // Sign in with email/password
  const signIn = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true }))
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setState(prev => ({ ...prev, isLoading: false }))
    }
    // If successful, onAuthStateChange will handle the state update

    return { error }
  }, [])

  // Sign up with email/password
  const signUp = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true }))

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
      },
    })

    if (error) {
      setState(prev => ({ ...prev, isLoading: false }))
    }

    return { error }
  }, [])

  // Sign out
  const signOut = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }))
    await supabase.auth.signOut()
    // onAuthStateChange will handle the state update
  }, [])

  // Sign in with demo account
  const signInWithDemo = useCallback(async () => {
    console.log('Demo mode activated')
    return signIn(DEMO_EMAIL, DEMO_PASSWORD)
  }, [signIn])

  // Refresh profile from database
  const refreshProfile = useCallback(async () => {
    if (!state.user) return
    
    const profile = await fetchProfile(state.user.id)
    setState(prev => ({ ...prev, profile }))
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
      setState(prev => ({
        ...prev,
        profile: prev.profile ? { ...prev.profile, ...updates } : null
      }))

      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }, [state.user])

  // Get default currency from profile, fallback to SAR
  const defaultCurrency: Currency = (state.profile?.default_currency as Currency) || 'SAR'

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

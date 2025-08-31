import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { authService } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signUp: (email: string, password: string, fullName?: string) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<void>
  isAuthenticated: boolean
  // Google Drive integration
  googleDriveConnected: boolean
  connectGoogleDrive: () => Promise<void>
  disconnectGoogleDrive: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [googleDriveConnected, setGoogleDriveConnected] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    // Check if this is a Google Drive OAuth callback
    const urlParams = new URLSearchParams(window.location.search)
    const isGoogleDriveCallback = urlParams.get('google_drive_auth') === 'success'
    
    const initializeAuth = async () => {
      try {
        // For OAuth callbacks, give Supabase a moment to restore the session
        if (isGoogleDriveCallback) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
        
        const { session } = await authService.getCurrentSession()
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
        
        // If this is a Google Drive callback and user is authenticated, store the tokens
        if (isGoogleDriveCallback && session?.user) {
          const accessToken = urlParams.get('access_token')
          const refreshToken = urlParams.get('refresh_token')
          
          if (accessToken) {
            localStorage.setItem('google_drive_tokens', JSON.stringify({
              accessToken,
              refreshToken
            }))
            
            // Clean up URL without full page reload
            window.history.replaceState({}, document.title, window.location.pathname)
            
            toast({
              title: "Google Drive Connected",
              description: "Successfully connected to Google Drive",
            })
          }
        } else if (isGoogleDriveCallback && !session?.user) {
          // If OAuth callback but no session, the user might have been logged out
          console.warn('Google Drive OAuth callback received but user not authenticated')
          // Clean up URL anyway
          window.history.replaceState({}, document.title, window.location.pathname)
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        setLoading(false)
      }
    }
    
    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = authService.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.email)
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)

      if (event === 'SIGNED_IN') {
        toast({
          title: "Welcome back!",
          description: `Signed in as ${session?.user?.email}`,
        })
      } else if (event === 'SIGNED_OUT') {
        // Clear Google Drive tokens on sign out
        localStorage.removeItem('google_drive_tokens')
        setGoogleDriveConnected(false)
        toast({
          title: "Signed out",
          description: "You have been signed out successfully",
        })
      }
    })

    return () => subscription.unsubscribe()
  }, [toast])

  // Check for Google Drive connection status
  useEffect(() => {
    const checkGoogleDriveConnection = () => {
      try {
        const stored = localStorage.getItem('google_drive_tokens')
        setGoogleDriveConnected(!!stored)
      } catch (error) {
        console.error('Error checking Google Drive connection:', error)
        setGoogleDriveConnected(false)
      }
    }

    checkGoogleDriveConnection()
    
    // Check periodically (in case tokens expire)
    const interval = setInterval(checkGoogleDriveConnection, 30000) // Check every 30 seconds
    
    return () => clearInterval(interval)
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      const { data, error } = await authService.signIn(email, password)
      
      if (error) {
        return { success: false, error: error.message }
      }
      
      return { success: true }
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' }
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      setLoading(true)
      const { data, error } = await authService.signUp(email, password, { fullName })
      
      if (error) {
        return { success: false, error: error.message }
      }
      
      toast({
        title: "Account created!",
        description: "Please check your email to verify your account.",
      })
      
      return { success: true }
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      await authService.signOut()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const connectGoogleDrive = async () => {
    try {
      // Get auth URL from backend
      const headers: HeadersInit = {}
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`
      }

      const response = await fetch('/api/google-drive/auth-url', { headers })
      
      if (!response.ok) {
        throw new Error('Failed to get Google Drive authorization URL')
      }
      
      const { authUrl } = await response.json()
      
      // Use popup instead of redirect to preserve session
      const popup = window.open(
        authUrl,
        'googleAuth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      )
      
      if (!popup) {
        // Fallback to redirect if popup is blocked
        window.location.href = authUrl
        return
      }
      
      // Listen for popup to close or send message
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed)
          // Check if tokens were stored (popup might have completed auth)
          setTimeout(() => {
            const stored = localStorage.getItem('google_drive_tokens')
            if (stored) {
              setGoogleDriveConnected(true)
              toast({
                title: "Google Drive Connected",
                description: "Successfully connected to Google Drive",
              })
            }
          }, 1000)
        }
      }, 1000)
      
      // Clean up interval after 5 minutes
      setTimeout(() => clearInterval(checkClosed), 300000)
      
    } catch (error) {
      console.error('Google Drive auth error:', error)
      toast({
        title: "Authentication Failed",
        description: "Failed to authenticate with Google Drive",
        variant: "destructive"
      })
    }
  }

  const disconnectGoogleDrive = () => {
    localStorage.removeItem('google_drive_tokens')
    setGoogleDriveConnected(false)
    toast({
      title: "Disconnected",
      description: "Google Drive has been disconnected"
    })
  }

  const value: AuthContextType = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    isAuthenticated: !!user,
    googleDriveConnected,
    connectGoogleDrive,
    disconnectGoogleDrive
  }

  return (
    <AuthContext.Provider value={value}>
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

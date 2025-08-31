import { ReactNode, useEffect } from 'react'
import { useLocation } from 'wouter'
import { useAuth } from '@/contexts/auth-context'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading } = useAuth()
  const [, setLocation] = useLocation()

  useEffect(() => {
    // Check if this is an OAuth callback - if so, don't redirect to sign in
    const urlParams = new URLSearchParams(window.location.search)
    const isOAuthCallback = urlParams.get('google_drive_auth') === 'success'
    
    if (!loading && !isAuthenticated && !isOAuthCallback) {
      setLocation('/auth/signin')
    }
  }, [isAuthenticated, loading, setLocation])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null // Will redirect via useEffect
  }

  return <>{children}</>
}

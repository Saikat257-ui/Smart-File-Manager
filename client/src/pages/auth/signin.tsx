import { useEffect } from 'react'
import { useLocation } from 'wouter'
import { AuthLayout } from '@/components/auth/auth-layout'
import { SignIn } from '@/components/auth/sign-in'
import { useAuth } from '@/contexts/auth-context'

export default function SignInPage() {
  const [, setLocation] = useLocation()
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    if (isAuthenticated) {
      setLocation('/')
    }
  }, [isAuthenticated, setLocation])

  return (
    <AuthLayout>
      <SignIn onSuccess={() => setLocation('/')} />
    </AuthLayout>
  )
}

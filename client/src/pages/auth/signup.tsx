import { useEffect } from 'react'
import { useLocation } from 'wouter'
import { AuthLayout } from '@/components/auth/auth-layout'
import { SignUp } from '@/components/auth/sign-up'
import { useAuth } from '@/contexts/auth-context'

export default function SignUpPage() {
  const [, setLocation] = useLocation()
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    if (isAuthenticated) {
      setLocation('/')
    }
  }, [isAuthenticated, setLocation])

  return (
    <AuthLayout>
      <SignUp onSuccess={() => setLocation('/auth/signin')} />
    </AuthLayout>
  )
}

import { Request, Response, NextFunction } from 'express'
import { createClient } from '@supabase/supabase-js'
import { config } from '../config'

const supabase = createClient(config.supabase.url, config.supabase.anonKey)

declare global {
  namespace Express {
    interface Request {
      userId?: string
      user?: any
      accessToken?: string
    }
  }
}

export async function authenticateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No valid authentication token provided' })
    }

    const token = authHeader.split(' ')[1]
    
    // Verify the JWT token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid authentication token' })
    }

    // Add user information to request
    req.userId = user.id
    req.user = user
    req.accessToken = token
    
    next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    return res.status(500).json({ error: 'Internal server error during authentication' })
  }
}

// Optional auth middleware (for routes that can work with or without auth)
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      const { data: { user } } = await supabase.auth.getUser(token)
      
      if (user) {
        req.userId = user.id
        req.user = user
      }
    }
    
    next()
  } catch (error) {
    // Don't block the request for optional auth errors
    console.error('Optional auth error:', error)
    next()
  }
}

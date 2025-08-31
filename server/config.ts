import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Export environment variables with defaults
export const config = {
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  },
  database: {
    url: process.env.DATABASE_URL || ''
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || ''
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback'
  },
  server: {
    port: parseInt(process.env.PORT || '5000', 10),
    env: process.env.NODE_ENV || 'development',
    host: process.env.HOST || 'localhost'
  }
};

// Validate required environment variables
export function validateConfig() {
  const requiredVars = [
    { key: 'SUPABASE_URL', value: config.supabase.url },
    { key: 'SUPABASE_ANON_KEY', value: config.supabase.anonKey },
    { key: 'DATABASE_URL', value: config.database.url },
    { key: 'GEMINI_API_KEY', value: config.gemini.apiKey },
    { key: 'GOOGLE_CLIENT_ID', value: config.google.clientId },
    { key: 'GOOGLE_CLIENT_SECRET', value: config.google.clientSecret }
  ];

  const missingVars = requiredVars.filter(v => !v.value);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.map(v => v.key).join(', ')}`);
  }
}
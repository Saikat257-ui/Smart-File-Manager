import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
  thumbnailLink?: string;
  parents?: string[];
  isFolder: boolean;
}

export function useGoogleDrive() {
  const [googleDriveTokens, setGoogleDriveTokens] = useState<{
    accessToken: string;
    refreshToken?: string;
  } | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Store Google Drive tokens (in a real app, you'd want secure storage)
  const setTokens = useCallback((accessToken: string, refreshToken?: string) => {
    setGoogleDriveTokens({ accessToken, refreshToken });
    // Store in localStorage for persistence (not secure for production)
    localStorage.setItem('google_drive_tokens', JSON.stringify({ accessToken, refreshToken }));
  }, []);

  // Load tokens from storage on initialization
  const loadStoredTokens = useCallback(() => {
    try {
      const stored = localStorage.getItem('google_drive_tokens');
      if (stored) {
        const tokens = JSON.parse(stored);
        setGoogleDriveTokens(tokens);
        return tokens;
      }
    } catch (error) {
      console.error('Failed to load stored Google Drive tokens:', error);
    }
    return null;
  }, []);

  // Clear tokens
  const clearTokens = useCallback(() => {
    setGoogleDriveTokens(null);
    localStorage.removeItem('google_drive_tokens');
  }, []);

  // Import files from Google Drive
  const importFilesMutation = useMutation({
    mutationFn: async ({ fileIds, accessToken }: { fileIds: string[]; accessToken: string }) => {
      // Get current session for auth headers
      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/google-drive/import-multiple', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          access_token: accessToken,
          file_ids: fileIds
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to import files');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate file queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      queryClient.invalidateQueries({ queryKey: ['/api/folders'] });
      
      const { imported, failed, errors } = data;
      
      if (imported > 0) {
        toast({
          title: "Import Successful",
          description: `Successfully imported ${imported} file(s) from Google Drive${failed > 0 ? `. ${failed} file(s) failed to import.` : ''}`,
        });
      }
      
      if (failed > 0 && imported === 0) {
        toast({
          title: "Import Failed",
          description: `Failed to import ${failed} file(s). Please try again.`,
          variant: "destructive"
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import files from Google Drive",
        variant: "destructive"
      });
    }
  });

  // Get Google Drive authorization URL
  const getAuthUrl = useCallback(async () => {
    try {
      // Get current session for auth headers
      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      
      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/google-drive/auth-url', { headers });
      
      if (!response.ok) {
        throw new Error('Failed to get Google Drive authorization URL');
      }
      
      const { authUrl } = await response.json();
      return authUrl;
    } catch (error) {
      console.error('Error getting Google Drive auth URL:', error);
      throw error;
    }
  }, []);

  // Import files
  const importFiles = useCallback(async (fileIds: string[]) => {
    if (!googleDriveTokens?.accessToken) {
      throw new Error('Google Drive not authenticated');
    }

    return importFilesMutation.mutateAsync({
      fileIds,
      accessToken: googleDriveTokens.accessToken
    });
  }, [googleDriveTokens, importFilesMutation]);

  return {
    googleDriveTokens,
    isAuthenticated: !!googleDriveTokens?.accessToken,
    setTokens,
    loadStoredTokens,
    clearTokens,
    getAuthUrl,
    importFiles,
    isImporting: importFilesMutation.isPending
  };
}

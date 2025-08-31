import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { UploadProgress } from '@/lib/types';

export function useFileUpload() {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });

      // Get current session for auth headers
      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      
      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      // Use native fetch for file uploads to handle FormData properly
      const response = await fetch('/api/files/upload-multiple', {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`${response.status}: ${await response.text()}`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      queryClient.invalidateQueries({ queryKey: ['/api/folders'] });
      toast({
        title: "Upload Successful",
        description: "Files have been uploaded and processed with AI tagging",
      });
      setUploadProgress([]);
    },
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: "Failed to upload files. Please try again.",
        variant: "destructive",
      });
      console.error('Upload error:', error);
    }
  });

  const uploadFiles = useCallback((files: File[]) => {
    // Initialize progress tracking
    const initialProgress = files.map(file => ({
      fileName: file.name,
      progress: 0,
      status: 'uploading' as const
    }));
    setUploadProgress(initialProgress);

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => 
        prev.map(item => ({
          ...item,
          progress: Math.min(item.progress + Math.random() * 20, 90),
          status: item.progress > 50 ? 'processing' as const : 'uploading' as const
        }))
      );
    }, 500);

    uploadMutation.mutate(files, {
      onSettled: () => {
        clearInterval(progressInterval);
      }
    });
  }, [uploadMutation]);

  return {
    uploadFiles,
    uploadProgress,
    isUploading: uploadMutation.isPending,
    clearProgress: () => setUploadProgress([])
  };
}

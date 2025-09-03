import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { UploadProgress } from '@/lib/types';

interface FolderStructure {
  [path: string]: File;
}
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

  const uploadFolderMutation = useMutation({
    mutationFn: async (folderData: { files: File[]; folderStructure: any }) => {
      const formData = new FormData();
      
      // Add all files to FormData
      folderData.files.forEach(file => {
        formData.append('files', file);
      });
      
      // Add folder structure as JSON
      formData.append('folderStructure', JSON.stringify(folderData.folderStructure));

      // Get current session for auth headers
      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      
      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/folders/upload', {
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
        title: "Folder Upload Successful",
        description: "Folder has been uploaded and organized with AI analysis",
      });
      setUploadProgress([]);
    },
    onError: (error) => {
      toast({
        title: "Folder Upload Failed",
        description: "Failed to upload folder. Please try again.",
        variant: "destructive",
      });
      console.error('Folder upload error:', error);
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

  const uploadFolder = useCallback((items: DataTransferItem[] | File[]) => {
    if (Array.isArray(items) && items.length > 0 && items[0] instanceof File) {
      // Handle folder selection from input[webkitdirectory]
      const files = items as File[];
      const folderStructure = buildFolderStructureFromFiles(files);
      
      // Initialize progress tracking
      const initialProgress = files.map(file => ({
        fileName: file.webkitRelativePath || file.name,
        progress: 0,
        status: 'uploading' as const
      }));
      setUploadProgress(initialProgress);

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => 
          prev.map(item => ({
            ...item,
            progress: Math.min(item.progress + Math.random() * 15, 90),
            status: item.progress > 60 ? 'processing' as const : 'uploading' as const
          }))
        );
      }, 700);

      uploadFolderMutation.mutate({ files, folderStructure }, {
        onSettled: () => {
          clearInterval(progressInterval);
        }
      });
    } else {
      // Handle drag and drop with DataTransferItem
      const dataTransferItems = items as DataTransferItem[];
      processDataTransferItems(dataTransferItems);
    }
  }, [uploadFolderMutation]);

  const processDataTransferItems = useCallback(async (items: DataTransferItem[]) => {
    const files: File[] = [];
    const folderStructure: any = {};

    const processEntry = async (entry: FileSystemEntry, path = '') => {
      if (entry.isFile) {
        const fileEntry = entry as FileSystemFileEntry;
        return new Promise<void>((resolve) => {
          fileEntry.file((file) => {
            // Add relative path to file for folder structure
            Object.defineProperty(file, 'webkitRelativePath', {
              value: path + file.name,
              writable: false
            });
            files.push(file);
            resolve();
          });
        });
      } else if (entry.isDirectory) {
        const dirEntry = entry as FileSystemDirectoryEntry;
        const dirReader = dirEntry.createReader();
        
        return new Promise<void>((resolve) => {
          dirReader.readEntries(async (entries) => {
            const promises = entries.map(childEntry => 
              processEntry(childEntry, path + entry.name + '/')
            );
            await Promise.all(promises);
            resolve();
          });
        });
      }
    };

    // Process all dropped items
    const promises = Array.from(items).map(item => {
      const entry = item.webkitGetAsEntry();
      return entry ? processEntry(entry) : Promise.resolve();
    });

    await Promise.all(promises);

    if (files.length > 0) {
      const folderStructure = buildFolderStructureFromFiles(files);
      
      // Initialize progress tracking
      const initialProgress = files.map(file => ({
        fileName: (file as any).webkitRelativePath || file.name,
        progress: 0,
        status: 'uploading' as const
      }));
      setUploadProgress(initialProgress);

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => 
          prev.map(item => ({
            ...item,
            progress: Math.min(item.progress + Math.random() * 15, 90),
            status: item.progress > 60 ? 'processing' as const : 'uploading' as const
          }))
        );
      }, 700);

      uploadFolderMutation.mutate({ files, folderStructure }, {
        onSettled: () => {
          clearInterval(progressInterval);
        }
      });
    }
  }, [uploadFolderMutation]);

  // Helper function to build folder structure from files
  const buildFolderStructureFromFiles = (files: File[]) => {
    const structure: any = {};
    
    files.forEach(file => {
      const relativePath = (file as any).webkitRelativePath || file.name;
      const pathParts = relativePath.split('/');
      
      let current = structure;
      for (let i = 0; i < pathParts.length - 1; i++) {
        const folderName = pathParts[i];
        if (!current[folderName]) {
          current[folderName] = {
            type: 'folder',
            children: {},
            files: []
          };
        }
        current = current[folderName].children;
      }
      
      // Add file to the final folder
      const fileName = pathParts[pathParts.length - 1];
      if (!current.files) current.files = [];
      current.files = current.files || [];
      current.files.push({
        name: fileName,
        originalFile: file,
        relativePath
      });
    });
    
    return structure;
  };
  return {
    uploadFiles,
    uploadFolder,
    uploadProgress,
    isUploading: uploadMutation.isPending,
    isFolderUploading: uploadFolderMutation.isPending,
    clearProgress: () => setUploadProgress([])
  };
}
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Folder, 
  FolderOpen, 
  FileText, 
  Image, 
  FileSpreadsheet, 
  File,
  ChevronRight,
  ChevronDown 
} from "lucide-react";
import type { File as FileType, Folder as FolderType } from "@shared/schema";

interface FileTreeProps {
  view: 'before' | 'after';
}

// Helper function to get file icon and color
const getFileIcon = (fileType: string | undefined) => {
  if (!fileType) return <File className="w-4 h-4 text-gray-500" />;

  const type = fileType.toLowerCase();
  if (type.includes('image')) return <Image className="w-4 h-4 text-blue-500" />;
  if (type.includes('pdf')) return <FileText className="w-4 h-4 text-red-500" />;
  if (type.includes('excel') || type.includes('spreadsheet')) 
    return <FileSpreadsheet className="w-4 h-4 text-green-600" />;
  if (type.includes('word')) return <FileText className="w-4 h-4 text-blue-600" />;
  return <File className="w-4 h-4 text-gray-500" />;
};

// Helper function to get file color (used in the snippet)
const getFileColor = (fileType: string | undefined) => {
  if (!fileType) return 'bg-gray-400';
  const type = fileType.toLowerCase();
  if (type.includes('image')) return 'bg-blue-500';
  if (type.includes('pdf')) return 'bg-red-500';
  if (type.includes('excel') || type.includes('spreadsheet')) return 'bg-green-600';
  if (type.includes('word')) return 'bg-blue-600';
  return 'bg-gray-500';
};

// Helper function to format file size (used in the snippet)
const formatFileSize = (size: number | undefined) => {
  if (size === undefined) return 'N/A';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

// Helper function to format date (used in the snippet)
const formatDate = (dateString: string | undefined) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString();
};


export function FileTree({ view }: FileTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  // State to hold the selected file for highlighting
  const [selectedFile, setSelectedFile] = useState<FileType | null>(null);

  const { data: files = [] } = useQuery<FileType[]>({
    queryKey: ['/api/files'],
  });

  const { data: folders = [] } = useQuery<FolderType[]>({
    queryKey: ['/api/folders'],
  });

  // Pre-calculate folder file counts for efficiency
  const folderFileCounts = folders.reduce((acc, folder) => {
    acc[folder.id] = files.filter(file => file.folder_id === folder.id).length;
    return acc;
  }, {} as Record<string, number>);

  // Group files by folder ID for easier rendering
  const filesByFolder = files.reduce((acc, file) => {
    const folderId = file.folder_id || 'root'; // Group files without folder_id under 'root'
    if (!acc[folderId]) {
      acc[folderId] = [];
    }
    acc[folderId].push(file);
    return acc;
  }, {} as Record<string, FileType[]>);

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const getDisplayFileType = (fileName: string, fileType: string) => {
    const lowerName = fileName.toLowerCase();
    const lowerType = fileType.toLowerCase();

    // Specific file type mappings
    if (lowerType.includes('pdf')) return 'PDF';
    if (lowerType.includes('excel') || lowerType.includes('spreadsheet') || fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) return 'Spreadsheet';
    if (lowerType.includes('word') || fileName.endsWith('.docx') || fileName.endsWith('.doc')) return 'Document';
    if (lowerType.includes('powerpoint') || fileName.endsWith('.pptx') || fileName.endsWith('.ppt')) return 'Presentation';
    if (lowerType.includes('image') || lowerType.includes('jpg') || lowerType.includes('png') || lowerType.includes('jpeg')) return 'Image';
    if (lowerType.includes('video') || lowerType.includes('mp4')) return 'Video';
    if (lowerType.includes('audio') || lowerType.includes('mp3')) return 'Audio';
    if (lowerType.includes('csv')) return 'CSV';
    if (lowerType.includes('text') || fileName.endsWith('.txt')) return 'Text';

    // Fallback to main type
    return fileType?.split('/')[0] || 'Unknown';
  };

  // Function to handle file selection for highlighting
  const onFileSelect = (file: FileType) => {
    setSelectedFile(file);
  };

  const renderBeforeView = () => {
    // Show ALL files in a flat structure, regardless of folder assignment
    if (files.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <p>No files uploaded yet</p>
          <p className="text-sm">Upload some files to see the original structure</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {files.map(file => (
          <div
            key={file.id}
            className={`flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-md border cursor-pointer transition-colors ${
              selectedFile?.id === file.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
            }`}
            onClick={() => onFileSelect(file)}
          >
            {getFileIcon(file.file_type)}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate mb-1">
                {file.display_name}
              </p>
              <p className="text-xs text-gray-500 mb-2">
                {formatFileSize(file.file_size)}
              </p>
              {file.tags && file.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {file.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="text-xs px-2 py-1 bg-gray-100 text-gray-700 border border-gray-200 rounded-md whitespace-nowrap"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderAfterView = () => {
    // Show folders with their files
    const rootFolders = folders.filter(folder => !folder.parent_id);
    const rootFiles = filesByFolder['root'] || []; // Files not in any folder

    return (
      <div className="space-y-3">
        {/* Render folders */}
        {rootFolders.map(folder => {
          const folderFiles = filesByFolder[folder.id] || [];
          const isExpanded = expandedFolders.has(folder.id);

          return (
            <div key={folder.id} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => toggleFolder(folder.id)}
              >
                <div className="flex items-center space-x-3">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  )}
                  <Folder className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-gray-800">{folder.name}</span>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="text-xs bg-gray-800 text-white px-2 py-1">
                      {folderFileCounts[folder.id] || 0} files
                    </Badge>
                    {folder.is_ai_organized && (
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 border-green-200 px-2 py-1">
                        Auto-tagged
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="mt-4 ml-6 space-y-3">
                  {folderFiles.map((file) => (
                    <div
                      key={file.id}
                      className={`flex items-start justify-between p-3 rounded-md border cursor-pointer transition-colors ${
                        selectedFile?.id === file.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => onFileSelect(file)}
                    >
                      <div className="flex items-start space-x-3 flex-1 min-w-0">
                        {getFileIcon(file.file_type)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate mb-1">
                            {file.display_name}
                          </p>
                          <p className="text-xs text-gray-500 mb-2">
                            {formatFileSize(file.file_size)}
                          </p>
                          {file.tags && file.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {file.tags.map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="secondary"
                                  className="text-xs px-2 py-1 bg-gray-100 text-gray-700 border border-gray-200 rounded-md whitespace-nowrap"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Render files not in any folder */}
        {rootFiles.map(file => (
          <div 
            key={file.id}
            className={`flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-md border cursor-pointer transition-colors ${
              selectedFile?.id === file.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
            }`}
            onClick={() => onFileSelect(file)}
          >
            {getFileIcon(file.file_type)}
            <span className="text-sm font-medium text-gray-800">{file.display_name}</span>
            <p className="text-xs text-gray-500 ml-auto">{formatFileSize(file.file_size)}</p>
            <div className="flex space-x-1.5">
              {file.tags?.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs px-2 py-1 bg-gray-100 text-gray-700 border border-gray-200 rounded-md whitespace-nowrap">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-gray-800 flex items-center">
          {view === 'before' ? (
            <>
              <Folder className="w-5 h-5 text-yellow-500 mr-2" />
              Original Structure
            </>
          ) : (
            <>
              <FolderOpen className="w-5 h-5 text-green-600 mr-2" />
              AI-Organized Structure
            </>
          )}
        </h3>
        <div className="flex items-center space-x-2">
          {view === 'after' && (
            <Badge className="text-xs bg-green-100 text-green-800">
              Auto-tagged
            </Badge>
          )}
          <Badge variant="secondary" className="text-xs">
            {files.length} files
          </Badge>
        </div>
      </div>

      <div data-testid={`file-tree-${view}`}>
        {view === 'before' ? renderBeforeView() : renderAfterView()}
      </div>

      {view === 'after' && files.length > 0 && (
        <div className="mt-4 space-y-3">
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-600 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800">AI Processing Complete</p>
                <p className="text-xs text-green-600">
                  All files have been analyzed and organized using Google Gemini AI
                </p>
              </div>
            </div>
          </div>

          {/* Show organize button if there are unorganized files */}
          {files.some(file => !file.folder_id) && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-800">Organize Files</p>
                  <p className="text-xs text-blue-600">
                    Auto-organize your files into folders based on AI analysis
                  </p>
                </div>
                <Button 
                  size="sm" 
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={async () => {
                    try {
                      // Get current session for auth headers
                      const { supabase } = await import('@/lib/supabase');
                      const { data: { session } } = await supabase.auth.getSession();
                      
                      const headers: HeadersInit = { 'Content-Type': 'application/json' };
                      if (session?.access_token) {
                        headers.Authorization = `Bearer ${session.access_token}`;
                      }
                      
                      const response = await fetch('/api/organize-files', { 
                        method: 'POST',
                        headers
                      });
                      if (response.ok) {
                        window.location.reload(); // Refresh to show new organization
                      }
                    } catch (error) {
                      console.error('Organization failed:', error);
                    }
                  }}
                >
                  Organize Now
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
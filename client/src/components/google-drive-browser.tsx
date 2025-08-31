import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  FolderOpen, 
  File, 
  Image, 
  FileText, 
  FileSpreadsheet,
  Search,
  Download,
  ChevronLeft,
  Loader2,
  CheckCircle2
} from "lucide-react";

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

interface GoogleDriveBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (fileIds: string[]) => Promise<void>;
}

// Helper function to get file icon
const getFileIcon = (mimeType: string) => {
  if (mimeType === 'application/vnd.google-apps.folder') {
    return <FolderOpen className="w-4 h-4 text-blue-600" />;
  }
  if (mimeType.includes('image')) {
    return <Image className="w-4 h-4 text-blue-500" />;
  }
  if (mimeType.includes('pdf') || mimeType.includes('document')) {
    return <FileText className="w-4 h-4 text-red-500" />;
  }
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
    return <FileSpreadsheet className="w-4 h-4 text-green-600" />;
  }
  return <File className="w-4 h-4 text-gray-500" />;
};

// Helper function to format file size
const formatFileSize = (size?: number) => {
  if (!size) return 'N/A';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

// Helper function to get readable file type
const getFileType = (mimeType: string) => {
  if (mimeType === 'application/vnd.google-apps.document') return 'Google Doc';
  if (mimeType === 'application/vnd.google-apps.spreadsheet') return 'Google Sheet';
  if (mimeType === 'application/vnd.google-apps.presentation') return 'Google Slides';
  if (mimeType === 'application/vnd.google-apps.folder') return 'Folder';
  if (mimeType.includes('pdf')) return 'PDF';
  if (mimeType.includes('image')) return 'Image';
  if (mimeType.includes('video')) return 'Video';
  return mimeType.split('/')[1]?.toUpperCase() || 'File';
};

export function GoogleDriveBrowser({ isOpen, onClose, onImport }: GoogleDriveBrowserProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessToken, setAccessToken] = useState<string>('');
  const [files, setFiles] = useState<GoogleDriveFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentFolderId, setCurrentFolderId] = useState<string>('root');
  const [folderHistory, setFolderHistory] = useState<{ id: string; name: string }[]>([
    { id: 'root', name: 'My Drive' }
  ]);
  const { toast } = useToast();

  // Check for Google Drive auth tokens on component mount
  useEffect(() => {
    if (isOpen) {
      // First check URL params for new auth
      const urlParams = new URLSearchParams(window.location.search);
      const googleAuthSuccess = urlParams.get('google_drive_auth');
      const accessTokenParam = urlParams.get('access_token');
      
      if (googleAuthSuccess === 'success' && accessTokenParam) {
        setAccessToken(accessTokenParam);
        setIsAuthenticated(true);
        
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Load initial files
        loadFiles(accessTokenParam);
      } else {
        // Check for stored tokens
        try {
          const stored = localStorage.getItem('google_drive_tokens');
          if (stored) {
            const tokens = JSON.parse(stored);
            if (tokens.accessToken) {
              setAccessToken(tokens.accessToken);
              setIsAuthenticated(true);
              loadFiles(tokens.accessToken);
            }
          }
        } catch (error) {
          console.error('Failed to load stored tokens:', error);
        }
      }
    }
  }, [isOpen]);

  const authenticateGoogleDrive = async () => {
    try {
      setLoading(true);
      
      // Get auth URL from backend
      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      
      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/google-drive/auth-url', { headers });
      const { authUrl } = await response.json();

      // Redirect to Google OAuth
      window.location.href = authUrl;
    } catch (error) {
      console.error('Google Drive auth error:', error);
      toast({
        title: "Authentication Failed",
        description: "Failed to authenticate with Google Drive",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadFiles = async (token?: string, folderId: string = 'root') => {
    try {
      setLoading(true);
      const authToken = token || accessToken;
      
      if (!authToken) return;

      // Get current session for auth headers
      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      
      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const params = new URLSearchParams({
        access_token: authToken,
        ...(folderId !== 'root' && { folder_id: folderId })
      });

      const response = await fetch(`/api/google-drive/files?${params}`, { headers });
      
      if (!response.ok) {
        throw new Error('Failed to fetch Google Drive files');
      }
      
      const { files: driveFiles } = await response.json();
      setFiles(driveFiles);
    } catch (error) {
      console.error('Error loading Google Drive files:', error);
      toast({
        title: "Error",
        description: "Failed to load Google Drive files",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const searchFiles = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      setLoading(true);
      
      // Get current session for auth headers
      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      
      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const params = new URLSearchParams({
        access_token: accessToken,
        q: searchQuery
      });

      const response = await fetch(`/api/google-drive/search?${params}`, { headers });
      
      if (!response.ok) {
        throw new Error('Failed to search Google Drive files');
      }
      
      const { files: searchResults } = await response.json();
      setFiles(searchResults);
    } catch (error) {
      console.error('Error searching Google Drive files:', error);
      toast({
        title: "Search Failed",
        description: "Failed to search Google Drive files",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const navigateToFolder = (folderId: string, folderName: string) => {
    setCurrentFolderId(folderId);
    setFolderHistory([...folderHistory, { id: folderId, name: folderName }]);
    loadFiles(accessToken, folderId);
  };

  const navigateBack = () => {
    if (folderHistory.length > 1) {
      const newHistory = folderHistory.slice(0, -1);
      const parentFolder = newHistory[newHistory.length - 1];
      setFolderHistory(newHistory);
      setCurrentFolderId(parentFolder.id);
      loadFiles(accessToken, parentFolder.id);
    }
  };

  const toggleFileSelection = (fileId: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId);
    } else {
      newSelected.add(fileId);
    }
    setSelectedFiles(newSelected);
  };

  const handleImport = async () => {
    if (selectedFiles.size === 0) return;
    
    try {
      setImporting(true);
      
      // Convert selected file IDs to array
      const fileIds = Array.from(selectedFiles);
      
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

      const result = await response.json();
      
      // Trigger a refresh of the file list
      window.location.reload();
      
      // Clear selection and close
      setSelectedFiles(new Set());
      toast({
        title: "Import Successful",
        description: `Successfully imported ${fileIds.length} file(s) from Google Drive`,
      });
      
      onClose();
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: "Failed to import selected files",
        variant: "destructive"
      });
    } finally {
      setImporting(false);
    }
  };

  const filteredFiles = files.filter(file => !file.isFolder);
  const folders = files.filter(file => file.isFolder);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Image className="w-5 h-5 text-blue-600" />
            <span>Import from Google Drive</span>
          </DialogTitle>
        </DialogHeader>

        {!isAuthenticated ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <Image className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-medium">Connect to Google Drive</h3>
              <p className="text-gray-600 max-w-md">
                To import files from Google Drive, you need to connect your Google account.
                This will allow you to browse and import your files.
              </p>
              <Button 
                onClick={authenticateGoogleDrive}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Connect Google Drive
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Navigation and Search */}
            <div className="border-b pb-4 mb-4 space-y-4">
              {/* Breadcrumb Navigation */}
              <div className="flex items-center space-x-2">
                {folderHistory.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={navigateBack}
                    className="p-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                )}
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  {folderHistory.map((folder, index) => (
                    <span key={folder.id}>
                      {index > 0 && <span className="mx-1">/</span>}
                      <span className={index === folderHistory.length - 1 ? "font-medium text-gray-900" : ""}>
                        {folder.name}
                      </span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Search */}
              <div className="flex space-x-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search Google Drive files..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchFiles()}
                    className="pl-10"
                  />
                </div>
                <Button 
                  onClick={searchFiles}
                  variant="outline"
                  disabled={loading}
                >
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Search
                </Button>
                {searchQuery && (
                  <Button 
                    onClick={() => {
                      setSearchQuery('');
                      loadFiles(accessToken, currentFolderId);
                    }}
                    variant="outline"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* File List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  <span>Loading files...</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Folders */}
                  {folders.map((folder) => (
                    <div
                      key={folder.id}
                      className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-md border border-gray-200 cursor-pointer"
                      onClick={() => navigateToFolder(folder.id, folder.name)}
                    >
                      {getFileIcon(folder.mimeType)}
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{folder.name}</p>
                        <p className="text-sm text-gray-500">Folder</p>
                      </div>
                      <div className="text-xs text-gray-400">
                        {folder.modifiedTime && new Date(folder.modifiedTime).toLocaleDateString()}
                      </div>
                    </div>
                  ))}

                  {/* Files */}
                  {filteredFiles.map((file) => (
                    <div
                      key={file.id}
                      className={`flex items-center space-x-3 p-3 rounded-md border cursor-pointer transition-colors ${
                        selectedFiles.has(file.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => toggleFileSelection(file.id)}
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        {selectedFiles.has(file.id) && (
                          <CheckCircle2 className="w-4 h-4 text-blue-600" />
                        )}
                        {getFileIcon(file.mimeType)}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800 truncate">{file.name}</p>
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <span>{getFileType(file.mimeType)}</span>
                            {file.size && (
                              <>
                                <span>•</span>
                                <span>{formatFileSize(file.size)}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 hidden sm:block">
                        {file.modifiedTime && new Date(file.modifiedTime).toLocaleDateString()}
                      </div>
                    </div>
                  ))}

                  {files.length === 0 && !loading && (
                    <div className="text-center py-8 text-gray-500">
                      <p>No files found</p>
                      {searchQuery && (
                        <p className="text-sm">Try adjusting your search query</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer with import action */}
            <div className="border-t pt-4 mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {selectedFiles.size > 0 && (
                  <span>{selectedFiles.size} file(s) selected</span>
                )}
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button 
                  onClick={handleImport}
                  disabled={selectedFiles.size === 0 || importing}
                  className="bg-blue-600 hover:bg-blue-700">
                  {importing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  <Download className="w-4 h-4 mr-2" />
                  Import {selectedFiles.size > 0 ? `(${selectedFiles.size})` : ''}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

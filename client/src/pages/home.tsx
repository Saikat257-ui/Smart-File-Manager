import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import { UploadArea } from "@/components/upload-area";
import { FileTree } from "@/components/file-tree";
import { FileDetailsPanel } from "@/components/file-details-panel";
import { SearchFilterPanel } from "@/components/search-filter-panel";
import { cn } from "@/lib/utils";
import type { File } from "@shared/schema";

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [searchResults, setSearchResults] = useState<File[] | null>(null);

  const { data: files = [] } = useQuery<File[]>({
    queryKey: ['/api/files'],
  });

  // Default to 'after' view if files exist, 'before' if empty
  const [currentView, setCurrentView] = useState<'before' | 'after'>(
    files.length > 0 ? 'after' : 'before'
  );

  const handleSearch = async (query: string, tag: string, fileType: string) => {
    if (!query && !tag && !fileType) {
      setSearchResults(null);
      return;
    }

    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (tag) params.set('tag', tag);
      if (fileType) params.set('type', fileType);

      // Get current session for auth headers
      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      
      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/search?${params}`, { headers });
      const results = await response.json();
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    }
  };

  const displayedFiles = searchResults !== null ? searchResults : files;

  return (
    <div className="min-h-screen bg-white w-full overflow-x-hidden">
      <Header />
      
      <div className="flex max-w-7xl mx-auto min-h-0">
        <Sidebar />
        
        <main className="flex-1 p-4 sm:p-6 min-w-0">
          <UploadArea />

          {/* Before/After Toggle */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-medium text-gray-800">File Organization</h2>
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <Button
                variant={currentView === 'before' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('before')}
                className={cn(
                  currentView === 'before' 
                    ? 'bg-white shadow text-blue-600 border border-blue-600' 
                    : 'text-gray-600'
                )}
                data-testid="button-view-before"
              >
                Original Structure
              </Button>
              <Button
                variant={currentView === 'after' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('after')}
                className={cn(
                  currentView === 'after' 
                    ? 'bg-white shadow text-blue-600 border border-blue-600' 
                    : 'text-gray-600'
                )}
                data-testid="button-view-after"
              >
                After AI Organization
              </Button>
            </div>
          </div>

          {/* File Structure View - Single view that switches based on currentView */}
          <div className="mb-8">
            <FileTree view={currentView} />
          </div>

          {/* File Details Panel */}
          <div className="mb-8">
            <FileDetailsPanel selectedFile={selectedFile} />
          </div>

          {/* Search and Filter */}
          <SearchFilterPanel onSearch={handleSearch} />

          {/* Search Results */}
          {searchResults !== null && (
            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-800 mb-4">
                Search Results ({searchResults.length})
              </h3>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                {searchResults.length > 0 ? (
                  <div className="space-y-2">
                    {searchResults.map((file) => (
                      <div 
                        key={file.id}
                        className={cn(
                          "flex items-center space-x-3 p-3 rounded hover:bg-gray-50 cursor-pointer transition-colors",
                          selectedFile?.id === file.id && "bg-blue-50 border border-blue-200"
                        )}
                        onClick={() => setSelectedFile(file)}
                        data-testid={`search-result-${file.id}`}
                      >
                        <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                          <span className="text-blue-600 text-xs font-medium">
                            {file.file_type?.split('/')[1]?.toUpperCase().substring(0, 3) || 'FILE'}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-800">{file.display_name}</h4>
                          <p className="text-sm text-gray-600">{file.original_name}</p>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(file.tags || []).slice(0, 3).map((tag) => (
                            <span 
                              key={tag}
                              className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        <span className="text-xs text-gray-500">
                          {(file.file_size / 1024 / 1024).toFixed(1)} MB
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No files found matching your search criteria</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Empty State */}
          {files.length === 0 && searchResults === null && (
            <div className="text-center py-12" data-testid="empty-state">
              <div className="max-w-md mx-auto">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v1H8V5z" />
                  </svg>
                </div>
                <h3 className="text-xl font-medium text-gray-800 mb-2">No files yet</h3>
                <p className="text-gray-600 mb-6">
                  Upload your first files to get started with AI-powered organization
                </p>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => document.querySelector<HTMLInputElement>('[data-testid="input-file-select"]')?.click()}
                  data-testid="button-upload-empty-state"
                >
                  Upload Files
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

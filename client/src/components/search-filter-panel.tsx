import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search } from "lucide-react";
import type { File } from "@shared/schema";

interface SearchFilterPanelProps {
  onSearch: (query: string, tag: string, fileType: string) => void;
}

export function SearchFilterPanel({ onSearch }: SearchFilterPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('all');
  const [selectedFileType, setSelectedFileType] = useState('all');

  const { data: files = [] } = useQuery<File[]>({
    queryKey: ['/api/files'],
  });

  // Extract unique tags and file types from files
  const allTags = Array.from(new Set(
    files
      .filter(file => file.tags && Array.isArray(file.tags))
      .flatMap(file => file.tags || [])
      .filter(tag => tag && typeof tag === 'string' && tag.trim() !== '')
  )).sort();

  const allFileTypes = Array.from(new Set(
    files
      .map(file => {
        if (!file.file_type || typeof file.file_type !== 'string') return 'UNKNOWN';
        const parts = file.file_type.split('/');
        const type = parts.length > 1 ? parts[1] : parts[0];
        return type ? type.toUpperCase() : 'UNKNOWN';
      })
      .filter(type => type !== 'UNKNOWN')
  )).sort();

  const handleSearch = () => {
    onSearch(
      searchQuery, 
      selectedTag === 'all' ? '' : selectedTag, 
      selectedFileType === 'all' ? '' : selectedFileType
    );
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTag('all');
    setSelectedFileType('all');
    onSearch('', '', '');
  };

  // Listen for tag search events from sidebar
  useEffect(() => {
    const handleTagSearch = (event: CustomEvent) => {
      const { tag } = event.detail;
      setSelectedTag(tag);
      onSearch('', tag, selectedFileType === 'all' ? '' : selectedFileType);
    };

    window.addEventListener('tagSearch', handleTagSearch as EventListener);
    
    return () => {
      window.removeEventListener('tagSearch', handleTagSearch as EventListener);
    };
  }, [onSearch, selectedFileType]);

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-medium text-gray-800 mb-4">Search & Filter</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Files
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search by filename or content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="pl-10 w-full"
                  data-testid="input-search-query"
                />
              </div>
            </div>

            <div className="col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Tag
              </label>
              <select 
                value={selectedTag} 
                onChange={(e) => setSelectedTag(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                data-testid="select-tag-filter"
              >
                <option value="all">All Tags</option>
                {allTags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                File Type
              </label>
              <select 
                value={selectedFileType} 
                onChange={(e) => setSelectedFileType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                data-testid="select-filetype-filter"
              >
                <option value="all">All Types</option>
                {allFileTypes.map((type) => (
                  <option key={type} value={type.toLowerCase()}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 justify-start">
            <Button 
              onClick={handleSearch}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="button-search"
            >
              Search
            </Button>
            <Button 
              variant="outline"
              onClick={clearFilters}
              data-testid="button-clear-filters"
            >
              Clear
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
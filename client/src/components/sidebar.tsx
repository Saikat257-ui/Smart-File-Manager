import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Folder, Tags, Clock, Archive, Trash2, Wand2, Search } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import type { File } from "@shared/schema";

const navigationItems = [
  { name: "All Files", icon: Archive, isActive: true, id: "all", label: "All Files" },
  { name: "Recent", icon: Clock, isActive: false, id: "recent", label: "Recent" },
  { name: "Folders", icon: Folder, isActive: false, id: "folders", label: "Folders" },
  { name: "Tags", icon: Tags, isActive: false, id: "tags", label: "Tags" },
  { name: "Trash", icon: Trash2, isActive: false, id: "trash", label: "Trash" },
];

const recentTags = [
  { name: "Documents", color: "bg-blue-100 text-blue-800" },
  { name: "Images", color: "bg-green-100 text-green-800" },
  { name: "Projects", color: "bg-purple-100 text-purple-800" },
  { name: "Reports", color: "bg-orange-100 text-orange-800" },
  { name: "Photos", color: "bg-pink-100 text-pink-800" },
];

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function Sidebar() {
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [searchTagsOpen, setSearchTagsOpen] = useState(false);
  const [bulkTags, setBulkTags] = useState<string>('');
  const [searchTag, setSearchTag] = useState<string>('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: storageUsage } = useQuery({
    queryKey: ['storage-usage'],
    queryFn: async () => {
      // Get current session for auth headers
      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      
      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }
      
      const response = await fetch('/api/storage-usage', { headers });
      if (!response.ok) throw new Error('Failed to fetch storage usage');
      return response.json() as Promise<{ used: number; total: number }>;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const { data: files = [] } = useQuery<File[]>({
    queryKey: ['/api/files'],
  });

  

  // Smart Rename mutation
  const smartRenameMutation = useMutation({
    mutationFn: async () => {
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
      if (!response.ok) throw new Error('Failed to organize files');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      queryClient.invalidateQueries({ queryKey: ['/api/folders'] });
      toast({
        title: "Smart Rename Complete",
        description: `Organized ${data.filesMoved} files into ${data.foldersCreated} folders`,
      });
    },
    onError: () => {
      toast({
        title: "Smart Rename Failed",
        description: "Failed to organize files. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Bulk Edit Tags mutation
  const bulkEditMutation = useMutation({
    mutationFn: async (tagsToAdd: string[]) => {
      // Get current session for auth headers
      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }
      
      const promises = files.map(file =>
        fetch(`/api/files/${file.id}/tags`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ tags: [...(file.tags || []), ...tagsToAdd] })
        })
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      setBulkEditOpen(false);
      setBulkTags('');
      toast({
        title: "Bulk Edit Complete",
        description: "Tags added to all files successfully",
      });
    },
    onError: () => {
      toast({
        title: "Bulk Edit Failed",
        description: "Failed to update tags. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleBulkEdit = () => {
    if (!bulkTags.trim()) return;
    const tags = bulkTags.split(',').map(tag => tag.trim()).filter(Boolean);
    bulkEditMutation.mutate(tags);
  };

  const handleSearchByTag = () => {
    if (!searchTag.trim()) return;
    // Dispatch a custom event to notify the parent component about the tag search
    const event = new CustomEvent('tagSearch', { detail: { tag: searchTag.trim() } });
    window.dispatchEvent(event);
    setSearchTagsOpen(false); // Close the dialog after triggering the search
  };

  const usedPercentage = storageUsage ? (storageUsage.used / storageUsage.total) * 100 : 0;
  const usedFormatted = storageUsage ? formatBytes(storageUsage.used) : '0 B';
  const totalFormatted = storageUsage ? formatBytes(storageUsage.total) : '1 GB';

  return (
    <aside className="w-48 sm:w-64 bg-gray-50 border-r border-gray-200 p-3 sm:p-6 flex-shrink-0">
      <div className="mb-6">
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium text-gray-800 mb-2">Storage Used</h3>
            <div className="flex items-center space-x-2 mb-2">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${usedPercentage}%` }}></div>
              </div>
              <span className="text-sm text-gray-600" data-testid="text-storage-used">{usedFormatted}</span>
            </div>
            <p className="text-xs text-gray-500" data-testid="text-storage-total">of {totalFormatted} used</p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6">
        <h3 className="text-xs sm:text-sm font-medium text-gray-800 mb-3 sm:mb-4">Quick Actions</h3>
        <div className="space-y-1 sm:space-y-2">
          <Dialog open={bulkEditOpen} onOpenChange={setBulkEditOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start text-gray-600 hover:bg-gray-100 text-xs sm:text-sm px-2 py-1.5 sm:px-3 sm:py-2"
                data-testid="button-bulk-edit-tags"
              >
                <Tags className="w-3 h-3 sm:w-4 sm:h-4 mr-2 sm:mr-3 flex-shrink-0 text-blue-600" />
                <span className="truncate">Bulk Edit Tags</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Bulk Edit Tags</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="bulk-tags">Add tags to all files (comma-separated)</Label>
                  <Input
                    id="bulk-tags"
                    value={bulkTags}
                    onChange={(e) => setBulkTags(e.target.value)}
                    placeholder="work, important, project"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setBulkEditOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleBulkEdit}
                    disabled={bulkEditMutation.isPending || !bulkTags.trim()}
                  >
                    {bulkEditMutation.isPending ? 'Adding...' : 'Add Tags'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button
            variant="ghost"
            className="w-full justify-start text-gray-600 hover:bg-gray-100 text-xs sm:text-sm px-2 py-1.5 sm:px-3 sm:py-2"
            data-testid="button-smart-rename"
            onClick={() => smartRenameMutation.mutate()}
            disabled={smartRenameMutation.isPending}
          >
            <Wand2 className="w-3 h-3 sm:w-4 sm:h-4 mr-2 sm:mr-3 flex-shrink-0 text-green-600" />
            <span className="truncate">
              {smartRenameMutation.isPending ? 'Organizing...' : 'Smart Rename'}
            </span>
          </Button>

          <Dialog open={searchTagsOpen} onOpenChange={setSearchTagsOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start text-gray-600 hover:bg-gray-100 text-xs sm:text-sm px-2 py-1.5 sm:px-3 sm:py-2"
                data-testid="button-search-tags"
              >
                <Search className="w-3 h-3 sm:w-4 sm:h-4 mr-2 sm:mr-3 flex-shrink-0 text-yellow-600" />
                <span className="truncate">Search by Tags</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Search by Tags</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="search-tag">Enter tag to search</Label>
                  <Input
                    id="search-tag"
                    value={searchTag}
                    onChange={(e) => setSearchTag(e.target.value)}
                    placeholder="Enter tag name"
                    onKeyPress={(e) => e.key === 'Enter' && handleSearchByTag()}
                  />
                </div>
                <div>
                  <Label>Available Tags</Label>
                  <div className="flex flex-wrap gap-1 sm:gap-2 mt-2">
                    {Array.from(new Set(files.flatMap(file => file.tags || []))).map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="cursor-pointer text-xs px-2 py-1"
                        onClick={() => {
                          setSearchTag(tag);
                          handleSearchByTag();
                        }}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setSearchTagsOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSearchByTag}
                    disabled={!searchTag.trim()}
                  >
                    Search
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      
    </aside>
  );
}
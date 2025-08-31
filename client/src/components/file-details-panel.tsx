import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Copy, Wand2, X, Eye } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { File } from "@shared/schema";

interface FileDetailsPanelProps {
  selectedFile: File | null;
}

export function FileDetailsPanel({ selectedFile }: FileDetailsPanelProps) {
  const [newTag, setNewTag] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateTagsMutation = useMutation({
    mutationFn: async ({ fileId, tags }: { fileId: string; tags: string[] }) => {
      const response = await apiRequest('PATCH', `/api/files/${fileId}/tags`, { tags });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      toast({
        title: "Tags Updated",
        description: "File tags have been updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update tags. Please try again.",
        variant: "destructive",
      });
    }
  });

  const reprocessMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const response = await apiRequest('POST', `/api/files/${fileId}/reprocess`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      toast({
        title: "Reprocessing Complete",
        description: "File has been reprocessed with updated AI analysis",
      });
    },
    onError: () => {
      toast({
        title: "Reprocessing Failed",
        description: "Failed to reprocess file. Please try again.",
        variant: "destructive",
      });
    }
  });

  const applyToSimilarMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const response = await apiRequest('POST', `/api/files/${fileId}/apply-to-similar`);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      toast({
        title: "Tags Applied Successfully",
        description: `Applied tags to ${data.count} similar files`,
      });
    },
    onError: () => {
      toast({
        title: "Apply Failed",
        description: "Failed to apply tags to similar files. Please try again.",
        variant: "destructive",
      });
    }
  });

  const addTag = () => {
    if (!selectedFile || !newTag.trim()) return;

    const updatedTags = [...(selectedFile.tags || []), newTag.trim()];
    updateTagsMutation.mutate({ 
      fileId: selectedFile.id, 
      tags: updatedTags 
    });
    setNewTag('');
  };

  const removeTag = (tagToRemove: string) => {
    if (!selectedFile) return;

    const updatedTags = (selectedFile.tags || []).filter(tag => tag !== tagToRemove);
    updateTagsMutation.mutate({ 
      fileId: selectedFile.id, 
      tags: updatedTags 
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addTag();
    }
  };

  if (!selectedFile) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">Select a file to view details and manage tags</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-medium text-gray-800 mb-4">
          File Details & Tag Management
        </h3>
        
        {/* Selected File Info */}
        <div className="flex items-start space-x-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center">
            <span className="text-blue-600 font-medium text-xs">
              {(() => {
                const fileName = selectedFile.display_name.toLowerCase();
                const fileType = selectedFile.file_type?.toLowerCase() || '';
                
                if (fileType.includes('pdf')) return 'PDF';
                if (fileType.includes('excel') || fileType.includes('spreadsheet') || fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) return 'XLS';
                if (fileType.includes('word') || fileName.endsWith('.docx') || fileName.endsWith('.doc')) return 'DOC';
                if (fileType.includes('powerpoint') || fileName.endsWith('.pptx') || fileName.endsWith('.ppt')) return 'PPT';
                if (fileType.includes('image')) return 'IMG';
                if (fileType.includes('video')) return 'VID';
                if (fileType.includes('audio')) return 'AUD';
                if (fileType.includes('text')) return 'TXT';
                
                return 'FILE';
              })()}
            </span>
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-gray-800" data-testid="text-filename">
              {selectedFile.display_name}
            </h4>
            <p className="text-sm text-gray-600" data-testid="text-filepath">
              {selectedFile.storage_path}
            </p>
            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
              <span data-testid="text-filesize">
                {(selectedFile.file_size / 1024 / 1024).toFixed(1)} MB
              </span>
              <span data-testid="text-filetype">
                {selectedFile.file_type}
              </span>
              <span data-testid="text-upload-date">
                {selectedFile.uploaded_at 
                  ? new Date(selectedFile.uploaded_at).toLocaleDateString()
                  : 'Unknown'
                }
              </span>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            data-testid="button-preview-file"
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
        </div>

        {/* Tag Management */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              AI-Generated Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {(selectedFile.tags || []).map((tag) => (
                <Badge 
                  key={tag}
                  className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                  data-testid={`tag-badge-${tag}`}
                >
                  <span>{tag}</span>
                  <button
                    onClick={() => removeTag(tag)}
                    className="ml-2 text-blue-600 hover:text-blue-800"
                    data-testid={`button-remove-tag-${tag}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
              {(!selectedFile.tags || selectedFile.tags.length === 0) && (
                <p className="text-sm text-gray-500">No tags assigned</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add Custom Tags
            </label>
            <div className="flex space-x-2">
              <Input
                type="text"
                placeholder="Enter new tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={handleKeyPress}
                data-testid="input-new-tag"
              />
              <Button 
                onClick={addTag}
                disabled={!newTag.trim() || updateTagsMutation.isPending}
                data-testid="button-add-tag"
              >
                Add Tag
              </Button>
            </div>
          </div>

          {/* Bulk Actions */}
          <div className="flex space-x-2 pt-4 border-t border-gray-200">
            <Button 
              variant="outline"
              className="bg-green-600 text-white hover:bg-green-700"
              onClick={() => applyToSimilarMutation.mutate(selectedFile.id)}
              disabled={applyToSimilarMutation.isPending || !selectedFile.tags || selectedFile.tags.length === 0}
              data-testid="button-apply-similar"
            >
              <Copy className="w-4 h-4 mr-2" />
              Apply to Similar Files
            </Button>
            <Button 
              variant="outline"
              onClick={() => reprocessMutation.mutate(selectedFile.id)}
              disabled={reprocessMutation.isPending}
              data-testid="button-reprocess-ai"
            >
              <Wand2 className="w-4 h-4 mr-2" />
              Re-process with AI
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

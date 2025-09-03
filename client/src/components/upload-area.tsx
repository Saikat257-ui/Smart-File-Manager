import { useCallback, useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CloudUpload, Upload, Loader2, FolderPlus } from "lucide-react";
import { useFileUpload } from "@/hooks/use-file-upload";
import { useGoogleDrive } from "@/hooks/use-google-drive";
import { GoogleDriveBrowser } from "@/components/google-drive-browser";
import { cn } from "@/lib/utils";

export function UploadArea() {
  const [isDragOver, setIsDragOver] = useState(false);
  const [showGoogleDriveBrowser, setShowGoogleDriveBrowser] = useState(false);
  const { uploadFiles, uploadFolder, uploadProgress, isUploading, isFolderUploading } = useFileUpload();
  const { importFiles, loadStoredTokens, setTokens } = useGoogleDrive();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const items = Array.from(e.dataTransfer.items);
    
    // Check if any items are directories
    const hasDirectories = items.some(item => item.webkitGetAsEntry()?.isDirectory);
    
    if (hasDirectories) {
      // Handle folder upload
      uploadFolder(items);
    } else {
      // Handle regular file upload
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        uploadFiles(files);
      }
    }
  }, [uploadFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      uploadFiles(files);
    }
    // Reset the input to allow selecting the same file again
    e.target.value = '';
  }, [uploadFiles]);

  const handleFolderSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      uploadFolder(files);
    }
    // Reset the input to allow selecting the same folder again
    e.target.value = '';
  }, [uploadFolder]);

  // Load stored Google Drive tokens on component mount
  useEffect(() => {
    loadStoredTokens();
  }, [loadStoredTokens]);

  return (
    <div className="mb-8">
      <div
        className={cn(
          "border-2 border-dashed border-gray-300 rounded-lg p-8 text-center transition-all duration-300 cursor-pointer",
          isDragOver && "border-blue-600 bg-blue-50",
          "hover:border-blue-600 hover:bg-blue-50",
          (isUploading || isFolderUploading) && "pointer-events-none opacity-75"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        data-testid="upload-area"
      >
        <div className="max-w-md mx-auto">
          {(isUploading || isFolderUploading) ? (
            <Loader2 className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-spin" />
          ) : (
            <CloudUpload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          )}
          <h3 className="text-lg font-medium text-gray-800 mb-2">
            Drop files or folders here or click to upload
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Support for files and folders. AI will automatically tag and organize your content while preserving folder structures.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="relative">
              <input
                type="file"
                multiple
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                data-testid="input-file-select"
                disabled={isUploading || isFolderUploading}
              />
              <Button
                className="bg-blue-600 hover:bg-blue-700 w-full"
                data-testid="button-select-files"
                disabled={isUploading || isFolderUploading}
              >
                <Upload className="w-4 h-4 mr-2" />
                Select Files
              </Button>
            </div>
            <div className="relative">
              <input
                type="file"
                webkitdirectory=""
                multiple
                onChange={handleFolderSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                data-testid="input-folder-select"
                disabled={isUploading || isFolderUploading}
              />
              <Button
                variant="outline"
                className="w-full border-green-200 text-green-600 hover:bg-green-50"
                data-testid="button-select-folder"
                disabled={isUploading || isFolderUploading}
              >
                <FolderPlus className="w-4 h-4 mr-2" />
                Select Folder
              </Button>
            </div>
            <Button
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowGoogleDriveBrowser(true);
              }}
              className="w-full border-blue-200 text-blue-600 hover:bg-blue-50"
              data-testid="button-google-drive-import"
              disabled={isUploading || isFolderUploading}
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                <path fill="#4285f4" d="M12 2L15.09 8H20.83L12 21L3.17 8H8.91Z" />
                <path fill="#34a853" d="M3.17 8H8.91L12 2L15.09 8Z" />
                <path fill="#ea4335" d="M12 21L20.83 8L15.09 8L12 2Z" />
              </svg>
              Import from Google Drive
            </Button>
          </div>
        </div>

        {uploadProgress.length > 0 && (
          <div className="mt-6 space-y-2">
            <div className="text-center mb-4">
              <p className="text-sm font-medium text-gray-700">
                {isFolderUploading ? 'Uploading folder and organizing with AI...' : 'Uploading files...'}
              </p>
            </div>
            {uploadProgress.map((progress) => (
              <div
                key={progress.fileName}
                className="bg-white rounded-lg p-4 shadow-sm border"
                data-testid={`upload-progress-${progress.fileName}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    {progress.status === 'uploading' && 'Uploading '}
                    {progress.status === 'processing' && 'Processing '}
                    {progress.status === 'complete' && 'Complete '}
                    {progress.fileName}
                  </span>
                  <span className="text-sm text-gray-600">
                    {Math.round(progress.progress)}%
                  </span>
                </div>
                <Progress
                  value={progress.progress}
                  className="w-full"
                  data-testid={`progress-bar-${progress.fileName}`}
                />
                {progress.status === 'processing' && (
                  <p className="text-xs text-blue-600 mt-1">
                    AI is analyzing and organizing this file...
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Google Drive Browser Dialog */}
      <GoogleDriveBrowser
        isOpen={showGoogleDriveBrowser}
        onClose={() => setShowGoogleDriveBrowser(false)}
        onImport={importFiles}
      />
    </div>
  );
}
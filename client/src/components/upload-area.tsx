import { useCallback, useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CloudUpload, Upload, Loader2 } from "lucide-react";
import { useFileUpload } from "@/hooks/use-file-upload";
import { useGoogleDrive } from "@/hooks/use-google-drive";
import { GoogleDriveBrowser } from "@/components/google-drive-browser";
import { cn } from "@/lib/utils";

export function UploadArea() {
  const [isDragOver, setIsDragOver] = useState(false);
  const [showGoogleDriveBrowser, setShowGoogleDriveBrowser] = useState(false);
  const { uploadFiles, uploadProgress, isUploading } = useFileUpload();
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

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      uploadFiles(files);
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

  // Mock handleClick for the provided snippet, assuming it's meant to trigger file selection
  const handleClick = useCallback(() => {
    // This would typically trigger the hidden file input click
    // For now, we'll assume it's handled by the button itself or an external mechanism if not using the input directly
  }, []);

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
          "hover:border-blue-600 hover:bg-blue-50"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        data-testid="upload-area"
      >
        <div className="max-w-md mx-auto">
          <CloudUpload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">
            Drop files here or click to upload
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Support for multiple file types. AI will automatically tag and organize your files.
          </p>
          <div className="space-y-2">
            <div className="relative">
              <input
                type="file"
                multiple
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                data-testid="input-file-select"
              />
              <Button
                className="bg-blue-600 hover:bg-blue-700 w-full"
                data-testid="button-select-files"
              >
                Select Files
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

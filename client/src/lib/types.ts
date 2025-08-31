export interface FileTreeNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  children?: FileTreeNode[];
  size?: number;
  tags?: string[];
  isExpanded?: boolean;
  fileType?: string;
  uploadedAt?: Date;
}

export interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
}

export interface SearchFilters {
  query: string;
  tag: string;
  fileType: string;
}

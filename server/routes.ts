import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateFileTags } from "./services/gemini";
import { supabaseStorage } from "./services/supabase";
import { googleDriveService } from "./services/google-drive";
import { insertFileSchema, insertFolderSchema } from "@shared/schema";
import { authenticateUser } from "./middleware/auth";
import multer from "multer";
import { z } from "zod";

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Get all files
  app.get("/api/files", authenticateUser, async (req, res) => {
    try {
      const files = await storage.getAllFiles(req.userId, req.accessToken);
      res.json(files);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch files" });
    }
  });

  // Get files by folder
  app.get("/api/files/folder/:folderId?", authenticateUser, async (req, res) => {
    try {
      const { folderId } = req.params;
      const files = await storage.getFilesByFolderId(folderId === 'root' ? undefined : folderId, req.userId, req.accessToken);
      res.json(files);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch files" });
    }
  });

  // Upload single file
  app.post("/api/files/upload", authenticateUser, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file provided" });
      }

      const file = req.file;
      const { folderId } = req.body;

      // Upload to Supabase Storage
      const { path: storagePath, url } = await supabaseStorage.uploadFile(
        file.buffer,
        file.originalname,
        file.mimetype,
        req.accessToken!
      );

      // Generate AI tags
      const aiTagging = await generateFileTags(
        file.originalname,
        file.mimetype
      );

      // Auto-create folder if AI suggests one and no specific folder is provided
      let targetFolderId = folderId;
      if (!folderId && aiTagging.suggestedFolderName) {
        // Check if folder already exists
        const allFolders = await storage.getAllFolders(req.userId, req.accessToken);
        let existingFolder = allFolders.find(folder => 
          folder.name.toLowerCase() === aiTagging.suggestedFolderName.toLowerCase()
        );

        if (!existingFolder) {
          // Create new folder
          const newFolderData = insertFolderSchema.parse({
            name: aiTagging.suggestedFolderName,
            isAiGenerated: true,
            userId: req.userId
          });
          existingFolder = await storage.createFolder(newFolderData, req.accessToken);
          console.log(`Created new AI folder: ${aiTagging.suggestedFolderName}`);
        }

        targetFolderId = existingFolder.id;
      }

      // Create file record
      const fileData = insertFileSchema.parse({
        originalName: file.originalname,
        displayName: aiTagging.suggestedFileName || file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        storagePath,
        userId: req.userId, // Add user ID from authentication
        tags: aiTagging.tags,
        aiGenerated: true,
        folderId: targetFolderId,
        metadata: {
          url,
          confidence: aiTagging.confidence,
          suggestedFolderName: aiTagging.suggestedFolderName
        }
      });

      const createdFile = await storage.createFile(fileData, req.accessToken);
      res.json(createdFile);
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  // Upload multiple files
  app.post("/api/files/upload-multiple", authenticateUser, upload.array('files', 10), async (req, res) => {
    try {
      console.log('Multiple upload request received, files:', req.files?.length);
      if (!req.files || !Array.isArray(req.files)) {
        return res.status(400).json({ error: "No files provided" });
      }

      // Build folder structure from file paths
      const folderStructure = buildFolderStructureFromMulterFiles(req.files);
      const uploadedFiles = [];

      for (const file of req.files) {
        try {
          // Upload to Supabase Storage
          const { path: storagePath, url } = await supabaseStorage.uploadFile(
            file.buffer,
            file.originalname,
            file.mimetype,
            req.accessToken!
          );

          // Generate AI tags
          const aiTagging = await generateFileTags(
            file.originalname,
            file.mimetype
              isAiGenerated: false,
              originalPath: currentPath,
              folderType: 'original'

          // Auto-create folder if AI suggests one and no specific folder is provided
          let targetFolderId = folderId;
          if (!folderId && aiTagging.suggestedFolderName) {
            // Check if folder already exists
            const allFolders = await storage.getAllFolders(req.userId, req.accessToken);
            let existingFolder = allFolders.find(folder => 
              folder.name.toLowerCase() === aiTagging.suggestedFolderName.toLowerCase()
            );

            if (!existingFolder) {
              // Create new folder
              const newFolderData = insertFolderSchema.parse({
                name: aiTagging.suggestedFolderName,
                isAiGenerated: true,
                userId: req.userId
              });
              existingFolder = await storage.createFolder(newFolderData, req.accessToken);
              console.log(`Created new AI folder: ${aiTagging.suggestedFolderName}`);
            }

            targetFolderId = existingFolder.id;
          }

          // Create file record
          const fileData = insertFileSchema.parse({
            originalName: file.originalname,
            displayName: aiTagging.suggestedFileName || file.originalname,
            fileType: file.mimetype,
            fileSize: file.size,
            storagePath,
            userId: req.userId, // Add user ID from authentication
            tags: aiTagging.tags,
            aiGenerated: true,
            folderId: targetFolderId,
            metadata: {
              url,
              confidence: aiTagging.confidence,
              suggestedFolderName: aiTagging.suggestedFolderName
            }
          });

          const createdFile = await storage.createFile(fileData, req.accessToken);
          uploadedFiles.push(createdFile);
        } catch (error) {
          console.error(`Failed to upload ${file.originalname}:`, error);
        }
      }

      console.log(`Successfully uploaded ${uploadedFiles.length} files`);
      res.json(uploadedFiles);
    } catch (error) {
      console.error("Bulk upload error:", error);
      res.status(500).json({ error: "Failed to upload files" });
    }
  });

  // Update file tags
  app.patch("/api/files/:id/tags", authenticateUser, async (req, res) => {
    try {
      const { id } = req.params;
      const { tags } = req.body;

      if (!Array.isArray(tags)) {
        return res.status(400).json({ error: "Tags must be an array" });
      }

      const updatedFile = await storage.updateFile(id, { tags }, req.userId, req.accessToken);
      if (!updatedFile) {
        return res.status(404).json({ error: "File not found" });
      }

      res.json(updatedFile);
    } catch (error) {
      res.status(500).json({ error: "Failed to update tags" });
    }
  });

  // Re-process file with AI
  app.post("/api/files/:id/reprocess", authenticateUser, async (req, res) => {
    try {
      const { id } = req.params;
      const file = await storage.getFile(id, req.userId, req.accessToken);
      
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }

      // Generate new AI tags
      const aiTagging = await generateFileTags(
        // Note: depending on shape, these might be snake_case
        (file as any).original_name || (file as any).originalName,
        (file as any).file_type || (file as any).fileType
      );

      // Update file with new tags
      const updatedFile = await storage.updateFile(id, {
        tags: aiTagging.tags,
        displayName: aiTagging.suggestedFileName || ((file as any).display_name || (file as any).displayName),
        metadata: {
          ...((typeof (file as any).metadata === 'object' && (file as any).metadata !== null) ? (file as any).metadata : {}),
          confidence: aiTagging.confidence,
          suggestedFolderName: aiTagging.suggestedFolderName
        }
      }, req.userId, req.accessToken);

      res.json(updatedFile);
    } catch (error) {
      res.status(500).json({ error: "Failed to reprocess file" });
    }
  });

  // Apply tags to similar files
  app.post("/api/files/:id/apply-to-similar", authenticateUser, async (req, res) => {
    try {
      const { id } = req.params;
      const sourceFile = await storage.getFile(id, req.userId, req.accessToken);
      
      if (!sourceFile) {
        return res.status(404).json({ error: "File not found" });
      }

      console.log(`Applying tags from source file: ${(sourceFile as any).original_name} (${(sourceFile as any).file_type})`);
      console.log(`Source file tags:`, (sourceFile as any).tags);

      const allFiles = await storage.getAllFiles(req.userId, req.accessToken);
      
      // Find similar files based on file type and name patterns
      const similarFiles = allFiles.filter(file => {
        if (file.id === id) return false; // Exclude the source file
        
        // Check if files have the same type (main category)
        const sourceMainType = ((sourceFile as any).file_type || '').split('/')[0]?.toLowerCase();
        const fileMainType = ((file as any).file_type || '').split('/')[0]?.toLowerCase();
        const sameMainType = sourceMainType === fileMainType;
        
        // Check if files have the exact same type
        const sameExactType = (file as any).file_type === (sourceFile as any).file_type;
        
        // Check for similar naming patterns (same extension)
        const sourceExt = ((sourceFile as any).original_name || '').split('.').pop()?.toLowerCase();
        const fileExt = ((file as any).original_name || '').split('.').pop()?.toLowerCase();
        const sameExtension = sourceExt === fileExt;
        
        // Check for similar keywords in filename (more lenient)
        const sourceKeywords = ((sourceFile as any).original_name || '').toLowerCase()
          .replace(/[^a-z0-9]/g, ' ')
          .split(' ')
          .filter(word => word.length > 2);
        const fileKeywords = ((file as any).original_name || '').toLowerCase()
          .replace(/[^a-z0-9]/g, ' ')
          .split(' ')
          .filter(word => word.length > 2);
        
        const commonKeywords = sourceKeywords.filter(keyword => 
          fileKeywords.some(fKeyword => 
            fKeyword.includes(keyword) || 
            keyword.includes(fKeyword) ||
            fKeyword === keyword
          )
        );
        const hasCommonKeywords = commonKeywords.length > 0;
        
        // More lenient matching criteria
        const isMatch = sameExactType || // Exact same file type
                       (sameMainType && sameExtension) || // Same main type (image, document, etc.) and extension
                       (sameExtension && hasCommonKeywords); // Same extension with common keywords
        
        if (isMatch) {
          console.log(`Found similar file: ${(file as any).original_name} (${(file as any).file_type}) - Reason: ${
            sameExactType ? 'exact type' : 
            sameMainType && sameExtension ? 'same main type + extension' : 
            'same extension + keywords'
          }`);
        }
        
        return isMatch;
      });

      console.log(`Found ${similarFiles.length} similar files to update`);

      // Apply the source file's tags to similar files
      const updatedFiles = [] as any[];
      for (const file of similarFiles) {
        try {
          const updatedFile = await storage.updateFile(file.id, {
            tags: (sourceFile as any).tags
          }, req.userId, req.accessToken);
          if (updatedFile) {
            updatedFiles.push(updatedFile);
            console.log(`Updated tags for: ${(file as any).original_name}`);
          }
        } catch (error) {
          console.error(`Failed to update file ${file.id} (${(file as any).original_name}):`, error);
        }
      }

      console.log(`Successfully updated ${updatedFiles.length} files with tags:`, (sourceFile as any).tags);

      res.json({
        sourceFile,
        updatedFiles,
        count: updatedFiles.length,
        similarFilesFound: similarFiles.length
      });
    } catch (error) {
      console.error("Apply to similar files error:", error);
      res.status(500).json({ error: "Failed to apply tags to similar files" });
    }
  });

  // Delete file
  app.delete("/api/files/:id", authenticateUser, async (req, res) => {
    try {
      const { id } = req.params;
      const file = await storage.getFile(id, req.userId, req.accessToken);
      
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }

      // Delete from Supabase Storage
      await supabaseStorage.deleteFile((file as any).storage_path || (file as any).storagePath, req.accessToken!);
      
      // Delete from database
      await storage.deleteFile(id, req.userId, req.accessToken);
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete file" });
    }
  });

  // Get all folders
  app.get("/api/folders", authenticateUser, async (req, res) => {
    try {
      const folders = await storage.getAllFolders(req.userId, req.accessToken);
      res.json(folders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch folders" });
    }
  });

  // Create folder
  app.post("/api/folders", authenticateUser, async (req, res) => {
    try {
      const folderData = insertFolderSchema.parse({
        ...req.body,
        userId: req.userId
      });
      const folder = await storage.createFolder(folderData, req.accessToken);
      res.json(folder);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid folder data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create folder" });
    }
  });

  // Get storage usage
  app.get("/api/storage-usage", authenticateUser, async (req, res) => {
    try {
      // Calculate storage usage from database using the same storage instance
      const files = await storage.getAllFiles(req.userId, req.accessToken);
      const totalSize = (files as any[]).reduce((acc, file) => acc + ((file as any).file_size || (file as any).fileSize || 0), 0);
      
      // Supabase storage limit is typically 1GB for free tier, 100GB for pro
      const storageLimit = 1 * 1024 * 1024 * 1024; // 1GB in bytes
      
      res.json({
        used: totalSize,
        total: storageLimit
      });
    } catch (error) {
      console.error('Storage usage error:', error);
      res.status(500).json({ error: "Failed to get storage usage" });
    }
  });

  // Search files
  app.get("/api/search", authenticateUser, async (req, res) => {
    try {
      const { q, tag, type } = req.query;
      let files = await storage.getAllFiles(req.userId, req.accessToken) as any[];

      // Filter by search query
      if (q && typeof q === 'string') {
        const query = q.toLowerCase();
        files = files.filter(file => 
          ((file.original_name || file.originalName || '').toLowerCase().includes(query)) ||
          ((file.display_name || file.displayName || '').toLowerCase().includes(query)) ||
          ((file.tags || []).some((t: string) => t.toLowerCase().includes(query)))
        );
      }

      // Filter by tag
      if (tag && typeof tag === 'string') {
        files = files.filter(file => 
          ((file.tags || []).some((t: string) => t.toLowerCase() === tag.toLowerCase()))
        );
      }

      // Filter by file type
      if (type && typeof type === 'string') {
        files = files.filter(file => 
          ((file.file_type || file.fileType || '').toLowerCase().includes(type.toLowerCase()))
        );
      }

      res.json(files);
    } catch (error) {
      res.status(500).json({ error: "Search failed" });
    }
  });

  // Organize existing files into folders
  app.post("/api/organize-files", authenticateUser, async (req, res) => {
    try {
      const files = await storage.getAllFiles(req.userId, req.accessToken) as any[];
      const organizedCount = { created: 0, moved: 0 };

      for (const file of files) {
        // Skip files already in folders
        if ((file as any).folderId || (file as any).folder_id) continue;

        // Re-generate AI suggestions for unorganized files
        const aiTagging = await generateFileTags(
          (file as any).original_name,
          (file as any).file_type
        );

        if (aiTagging.suggestedFolderName) {
          // Check if folder exists
          const allFolders = await storage.getAllFolders(req.userId, req.accessToken);
          let existingFolder = allFolders.find(folder => 
            (folder as any).name.toLowerCase() === aiTagging.suggestedFolderName.toLowerCase()
          );

          if (!existingFolder) {
            // Create new folder
            const newFolderData = insertFolderSchema.parse({
              name: aiTagging.suggestedFolderName,
              isAiGenerated: true,
              userId: req.userId
            });
            existingFolder = await storage.createFolder(newFolderData, req.accessToken);
            organizedCount.created++;
            console.log(`Created folder: ${aiTagging.suggestedFolderName}`);
          }

          // Move file to folder
          await storage.updateFile((file as any).id, {
            folderId: (existingFolder as any).id,
            tags: aiTagging.tags
          }, req.userId, req.accessToken);
          organizedCount.moved++;
          console.log(`Moved ${(file as any).original_name} to ${aiTagging.suggestedFolderName}`);
        }
      }

      res.json({
        success: true,
        foldersCreated: organizedCount.created,
          const relativePath = file.originalname;
        message: `Organized ${organizedCount.moved} files into ${organizedCount.created} new folders`
      });
    } catch (error) {
      console.error("Organization error:", error);
      res.status(500).json({ error: "Failed to organize files" });
    }
  });

  // Google Drive integration routes
  
  // Get Google Drive authorization URL
  app.get("/api/google-drive/auth-url", authenticateUser, async (req, res) => {
    try {
      const { authUrl, state } = googleDriveService.generateAuthUrl(req.userId!);
      res.json({ authUrl, state });
    } catch (error) {
      console.error('Google Drive auth URL error:', error);
      res.status(500).json({ error: "Failed to generate Google Drive authorization URL" });
    }
  });

  // Handle Google OAuth callback
  app.get("/api/google-auth/callback", async (req, res) => {
    try {
      const { code, state } = req.query;
      
      if (!code || !state) {
        return res.status(400).send('Missing authorization code or state');
      }

      const result = await googleDriveService.exchangeCodeForTokens(code as string, state as string);
      
      if (!result.success) {
        return res.status(400).send('Authorization failed');
      }

      // Store tokens temporarily (in a real app, you'd want to store these securely)
      const accessToken = result.tokens?.access_token || '';
      const refreshToken = result.tokens?.refresh_token || '';
      const expiresIn = result.tokens?.expiry_date?.toString() || '';

      // Return an HTML page that can handle both popup and redirect scenarios
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Google Drive Authorization</title>
        </head>
        <body>
          <script>
            try {
              // Store tokens in localStorage
              const tokens = {
                accessToken: '${accessToken}',
                refreshToken: '${refreshToken}',
                expiresIn: '${expiresIn}'
              };
              
              localStorage.setItem('google_drive_tokens', JSON.stringify(tokens));
              
              // Check if we're in a popup window
              if (window.opener && !window.opener.closed) {
                // We're in a popup - close it and let parent handle the rest
                window.close();
              } else {
                // We're in the main window - redirect back to home
                window.location.href = '/?google_drive_auth=success';
              }
            } catch (error) {
              console.error('Error storing tokens:', error);
              if (window.opener && !window.opener.closed) {
                window.close();
              } else {
                window.location.href = '/?error=auth_failed';
              }
            }
          </script>
          <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
            <h2>Connecting to Google Drive...</h2>
            <p>Please wait while we complete the authentication.</p>
          </div>
        </body>
        </html>
      `;
      
      res.send(html);
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      res.status(500).send('Authorization failed');
    }
  });

  // List Google Drive files
  app.get("/api/google-drive/files", authenticateUser, async (req, res) => {
    try {
      const { access_token, folder_id, page_token } = req.query;
      
      if (!access_token) {
        return res.status(400).json({ error: "Google Drive access token required" });
      }

      const result = await googleDriveService.listFiles(
        access_token as string,
        folder_id as string,
        page_token as string
      );
      
      res.json(result);
    } catch (error) {
      console.error('Google Drive files list error:', error);
      res.status(500).json({ error: "Failed to fetch Google Drive files" });
    }
  });

  // Search Google Drive files
  app.get("/api/google-drive/search", authenticateUser, async (req, res) => {
    try {
      const { access_token, q, page_token } = req.query;
      
      if (!access_token || !q) {
        return res.status(400).json({ error: "Access token and search query required" });
      }

      const result = await googleDriveService.searchFiles(
        access_token as string,
        q as string,
        page_token as string
      );
      
      res.json(result);
    } catch (error) {
      console.error('Google Drive search error:', error);
      res.status(500).json({ error: "Failed to search Google Drive files" });
    }
  });

  // Import file from Google Drive
  app.post("/api/google-drive/import", authenticateUser, async (req, res) => {
    try {
      const { access_token, file_id, folder_id } = req.body;
      
      if (!access_token || !file_id) {
        return res.status(400).json({ error: "Access token and file ID required" });
      }

      // Get file metadata from Google Drive
      const driveFile = await googleDriveService.getFileMetadata(access_token, file_id);
      if (!driveFile || driveFile.isFolder) {
        return res.status(400).json({ error: "Invalid file or folder cannot be imported" });
      }

      // Download file content
      const fileBuffer = await googleDriveService.downloadFile(access_token, file_id);
      if (!fileBuffer) {
        return res.status(500).json({ error: "Failed to download file from Google Drive" });
      }

      // Get appropriate filename and mime type for export
      let fileName = driveFile.name;
      let mimeType = driveFile.mimeType;
      
      // Handle Google Workspace file exports
      if (driveFile.mimeType.includes('google-apps')) {
        const exportMimeType = googleDriveService['getExportMimeType'](driveFile.mimeType);
        if (exportMimeType) {
          mimeType = exportMimeType;
          // Add appropriate extension
          if (exportMimeType.includes('pdf')) fileName += '.pdf';
          else if (exportMimeType.includes('spreadsheet')) fileName += '.xlsx';
          else if (exportMimeType.includes('presentation')) fileName += '.pptx';
          else if (exportMimeType.includes('png')) fileName += '.png';
        }
      }

      // Upload to Supabase Storage
      const { path: storagePath, url } = await supabaseStorage.uploadFile(
        fileBuffer,
        fileName,
        mimeType,
        req.accessToken!
      );

      // Generate AI tags
      const aiTagging = await generateFileTags(fileName, mimeType);

      // Auto-create folder if AI suggests one and no specific folder is provided
      let targetFolderId = folder_id;
      if (!folder_id && aiTagging.suggestedFolderName) {
        const allFolders = await storage.getAllFolders(req.userId, req.accessToken);
        let existingFolder = allFolders.find(folder => 
          folder.name.toLowerCase() === aiTagging.suggestedFolderName.toLowerCase()
        );

        if (!existingFolder) {
          const newFolderData = insertFolderSchema.parse({
            name: aiTagging.suggestedFolderName,
            isAiGenerated: true,
            userId: req.userId
          });
          existingFolder = await storage.createFolder(newFolderData, req.accessToken);
        }

        targetFolderId = existingFolder.id;
      }

      // Create file record
      const fileData = insertFileSchema.parse({
        originalName: driveFile.name,
        displayName: aiTagging.suggestedFileName || fileName,
        fileType: mimeType,
        fileSize: fileBuffer.length,
        storagePath,
        userId: req.userId,
        tags: aiTagging.tags,
        aiGenerated: true,
        folderId: targetFolderId,
        metadata: {
          url,
          confidence: aiTagging.confidence,
          suggestedFolderName: aiTagging.suggestedFolderName,
          importedFromGoogleDrive: true,
          googleDriveFileId: file_id,
          googleDriveWebViewLink: driveFile.webViewLink
        }
      });

      const createdFile = await storage.createFile(fileData, req.accessToken);
      res.json(createdFile);
    } catch (error) {
      console.error('Google Drive import error:', error);
      res.status(500).json({ error: "Failed to import file from Google Drive" });
    }
  });

  // Import multiple files from Google Drive
  app.post("/api/google-drive/import-multiple", authenticateUser, async (req, res) => {
    try {
      const { access_token, file_ids, folder_id } = req.body;
      
      if (!access_token || !Array.isArray(file_ids) || file_ids.length === 0) {
        return res.status(400).json({ error: "Access token and file IDs array required" });
      }

      const importedFiles = [];
      const errors = [];

      for (const fileId of file_ids) {
        try {
          // Get file metadata
          const driveFile = await googleDriveService.getFileMetadata(access_token, fileId);
          if (!driveFile || driveFile.isFolder) {
            errors.push({ fileId, error: 'Invalid file or folder cannot be imported' });
            continue;
          }

          // Download file content
          const fileBuffer = await googleDriveService.downloadFile(access_token, fileId);
          if (!fileBuffer) {
            errors.push({ fileId, error: 'Failed to download file' });
            continue;
          }

          // Handle filename and mime type
          let fileName = driveFile.name;
          let mimeType = driveFile.mimeType;
          
          if (driveFile.mimeType.includes('google-apps')) {
            const exportMimeType = googleDriveService['getExportMimeType'](driveFile.mimeType);
            if (exportMimeType) {
              mimeType = exportMimeType;
              if (exportMimeType.includes('pdf')) fileName += '.pdf';
              else if (exportMimeType.includes('spreadsheet')) fileName += '.xlsx';
              else if (exportMimeType.includes('presentation')) fileName += '.pptx';
              else if (exportMimeType.includes('png')) fileName += '.png';
            }
          }

          // Upload to Supabase Storage
          const { path: storagePath, url } = await supabaseStorage.uploadFile(
            fileBuffer,
            relativePath,
            fileName,
            mimeType,
            req.accessToken!
          );

          // Generate AI tags
          const aiTagging = await generateFileTags(fileName, mimeType);

          // Auto-create folder if needed
          let targetFolderId = folder_id;
          if (!folder_id && aiTagging.suggestedFolderName) {
            const allFolders = await storage.getAllFolders(req.userId, req.accessToken);
            let existingFolder = allFolders.find(folder => 
              folder.name.toLowerCase() === aiTagging.suggestedFolderName.toLowerCase()
            );

            if (!existingFolder) {
              const newFolderData = insertFolderSchema.parse({
                name: aiTagging.suggestedFolderName,
                isAiGenerated: true,
                userId: req.userId
              });
              existingFolder = await storage.createFolder(newFolderData, req.accessToken);
            }

            targetFolderId = existingFolder.id;
          }

          // Create file record
          const fileData = insertFileSchema.parse({
            originalName: driveFile.name,
            displayName: aiTagging.suggestedFileName || fileName,
            fileType: mimeType,
            fileSize: fileBuffer.length,
            storagePath,
            userId: req.userId,
            tags: aiTagging.tags,
            aiGenerated: true,
            folderId: targetFolderId,
            metadata: {
              url,
              confidence: aiTagging.confidence,
              suggestedFolderName: aiTagging.suggestedFolderName,
                isAiGenerated: true,
                folderType: 'ai_organized'
              isOriginalUpload: true
              googleDriveWebViewLink: driveFile.webViewLink
            }
          });

          const createdFile = await storage.createFile(fileData, req.accessToken);
          importedFiles.push(createdFile);
        } catch (error) {
          console.error(`Failed to import file ${fileId}:`, error);
          errors.push({ fileId, error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }

      res.json({
        success: true,
        importedFiles,
        errors,
        imported: importedFiles.length,
        failed: errors.length
            originalFolderId: (file as any).folder_id,
            relativePath: (file as any).relative_path,
      });
    } catch (error) {
      console.error('Google Drive bulk import error:', error);
      res.status(500).json({ error: "Failed to import files from Google Drive" });
    }
  });
              (folder as any).folder_type === 'ai_organized'
  const httpServer = createServer(app);
  return httpServer;
}

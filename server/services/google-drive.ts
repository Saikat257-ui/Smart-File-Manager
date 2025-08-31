import { google, drive_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../config';

export interface GoogleDriveFile {
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

export interface GoogleDriveAuthUrl {
  authUrl: string;
  state: string;
}

export class GoogleDriveService {
  private oauth2Client: OAuth2Client;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      config.google.clientId,
      config.google.clientSecret,
      config.google.redirectUri
    );
  }

  /**
   * Generate Google OAuth2 authorization URL
   */
  generateAuthUrl(userId: string): GoogleDriveAuthUrl {
    const state = Buffer.from(JSON.stringify({ userId, timestamp: Date.now() })).toString('base64');
    
    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/drive.readonly',
      ],
      state,
      prompt: 'consent', // Force consent to get refresh token
      include_granted_scopes: false // Prevent Google from adding additional scopes
    });

    return { authUrl, state };
  }

  /**
   * Exchange authorization code for access tokens
   */
  async exchangeCodeForTokens(code: string, state: string) {
    try {
      // Verify state parameter
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
      const { userId } = stateData;

      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);

      return { 
        tokens, 
        userId,
        success: true 
      };
    } catch (error) {
      console.error('Token exchange error:', error);
      return { 
        success: false, 
        error: 'Failed to exchange authorization code' 
      };
    }
  }

  /**
   * Set credentials from stored tokens
   */
  setCredentials(accessToken: string, refreshToken?: string) {
    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken
    });
  }

  /**
   * List files from Google Drive
   */
  async listFiles(
    accessToken: string, 
    folderId?: string, 
    pageToken?: string
  ): Promise<{
    files: GoogleDriveFile[];
    nextPageToken?: string;
  }> {
    try {
      this.oauth2Client.setCredentials({ access_token: accessToken });
      const drive = google.drive({ version: 'v3', auth: this.oauth2Client });

      let query = "trashed=false";
      if (folderId) {
        query += ` and '${folderId}' in parents`;
      } else {
        // Root folder items
        query += " and 'root' in parents";
      }

      const response = await drive.files.list({
        q: query,
        fields: 'nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, thumbnailLink, parents)',
        pageSize: 50,
        pageToken,
        orderBy: 'folder,name'
      });

      const files: GoogleDriveFile[] = (response.data.files || []).map(file => ({
        id: file.id!,
        name: file.name!,
        mimeType: file.mimeType!,
        size: file.size ? parseInt(file.size) : undefined,
        createdTime: file.createdTime || undefined,
        modifiedTime: file.modifiedTime || undefined,
        webViewLink: file.webViewLink || undefined,
        thumbnailLink: file.thumbnailLink || undefined,
        parents: file.parents || undefined,
        isFolder: file.mimeType === 'application/vnd.google-apps.folder'
      }));

      return {
        files,
        nextPageToken: response.data.nextPageToken || undefined
      };
    } catch (error) {
      console.error('Google Drive list files error:', error);
      throw new Error('Failed to list Google Drive files');
    }
  }

  /**
   * Get file metadata from Google Drive
   */
  async getFileMetadata(accessToken: string, fileId: string): Promise<GoogleDriveFile | null> {
    try {
      this.oauth2Client.setCredentials({ access_token: accessToken });
      const drive = google.drive({ version: 'v3', auth: this.oauth2Client });

      const response = await drive.files.get({
        fileId,
        fields: 'id, name, mimeType, size, createdTime, modifiedTime, webViewLink, thumbnailLink, parents'
      });

      const file = response.data;
      return {
        id: file.id!,
        name: file.name!,
        mimeType: file.mimeType!,
        size: file.size ? parseInt(file.size) : undefined,
        createdTime: file.createdTime || undefined,
        modifiedTime: file.modifiedTime || undefined,
        webViewLink: file.webViewLink || undefined,
        thumbnailLink: file.thumbnailLink || undefined,
        parents: file.parents || undefined,
        isFolder: file.mimeType === 'application/vnd.google-apps.folder'
      };
    } catch (error) {
      console.error('Google Drive get file error:', error);
      return null;
    }
  }

  /**
   * Download file content from Google Drive
   */
  async downloadFile(accessToken: string, fileId: string): Promise<Buffer | null> {
    try {
      this.oauth2Client.setCredentials({ access_token: accessToken });
      const drive = google.drive({ version: 'v3', auth: this.oauth2Client });

      // First check if it's a Google Workspace file that needs to be exported
      const metadata = await this.getFileMetadata(accessToken, fileId);
      if (!metadata) return null;

      let response;

      // Handle Google Workspace files (need to export)
      if (metadata.mimeType.includes('google-apps')) {
        // Export Google Docs as PDF, Sheets as Excel, etc.
        const exportMimeType = this.getExportMimeType(metadata.mimeType);
        if (exportMimeType) {
          response = await drive.files.export({
            fileId,
            mimeType: exportMimeType
          }, { responseType: 'arraybuffer' });
        } else {
          throw new Error('Unsupported Google Workspace file type for export');
        }
      } else {
        // Download regular files
        response = await drive.files.get({
          fileId,
          alt: 'media'
        }, { responseType: 'arraybuffer' });
      }

      return Buffer.from(response.data as ArrayBuffer);
    } catch (error) {
      console.error('Google Drive download error:', error);
      return null;
    }
  }

  /**
   * Get appropriate export MIME type for Google Workspace files
   */
  private getExportMimeType(googleMimeType: string): string | null {
    const exportMap: Record<string, string> = {
      'application/vnd.google-apps.document': 'application/pdf',
      'application/vnd.google-apps.spreadsheet': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.google-apps.presentation': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.google-apps.drawing': 'image/png'
    };

    return exportMap[googleMimeType] || null;
  }

  /**
   * Search files in Google Drive
   */
  async searchFiles(
    accessToken: string, 
    query: string, 
    pageToken?: string
  ): Promise<{
    files: GoogleDriveFile[];
    nextPageToken?: string;
  }> {
    try {
      this.oauth2Client.setCredentials({ access_token: accessToken });
      const drive = google.drive({ version: 'v3', auth: this.oauth2Client });

      const searchQuery = `trashed=false and name contains '${query}'`;

      const response = await drive.files.list({
        q: searchQuery,
        fields: 'nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, thumbnailLink, parents)',
        pageSize: 50,
        pageToken,
        orderBy: 'name'
      });

      const files: GoogleDriveFile[] = (response.data.files || []).map(file => ({
        id: file.id!,
        name: file.name!,
        mimeType: file.mimeType!,
        size: file.size ? parseInt(file.size) : undefined,
        createdTime: file.createdTime || undefined,
        modifiedTime: file.modifiedTime || undefined,
        webViewLink: file.webViewLink || undefined,
        thumbnailLink: file.thumbnailLink || undefined,
        parents: file.parents || undefined,
        isFolder: file.mimeType === 'application/vnd.google-apps.folder'
      }));

      return {
        files,
        nextPageToken: response.data.nextPageToken || undefined
      };
    } catch (error) {
      console.error('Google Drive search error:', error);
      throw new Error('Failed to search Google Drive files');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string) {
    try {
      this.oauth2Client.setCredentials({ refresh_token: refreshToken });
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      return credentials;
    } catch (error) {
      console.error('Token refresh error:', error);
      throw new Error('Failed to refresh access token');
    }
  }
}

export const googleDriveService = new GoogleDriveService();

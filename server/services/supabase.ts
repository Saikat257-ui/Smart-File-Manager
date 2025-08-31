import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from "crypto";
import { config } from '../config';

export class SupabaseStorageService {
  private bucketName: string;
  private adminClient: SupabaseClient;

  constructor() {
    this.bucketName = "file-storage";
    // Prefer service role for server-side operations to bypass RLS on storage
    const key = config.supabase.serviceRoleKey || config.supabase.anonKey;
    this.adminClient = createClient(config.supabase.url, key);
  }

  // Create a Supabase client impersonating the user (for cases where policies rely on auth.uid())
  private createUserScopedClient(accessToken: string) {
    return createClient(config.supabase.url, config.supabase.anonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    });
  }

  async uploadFile(file: Buffer, fileName: string, mimeType: string, accessToken: string): Promise<{ path: string; url: string }> {
    // Generate unique file path
    const fileId = randomUUID();
    const extension = fileName.split('.').pop();
    const uniqueFileName = `${fileId}.${extension}`;
    const filePath = `uploads/${uniqueFileName}`;

    try {
      // Use admin client to avoid storage RLS issues if policies aren't present
      const client = config.supabase.serviceRoleKey ? this.adminClient : this.createUserScopedClient(accessToken);

      const { error } = await client.storage
        .from(this.bucketName)
        .upload(filePath, file, {
          contentType: mimeType,
          upsert: false
        });

      if (error) {
        throw new Error(`Supabase upload error: ${error.message}`);
      }

      const { data: urlData } = client.storage
        .from(this.bucketName)
        .getPublicUrl(filePath);

      return {
        path: filePath,
        url: urlData.publicUrl
      };
    } catch (error) {
      throw new Error(`Failed to upload file: ${error}`);
    }
  }

  async deleteFile(path: string, accessToken: string): Promise<boolean> {
    try {
      const client = config.supabase.serviceRoleKey ? this.adminClient : this.createUserScopedClient(accessToken);

      const { error } = await client.storage
        .from(this.bucketName)
        .remove([path]);

      if (error) {
        console.error(`Failed to delete file: ${error.message}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`Failed to delete file: ${error}`);
      return false;
    }
  }

  async getFileUrl(path: string): Promise<string> {
    const { data } = this.adminClient.storage
      .from(this.bucketName)
      .getPublicUrl(path);
    
    return data.publicUrl;
  }

  async getBucketSize(): Promise<{ used: number; total: number }> {
    try {
      const { data, error } = await this.adminClient.storage
        .from(this.bucketName)
        .list("uploads", {
          limit: 10000, // Adjust as needed, may need pagination for more files
        });

      if (error) {
        throw error;
      }

      const usedSize = data.reduce((acc, file) => acc + (file.metadata?.size ?? 0), 0);

      const storageLimit = 1 * 1024 * 1024 * 1024; // 1GB in bytes
      return { used: usedSize, total: storageLimit };
    } catch (error) {
      console.error('Failed to get bucket size:', error);
      // Fallback to a default value in case of an error
      return { used: 0, total: 1 * 1024 * 1024 * 1024 };
    }
  }
}

export const supabaseStorage = new SupabaseStorageService();

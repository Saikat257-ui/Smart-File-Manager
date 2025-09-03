import { type File, type InsertFile, type Folder, type InsertFolder } from "@shared/schema";
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config, validateConfig } from './config';

// Validate environment variables before proceeding
validateConfig();

function getClient(accessToken?: string): SupabaseClient {
  if (config.supabase.serviceRoleKey) {
    return createClient(config.supabase.url, config.supabase.serviceRoleKey);
  }
  // Fallback: use anon key but impersonate the user with Authorization header for RLS
  return createClient(config.supabase.url, config.supabase.anonKey, accessToken ? {
    global: { headers: { Authorization: `Bearer ${accessToken}` } }
  } : undefined);
}

export interface IStorage {
  // File operations
  createFile(file: InsertFile, accessToken?: string): Promise<File>;
  getFile(id: string, userId?: string, accessToken?: string): Promise<File | undefined>;
  getAllFiles(userId?: string, accessToken?: string): Promise<File[]>;
  updateFile(id: string, updates: Partial<InsertFile>, userId?: string, accessToken?: string): Promise<File | undefined>;
  deleteFile(id: string, userId?: string, accessToken?: string): Promise<boolean>;
  getFilesByFolderId(folderId?: string, userId?: string, accessToken?: string): Promise<File[]>;
  
  // Folder operations
  createFolder(folder: InsertFolder, accessToken?: string): Promise<Folder>;
  getFolder(id: string, userId?: string, accessToken?: string): Promise<Folder | undefined>;
  getAllFolders(userId?: string, accessToken?: string): Promise<Folder[]>;
  getFoldersByParentId(parentId?: string, userId?: string, accessToken?: string): Promise<Folder[]>;
  deleteFolder(id: string, userId?: string, accessToken?: string): Promise<boolean>;
}

export class SupabaseStorage implements IStorage {

  async createFile(insertFile: InsertFile, accessToken?: string): Promise<File> {
    const db = getClient(accessToken);
    const fileData = {
      original_name: insertFile.originalName,
      display_name: insertFile.displayName,
      file_type: insertFile.fileType,
      file_size: insertFile.fileSize,
      storage_path: insertFile.storagePath,
      folder_id: insertFile.folderId || null,
      user_id: insertFile.userId, // Now required in schema
      tags: Array.isArray(insertFile.tags) ? insertFile.tags : [],
      ai_generated: typeof insertFile.aiGenerated === 'boolean' ? insertFile.aiGenerated : false,
      metadata: typeof insertFile.metadata === 'object' && insertFile.metadata !== null ? insertFile.metadata : {}
    };

    const { data, error } = await db
      .from('files')
      .insert([fileData])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create file: ${error.message}`);
    }

    return data;
  }

  async getFile(id: string, userId?: string, accessToken?: string): Promise<File | undefined> {
    const db = getClient(accessToken);
    let query = db
      .from('files')
      .select('*')
      .eq('id', id);
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data, error } = await query.single();

    if (error) {
      return undefined;
    }

    return data;
  }

  async getAllFiles(userId?: string, accessToken?: string): Promise<File[]> {
    const db = getClient(accessToken);
    let query = db
      .from('files')
      .select('*');
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data, error } = await query.order('uploaded_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      throw new Error(`Failed to get files: ${error.message}`);
    }

    return data || [];
  }

  async updateFile(id: string, updates: Partial<InsertFile>, userId?: string, accessToken?: string): Promise<File | undefined> {
    const db = getClient(accessToken);
    let query = db
      .from('files')
      .update(updates)
      .eq('id', id);
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data, error } = await query.select().single();

    if (error) {
      return undefined;
    }

    return data;
  }

  async deleteFile(id: string, userId?: string, accessToken?: string): Promise<boolean> {
    const db = getClient(accessToken);
    let query = db
      .from('files')
      .delete()
      .eq('id', id);
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { error } = await query;

    return !error;
  }

  async getFilesByFolderId(folderId?: string, userId?: string, accessToken?: string): Promise<File[]> {
    const db = getClient(accessToken);
    let query = db
      .from('files')
      .select('*');

    if (folderId) {
      query = query.eq('folder_id', folderId);
    } else {
      query = query.is('folder_id', null);
    }
    
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.order('uploaded_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get files by folder: ${error.message}`);
    }

    return data || [];
  }

  async createFolder(insertFolder: InsertFolder, accessToken?: string): Promise<Folder> {
    const db = getClient(accessToken);
    const folderData = {
      name: insertFolder.name,
      parent_id: insertFolder.parentId || null,
      user_id: insertFolder.userId, // Now required in schema
      is_ai_generated: typeof insertFolder.isAiGenerated === 'boolean' ? insertFolder.isAiGenerated : false,
      original_path: insertFolder.originalPath || null,
      folder_type: insertFolder.folderType || 'user'
    };

    const { data, error } = await db
      .from('folders')
      .insert([folderData])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create folder: ${error.message}`);
    }

    return data;
  }

  async getFolder(id: string, userId?: string, accessToken?: string): Promise<Folder | undefined> {
    const db = getClient(accessToken);
    let query = db
      .from('folders')
      .select('*')
      .eq('id', id);
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data, error } = await query.single();

    if (error) {
      return undefined;
    }

    return data;
  }

  async getAllFolders(userId?: string, accessToken?: string): Promise<Folder[]> {
    const db = getClient(accessToken);
    let query = db
      .from('folders')
      .select('*');
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase folders error:', error);
      throw new Error(`Failed to get folders: ${error.message}`);
    }

    return data || [];
  }

  async getFoldersByParentId(parentId?: string, userId?: string, accessToken?: string): Promise<Folder[]> {
    const db = getClient(accessToken);
    let query = db
      .from('folders')
      .select('*');

    if (parentId) {
      query = query.eq('parent_id', parentId);
    } else {
      query = query.is('parent_id', null);
    }
    
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get folders by parent: ${error.message}`);
    }

    return data || [];
  }

  async deleteFolder(id: string, userId?: string, accessToken?: string): Promise<boolean> {
    const db = getClient(accessToken);
    let query = db
      .from('folders')
      .delete()
      .eq('id', id);
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { error } = await query;

    return !error;
  }
}

export const storage = new SupabaseStorage();

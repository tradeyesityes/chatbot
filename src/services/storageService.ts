import { FileContext } from '../types'
import { supabase } from './supabaseService'

export class StorageService {
  static async saveFiles(userId: string, files: FileContext[]): Promise<void> {
    const fileRecords = files.map(f => ({
      user_id: userId,
      name: f.name,
      content: f.content,
      type: f.type,
      size: f.size
    }))

    const { error } = await supabase.from('user_files').insert(fileRecords)
    if (error) throw error
  }

  static async getFiles(userId: string): Promise<FileContext[]> {
    const { data, error } = await supabase
      .from('user_files')
      .select('*')
      .eq('user_id', userId)

    if (error) throw error
    return data || []
  }

  static async deleteFile(userId: string, fileName: string): Promise<void> {
    const { error } = await supabase
      .from('user_files')
      .delete()
      .eq('user_id', userId)
      .eq('name', fileName)

    if (error) throw error
  }

  static async clearFiles(userId: string): Promise<void> {
    const { error } = await supabase
      .from('user_files')
      .delete()
      .eq('user_id', userId)

    if (error) throw error
  }
}

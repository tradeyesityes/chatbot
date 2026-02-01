import React, { useRef, useState } from 'react'
import { FileContext } from '../types'
import { FileProcessingService } from '../services/fileProcessingService'
import { GoogleDriveService } from '../services/googleDriveService'
import { SettingsService } from '../services/settingsService'

interface FileUploaderProps {
  userId: string
  onFilesAdded: (files: FileContext[]) => void
  isLoading?: boolean
}

export const FileUploader: React.FC<FileUploaderProps> = ({ userId, onFilesAdded, isLoading = false }) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [error, setError] = useState<string>('')

  const processFiles = async (fileArray: File[]) => {
    setError('')
    const uploadedFiles: FileContext[] = []

    for (let i = 0; i < fileArray.length; i++) {
      try {
        const validation = FileProcessingService.validateFile(fileArray[i])
        if (!validation.valid) {
          setError(`${fileArray[i].name}: ${validation.message}`)
          continue
        }

        const processed = await FileProcessingService.processFile(fileArray[i])
        uploadedFiles.push(processed)
        setUploadProgress(((i + 1) / fileArray.length) * 100)
      } catch (err: any) {
        setError(`خطأ في معالجة ${fileArray[i].name}: ${err.message}`)
      }
    }

    if (uploadedFiles.length > 0) {
      onFilesAdded(uploadedFiles)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    await processFiles(Array.from(files))
    setUploadProgress(0)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleGoogleDrive = async () => {
    try {
      // Fetch user settings first
      const settings = await SettingsService.getSettings(userId)

      if (!settings.google_client_id || !settings.google_api_key) {
        setError('يرجى ضبط إعدادات Google Drive أولاً من لوحة التحكم (أيقونة الترس)')
        return
      }

      const files = await GoogleDriveService.openPicker(settings.google_client_id, settings.google_api_key)
      if (files.length > 0) {
        await processFiles(files)
      }
    } catch (e: any) {
      console.error(e)
      setError(e.message || 'فشل الاتصال بـ Google Drive')
    }
  }

  const handleClick = () => {
    if (!isLoading) inputRef.current?.click()
  }

  return (
    <div className="group relative border-2 border-dashed border-slate-300/60 dark:border-slate-600 rounded-2xl p-10 text-center hover:border-blue-500 transition-all duration-300 bg-slate-50/50 hover:bg-blue-50/30">
      <input
        ref={inputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        disabled={isLoading}
        className="hidden"
        accept=".pdf,.txt,.csv,.docx,.doc,.xlsx,.xls,.json,text/*,image/*"
      />

      <div className="flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 bg-blue-100/50 text-blue-600 rounded-full flex items-center justify-center text-3xl mb-2 group-hover:scale-110 transition-transform duration-300">
          ☁️
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleClick}
            disabled={isLoading}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 font-semibold disabled:opacity-50 disabled:shadow-none transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⏳</span>
                جاري المعالجة...
              </span>
            ) : (
              '📁 اختر الملفات'
            )}
          </button>

          <button
            onClick={handleGoogleDrive}
            disabled={isLoading}
            className="px-6 py-3 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 shadow-sm font-semibold disabled:opacity-50 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2"
          >
            <span className="text-xl">📄</span>
            <span>Google Drive</span>
          </button>
        </div>

        <p className="text-sm text-slate-500 font-medium">
          PDF, DOCX, Excel, TXT, CSV, JSON, والصور
        </p>
      </div>

      {uploadProgress > 0 && uploadProgress < 100 && (
        <div className="mt-6 w-full max-w-xs mx-auto">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>جاري الرفع...</span>
            <span>{Math.round(uploadProgress)}%</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 animate-in">
          ⚠️ {error}
        </div>
      )}
    </div>
  )
}

import React, { useRef, useState } from 'react'
import { FileContext } from '../types'
import { FileProcessingService } from '../services/fileProcessingService'
import { EmbeddingService } from '../services/embeddingService'
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
  const [success, setSuccess] = useState<string>('')

  const processFiles = async (fileArray: File[]) => {
    setError('')
    setSuccess('')
    const uploadedFiles: FileContext[] = []

    for (let i = 0; i < fileArray.length; i++) {
      try {
        const validation = FileProcessingService.validateFile(fileArray[i])
        if (!validation.valid) {
          setError(`${fileArray[i].name}: ${validation.message}`)
          continue
        }

        const processed = await FileProcessingService.processFile(fileArray[i])

        // ENTERPRISE UPGRADE: Automatic Vector Indexing
        try {
          const settings = await SettingsService.getSettings(userId);
          const apiKey = settings.openai_api_key || (import.meta.env as any).VITE_OPENAI_API_KEY;
          if (apiKey) {
            console.log(`Triggering vector indexing for: ${fileArray[i].name}`);
            // Proceed without waiting for indexing to finish (background) if it's too slow, 
            // but for reliability we await here.
            await EmbeddingService.indexFile(userId, fileArray[i].name, processed.content, apiKey);
          }
        } catch (idxErr) {
          console.error('Vector indexing failed:', idxErr);
          // Non-blocking for the user
        }

        uploadedFiles.push(processed)
        setUploadProgress(((i + 1) / fileArray.length) * 100)
      } catch (err: any) {
        setError(`خطأ في معالجة ${fileArray[i].name}: ${err.message}`)
      }
    }

    if (uploadedFiles.length > 0) {
      onFilesAdded(uploadedFiles)
      const totalChars = uploadedFiles.reduce((acc, f) => acc + f.content.length, 0)
      setSuccess(`تم بنجاح تحميل ${uploadedFiles.length} ملفات (إجمالي ${totalChars.toLocaleString()} حرف)`)
      setTimeout(() => setSuccess(''), 5000)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    await processFiles(Array.from(files))
    setUploadProgress(0)
    if (inputRef.current) inputRef.current.value = ''
  }


  const handleClick = () => {
    if (!isLoading) inputRef.current?.click()
  }

  return (
    <div className="group relative border-2 border-dashed border-salla-accent rounded-salla p-10 text-center hover:border-salla-primary transition-all duration-300 bg-salla-bg-soft hover:bg-salla-accent-light/50">
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
        <div className="w-16 h-16 bg-salla-accent-light text-salla-primary rounded-full flex items-center justify-center text-3xl mb-2 group-hover:scale-110 transition-transform duration-300 shadow-sm">
          ☁️
        </div>

        <div className="flex justify-center">
          <button
            onClick={handleClick}
            disabled={isLoading}
            className="px-8 py-4 bg-salla-primary text-white rounded-salla hover:opacity-90 shadow-xl shadow-salla-primary/10 font-bold disabled:opacity-50 disabled:shadow-none transition-all transform hover:-translate-y-0.5 active:translate-y-0 text-lg"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⏳</span>
                جاري المعالجة...
              </span>
            ) : (
              '📁 اختر الملفات من جهازك'
            )}
          </button>
        </div>

        <p className="text-sm text-salla-muted font-bold opacity-80">
          PDF, DOCX, Excel, TXT, CSV, JSON, والصور
        </p>
      </div>

      {uploadProgress > 0 && uploadProgress < 100 && (
        <div className="mt-6 w-full max-w-xs mx-auto">
          <div className="flex justify-between text-xs text-salla-primary mb-1 font-bold">
            <span>جاري الرفع...</span>
            <span>{Math.round(uploadProgress)}%</span>
          </div>
          <div className="h-2 bg-salla-accent-light rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full bg-salla-primary rounded-full transition-all duration-300 ease-out"
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

      {success && (
        <div className="mt-4 p-3 bg-emerald-50 text-emerald-600 text-sm rounded-lg border border-emerald-100 animate-in">
          ✅ {success}
        </div>
      )}
    </div>
  )
}

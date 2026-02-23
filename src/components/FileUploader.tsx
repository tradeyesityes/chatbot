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
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [eta, setEta] = useState<number | null>(null)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')

  const processFiles = async (fileArray: File[]) => {
    setError('')
    setSuccess('')
    setIsProcessing(true)
    const uploadedFiles: FileContext[] = []
    const startTime = Date.now()

    for (let i = 0; i < fileArray.length; i++) {
      try {
        const validation = FileProcessingService.validateFile(fileArray[i])
        if (!validation.valid) {
          setError(`${fileArray[i].name}: ${validation.message}`)
          continue
        }

        const processed = await FileProcessingService.processFile(fileArray[i])

        // ENTERPRISE UPGRADE: Automatic Vector Indexing with ETA
        try {
          const settings = await SettingsService.getSettings(userId);
          const apiKey = settings.openai_api_key || (import.meta.env as any).VITE_OPENAI_API_KEY;
          if (apiKey) {
            console.log(`Triggering vector indexing for: ${fileArray[i].name}`);

            const indexStartTime = Date.now();
            await EmbeddingService.indexFile(
              userId,
              fileArray[i].name,
              processed.content,
              apiKey,
              (processedChunks, totalChunks) => {
                // Calculate percentage based on current file progress + previous files
                const fileProgress = (processedChunks / totalChunks) * (1 / fileArray.length);
                const previousFilesProgress = i / fileArray.length;
                const totalProgress = (previousFilesProgress + fileProgress) * 100;
                setUploadProgress(totalProgress);

                // Calculate ETA
                const elapsed = (Date.now() - indexStartTime) / 1000; // seconds since start of THIS file
                if (processedChunks > 1) {
                  const rate = processedChunks / elapsed; // chunks per second
                  const remainingChunks = totalChunks - processedChunks;
                  // Add time for remaining chunks in THIS file + estimate for remaining files
                  const remainingFiles = fileArray.length - (i + 1);
                  const estimatedThisFile = remainingChunks / rate;
                  // Roughly estimate other files based on this file's average time
                  const avgTimePerFile = elapsed / (processedChunks / totalChunks);
                  const estimatedOtherFiles = remainingFiles * avgTimePerFile;

                  setEta(Math.ceil(estimatedThisFile + estimatedOtherFiles));
                }
              }
            );
          }
        } catch (idxErr) {
          console.error('Vector indexing failed:', idxErr);
        }

        uploadedFiles.push(processed)
        setUploadProgress(((i + 1) / fileArray.length) * 100)
        setEta(null)
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

    setIsProcessing(false)
    setUploadProgress(0)
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    await processFiles(Array.from(files))
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleClick = () => {
    if (!isLoading && !isProcessing) inputRef.current?.click()
  }

  const combinedLoading = isLoading || isProcessing

  return (
    <div className="group relative border-2 border-dashed border-salla-accent rounded-salla p-10 text-center hover:border-salla-primary transition-all duration-300 bg-salla-bg-soft hover:bg-salla-accent-light/50">
      <input
        ref={inputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        disabled={combinedLoading}
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
            disabled={combinedLoading}
            className="px-8 py-4 bg-salla-primary text-white rounded-salla hover:opacity-90 shadow-xl shadow-salla-primary/10 font-bold disabled:opacity-50 disabled:shadow-none transition-all transform hover:-translate-y-0.5 active:translate-y-0 text-lg"
          >
            {combinedLoading ? (
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

      {isProcessing && (
        <div className="mt-6 w-full max-w-xs mx-auto">
          <div className="flex flex-col gap-2 mb-2">
            <p className="text-salla-primary font-bold text-sm text-center animate-pulse">
              ⏳ نأمل الانتظار حتى يتم رفع الملف...
            </p>
            {uploadProgress > 0 && (
              <div className="flex justify-between text-xs text-salla-primary font-bold">
                <span>جاري الرفع...</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
            )}
          </div>
          <div className="h-2 bg-salla-accent-light rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full bg-salla-primary rounded-full transition-all duration-300 ease-out"
              style={{ width: `${uploadProgress || 5}%` }}
            />
          </div>
          {eta !== null && eta > 0 && (
            <p className="mt-2 text-[10px] text-salla-muted font-bold text-center">
              ⏳ الوقت المتبقي المقدر: {eta > 60 ? `${Math.floor(eta / 60)} دقيقة و ${eta % 60} ثانية` : `${eta} ثانية`}
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 animate-in text-right font-bold">
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div className="mt-4 p-3 bg-emerald-50 text-emerald-600 text-sm rounded-lg border border-emerald-100 animate-in text-right font-bold">
          ✅ {success}
        </div>
      )}
    </div>
  )
}

import { useState, useCallback } from 'react'
import { FileContext } from '../types'
import { FileProcessingService } from '../services/fileProcessingService'

export const useFileUpload = () => {
  const [files, setFiles] = useState<FileContext[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  const addFiles = useCallback(async (fileList: FileList) => {
    setLoading(true)
    setError('')
    const uploadedFiles: FileContext[] = []
    const fileArray = Array.from(fileList)

    for (let i = 0; i < fileArray.length; i++) {
      try {
        const validation = FileProcessingService.validateFile(fileArray[i])
        if (!validation.valid) {
          setError(`${fileArray[i].name}: ${validation.message}`)
          continue
        }

        const processed = await FileProcessingService.processFile(fileArray[i])
        uploadedFiles.push(processed)
      } catch (err: any) {
        setError(`خطأ في معالجة ${fileArray[i].name}: ${err.message}`)
      }
    }

    if (uploadedFiles.length > 0) {
      setFiles(prev => [...prev, ...uploadedFiles])
    }

    setLoading(false)
    return uploadedFiles
  }, [])

  const removeFile = useCallback((fileName: string) => {
    setFiles(prev => prev.filter(f => f.name !== fileName))
  }, [])

  const clearFiles = useCallback(() => {
    setFiles([])
    setError('')
  }, [])

  return {
    files,
    loading,
    error,
    addFiles,
    removeFile,
    clearFiles,
    setError
  }
}

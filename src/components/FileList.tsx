import React from 'react'
import { FileContext } from '../types'

interface FileListProps {
  files: FileContext[]
  onRemove?: (fileName: string) => void
}

export const FileList: React.FC<FileListProps> = ({ files, onRemove }) => {
  const getFileIcon = (type?: string): string => {
    if (!type) return '📄'
    if (type.includes('pdf')) return '📕'
    if (type.includes('word') || type.includes('document')) return '📘'
    if (type.includes('sheet') || type === 'text/csv') return '📗'
    if (type.startsWith('image')) return '🖼️'
    if (type.includes('text')) return '📝'
    return '📄'
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <h3 className="font-semibold text-slate-900 mb-3">قاعدة المعرفة ({files.length})</h3>
      {files.length === 0 ? (
        <p className="text-slate-500 text-sm">لم يتم تحميل أي ملفات بعد</p>
      ) : (
        <ul className="space-y-2">
          {files.map((file, idx) => (
            <li
              key={idx}
              className="flex items-center justify-between p-2 bg-slate-50 rounded hover:bg-slate-100"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-lg">{getFileIcon(file.type)}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
                  <p className="text-xs text-slate-500">
                    {file.size ? `${(file.size / 1024).toFixed(2)} KB` : 'بدون حجم'}
                  </p>
                </div>
              </div>
              {onRemove && (
                <button
                  onClick={() => onRemove(file.name)}
                  className="text-red-500 hover:text-red-700 ml-2 flex-shrink-0"
                >
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

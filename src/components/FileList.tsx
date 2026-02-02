import React from 'react'
import { FileContext } from '../types'

interface FileListProps {
  files: FileContext[]
  onRemove?: (fileName: string) => void
}

export const FileList: React.FC<FileListProps> = ({ files, onRemove }) => {
  const getFileIcon = (type?: string): string => {
    if (!type) return '📄'
    if (type.includes('pdf')) return '📄'
    if (type.includes('word') || type.includes('document')) return '📄'
    if (type.includes('sheet') || type === 'text/csv') return '📊'
    if (type.startsWith('image')) return '🖼️'
    if (type.includes('text')) return '📝'
    return '📄'
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <h3 className="font-semibold text-slate-900 mb-3 text-right">قاعدة المعرفة ({files.length})</h3>
      {files.length === 0 ? (
        <p className="text-slate-500 text-sm text-right">لم يتم تحميل أي ملفات بعد</p>
      ) : (
        <ul className="space-y-2">
          {files.map((file, idx) => (
            <li
              key={idx}
              className="flex items-center justify-between p-2 bg-slate-50 rounded hover:bg-slate-100 border border-slate-200/50"
            >
              <div className="flex items-center gap-2 min-w-0 flex-row-reverse w-full text-right">
                <span className="text-lg opacity-70">{getFileIcon(file.type)}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
                  <p className="text-[10px] text-slate-500 flex gap-2 justify-end">
                    <span>{file.content.length.toLocaleString()} حرف</span>
                    <span>•</span>
                    <span>{file.size ? `${(file.size / 1024).toFixed(0)} KB` : 'بدون حجم'}</span>
                  </p>
                </div>
              </div>
              {onRemove && (
                <button
                  onClick={() => onRemove(file.name)}
                  className="text-slate-400 hover:text-red-500 mr-2 flex-shrink-0 transition-colors"
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

import React from 'react'

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large'
  message?: string
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'medium', message }) => {
  const sizeClasses = {
    small: 'h-4 w-4',
    medium: 'h-8 w-8',
    large: 'h-12 w-12',
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className={`${sizeClasses[size]} border-4 border-slate-300 border-t-blue-600 rounded-full animate-spin`} />
      {message && <p className="text-sm text-slate-600">{message}</p>}
    </div>
  )
}

interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon = '📭', title, description, action }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <p className="text-4xl mb-4">{icon}</p>
      <h3 className="text-lg font-medium text-slate-900 mb-2">{title}</h3>
      {description && <p className="text-sm text-slate-600 mb-4">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  onClose?: () => void
}

export const Alert: React.FC<AlertProps> = ({ type, title, message, onClose }) => {
  const typeClasses = {
    success: 'bg-green-100 border-green-400 text-green-700',
    error: 'bg-red-100 border-red-400 text-red-700',
    warning: 'bg-yellow-100 border-yellow-400 text-yellow-700',
    info: 'bg-blue-100 border-blue-400 text-blue-700',
  }

  const typeIcons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  }

  return (
    <div className={`border-l-4 p-4 rounded ${typeClasses[type]} animate-in`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium flex items-center gap-2">
            <span>{typeIcons[type]}</span>
            {title}
          </p>
          <p className="text-sm mt-1">{message}</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="ml-4 hover:opacity-70">
            ✕
          </button>
        )}
      </div>
    </div>
  )
}

interface ProgressBarProps {
  progress: number
  showLabel?: boolean
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress, showLabel = true }) => {
  return (
    <div className="w-full">
      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-600 transition-all"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      {showLabel && <p className="text-xs text-slate-600 mt-1">{Math.round(progress)}%</p>}
    </div>
  )
}

interface BadgeProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error'
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'primary' }) => {
  const variantClasses = {
    primary: 'bg-blue-100 text-blue-800',
    secondary: 'bg-slate-100 text-slate-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
  }

  return <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${variantClasses[variant]}`}>{children}</span>
}

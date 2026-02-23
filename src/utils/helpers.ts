// String utilities
export const truncate = (str: string, length: number): string => {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

export const extractUrls = (text: string): string[] => {
  const urlRegex = /(https?:\/\/[^\s]+)/g
  return text.match(urlRegex) || []
}

export const sanitizeText = (text: string): string => {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[<>]/g, '')
    .trim()
}

/**
 * Normalizes Arabic text for better search matching.
 * Handles Alif/Hamza variations and common interchangeable characters.
 */
export const normalizeArabic = (text: string): string => {
  if (!text) return ''
  return text
    .replace(/[\u064B-\u0652]/g, '') // Remove diacritics (harakat)
    .replace(/[أإآ]/g, 'ا') // Normalize Alif with Hamza
    .replace(/ة/g, 'ه') // Normalize Te Marbuta
    .replace(/ى/g, 'ي') // Normalize Alif Maksura (optional, but helpful for search)
    .trim()
}

// Number utilities
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('ar-SA').format(num)
}

// Date utilities
export const formatDate = (date: Date, locale = 'ar-SA'): string => {
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export const formatTime = (date: Date, locale = 'ar-SA'): string => {
  return date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

// Array utilities
export const chunk = <T,>(arr: T[], size: number): T[][] => {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

export const unique = <T,>(arr: T[]): T[] => {
  return [...new Set(arr)]
}

// Object utilities
export const pick = <T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> => {
  const result = {} as Pick<T, K>
  keys.forEach(key => {
    result[key] = obj[key]
  })
  return result
}

// Error utilities
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'حدث خطأ غير معروف'
}

// Local storage utilities
export const storage = {
  set: (key: string, value: any): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (e) {
      console.error(`فشل حفظ ${key}:`, e)
    }
  },

  get: <T,>(key: string, defaultValue?: T): T | undefined => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch (e) {
      console.error(`فشل قراءة ${key}:`, e)
      return defaultValue
    }
  },

  remove: (key: string): void => {
    try {
      localStorage.removeItem(key)
    } catch (e) {
      console.error(`فشل حذف ${key}:`, e)
    }
  },

  clear: (): void => {
    try {
      localStorage.clear()
    } catch (e) {
      console.error('فشل مسح localStorage:', e)
    }
  },
}

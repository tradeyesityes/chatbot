// Message types and roles
export const MESSAGE_ROLES = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system',
} as const

export const MESSAGE_TYPES = {
  TEXT: 'text',
  ERROR: 'error',
  INFO: 'info',
  WARNING: 'warning',
} as const

// File types
export const FILE_TYPES = {
  PDF: 'application/pdf',
  TEXT: 'text/plain',
  CSV: 'text/csv',
  JSON: 'application/json',
  WORD: 'application/msword',
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  IMAGE: 'image/*',
} as const

// Error messages
export const ERROR_MESSAGES = {
  NO_FILES: 'يرجى تحميل ملف أولاً',
  FILE_TOO_LARGE: 'حجم الملف أكبر من المسموح',
  INVALID_FILE: 'صيغة الملف غير مدعومة',
  UPLOAD_FAILED: 'فشل تحميل الملف',
  PROCESSING_FAILED: 'فشل معالجة الملف',
  API_ERROR: 'خطأ في الاتصال بـ OpenAI',
  NETWORK_ERROR: 'فشل الاتصال بالشبكة',
  VALIDATION_ERROR: 'خطأ في التحقق من البيانات',
} as const

// Success messages
export const SUCCESS_MESSAGES = {
  FILE_UPLOADED: 'تم تحميل الملف بنجاح',
  FILE_DELETED: 'تم حذف الملف بنجاح',
  CHAT_CLEARED: 'تم مسح المحادثة',
  SETTINGS_SAVED: 'تم حفظ الإعدادات',
} as const

// API endpoints
export const API_ENDPOINTS = {
  OPENAI: 'https://api.openai.com/v1/chat/completions',
} as const

// Local storage keys
export const STORAGE_KEYS = {
  USER_SESSION: 'kb_user_session',
  CHAT_HISTORY: 'kb_chat_history',
  USER_FILES: 'kb_user_files',
  SETTINGS: 'kb_settings',
} as const

// Time constants (in milliseconds)
export const TIME_CONSTANTS = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
} as const

// User plans
export const USER_PLANS = {
  FREE: 'free',
  PRO: 'pro',
} as const

// UI constants
export const UI_CONSTANTS = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_FILES: 20,
  MESSAGE_HISTORY_LIMIT: 50,
  SIDEBAR_WIDTH: 288, // w-72 in tailwind
} as const

// Regular expressions
export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  URL: /(https?:\/\/[^\s]+)/g,
  PHONE: /^[\d\s\-+()]+$/,
  ARABIC: /[\u0600-\u06FF]/,
} as const

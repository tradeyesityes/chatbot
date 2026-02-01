# KB Chatbot v2 - API Documentation

## Services Documentation

### OpenAIService

#### Class Methods

##### `generateResponse(userMessage, history, contextFiles, plan?, systemPrompt?)`

Generates an AI response based on user input and uploaded files.

**Parameters:**
- `userMessage: string` - The user's question or input
- `history: Message[]` - Previous messages in the conversation
- `contextFiles: FileContext[]` - Uploaded files containing context
- `plan: UserPlan` - User subscription plan ('free' or 'pro')
- `systemPrompt?: string` - Optional custom system instruction

**Returns:** `Promise<string>` - AI-generated response

**Example:**
```typescript
const response = await openaiService.generateResponse(
  'ما هي الخدمات المتاحة؟',
  messages,
  files,
  'free'
)
```

**Error Handling:**
```typescript
try {
  const response = await openaiService.generateResponse(...)
} catch (error) {
  console.error('API Error:', error.message)
}
```

---

### FileProcessingService

#### Static Methods

##### `processFile(file)`

Processes an uploaded file and extracts its content.

**Parameters:**
- `file: File` - The file to process

**Returns:** `Promise<FileContext>` - Processed file with extracted content

**Supported Types:**
- Text files (.txt)
- PDF documents (.pdf)
- Excel/CSV (.csv, .xlsx)
- Word documents (.docx, .doc)
- JSON files (.json)
- Images (with metadata only, no OCR in v2)

**Example:**
```typescript
const processed = await FileProcessingService.processFile(file)
console.log(processed.name, processed.size, processed.type)
```

##### `validateFile(file)`

Validates file before processing.

**Parameters:**
- `file: File` - File to validate

**Returns:** `{ valid: boolean; message: string }`

**Validation Rules:**
- Max size: 50MB
- Supported format check

**Example:**
```typescript
const { valid, message } = FileProcessingService.validateFile(file)
if (!valid) {
  alert(message)
}
```

##### `extractKeywords(content, limit?)`

Extracts keywords from file content.

**Parameters:**
- `content: string` - Text to extract from
- `limit: number` - Max keywords (default: 10)

**Returns:** `string[]` - Array of keywords

---

### StorageService

#### Static Methods

##### `saveFiles(userId, files)`

Saves files to Supabase storage.

**Parameters:**
- `userId: string` - User identifier
- `files: FileContext[]` - Files to save

**Returns:** `Promise<void>`

**Example:**
```typescript
await StorageService.saveFiles('user123', files)
```

##### `getFiles(userId)`

Retrieves user's files from storage.

**Parameters:**
- `userId: string` - User identifier

**Returns:** `Promise<FileContext[]>`

**Example:**
```typescript
const userFiles = await StorageService.getFiles('user123')
```

##### `deleteFile(userId, fileName)`

Deletes a specific file from storage.

**Parameters:**
- `userId: string` - User identifier
- `fileName: string` - Name of file to delete

**Returns:** `Promise<void>`

##### `clearFiles(userId)`

Clears all files for a user.

**Parameters:**
- `userId: string` - User identifier

**Returns:** `Promise<void>`

---

### AuthService

#### Static Methods

##### `login(email, password)`

Authenticates a user.

**Parameters:**
- `email: string` - User email
- `password: string` - User password

**Returns:** `Promise<User>`

**Example:**
```typescript
const user = await AuthService.login('user@example.com', 'password')
```

##### `logout()`

Logs out the current user.

**Returns:** `Promise<void>`

##### `getSession()`

Retrieves current session.

**Returns:** `User | null`

##### `isAuthenticated()`

Checks if user is authenticated.

**Returns:** `boolean`

---

## Custom Hooks Documentation

### useChat

Manages chat state and message history.

**Returns:**
```typescript
{
  messages: Message[]
  loading: boolean
  error: string
  addMessage: (message: Message) => void
  clearMessages: () => void
  sendMessage: (content: string, files: FileContext[], plan?: UserPlan) => Promise<string>
  setError: (error: string) => void
}
```

**Example:**
```typescript
const { messages, loading, error, sendMessage } = useChat()

await sendMessage('Hello', files, 'free')
```

### useFileUpload

Manages file upload state.

**Returns:**
```typescript
{
  files: FileContext[]
  loading: boolean
  error: string
  addFiles: (fileList: FileList) => Promise<FileContext[]>
  removeFile: (fileName: string) => void
  clearFiles: () => void
  setError: (error: string) => void
}
```

**Example:**
```typescript
const { files, loading, addFiles, removeFile } = useFileUpload()

await addFiles(inputElement.files)
removeFile('document.pdf')
```

---

## Type Definitions

### Message
```typescript
interface Message {
  id: string
  role: 'user' | 'assistant' | 'model'
  content: string
  timestamp: Date
}
```

### FileContext
```typescript
interface FileContext {
  id?: string | number
  name: string
  content: string
  type?: string
  size?: number
}
```

### User
```typescript
interface User {
  id: string
  username: string
  email?: string
  isLoggedIn: boolean
  plan: UserPlan
}

type UserPlan = 'free' | 'pro'
```

---

## Utility Functions

### String Utilities
- `truncate(str, length)` - Truncate string to length
- `extractUrls(text)` - Extract URLs from text
- `sanitizeText(text)` - Remove special characters

### Number Utilities
- `formatBytes(bytes)` - Format bytes to human readable
- `formatNumber(num)` - Format number with locale

### Date Utilities
- `formatDate(date, locale?)` - Format date to string
- `formatTime(date, locale?)` - Format time to string

### Array Utilities
- `chunk(arr, size)` - Split array into chunks
- `unique(arr)` - Get unique elements

### Storage Utilities
```typescript
storage.set(key, value)      // Save to localStorage
storage.get(key, default?)   // Get from localStorage
storage.remove(key)          // Remove from localStorage
storage.clear()              // Clear all localStorage
```

---

## Error Handling

### Common Errors

**OpenAI API Error**
```typescript
try {
  await openaiService.generateResponse(...)
} catch (error) {
  if (error.message.includes('API')) {
    // Handle API error
  }
}
```

**File Processing Error**
```typescript
try {
  await FileProcessingService.processFile(file)
} catch (error) {
  console.error('File error:', error.message)
}
```

**Supabase Error**
```typescript
try {
  await StorageService.saveFiles(userId, files)
} catch (error) {
  console.error('Storage error:', error)
}
```

---

## Best Practices

1. **Always validate files** before processing
2. **Handle errors** at every async operation
3. **Use TypeScript** for type safety
4. **Clean up** resources when components unmount
5. **Cache** API responses when appropriate
6. **Limit** message history size
7. **Validate** user input before sending

---

## Rate Limiting

### OpenAI API
- 3 requests per second for free tier
- Implement exponential backoff for retries

### Supabase
- 1000 requests per hour for free tier
- Use batch operations when possible

---

## Testing Guide

### Unit Tests
```typescript
describe('OpenAIService', () => {
  it('should generate response', async () => {
    const response = await openai.generateResponse(...)
    expect(response).toBeDefined()
  })
})
```

### Integration Tests
```typescript
describe('File Upload Flow', () => {
  it('should upload and process file', async () => {
    const file = new File(...)
    const processed = await FileProcessingService.processFile(file)
    expect(processed.content).toBeDefined()
  })
})
```

---

**API Version**: 2.0.0
**Last Updated**: 2024-01-31

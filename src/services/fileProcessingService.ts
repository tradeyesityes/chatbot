import { FileContext } from "../types";
import { createWorker } from 'tesseract.js';
import * as pdfjs from 'pdfjs-dist';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

// Set worker source to CDN for stability across different domains/deployments
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@4.8.69/build/pdf.worker.min.mjs`;

export class FileProcessingService {
  // Process uploaded file and return FileContext
  static async processFile(file: File): Promise<FileContext> {
    const name = file.name;
    const type = file.type;
    const size = file.size;

    console.log(`Processing file: ${name} (${type}, ${size} bytes)`);

    let content = '';

    try {
      if (type.startsWith('text') || type === 'application/json') {
        content = await this.readTextFile(file);
      } else if (type === 'application/pdf') {
        content = await this.readPdfFile(file);
      } else if (type.includes('word') || type.includes('document') || name.endsWith('.docx')) {
        content = await this.readDocxFile(file);
      } else if (type.includes('spreadsheet') || type.includes('excel') || name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) {
        content = await this.readExcelFile(file);
      } else if (type.startsWith('image')) {
        content = await this.readImageFile(file);
      } else {
        content = await this.readTextFile(file);
      }

      content = this.cleanContent(content);

      console.log(`File processed: ${name}, Content Length: ${content.length}`);
      if (content.length < 100) console.log(`Preview: ${content}`);

      return { name, content, type, size };
    } catch (err: any) {
      console.error(`Error processing file ${name}:`, err);
      throw new Error(`خطأ في معالجة الملف ${name}: ${err.message}`);
    }
  }

  // Helper for OCR to avoid duplication
  private static async performOcr(imageSource: File | Blob): Promise<string> {
    const worker = await createWorker('ara+eng');
    const ret = await worker.recognize(imageSource);
    await worker.terminate();
    return ret.data.text;
  }

  private static async readImageFile(file: File): Promise<string> {
    try {
      console.log('Starting OCR for Image...');
      const text = await this.performOcr(file);
      console.log('OCR completed.');
      return text;
    } catch (e: any) {
      console.error('OCR Error:', e);
      return `[فشل استخراج النص من الصورة: ${e.message}]`;
    }
  }

  private static async readTextFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(String(e.target?.result || ''));
      reader.onerror = () => reject(new Error('فشل في قراءة الملف كنص'));
      reader.readAsText(file);
    });
  }

  private static async readPdfFile(file: File): Promise<string> {
    try {
      console.log(`Reading PDF: ${file.name}`);
      const arrayBuffer = await file.arrayBuffer();
      // Using CDN for CMaps to ensure Arabic/Special chars are handled correctly
      const pdf = await pdfjs.getDocument({
        data: arrayBuffer,
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.8.69/cmaps/',
        cMapPacked: true,
      }).promise;

      console.log(`PDF loaded. Pages: ${pdf.numPages}`);
      let fullText = '';

      const MAX_PAGES_TO_PROCESS = 100; // Increased limit
      const MAX_OCR_PAGES = 15;

      const pagesToProcess = Math.min(pdf.numPages, MAX_PAGES_TO_PROCESS);

      for (let i = 1; i <= pagesToProcess; i++) {
        try {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const items = textContent.items as any[];

          let pageText = '';
          if (items.length > 0) {
            // Sort items: Top to Bottom, then Left to Right
            // Use a 10px tolerance for "same line" detection
            items.sort((a, b) => {
              const yDiff = b.transform[5] - a.transform[5];
              if (Math.abs(yDiff) > 10) return yDiff;
              return a.transform[4] - b.transform[4];
            });

            let lastY: number | null = null;

            for (const item of items) {
              if (!item.str) continue;
              const currentY = item.transform[5];

              // Newline detection: if Y changed significantly
              if (lastY !== null && Math.abs(currentY - lastY) > 10) {
                pageText += '\n';
              } else if (pageText.length > 0 && !pageText.endsWith('\n') && !pageText.endsWith(' ')) {
                // Same line: add space if not already there
                pageText += ' ';
              }

              pageText += item.str;
              lastY = currentY;
            }
          }

          let pageResult = pageText.trim();

          // SPEED OPTIMIZATION: Only OCR the FIRST page if it appears scanned
          if (i === 1 && pageResult.length < 30) {
            console.log("Page 1 appears empty or scanned, triggering diagnostic OCR...");
            try {
              const viewport = page.getViewport({ scale: 1.5 });
              const canvas = document.createElement('canvas');
              const context = canvas.getContext('2d');
              if (context) {
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                await page.render({ canvasContext: context, viewport: viewport }).promise;
                const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
                if (blob) {
                  const ocrText = await this.performOcr(blob);
                  pageResult = `[OCR Page 1]\n${ocrText}`;
                }
              }
            } catch (ocrErr) {
              console.error("OCR Failed:", ocrErr);
            }
          }

          fullText += `[Page ${i}]\n${pageResult}\n\n`;
        } catch (pageErr) {
          console.error(`Page ${i} error:`, pageErr);
        }
      }

      if (pdf.numPages > MAX_PAGES_TO_PROCESS) {
        fullText += `\n[... Remaining ${pdf.numPages - MAX_PAGES_TO_PROCESS} pages skipped ...]`;
      }

      console.log(`PDF Extraction Success: ${fullText.length} characters extracted from ${file.name}`);
      return fullText;
    } catch (e: any) {
      console.error('PDF Error:', e);
      return `⚠️ فشل استخراج نص PDF: ${e.message}`;
    }
  }

  private static async readDocxFile(file: File): Promise<string> {
    try {
      console.log('Reading DOCX...');
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    } catch (e: any) {
      console.error('DOCX Error:', e);
      return `⚠️ فشل قراءة ملف Word: ${e.message}`;
    }
  }

  private static async readExcelFile(file: File): Promise<string> {
    try {
      console.log(`Starting Excel logic for: ${file.name} (${file.type})`);
      const arrayBuffer = await file.arrayBuffer();
      // cellDates: true ensures dates are parsed as dates, not numbers
      const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
      console.log(`Workbook parsed. Sheets: ${workbook.SheetNames.join(', ')}`);

      let fullText = '';
      workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        // Convert to JSON with header row
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

        if (jsonData.length > 0) {
          console.log(`Sheet "${sheetName}" has ${jsonData.length} rows.`);

          // Extract headers (first row)
          const headerRow = jsonData[0] as any[];
          const headerStr = `| ${headerRow.map((cell: any) => String(cell).replace(/\|/g, '\\|').trim()).join(' | ')} |`;
          const separatorStr = `| ${headerRow.map(() => '---').join(' | ')} |`;

          // Process remaining rows in chunks
          const dataRows = jsonData.slice(1);
          const CHUNK_SIZE = 20; // 20 rows per chunk to keep context granular and small (~2-3k tokens max)

          if (dataRows.length === 0) {
            // Only headers exist
            fullText += `[Sheet: ${sheetName}]\n${headerStr}\n${separatorStr}\n\n`;
          } else {
            for (let i = 0; i < dataRows.length; i += CHUNK_SIZE) {
              const chunk = dataRows.slice(i, i + CHUNK_SIZE);
              const chunkRows = chunk.map((row: any) => `| ${(row as any[]).map((cell: any) => String(cell).replace(/\|/g, '\\|').trim()).join(' | ')} |`);
              const tableChunk = [headerStr, separatorStr, ...chunkRows].join('\n');

              fullText += `[Sheet: ${sheetName} (Rows ${i + 1}-${i + chunk.length})]\n${tableChunk}\n\n`;
            }
          }
        } else {
          console.log(`Sheet "${sheetName}" is empty.`);
        }
      });

      if (!fullText) console.warn('Warning: Excel file processed but result is empty.');
      return fullText;
    } catch (e: any) {
      console.error('Excel Error Stack:', e);
      return `⚠️ فشل قراءة ملف Excel: ${e.message}`;
    }
  }

  private static cleanContent(content: string): string {
    return content
      .replace(/[ \t]+/g, ' ') // Only replace horizontal whitespace with a single space
      .replace(/(\r\n|\n|\r){3,}/g, '\n\n') // Limit consecutive newlines
      .replace(/([.!?؟])\s+/g, '$1\n') // Handle Arabic question mark
      .trim();
  }

  static validateFile(file: File): { valid: boolean; message: string } {
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) return { valid: false, message: 'حجم الملف أكبر من 10MB' };
    return { valid: true, message: 'الملف صالح' };
  }

  static extractKeywords(content: string, limit = 10): string[] {
    const words = content.toLowerCase().split(/\W+/).filter(w => w.length > 4);
    const freq: Record<string, number> = {};
    for (const w of words) freq[w] = (freq[w] || 0) + 1;
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([k]) => k);
  }
}

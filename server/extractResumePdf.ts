import { pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

const MAX_RESUME_BYTES = 5 * 1024 * 1024
const require = createRequire(import.meta.url)

// Polyfill minimal browser canvas/DOM APIs for pdfjs-dist in Node.js environments (like Vercel Lambda)
const ensureDomPolyfills = () => {
  const g = globalThis as any
  if (typeof g.DOMMatrix === 'undefined') {
    g.DOMMatrix = class DOMMatrix {
      a = 1; b = 0; c = 0; d = 1; e = 0; f = 0
      m11 = 1; m12 = 0; m13 = 0; m14 = 0
      m21 = 0; m22 = 1; m23 = 0; m24 = 0
      m31 = 0; m32 = 0; m33 = 1; m34 = 0
      m41 = 0; m42 = 0; m43 = 0; m44 = 1
      is2D = true
      isIdentity = true
      constructor(init?: any) {
        if (Array.isArray(init) && init.length === 6) {
          this.a = this.m11 = init[0]
          this.b = this.m12 = init[1]
          this.c = this.m21 = init[2]
          this.d = this.m22 = init[3]
          this.e = this.m41 = init[4]
          this.f = this.m42 = init[5]
        }
      }
    }
  }
  if (typeof g.Path2D === 'undefined') {
    g.Path2D = class Path2D {}
  }
  if (typeof g.ImageData === 'undefined') {
    g.ImageData = class ImageData {}
  }
}

let cachedPdfjs: any = null

const getPdfjsLib = async () => {
  if (cachedPdfjs) return cachedPdfjs
  ensureDomPolyfills()
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  try {
    const workerPath = require.resolve('pdfjs-dist/legacy/build/pdf.worker.min.mjs')
    pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href
  } catch {
    // If worker path resolution fails in bundled environment, fallback gracefully
  }
  cachedPdfjs = pdfjs
  return pdfjs
}

export class ResumeExtractError extends Error {
  readonly status: number
  readonly code: string

  constructor(message: string, status = 400, code = 'invalid_pdf') {
    super(message)
    this.name = 'ResumeExtractError'
    this.status = status
    this.code = code
  }
}

export type ResumeExtractResult = {
  filename: string
  fileSize: number
  pageCount: number
  characterCount: number
  text: string
}

const readItemText = (item: unknown) => {
  if (!item || typeof item !== 'object' || !('str' in item)) return { text: '', y: null as number | null }
  const record = item as { str?: unknown; transform?: unknown }
  const text = typeof record.str === 'string' ? record.str : ''
  const transform = Array.isArray(record.transform) ? record.transform : []
  const y = typeof transform[5] === 'number' ? transform[5] : null
  return { text, y }
}

const pageTextFromContent = (items: unknown[]) => {
  const lines: string[] = []
  let current = ''
  let lastY: number | null = null

  for (const item of items) {
    const { text, y } = readItemText(item)
    if (!text) continue
    if (lastY !== null && y !== null && Math.abs(y - lastY) > 2) {
      if (current.trim()) lines.push(current.trim())
      current = text
    } else {
      const needsSpace = Boolean(current) && !current.endsWith(' ') && !text.startsWith(' ')
      current += `${needsSpace ? ' ' : ''}${text}`
    }
    lastY = y ?? lastY
  }

  if (current.trim()) lines.push(current.trim())
  return lines.join('\n').trim()
}

const mapPdfError = (error: unknown) => {
  const name = error instanceof Error ? error.name : ''
  const message = error instanceof Error ? error.message : ''
  const combined = `${name} ${message}`.toLowerCase()

  if (combined.includes('password')) {
    return new ResumeExtractError('This PDF is password-protected. Remove the password and try again.', 400, 'password_protected')
  }
  if (combined.includes('invalidpdf') || combined.includes('invalid pdf') || combined.includes('corrupt') || combined.includes('bad xref')) {
    return new ResumeExtractError('This PDF appears to be corrupted and could not be processed.', 400, 'corrupted_pdf')
  }
  if (combined.includes('missingpdf') || combined.includes('unexpected') || combined.includes('formaterror') || combined.includes('refers to a non-existent')) {
    return new ResumeExtractError('This PDF uses an unsupported structure. Please upload a standard text-based resume PDF.', 400, 'unsupported_pdf')
  }
  return new ResumeExtractError('We could not extract readable text from this PDF.', 400, 'extract_failed')
}

export const validateResumePdf = (bytes: Uint8Array, contentType: string | null) => {
  if (!bytes.byteLength) {
    throw new ResumeExtractError('This PDF is empty. Please upload a resume that contains readable text.', 400, 'empty_pdf')
  }
  if (bytes.byteLength > MAX_RESUME_BYTES) {
    throw new ResumeExtractError('This PDF is larger than 5 MB. Choose a smaller resume file.', 413, 'file_too_large')
  }
  const type = (contentType || '').split(';')[0].trim().toLowerCase()
  if (type !== 'application/pdf') {
    throw new ResumeExtractError('Please upload a PDF resume. Other file types are not supported.', 400, 'invalid_type')
  }
  const header = new TextDecoder('latin1').decode(bytes.slice(0, 8))
  if (!header.startsWith('%PDF')) {
    throw new ResumeExtractError('This file is not a valid PDF. Please upload a PDF resume.', 400, 'invalid_pdf')
  }
}

export const extractResumePdf = async (bytes: Uint8Array, filename: string, contentType: string | null): Promise<ResumeExtractResult> => {
  validateResumePdf(bytes, contentType)
  const pdfjsLib = await getPdfjsLib()

  try {
    const document = await pdfjsLib.getDocument({
      data: bytes,
      isEvalSupported: false,
      verbosity: 0,
    } as any).promise

    const pages: string[] = []
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber)
      const content = await page.getTextContent()
      const pageText = pageTextFromContent(content.items)
      if (pageText) pages.push(pageText)
    }

    const text = pages.join('\n\n').trim()
    if (!text) {
      throw new ResumeExtractError('This PDF contains no readable text. It may be scanned or image-only.', 422, 'scanned_or_empty')
    }

    return {
      filename: filename || 'resume.pdf',
      fileSize: bytes.byteLength,
      pageCount: document.numPages,
      characterCount: text.length,
      text,
    }
  } catch (error) {
    if (error instanceof ResumeExtractError) throw error
    throw mapPdfError(error)
  }
}

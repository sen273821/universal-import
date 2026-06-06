import mammoth from 'mammoth'
import * as XLSX from 'xlsx'
import type { ParserFileType } from '@/types'
import { normalizeCellValue } from './utils'

// Polyfill browser APIs for serverless environment (pdfjs-dist requires them)
const g = globalThis as any

if (typeof g.DOMMatrix === 'undefined') {
  g.DOMMatrix = function DOMMatrix() {
    this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0
    this.m11 = 1; this.m12 = 0; this.m13 = 0; this.m14 = 0
    this.m21 = 0; this.m22 = 1; this.m23 = 0; this.m24 = 0
    this.m31 = 0; this.m32 = 0; this.m33 = 1; this.m34 = 0
    this.m41 = 0; this.m42 = 0; this.m43 = 0; this.m44 = 1
    this.is2D = true
    this.isIdentity = true
  }
  g.DOMMatrix.prototype.multiplySelf = function() { return this }
  g.DOMMatrix.prototype.translateSelf = function() { return this }
  g.DOMMatrix.prototype.scaleSelf = function() { return this }
  g.DOMMatrix.prototype.rotateSelf = function() { return this }
  g.DOMMatrix.prototype.invertSelf = function() { return this }
  g.DOMMatrix.prototype.toFloat32Array = function() { return new Float32Array(16) }
}

if (typeof g.ImageData === 'undefined') {
  g.ImageData = function ImageData(dataOrWidth: any, widthOrHeight: number, height?: number) {
    if (dataOrWidth instanceof Uint8ClampedArray) {
      this.data = dataOrWidth
      this.width = widthOrHeight
      this.height = height ?? widthOrHeight
    } else {
      this.width = dataOrWidth
      this.height = widthOrHeight
      this.data = new Uint8ClampedArray(dataOrWidth * widthOrHeight * 4)
    }
  }
}

if (typeof g.Path2D === 'undefined') {
  g.Path2D = function Path2D() {}
  g.Path2D.prototype.addPath = function() {}
  g.Path2D.prototype.closePath = function() {}
  g.Path2D.prototype.moveTo = function() {}
  g.Path2D.prototype.lineTo = function() {}
  g.Path2D.prototype.bezierCurveTo = function() {}
  g.Path2D.prototype.quadraticCurveTo = function() {}
  g.Path2D.prototype.arc = function() {}
  g.Path2D.prototype.arcTo = function() {}
  g.Path2D.prototype.ellipse = function() {}
  g.Path2D.prototype.rect = function() {}
}

export async function extractFileText(file: File, fileType: ParserFileType): Promise<string> {
  switch (fileType) {
    case 'excel':
      return extractExcelText(file)
    case 'word':
      return extractWordText(file)
    case 'pdf':
      return extractPdfText(file)
    default:
      return ''
  }
}

async function extractExcelText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })

  return workbook.SheetNames.map((sheetName) => {
    const worksheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(worksheet, {
      header: 1,
      defval: '',
      blankrows: false,
      raw: false,
    })

    const lines = rows
      .slice(0, 50)
      .map((row) => row.map((cell) => normalizeCellValue(cell)).join('\t'))
      .join('\n')

    return `# Sheet: ${sheetName}\n${lines}`
  }).join('\n\n')
}

async function extractWordText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value
}

async function extractPdfText(file: File): Promise<string> {
  const { PDFParse } = await import('pdf-parse')
  const arrayBuffer = await file.arrayBuffer()
  const parser = new PDFParse({ data: new Uint8Array(arrayBuffer) })
  const result = await parser.getText()
  return result.text
}

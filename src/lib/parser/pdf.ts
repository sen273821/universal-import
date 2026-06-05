// 简化 PDF 解析器
// 实际项目中需要使用 pdf-parse 或其他 PDF 解析库

// 解析 PDF 文件
export async function parsePDF(file: File, rule: any): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = async (e) => {
      try {
        // 这里简化处理，实际需要使用 PDF 解析库
        // const arrayBuffer = e.target?.result as ArrayBuffer
        // const buffer = Buffer.from(arrayBuffer)
        // const pdfParse = (await import('pdf-parse')).default
        // const pdfData = await pdfParse(buffer)
        // const text = pdfData.text

        // 简化实现：返回空数组
        // 实际项目中需要解析 PDF 内容
        resolve([])
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    reader.readAsArrayBuffer(file)
  })
}

// 检测 PDF 中的多个独立订单
export function detectMultipleOrders(text: string): string[] {
  // 按分隔线或页面分隔符拆分
  const sections = text.split(/(?:^|\n)[-=_]{10,}(?:$|\n)/)
  return sections.filter((s: string) => s.trim().length > 0)
}

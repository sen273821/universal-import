'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileSpreadsheet, FileText, File, X } from 'lucide-react'

interface FileUploadProps {
  onFileSelect: (file: File) => void
  accept?: Record<string, string[]>
  maxSize?: number
}

export default function FileUpload({ onFileSelect, accept, maxSize = 10 * 1024 * 1024 }: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0])
      onFileSelect(acceptedFiles[0])
    }
  }, [onFileSelect])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: accept || {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/pdf': ['.pdf']
    },
    maxSize,
    multiple: false
  })

  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      return <FileSpreadsheet className="w-8 h-8 text-green-500" />
    }
    if (fileName.endsWith('.docx')) {
      return <FileText className="w-8 h-8 text-blue-500" />
    }
    if (fileName.endsWith('.pdf')) {
      return <File className="w-8 h-8 text-red-500" />
    }
    return <File className="w-8 h-8 text-gray-500" />
  }

  const removeFile = () => {
    setSelectedFile(null)
  }

  return (
    <div className="w-full">
      {selectedFile ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getFileIcon(selectedFile.name)}
            <div>
              <p className="font-medium text-gray-900">{selectedFile.name}</p>
              <p className="text-sm text-gray-500">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          <button
            onClick={removeFile}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-[#0fc6c2] bg-[#0fc6c2]/5'
              : 'border-gray-300 hover:border-[#0fc6c2] hover:bg-gray-50'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragActive ? 'text-[#0fc6c2]' : 'text-gray-400'}`} />
          <p className="text-lg font-medium text-gray-900 mb-2">
            {isDragActive ? '释放文件到此处' : '拖拽文件到此处或点击上传'}
          </p>
          <p className="text-sm text-gray-500">
            支持 Excel (.xlsx, .xls)、Word (.docx)、PDF 格式
          </p>
          <p className="text-xs text-gray-400 mt-2">
            最大文件大小: 10MB
          </p>
        </div>
      )}
    </div>
  )
}

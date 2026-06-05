'use client'

import { useCallback, useMemo } from 'react'
import { useDropzone } from 'react-dropzone'
import { FileSpreadsheet, FileText, LoaderCircle, PackageOpen, UploadCloud, XCircle } from 'lucide-react'
import { ACCEPTED_FILE_TYPES } from '@/lib/file'

interface FileUploadProps {
  file: File | null
  progress: number
  busy?: boolean
  onFileSelect: (file: File | null) => void
}

export default function FileUpload({ file, progress, busy, onFileSelect }: FileUploadProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onFileSelect(acceptedFiles[0] ?? null)
    },
    [onFileSelect],
  )

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    multiple: false,
    maxSize: 25 * 1024 * 1024,
  })

  const rejectionMessage = useMemo(() => {
    const first = fileRejections[0]
    if (!first) {
      return ''
    }

    return first.errors[0]?.message ?? '文件格式或大小不符合要求'
  }, [fileRejections])

  return (
    <div className="ui-card" id="file-import">
      <div className="ui-card-header">
        <div>
          <div className="ui-title">上传源文件</div>
          <p className="ui-subtitle mt-1">支持 Excel、Word、PDF。解析过程完全由规则配置驱动。</p>
        </div>
        {busy ? (
          <div className="flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-2 text-sm text-cyan-700">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            <span>处理中</span>
          </div>
        ) : null}
      </div>

      <div className="ui-card-body space-y-4">
        <div
          {...getRootProps()}
          className={`rounded-[28px] border border-dashed px-6 py-10 text-center transition ${
            isDragActive
              ? 'border-cyan-400 bg-cyan-50/70'
              : 'border-cyan-100 bg-[rgba(248,255,255,0.94)] hover:border-cyan-300 hover:bg-cyan-50/70'
          }`}
        >
          <input {...getInputProps()} />
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-cyan-100 text-cyan-700">
            <UploadCloud className="h-8 w-8" />
          </div>
          <div className="mt-4 text-lg font-semibold text-slate-900">
            {isDragActive ? '释放文件后开始加载' : '拖拽文件到此处，或点击选择文件'}
          </div>
          <p className="mt-2 text-sm text-slate-500">允许格式：`.xlsx`、`.xls`、`.docx`、`.pdf`，单文件不超过 25MB</p>
        </div>

        {rejectionMessage ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{rejectionMessage}</div>
        ) : null}

        {file ? (
          <div className="rounded-[28px] border border-cyan-100 bg-white/86 p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-cyan-50 text-cyan-700">
                  {file.name.toLowerCase().endsWith('.docx') ? (
                    <FileText className="h-7 w-7" />
                  ) : file.name.toLowerCase().endsWith('.pdf') ? (
                    <PackageOpen className="h-7 w-7" />
                  ) : (
                    <FileSpreadsheet className="h-7 w-7" />
                  )}
                </div>
                <div>
                  <div className="font-medium text-slate-900">{file.name}</div>
                  <div className="mt-1 text-sm text-slate-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>
              </div>

              <button type="button" className="ui-button ui-button-danger" onClick={() => onFileSelect(null)}>
                <XCircle className="h-4 w-4" />
                清除文件
              </button>
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-500">
                <span>上传与解析进度</span>
                <span>{Math.min(100, Math.max(0, progress))}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-cyan-50">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,var(--primary),#69ddd8)] transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(2, progress || 2))}%` }}
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

'use client'

import { useCallback, useRef, useState } from 'react'

interface FileReadProgress {
  fileId: string
  progress: number
  status: 'reading' | 'complete' | 'error'
  buffer?: ArrayBuffer
  error?: string
}

/**
 * Hook for reading large files using a Web Worker.
 * Breaks the file into chunks, transfers them to the worker,
 * and receives a merged ArrayBuffer back — all without blocking the UI.
 */
export function useFileReaderWorker() {
  const [progress, setProgress] = useState<FileReadProgress | null>(null)
  const workerRef = useRef<Worker | null>(null)

  const readFile = useCallback((file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const fileId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

      // For small files (< 1MB), read directly on main thread
      if (file.size < 1024 * 1024) {
        setProgress({ fileId, progress: 0, status: 'reading' })
        file.arrayBuffer().then(
          (buffer) => {
            setProgress({ fileId, progress: 100, status: 'complete' })
            resolve(buffer)
          },
          (err) => {
            setProgress({ fileId, progress: 0, status: 'error', error: String(err) })
            reject(err)
          },
        )
        return
      }

      // For large files, use Web Worker
      setProgress({ fileId, progress: 0, status: 'reading' })

      const worker = new Worker('/workers/file-reader.worker.js')
      workerRef.current = worker

      // Read file as chunks and send to worker
      const CHUNK_SIZE = 4 * 1024 * 1024 // 4MB chunks
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
      const chunks: ArrayBuffer[] = []
      let chunkIndex = 0

      const readNextChunk = () => {
        if (chunkIndex >= totalChunks) {
          // All chunks read, send to worker for merging
          worker.postMessage({ type: 'merge-chunks', fileId, chunks })
          return
        }

        const start = chunkIndex * CHUNK_SIZE
        const end = Math.min(start + CHUNK_SIZE, file.size)
        const slice = file.slice(start, end)

        slice.arrayBuffer().then((buffer) => {
          chunks.push(buffer)
          chunkIndex++
          setProgress({
            fileId,
            progress: Math.round((chunkIndex / totalChunks) * 50), // 0-50% for reading
            status: 'reading',
          })
          readNextChunk()
        })
      }

      worker.onmessage = (e) => {
        const data = e.data
        if (data.fileId !== fileId) return

        if (data.type === 'progress') {
          setProgress({
            fileId,
            progress: 50 + Math.round(data.progress / 2), // 50-100% for merging
            status: 'reading',
          })
        } else if (data.type === 'complete') {
          setProgress({ fileId, progress: 100, status: 'complete' })
          worker.terminate()
          workerRef.current = null
          resolve(data.buffer)
        } else if (data.type === 'error') {
          setProgress({ fileId, progress: 0, status: 'error', error: data.error })
          worker.terminate()
          workerRef.current = null
          reject(new Error(data.error))
        }
      }

      worker.onerror = (err) => {
        setProgress({ fileId, progress: 0, status: 'error', error: String(err) })
        worker.terminate()
        workerRef.current = null
        reject(err)
      }

      readNextChunk()
    })
  }, [])

  const terminate = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate()
      workerRef.current = null
    }
  }, [])

  return { readFile, progress, terminate }
}

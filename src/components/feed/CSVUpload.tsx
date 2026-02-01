/**
 * CSV Upload Component
 * 
 * Allows users to upload CSV bank statements for import
 */

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react'
import { GlassCard } from '@/components/ui'
import { cn } from '@/lib/utils'
import { processCSVUpload, type StagingResult } from '@/lib/reconciliation'

interface CSVUploadProps {
  userId: string
  onUploadComplete: (result: StagingResult) => void
  className?: string
}

export function CSVUpload({ userId, onUploadComplete, className }: CSVUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [result, setResult] = useState<StagingResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setResult({
        success: false,
        staged: 0,
        duplicates: 0,
        errors: ['Please upload a CSV file']
      })
      return
    }

    setIsUploading(true)
    setResult(null)

    try {
      const uploadResult = await processCSVUpload(userId, file)
      setResult(uploadResult)
      onUploadComplete(uploadResult)
    } catch (error) {
      setResult({
        success: false,
        staged: 0,
        duplicates: 0,
        errors: [error instanceof Error ? error.message : 'Upload failed']
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFile(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFile(file)
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const clearResult = () => {
    setResult(null)
  }

  return (
    <div className={className}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'relative border-2 border-dashed rounded-xl p-6 cursor-pointer transition-all',
          isDragging
            ? 'border-amber-500 bg-amber-500/10'
            : 'border-white/[0.1] hover:border-white/[0.2] hover:bg-white/[0.02]',
          isUploading && 'pointer-events-none opacity-50'
        )}
      >
        <div className="flex flex-col items-center text-center">
          {isUploading ? (
            <>
              <Loader2 className="h-8 w-8 text-amber-400 animate-spin mb-3" />
              <p className="text-white font-medium">Processing CSV...</p>
              <p className="text-sm text-slate-400">This may take a moment</p>
            </>
          ) : (
            <>
              <div className="p-3 rounded-xl bg-white/[0.05] mb-3">
                <Upload className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-white font-medium">
                {isDragging ? 'Drop CSV file here' : 'Upload Bank Statement'}
              </p>
              <p className="text-sm text-slate-400 mt-1">
                Drag & drop a CSV file or click to browse
              </p>
            </>
          )}
        </div>
      </div>

      {/* Result */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4"
          >
            <GlassCard size="sm" className={cn(
              'relative',
              result.success ? 'border-emerald-500/30' : 'border-rose-500/30'
            )}>
              <button
                onClick={clearResult}
                className="absolute top-2 right-2 p-1 rounded-lg hover:bg-white/10 text-slate-400"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex items-start gap-3">
                {result.success ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={cn(
                    'font-medium',
                    result.success ? 'text-emerald-400' : 'text-rose-400'
                  )}>
                    {result.success ? 'Upload Complete' : 'Upload Failed'}
                  </p>
                  {result.success ? (
                    <p className="text-sm text-slate-400 mt-1">
                      {result.staged} transactions staged
                      {result.duplicates > 0 && ` (${result.duplicates} potential duplicates)`}
                    </p>
                  ) : (
                    <ul className="text-sm text-slate-400 mt-1 space-y-1">
                      {result.errors.slice(0, 3).map((err, i) => (
                        <li key={i}>• {err}</li>
                      ))}
                      {result.errors.length > 3 && (
                        <li>• ...and {result.errors.length - 3} more errors</li>
                      )}
                    </ul>
                  )}
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * Small CSV upload button for toolbar
 */
export function CSVUploadButton({ 
  onClick, 
  className 
}: { 
  onClick: () => void
  className?: string 
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-slate-300 text-sm transition-colors',
        className
      )}
      title="Import CSV"
    >
      <FileSpreadsheet className="h-4 w-4" />
      <span className="hidden sm:inline">Import CSV</span>
    </button>
  )
}

/**
 * Attachment Item Component
 * 
 * Displays a single attachment with preview, download, and delete functionality.
 * Supports images and PDFs with appropriate icons/previews.
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  X, 
  FileText, 
  Image as ImageIcon, 
  Download, 
  ExternalLink,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TransactionAttachment } from '@/types/database'

interface AttachmentItemProps {
  attachment: TransactionAttachment
  onDelete?: (id: string) => void
  isDeleting?: boolean
  canDelete?: boolean
}

// Format file size for display
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Check if file is an image
function isImage(fileType: string): boolean {
  return fileType.startsWith('image/')
}

// Check if file is a PDF
function isPDF(fileType: string): boolean {
  return fileType === 'application/pdf'
}

export function AttachmentItem({ 
  attachment, 
  onDelete, 
  isDeleting = false,
  canDelete = true 
}: AttachmentItemProps) {
  const [imageError, setImageError] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const handleDownload = () => {
    window.open(attachment.file_url, '_blank')
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onDelete && !isDeleting) {
      onDelete(attachment.id)
    }
  }

  const isImageFile = isImage(attachment.file_type)
  const isPDFFile = isPDF(attachment.file_type)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        onClick={handleDownload}
        className={cn(
          'relative overflow-hidden rounded-xl cursor-pointer',
          'bg-white/[0.03] border border-white/[0.08]',
          'hover:bg-white/[0.06] hover:border-white/[0.12]',
          'transition-all duration-200',
          isDeleting && 'opacity-50 pointer-events-none'
        )}
      >
        {/* Preview Area */}
        <div className="aspect-square w-full relative">
          {isImageFile && !imageError ? (
            <img
              src={attachment.file_url}
              alt={attachment.file_name}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-800/50">
              {isPDFFile ? (
                <FileText className="h-10 w-10 text-rose-400" />
              ) : (
                <ImageIcon className="h-10 w-10 text-slate-500" />
              )}
            </div>
          )}

          {/* Hover Overlay */}
          {isHovered && !isDeleting && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-black/60 flex items-center justify-center gap-2"
            >
              <button
                onClick={handleDownload}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Open"
              >
                <ExternalLink className="h-4 w-4" />
              </button>
              <a
                href={attachment.file_url}
                download={attachment.file_name}
                onClick={(e) => e.stopPropagation()}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Download"
              >
                <Download className="h-4 w-4" />
              </a>
            </motion.div>
          )}

          {/* Delete Button */}
          {canDelete && onDelete && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className={cn(
                'absolute top-1 right-1 p-1 rounded-full',
                'bg-black/60 hover:bg-rose-500 text-white',
                'opacity-0 group-hover:opacity-100 transition-all',
                isDeleting && 'opacity-100'
              )}
              title="Delete attachment"
            >
              {isDeleting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <X className="h-3 w-3" />
              )}
            </button>
          )}
        </div>

        {/* File Info */}
        <div className="p-2 border-t border-white/[0.06]">
          <p className="text-xs text-slate-300 truncate" title={attachment.file_name}>
            {attachment.file_name}
          </p>
          <p className="text-[10px] text-slate-500">
            {formatFileSize(attachment.file_size)}
          </p>
        </div>
      </div>
    </motion.div>
  )
}

// Compact list item version
export function AttachmentListItem({ 
  attachment, 
  onDelete, 
  isDeleting = false,
  canDelete = true 
}: AttachmentItemProps) {
  const isImageFile = isImage(attachment.file_type)
  const isPDFFile = isPDF(attachment.file_type)

  const handleDownload = () => {
    window.open(attachment.file_url, '_blank')
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onDelete && !isDeleting) {
      onDelete(attachment.id)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className={cn(
        'flex items-center gap-3 p-2 rounded-lg group',
        'bg-white/[0.03] border border-white/[0.06]',
        'hover:bg-white/[0.06] transition-colors cursor-pointer',
        isDeleting && 'opacity-50'
      )}
      onClick={handleDownload}
    >
      {/* Icon/Thumbnail */}
      <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0">
        {isImageFile ? (
          <img
            src={attachment.file_url}
            alt={attachment.file_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {isPDFFile ? (
              <FileText className="h-5 w-5 text-rose-400" />
            ) : (
              <FileText className="h-5 w-5 text-slate-500" />
            )}
          </div>
        )}
      </div>

      {/* File Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-300 truncate">{attachment.file_name}</p>
        <p className="text-xs text-slate-500">{formatFileSize(attachment.file_size)}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <a
          href={attachment.file_url}
          download={attachment.file_name}
          onClick={(e) => e.stopPropagation()}
          className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          title="Download"
        >
          <Download className="h-4 w-4" />
        </a>
        {canDelete && onDelete && (
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
            title="Delete"
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <X className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
    </motion.div>
  )
}


import { FileDown } from 'lucide-react'

interface PDFExportButtonProps {
  onExport: () => Promise<void>
  loading?: boolean
  disabled?: boolean
}

export function PDFExportButton({ onExport, loading, disabled }: PDFExportButtonProps) {
  return (
    <button
      onClick={onExport}
      disabled={disabled || loading}
      className="btn-secondary text-sm whitespace-nowrap flex items-center gap-2"
    >
      {loading ? (
        <>
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>生成中...</span>
        </>
      ) : (
        <>
          <FileDown className="w-4 h-4" />
          <span>导出 PDF</span>
        </>
      )}
    </button>
  )
}

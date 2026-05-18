import { useState } from 'react'
import type { PlacedMachine } from '../types/Factory'
import { machineRegistry } from '../types/Machine'

interface ImportExportDialogProps {
  mode: 'import' | 'export'
  machines: PlacedMachine[]
  onImport: (machines: PlacedMachine[]) => void
  onClose: () => void
}

export function ImportExportDialog({ mode, machines, onImport, onClose }: ImportExportDialogProps) {
  const [jsonText, setJsonText] = useState(() => {
    if (mode === 'export') {
      return JSON.stringify(machines, null, 2)
    }
    return ''
  })
  const [error, setError] = useState<string | null>(null)

  const handleImport = () => {
    setError(null)
    let parsed: unknown
    try {
      parsed = JSON.parse(jsonText)
    } catch {
      setError('JSON 格式无效')
      return
    }
    if (!Array.isArray(parsed)) {
      setError('需要一个数组')
      return
    }
    const result: PlacedMachine[] = []
    for (let i = 0; i < parsed.length; i++) {
      const item = parsed[i]
      if (!item || typeof item !== 'object') {
        setError(`第 ${i + 1} 项不是有效对象`)
        return
      }
      const obj = item as Record<string, unknown>
      if (typeof obj.type !== 'string' || !obj.type) {
        setError(`第 ${i + 1} 项缺少有效的 type`)
        return
      }
      if (typeof obj.x !== 'number' || !Number.isInteger(obj.x) || typeof obj.y !== 'number' || !Number.isInteger(obj.y)) {
        setError(`第 ${i + 1} 项 x/y 必须为整数`)
        return
      }
      if (typeof obj.rotate !== 'number' || ![0, 90, 180, 270].includes(obj.rotate)) {
        setError(`第 ${i + 1} 项 rotate 必须为 0/90/180/270`)
        return
      }
      if (!machineRegistry.get(obj.type)) {
        setError(`第 ${i + 1} 项 type "${obj.type}" 未注册`)
        return
      }
      result.push({ type: obj.type, x: obj.x, y: obj.y, rotate: obj.rotate })
    }
    onImport(result)
    onClose()
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonText)
    } catch {
      // fallback: select all
      const ta = document.querySelector('.import-export-textarea') as HTMLTextAreaElement
      ta?.select()
    }
  }

  return (
    <div className="storage-dialog-overlay" onClick={onClose}>
      <div className="storage-dialog import-export-dialog" onClick={e => e.stopPropagation()}>
        <h3>{mode === 'import' ? '导入布局' : '导出布局'}</h3>
        <textarea
          className="import-export-textarea"
          value={jsonText}
          onChange={e => {
            setJsonText(e.target.value)
            setError(null)
          }}
          readOnly={mode === 'export'}
          placeholder={mode === 'import' ? '在此粘贴 JSON...' : ''}
        />
        {error && <div className="import-export-error">{error}</div>}
        <div className="import-export-actions">
          {mode === 'import' ? (
            <button className="tool-button" onClick={handleImport}>
              导入
            </button>
          ) : (
            <button className="tool-button" onClick={handleCopy}>
              复制
            </button>
          )}
          <button className="tool-button" onClick={onClose}>
            取消
          </button>
        </div>
      </div>
    </div>
  )
}

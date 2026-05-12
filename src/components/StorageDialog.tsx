import { useState, type RefObject } from 'react'
import type { FactoryEmulator } from '../factory/FactoryEmulator'

interface StorageDialogProps {
  machineIdx: number
  initialStorage: ({ id: string; amount: number } | null)[]
  emulatorRef: RefObject<FactoryEmulator | null>
  onClose: () => void
}

export function StorageDialog({ machineIdx, initialStorage, emulatorRef, onClose }: StorageDialogProps) {
  const [items, setItems] = useState<({ id: string; amount: number } | null)[]>(initialStorage)

  const close = () => {
    const e = emulatorRef.current
    if (e) {
      const m = e.machines[machineIdx]
      for (let i = 0; i < Math.min(m.inventory.storage.length, items.length); i++) {
        m.inventory.storage[i] = items[i] ? { ...items[i]! } : null
      }
    }
    onClose()
  }

  return (
    <div className="storage-dialog-overlay" onClick={close}>
      <div className="storage-dialog" onClick={e => e.stopPropagation()}>
        <h3>存储箱 #{machineIdx}</h3>
        <div className="storage-slots">
          {items.map((slot, i) => (
            <div key={i} className="storage-slot">
              <input
                type="text"
                placeholder="物品ID"
                value={slot?.id ?? ''}
                onChange={e => {
                  const copy = [...items]
                  const val = e.target.value
                  if (!val) {
                    copy[i] = null
                  } else if (copy[i]) {
                    copy[i] = { ...copy[i]!, id: val }
                  } else {
                    copy[i] = { id: val, amount: 1 }
                  }
                  setItems(copy)
                }}
              />
              <input
                type="number"
                placeholder="数量"
                min={1}
                max={50}
                value={slot?.amount ?? 1}
                onChange={e => {
                  const copy = [...items]
                  const val = parseInt(e.target.value) || 1
                  if (copy[i]) {
                    copy[i] = { ...copy[i]!, amount: Math.max(1, Math.min(50, val)) }
                  } else {
                    copy[i] = { id: '', amount: Math.max(1, Math.min(50, val)) }
                  }
                  setItems(copy)
                }}
              />
            </div>
          ))}
        </div>
        <button className="tool-button" onClick={close}>
          关闭
        </button>
      </div>
    </div>
  )
}

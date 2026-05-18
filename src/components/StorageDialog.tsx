import { useState, useEffect, useRef, type RefObject } from 'react'
import type { IEmulator } from '../factory/IEmulator'

interface StorageDialogProps {
  machineIdx: number
  emulatorRef: RefObject<IEmulator | null>
  onClose: () => void
}

export function StorageDialog({ machineIdx, emulatorRef, onClose }: StorageDialogProps) {
  const [items, setItems] = useState<({ id: string; amount: number } | null)[]>(() => {
    const e = emulatorRef.current
    if (!e) return []
    return e.machines[machineIdx].inventory.storage.map(s => s ? { ...s } : null)
  })
  const dirtySlots = useRef(new Set<number>())

  useEffect(() => {
    const timer = setInterval(() => {
      const e = emulatorRef.current
      if (!e) return
      const live = e.machines[machineIdx].inventory.storage
      setItems(prev => {
        let changed = false
        const next = prev.map((slot, i) => {
          if (dirtySlots.current.has(i)) return slot
          const liveSlot = live[i]
          const newSlot = liveSlot ? { ...liveSlot } : null
          if (JSON.stringify(slot) !== JSON.stringify(newSlot)) {
            changed = true
          }
          return newSlot
        })
        return changed ? next : prev
      })
    }, 100)
    return () => clearInterval(timer)
  }, [machineIdx, emulatorRef])

  const markDirty = (i: number) => {
    dirtySlots.current.add(i)
  }

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
                  markDirty(i)
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
                  markDirty(i)
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

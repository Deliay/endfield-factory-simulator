import { describe, it, expect } from 'vitest'
import type { PlacedMachine } from '../types/Factory'
import type { RuntimeMachine } from '../factory/IEmulator'
import '../machines/belt'
import '../machines/storage_box'
import { FactoryEmulator } from '../factory/FactoryEmulator'

const layout: PlacedMachine[] = [
  { type: 'storage_box', rotate: 0, x: 30, y: 29 },
  { type: 'storage_box', rotate: 0, x: 30, y: 33 },
  { type: 'belt', rotate: 90, x: 30, y: 32 },
  { type: 'belt', rotate: 90, x: 31, y: 32 },
  { type: 'belt', rotate: 90, x: 32, y: 32 },
  { type: 'belt_corner_ne', rotate: 0, x: 32, y: 36 },
  { type: 'belt_corner_ne', rotate: 270, x: 33, y: 36 },
  { type: 'belt', rotate: 270, x: 33, y: 35 },
  { type: 'belt', rotate: 270, x: 33, y: 34 },
  { type: 'belt', rotate: 270, x: 33, y: 33 },
  { type: 'belt', rotate: 270, x: 33, y: 32 },
  { type: 'belt', rotate: 270, x: 33, y: 31 },
  { type: 'belt', rotate: 270, x: 33, y: 30 },
  { type: 'belt', rotate: 270, x: 33, y: 29 },
  { type: 'belt_corner_ne', rotate: 180, x: 33, y: 28 },
  { type: 'belt_corner_ne', rotate: 90, x: 32, y: 28 },
  { type: 'storage_box', rotate: 0, x: 30, y: 37 },
  { type: 'belt', rotate: 90, x: 30, y: 36 },
]

function storageTotal(machines: RuntimeMachine[], idx: number): number {
  return machines[idx].inventory.storage.reduce((s, slot) => s + (slot ? slot.amount : 0), 0)
}

function totalItems(machines: RuntimeMachine[]): number {
  return machines.reduce((sum, m) =>
    sum + m.inventory.storage.reduce((s, slot) => s + (slot ? slot.amount : 0), 0), 0)
}

describe('loop layout: storage(30,29) → storage(30,33) → storage(30,37)', () => {
  it('should transfer all 50 items A from storage(30,29) to storage(30,37)', () => {
    const emulator = new FactoryEmulator(layout)
    emulator.setTimeScale(0.001)

    emulator.machines[0].inventory.storage[0] = { id: 'item_a', amount: 50 }

    for (let t = 0; t < 500; t++) {
      emulator.tick()
    }

    expect(totalItems(emulator.machines)).toBe(50)

    const dstTotal = storageTotal(emulator.machines, 16)
    expect(dstTotal).toBe(50)

    const srcTotal = storageTotal(emulator.machines, 0)
    expect(srcTotal).toBe(0)
  })
})

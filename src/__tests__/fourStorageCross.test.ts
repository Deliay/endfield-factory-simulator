import { describe, it, expect } from 'vitest'
import type { PlacedMachine } from '../types/Factory'
import type { ItemStack } from '../types/Machine'
import '../machines/belt'
import '../machines/storage_box'
import '../machines/log_connector'
import { FactoryEmulator } from '../factory/FactoryEmulator'

function pm(type: string, x: number, y: number, rotate = 0): PlacedMachine {
  return { type, x, y, rotate }
}

const itemA: ItemStack = { id: 'item_a', amount: 50 }
const itemB: ItemStack = { id: 'item_b', amount: 50 }

describe('4 storage cross with logistics bridge', () => {
  it('routes items correctly: A→storage4, B→storage2 through conveyor cross', () => {
    // Four storage boxes arranged in a ring around a 3x3 center area.
    // Storage1(3,0,rot0):  OUT=S→center,  IN=N←outside
    // Storage2(0,3,rot90): IN=E←center,   OUT=W→outside
    // Storage3(6,3,rot90): OUT=W→center,  IN=E←outside
    // Storage4(3,6,rot0):  IN=N←center,   OUT=S→outside
    //
    // Conveyor cross with logistics bridge at center:
    //   belt(4,3,90) → [connector(4,4)] → belt(3,4,180) → storage2
    //                                     → belt(4,5,90) → storage4
    //                                     ← belt(5,4,180) ← storage3
    //                ← storage1 ←
    //
    // The log_connector has per-direction storage (4 slots):
    //   IN:N→storage[0]→OUT:S  (flows item A: storage1→storage4)
    //   IN:E→storage[1]→OUT:W  (flows item B: storage3→storage2)
    //   IN:S→storage[2]→OUT:N
    //   IN:W→storage[3]→OUT:E
    // This enables two independent crossing flows without interference.
    const emulator = new FactoryEmulator([
      pm('storage_box', 3, 0, 0),    // [0] Storage1 (source A)
      pm('storage_box', 0, 3, 90),   // [1] Storage2 (dest B)
      pm('storage_box', 6, 3, 90),   // [2] Storage3 (source B)
      pm('storage_box', 3, 6, 0),    // [3] Storage4 (dest A)

      pm('belt', 4, 3, 90),          // [4] vertical upper
      pm('log_connector', 4, 4),     // [5] center bridge (4-slot per-direction)
      pm('belt', 3, 4, 180),         // [6] horizontal left
      pm('belt', 4, 5, 90),          // [7] vertical lower
      pm('belt', 5, 4, 180),         // [8] horizontal right
    ])
    emulator.setTimeScale(0.001)

    emulator.machines[0].inventory.storage[0] = { ...itemA }
    emulator.machines[2].inventory.storage[0] = { ...itemB }

    // Verify all port connections
    const c = (i: number, x: number, y: number, d: string) =>
      emulator.activeInput(i, { port: 'IN' as const, x, y, direction: d } as any) !== null
    expect(c(4, 0, 0, 'W'), 'belt(4,3,90)←storage1').toBe(true)
    expect(c(8, 0, 0, 'W'), 'belt(5,4,180)←storage3').toBe(true)
    expect(c(6, 0, 0, 'W'), 'belt(3,4,180)←connector').toBe(true)
    expect(c(7, 0, 0, 'W'), 'belt(4,5,90)←connector').toBe(true)
    expect(c(1, 1, 0, 'N'), 'storage2←belt(3,4,180)').toBe(true)
    expect(c(3, 1, 0, 'N'), 'storage4←belt(4,5,90)').toBe(true)

    for (let t = 0; t < 300; t++) emulator.tick()

    const total = (i: number) => emulator.machines[i].inventory.storage.reduce(
      (s: number, st: any) => s + (st ? st.amount : 0), 0
    )

    expect(total(0)).toBe(0)
    expect(total(2)).toBe(0)
    expect(total(1)).toBe(50)
    expect(total(3)).toBe(50)
  })
})

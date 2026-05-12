import { describe, it, expect } from 'vitest'
import type { PlacedMachine } from '../types/Factory'
import type { ItemStack } from '../types/Machine'
import '../machines/belt'
import '../machines/storage_box'
import { FactoryEmulator } from '../factory/FactoryEmulator'

function pm(type: string, x: number, y: number, rotate = 0): PlacedMachine {
  return { type, x, y, rotate }
}

const ore: ItemStack = { id: 'ore', amount: 1 }

describe('FactoryEmulator', () => {
  describe('activeInput', () => {
    it('should find upstream belt via activeInput', () => {
      const emulator = new FactoryEmulator([
        pm('belt', 0, 0),
        pm('belt', 1, 0),
      ])
      const result = emulator.activeInput(1, { port: 'IN', x: 0, y: 0, direction: 'W' })
      expect(result).not.toBeNull()
      expect(result!.machineIndex).toBe(0)
      expect(result!.port.port).toBe('OUT')
      expect(result!.port.direction).toBe('E')
    })
  })

  describe('belt ticking', () => {
    it('should pull item from upstream belt on tick', () => {
      const emulator = new FactoryEmulator([
        pm('belt', 0, 0),
        pm('belt', 1, 0),
      ])
      emulator.machines[0].inventory.storage[0] = { ...ore }

      emulator.tickMachine(1)

      expect(emulator.machines[1].inventory.storage[0]).toEqual(ore)
      expect(emulator.machines[0].inventory.storage[0]).toBeNull()
    })

    it('should not pull item when belt already has one', () => {
      const emulator = new FactoryEmulator([
        pm('belt', 0, 0),
        pm('belt', 1, 0),
      ])
      emulator.machines[0].inventory.storage[0] = { ...ore }
      emulator.machines[1].inventory.storage[0] = { id: 'ingot', amount: 1 }

      emulator.tickMachine(1)

      expect(emulator.machines[1].inventory.storage[0]!.id).toBe('ingot')
      expect(emulator.machines[0].inventory.storage[0]).toEqual(ore)
    })
  })

  describe('storage_box ticking', () => {
    it('should pull item from upstream belt via IN port', () => {
      const emulator = new FactoryEmulator([
        pm('belt', 0, 1, 90),
        pm('storage_box', 0, 2),
      ])
      emulator.machines[0].inventory.storage[0] = { ...ore }

      emulator.tickMachine(1)

      expect(emulator.machines[1].inventory.storage[0]).toEqual(ore)
      expect(emulator.machines[0].inventory.storage[0]).toBeNull()
    })

    it('should merge items of the same type', () => {
      const emulator = new FactoryEmulator([
        pm('belt', 0, 1, 90),
        pm('storage_box', 0, 2),
      ])
      emulator.machines[0].inventory.storage[0] = { ...ore }
      emulator.machines[1].inventory.storage[0] = { id: 'ore', amount: 5 }

      emulator.tickMachine(1)

      expect(emulator.machines[1].inventory.storage[0]).toEqual({ id: 'ore', amount: 6 })
    })

    it('should pull into next available slot when one slot is full', () => {
      const emulator = new FactoryEmulator([
        pm('belt', 0, 1, 90),
        pm('storage_box', 0, 2),
      ])
      emulator.machines[0].inventory.storage[0] = { ...ore }
      emulator.machines[1].inventory.storage[0] = { id: 'ore', amount: 50 }

      emulator.tickMachine(1)

      // Slot 0 is full (50), item goes to slot 1
      expect(emulator.machines[1].inventory.storage[1]).toEqual(ore)
      expect(emulator.machines[0].inventory.storage[0]).toBeNull()
    })

    it('should not pull when all slots are full (amount >= 50)', () => {
      const emulator = new FactoryEmulator([
        pm('belt', 0, 1, 90),
        pm('storage_box', 0, 2),
      ])
      // Fill all 6 slots to capacity
      for (let i = 0; i < 6; i++) {
        emulator.machines[1].inventory.storage[i] = { id: 'ore', amount: 50 }
      }
      emulator.machines[0].inventory.storage[0] = { ...ore }

      emulator.tickMachine(1)

      // Belt's item should remain untouched
      expect(emulator.machines[0].inventory.storage[0]).toEqual(ore)
    })
  })

  describe('factory tick loop', () => {
    it('should advance progress and tick eligible machines', () => {
      // belt: msPerRound=1000, storage_box: msPerRound=500
      const emulator = new FactoryEmulator([
        pm('belt', 0, 0),
        pm('belt', 0, 1, 90),
        pm('storage_box', 0, 2),
      ])
      // belt[1] feeds storage_box, belt[0] doesn't connect to anything downstream
      emulator.machines[0].inventory.storage[0] = { ...ore }
      emulator.machines[1].inventory.storage[0] = { id: 'ingot', amount: 1 }

      // First tick: minMsPerRound=500
      // belt[0]: progress 0->500, round 0->1 (500 >= 0), ticked (no upstream → no change)
      // belt[1]: progress 0->500, round 0->1 (500 >= 0), ticked → pulls from... nothing
      // storage: progress 0->500, round 0->1 (500 >= 0), ticked → pulls from belt[1]
      emulator.tick()

      // Storage box should have pulled from belt[1]
      expect(emulator.machines[2].inventory.storage[0]).toEqual({ id: 'ingot', amount: 1 })
      expect(emulator.machines[1].inventory.storage[0]).toBeNull()
      expect(emulator.machines[0].inventory.storage[0]).toEqual(ore) // untouched

      // Second tick: minMsPerRound=500
      // belt[0]: progress 500->1000, round 1->2 (1000 >= 1000), ticked (no upstream)
      // belt[1]: progress 500->1000, round 1->2 (1000 >= 1000), ticked (no upstream belt[1] empty)
      // storage: progress 500->1000, round 1->2 (1000 >= 500), ticked (no upstream items)
      emulator.tick()

      // No changes since belt[1] is empty and belt[0] has no downstream connection
      expect(emulator.machines[2].inventory.storage[0]).toEqual({ id: 'ingot', amount: 1 })
    })
  })

  describe('multi-machine chain', () => {
    it('should propagate item through belt chain', () => {
      // belt[0] -> belt[1] -> belt[2]
      const emulator = new FactoryEmulator([
        pm('belt', 0, 0),
        pm('belt', 1, 0),
        pm('belt', 2, 0),
      ])
      emulator.machines[0].inventory.storage[0] = { ...ore }

      // Tick middle belt: pulls from belt[0]
      emulator.tickMachine(1)
      expect(emulator.machines[1].inventory.storage[0]).toEqual(ore)
      expect(emulator.machines[0].inventory.storage[0]).toBeNull()

      // Tick last belt: pulls from belt[1] which now has the item
      emulator.tickMachine(2)
      expect(emulator.machines[2].inventory.storage[0]).toEqual(ore)
      expect(emulator.machines[1].inventory.storage[0]).toBeNull()
    })
  })
})

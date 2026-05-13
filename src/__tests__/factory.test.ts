import { describe, it, expect } from 'vitest'
import type { PlacedMachine } from '../types/Factory'
import type { ItemStack } from '../types/Machine'
import '../machines/belt'
import '../machines/storage_box'
import '../machines/log_splitter'
import { FactoryEmulator } from '../factory/FactoryEmulator'
import { computeBeltPathPieces } from '../App'
import { type Dir } from '../utils/rotation'


function pm(type: string, x: number, y: number, rotate = 0): PlacedMachine {
  return { type, x, y, rotate }
}

const ore: ItemStack = { id: 'ore', amount: 1 }
const itemTest: ItemStack = { id: 'item_test', amount: 1 }

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

      emulator.tick()

      expect(emulator.machines[1].inventory.storage[0]).toEqual(ore)
      expect(emulator.machines[0].inventory.storage[0]).toBeNull()
    })

    it('should pull into buffer when belt already has one in storage', () => {
      const emulator = new FactoryEmulator([
        pm('belt', 0, 0),
        pm('belt', 1, 0),
      ])
      emulator.machines[0].inventory.storage[0] = { ...ore }
      emulator.machines[1].inventory.storage[0] = { id: 'ingot', amount: 1 }

      emulator.tick()

      // Belt(1,0) had storage[0]=ingot, buffer was empty → pulls ore from upstream
      // postTick moves buffer[0]=ore to storage[0], overwriting ingot
      expect(emulator.machines[1].inventory.storage[0]!.id).toBe('ore')
      expect(emulator.machines[0].inventory.storage[0]).toBeNull()
    })
  })

  describe('storage_box ticking', () => {
    it('should pull item from upstream belt via IN port', () => {
      const emulator = new FactoryEmulator([
        pm('belt', 0, 1, 90),
        pm('storage_box', 0, 2),
      ])
      emulator.machines[0].inventory.storage[0] = { ...ore }

      emulator.tick()

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

      emulator.tick()

      expect(emulator.machines[1].inventory.storage[0]).toEqual({ id: 'ore', amount: 6 })
    })

    it('should pull into next available slot when one slot is full', () => {
      const emulator = new FactoryEmulator([
        pm('belt', 0, 1, 90),
        pm('storage_box', 0, 2),
      ])
      emulator.machines[0].inventory.storage[0] = { ...ore }
      emulator.machines[1].inventory.storage[0] = { id: 'ore', amount: 50 }

      emulator.tick()

      // Slot 0 is full (50), item goes to slot 1
      expect(emulator.machines[1].inventory.storage[1]).toEqual(ore)
      expect(emulator.machines[0].inventory.storage[0]).toBeNull()
    })

    it('should not pull when all slots are full (amount >= 50)', () => {
      const emulator = new FactoryEmulator([
        pm('belt', 0, 1, 90),
        pm('storage_box', 0, 2),
      ])
      for (let i = 0; i < 6; i++) {
        emulator.machines[1].inventory.storage[i] = { id: 'ore', amount: 50 }
      }
      emulator.machines[0].inventory.storage[0] = { ...ore }

      emulator.tick()

      expect(emulator.machines[0].inventory.storage[0]).toEqual(ore)
    })
  })

  describe('log_splitter ticking', () => {
    it('should pull item from upstream belt via IN:N port', () => {
      const emulator = new FactoryEmulator([
        pm('belt', 0, 0, 90),
        pm('log_splitter', 0, 1),
      ])
      emulator.machines[0].inventory.storage[0] = { ...ore }

      emulator.tick()

      expect(emulator.machines[1].inventory.storage[0]).toEqual(ore)
      expect(emulator.machines[0].inventory.storage[0]).toBeNull()
    })

    it('should allow downstream belt to pull from splitter via OUT:S', () => {
      const emulator = new FactoryEmulator([
        pm('log_splitter', 0, 0),
        pm('belt', 0, 1, 90),
      ])
      emulator.machines[0].inventory.storage[0] = { ...ore }

      emulator.tick()

      expect(emulator.machines[1].inventory.storage[0]).toEqual(ore)
      expect(emulator.machines[0].inventory.storage[0]).toBeNull()
    })

    it('should allow downstream belt to pull from splitter via OUT:E', () => {
      const emulator = new FactoryEmulator([
        pm('log_splitter', 0, 0),
        pm('belt', 1, 0),
      ])
      emulator.machines[0].inventory.storage[0] = { ...ore }

      emulator.tick()

      expect(emulator.machines[1].inventory.storage[0]).toEqual(ore)
      expect(emulator.machines[0].inventory.storage[0]).toBeNull()
    })

    it('should allow downstream belt to pull from splitter via OUT:W', () => {
      const emulator = new FactoryEmulator([
        pm('log_splitter', 1, 0),
        pm('belt', 0, 0, 180),
      ])
      emulator.machines[0].inventory.storage[0] = { ...ore }

      emulator.tick()

      expect(emulator.machines[1].inventory.storage[0]).toEqual(ore)
      expect(emulator.machines[0].inventory.storage[0]).toBeNull()
    })

    it('should propagate item through belt → splitter → belt chain', () => {
      const emulator = new FactoryEmulator([
        pm('belt', 0, 0, 90),
        pm('log_splitter', 0, 1),
        pm('belt', 0, 2, 90),
      ])
      emulator.machines[0].inventory.storage[0] = { ...ore }

      emulator.tick()
      // belt(0,0) → splitter(0,1): item now in splitter's storage
      expect(emulator.machines[1].inventory.storage[0]).toEqual(ore)

      emulator.tick()
      // splitter(0,1) → belt(0,2): item now in belt(0,2)'s storage
      expect(emulator.machines[2].inventory.storage[0]).toEqual(ore)
      expect(emulator.machines[1].inventory.storage[0]).toBeNull()
    })
  })

  describe('factory tick loop', () => {
    it('should advance progress and tick eligible machines', () => {
      const emulator = new FactoryEmulator([
        pm('belt', 0, 0),
        pm('belt', 0, 1, 90),
        pm('storage_box', 0, 2),
      ])
      emulator.machines[0].inventory.storage[0] = { ...ore }
      emulator.machines[1].inventory.storage[0] = { id: 'ingot', amount: 1 }

      emulator.tick()

      expect(emulator.machines[2].inventory.storage[0]).toEqual({ id: 'ingot', amount: 1 })
      expect(emulator.machines[1].inventory.storage[0]).toBeNull()
      expect(emulator.machines[0].inventory.storage[0]).toEqual(ore)

      emulator.tick()

      expect(emulator.machines[2].inventory.storage[0]).toEqual({ id: 'ingot', amount: 1 })
    })
  })

  describe('CASE1: storage_box loop belt path', () => {
    function setupCase1() {
      const storageBox: PlacedMachine = { type: 'storage_box', x: 1, y: 1, rotate: 0 }
      const path = [
        { x: 3, y: 4 },
        { x: 4, y: 4 },
        { x: 4, y: 3 },
        { x: 4, y: 2 },
        { x: 4, y: 1 },
        { x: 4, y: 0 },
        { x: 3, y: 0 },
      ]
      const startDir: Dir = 'N'
      const pieces = computeBeltPathPieces(path, startDir, undefined, [storageBox])
      const belts: PlacedMachine[] = [
        storageBox,
        ...pieces.map(p => ({ type: p.type, x: p.x, y: p.y, rotate: p.rotate })),
      ]
      const emulator = new FactoryEmulator(belts)
      emulator.machines[0].inventory.storage[0] = { ...itemTest }
      return { emulator, belts }
    }

    function findBelt(belts: PlacedMachine[], x: number, y: number): number {
      const idx = belts.findIndex(m => m.x === x && m.y === y)
      if (idx === -1) throw new Error(`Belt at (${x},${y}) not found`)
      return idx
    }

    it('tick 0: belt(3,4) pulls from storage_box', () => {
      const { emulator, belts } = setupCase1()
      emulator.tick()
      expect(emulator.machines[findBelt(belts, 3, 4)].inventory.storage[0]).toEqual(itemTest)
      expect(emulator.machines[0].inventory.storage[0]).toBeNull()
    })

    it('tick 1: item moves to belt(4,4)', () => {
      const { emulator, belts } = setupCase1()
      emulator.tick()
      emulator.tick()
      expect(emulator.machines[findBelt(belts, 4, 4)].inventory.storage[0]).toEqual(itemTest)
      expect(emulator.machines[findBelt(belts, 3, 4)].inventory.storage[0]).toBeNull()
    })

    it('tick 2: item moves to belt(4,3)', () => {
      const { emulator, belts } = setupCase1()
      for (let t = 0; t < 3; t++) emulator.tick()
      expect(emulator.machines[findBelt(belts, 4, 3)].inventory.storage[0]).toEqual(itemTest)
      expect(emulator.machines[findBelt(belts, 4, 4)].inventory.storage[0]).toBeNull()
    })

    it('tick 3: item moves to belt(4,2)', () => {
      const { emulator, belts } = setupCase1()
      for (let t = 0; t < 4; t++) emulator.tick()
      expect(emulator.machines[findBelt(belts, 4, 2)].inventory.storage[0]).toEqual(itemTest)
    })

    it('tick 4: item moves to belt(4,1)', () => {
      const { emulator, belts } = setupCase1()
      for (let t = 0; t < 5; t++) emulator.tick()
      expect(emulator.machines[findBelt(belts, 4, 1)].inventory.storage[0]).toEqual(itemTest)
    })

    it('tick 5: item moves to belt(4,0)', () => {
      const { emulator, belts } = setupCase1()
      for (let t = 0; t < 6; t++) emulator.tick()
      expect(emulator.machines[findBelt(belts, 4, 0)].inventory.storage[0]).toEqual(itemTest)
    })

    it('tick 6: item moves to belt(3,0)', () => {
      const { emulator, belts } = setupCase1()
      for (let t = 0; t < 7; t++) emulator.tick()
      expect(emulator.machines[findBelt(belts, 3, 0)].inventory.storage[0]).toEqual(itemTest)
    })

    it('tick 7: storage_box pulls item back from belt(3,0)', () => {
      const { emulator, belts } = setupCase1()
      for (let t = 0; t < 8; t++) emulator.tick()
      // Storage_box should have the item back
      expect(emulator.machines[0].inventory.storage[0]).toEqual(itemTest)
      expect(emulator.machines[findBelt(belts, 3, 0)].inventory.storage[0]).toBeNull()
    })
  })

  describe('multi-machine chain', () => {
    it('should propagate item through belt chain', () => {
      const emulator = new FactoryEmulator([
        pm('belt', 0, 0),
        pm('belt', 1, 0),
        pm('belt', 2, 0),
      ])
      emulator.machines[0].inventory.storage[0] = { ...ore }

      emulator.tick()
      expect(emulator.machines[1].inventory.storage[0]).toEqual(ore)
      expect(emulator.machines[0].inventory.storage[0]).toBeNull()

      emulator.tick()
      expect(emulator.machines[2].inventory.storage[0]).toEqual(ore)
      expect(emulator.machines[1].inventory.storage[0]).toBeNull()
    })
  })
})

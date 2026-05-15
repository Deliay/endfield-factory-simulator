import { describe, it, expect } from 'vitest'
import type { PlacedMachine } from '../types/Factory'
import type { ItemStack } from '../types/Machine'
import '../machines/belt'
import '../machines/storage_box'
import '../machines/log_splitter'
import '../machines/log_connector'
import { FactoryEmulator } from '../factory/FactoryEmulator'
import { computeBeltPathPieces, findPath } from '../App'
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

    it('should buffer item when belt already has one in storage', () => {
      const emulator = new FactoryEmulator([
        pm('belt', 0, 0),
        pm('belt', 1, 0),
      ])
      emulator.machines[0].inventory.storage[0] = { ...ore }
      emulator.machines[1].inventory.storage[0] = { id: 'ingot', amount: 1 }

      emulator.tick()

      // Belt(1,0) had storage[0]=ingot — ore goes into inputBuffer instead
      expect(emulator.machines[1].inventory.storage[0]!.id).toBe('ingot')
      expect(emulator.machines[1].inputBuffer[0]!.id).toBe('ore')
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

  describe('log_connector ticking', () => {
    it('should pull item from upstream belt via IN:N port', () => {
      const emulator = new FactoryEmulator([
        pm('belt', 0, 0, 90),
        pm('log_connector', 0, 1),
      ])
      emulator.machines[0].inventory.storage[0] = { ...ore }

      emulator.tick()

      expect(emulator.machines[1].inventory.storage[0]).toEqual(ore)
      expect(emulator.machines[0].inventory.storage[0]).toBeNull()
    })

    it('should pull item from upstream belt via IN:E port', () => {
      const emulator = new FactoryEmulator([
        pm('belt', 1, 0, 180),
        pm('log_connector', 0, 0),
      ])
      emulator.machines[0].inventory.storage[0] = { ...ore }

      emulator.tick()

      // IN:E is port index 1 → per-direction storage slot 1
      expect(emulator.machines[1].inventory.storage[1]).toEqual(ore)
      expect(emulator.machines[0].inventory.storage[0]).toBeNull()
    })

    it('should allow downstream belt to pull from connector via OUT:S', () => {
      const emulator = new FactoryEmulator([
        pm('log_connector', 0, 0),
        pm('belt', 0, 1, 90),
      ])
      emulator.machines[0].inventory.storage[0] = { ...ore }

      emulator.tick()

      expect(emulator.machines[1].inventory.storage[0]).toEqual(ore)
      expect(emulator.machines[0].inventory.storage[0]).toBeNull()
    })

    it('should flow N→S through connector', () => {
      // belt(0,0,90)[OUT:S] → connector(0,1)[IN:N]→[OUT:S] → belt(0,2,90)[IN:N]
      const emulator = new FactoryEmulator([
        pm('belt', 0, 0, 90),
        pm('log_connector', 0, 1),
        pm('belt', 0, 2, 90),
      ])
      emulator.machines[0].inventory.storage[0] = { ...ore }

      emulator.tick()
      // tick 1: belt(0,0)→connector IN:N (into buffer), connector OUT:S feeds toward (0,2)
      // postTick 1: connector buffer→storage, belt(0,2) has nothing yet
      expect(emulator.machines[1].inventory.storage[0]).toEqual(ore)

      emulator.tick()
      // tick 2: belt(0,2) takes from connector storage → belt(0,2) buffer
      // postTick 2: belt(0,2) buffer→storage
      expect(emulator.machines[2].inventory.storage[0]).toEqual(ore)
      expect(emulator.machines[1].inventory.storage[0]).toBeNull()
      expect(emulator.machines[0].inventory.storage[0]).toBeNull()
    })

    it('should flow S→N through connector', () => {
      // belt(0,2,270)[OUT:N] → connector(0,1)[IN:S]→[OUT:N] → belt(0,0,270)[IN:S]
      const emulator = new FactoryEmulator([
        pm('belt', 0, 2, 270),
        pm('log_connector', 0, 1),
        pm('belt', 0, 0, 270),
      ])
      emulator.machines[0].inventory.storage[0] = { ...ore }

      emulator.tick()
      // IN:S is port index 2 → per-direction storage slot 2
      expect(emulator.machines[1].inventory.storage[2]).toEqual(ore)

      emulator.tick()
      expect(emulator.machines[2].inventory.storage[0]).toEqual(ore)
      expect(emulator.machines[1].inventory.storage[2]).toBeNull()
      expect(emulator.machines[0].inventory.storage[0]).toBeNull()
    })

    it('should flow W→E through connector', () => {
      // belt(0,0,0)[OUT:E] → connector(1,0)[IN:W]→[OUT:E] → belt(2,0,0)[IN:W]
      const emulator = new FactoryEmulator([
        pm('belt', 0, 0, 0),
        pm('log_connector', 1, 0),
        pm('belt', 2, 0, 0),
      ])
      emulator.machines[0].inventory.storage[0] = { ...ore }

      emulator.tick()
      // IN:W is port index 3 → per-direction storage slot 3
      expect(emulator.machines[1].inventory.storage[3]).toEqual(ore)

      emulator.tick()
      expect(emulator.machines[2].inventory.storage[0]).toEqual(ore)
      expect(emulator.machines[1].inventory.storage[3]).toBeNull()
      expect(emulator.machines[0].inventory.storage[0]).toBeNull()
    })

    it('should flow E→W through connector', () => {
      // belt(2,0,180)[OUT:W] → connector(1,0)[IN:E]→[OUT:W] → belt(0,0,180)[IN:E]
      const emulator = new FactoryEmulator([
        pm('belt', 2, 0, 180),
        pm('log_connector', 1, 0),
        pm('belt', 0, 0, 180),
      ])
      emulator.machines[0].inventory.storage[0] = { ...ore }

      emulator.tick()
      // IN:E is port index 1 → per-direction storage slot 1
      expect(emulator.machines[1].inventory.storage[1]).toEqual(ore)

      emulator.tick()
      expect(emulator.machines[2].inventory.storage[0]).toEqual(ore)
      expect(emulator.machines[1].inventory.storage[1]).toBeNull()
      expect(emulator.machines[0].inventory.storage[0]).toBeNull()
    })
  })

  describe('belt crossing detection', () => {
    it('should replace crossed belt cell with connector when perpendicular', () => {
      const existing: PlacedMachine[] = [
        { type: 'belt', x: 1, y: 1, rotate: 0 },
      ]
      // belt at (1,1) rotate 0: IN:W, OUT:E (flow W→E)
      // path goes N→S through (1,1), which is perpendicular
      const path = [
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 1, y: 2 },
      ]
      const pieces = computeBeltPathPieces(path, 'S', undefined, existing)
      const crossing = pieces.find(p => p.x === 1 && p.y === 1)
      expect(crossing).toBeDefined()
      expect(crossing!.type).toBe('log_connector')
    })

    it('should NOT replace aligned belt cell with connector', () => {
      const existing: PlacedMachine[] = [
        { type: 'belt', x: 1, y: 1, rotate: 0 },
      ]
      // belt at (1,1) rotate 0: IN:W, OUT:E (flow W→E)
      // path also goes W→E through (1,1), which is aligned
      const path = [
        { x: 0, y: 1 },
        { x: 1, y: 1 },
        { x: 2, y: 1 },
      ]
      const pieces = computeBeltPathPieces(path, 'E', undefined, existing)
      const crossing = pieces.find(p => p.x === 1 && p.y === 1)
      expect(crossing).toBeDefined()
      expect(crossing!.type).not.toBe('log_connector')
    })

    it('should not replace corner belt with connector', () => {
      const existing: PlacedMachine[] = [
        { type: 'belt_corner_ne', x: 1, y: 1, rotate: 0 },
      ]
      const path = [
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 1, y: 2 },
      ]
      const pieces = computeBeltPathPieces(path, 'S', undefined, existing)
      const crossing = pieces.find(p => p.x === 1 && p.y === 1)
      expect(crossing).toBeDefined()
      expect(crossing!.type).not.toBe('log_connector')
    })

    it('findPath should allow crossing a belt cell', () => {
      const existing: PlacedMachine[] = [
        { type: 'belt', x: 1, y: 1, rotate: 0 },
      ]
      const path = findPath(1, 0, 1, 2, existing, true)
      expect(path).not.toBeNull()
      expect(path!.some(p => p.x === 1 && p.y === 1)).toBe(true)
    })

    it('findPath should still reject crossing a non-belt machine', () => {
      const existing: PlacedMachine[] = [
        { type: 'log_splitter', x: 1, y: 1, rotate: 0 },
      ]
      const path = findPath(1, 0, 1, 2, existing, true)
      expect(path).toBeNull()
    })

    it('should not replace start tile with splitter', () => {
      const existing: PlacedMachine[] = [
        { type: 'belt', x: 1, y: 0, rotate: 0 },
      ]
      const path = [
        { x: 1, y: 0 },
        { x: 1, y: 1 },
      ]
      const pieces = computeBeltPathPieces(path, 'S', undefined, existing)
      const startPiece = pieces.find(p => p.x === 1 && p.y === 0)
      expect(startPiece).toBeDefined()
      // start piece should be belt or corner, not splitter
      expect(startPiece!.type).not.toBe('log_connector')
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

  describe('50 items through 2-belt pipeline A→B', () => {
    it('should transfer 50 items from storage A to B through 2 belts', () => {
      // A above B, gap of 2 cells filled with belts
      // A(0,0) OUT:(1,2)S→belt1(1,3)rotate=90→belt2(1,4)rotate=90→B(0,5) IN:(1,0)N
      // Theoretical: 2 belts + 50 items = 52 ticks
      const emulator = new FactoryEmulator([
        pm('storage_box', 0, 0, 0),   // A
        pm('belt', 1, 3, 90),          // belt1: IN:N(↑), OUT:S(↓)
        pm('belt', 1, 4, 90),          // belt2: IN:N(↑), OUT:S(↓)
        pm('storage_box', 0, 5, 0),    // B
      ])
      emulator.setTimeScale(0.001)

      emulator.machines[0].inventory.storage[0] = { id: 'ore', amount: 50 }

      const ticksNeeded = 52
      for (let t = 0; t < ticksNeeded; t++) {
        emulator.tick()
      }

      const bTotal = emulator.machines[3].inventory.storage.reduce(
        (sum, s) => sum + (s ? s.amount : 0), 0
      )
      expect(bTotal).toBe(50)

      const aTotal = emulator.machines[0].inventory.storage.reduce(
        (sum, s) => sum + (s ? s.amount : 0), 0
      )
      expect(aTotal).toBe(0)
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

import { describe, it, expect } from 'vitest'
import { findPath, computeBeltPathPieces, findMachineOutPort, findAdjacentOutPort } from '../App'
import type { PlacedMachine } from '../types/Factory'
import '../machines/storage_box'
import '../machines/belt'
import { BeltCornerNeConfig, BeltCornerEnConfig, BeltConfig } from '../machines/belt'

describe('Belt placement cases from SPEC.md', () => {
  const storageBox: PlacedMachine = {
    type: 'storage_box',
    x: 1,
    y: 1,
    rotate: 0
  }

  describe('CASE1: 点击(3,3)作为起始点', () => {
    it('起始点会自动计算为(3,4)', () => {
      const result = findMachineOutPort(3, 3, [storageBox])
      expect(result).toEqual({ outX: 3, outY: 4, dir: 'N' })
    })

    it('点击(3,2)也应返回最近的OUT port', () => {
      const result = findMachineOutPort(3, 2, [storageBox])
      expect(result).toEqual({ outX: 3, outY: 4, dir: 'N' })
    })

    it('点击(2,2)应返回最近的OUT port', () => {
      const result = findMachineOutPort(2, 2, [storageBox])
      expect(result).toEqual({ outX: 2, outY: 4, dir: 'N' })
    })
  })

  describe('CASE2: 点击(3,4)作为起始点，结束点选为(4,3)', () => {
    it('should find path and compute 3 belt pieces', () => {
      const path = findPath(3, 4, 4, 3, [storageBox], true)
      expect(path).toEqual([
        { x: 3, y: 4 },
        { x: 4, y: 4 },
        { x: 4, y: 3 }
      ])

      const pieces = computeBeltPathPieces(path!, 'N', undefined)
      expect(pieces).toEqual([
        { x: 3, y: 4, type: BeltCornerNeConfig.type, rotate: 0 },
        { x: 4, y: 4, type: BeltCornerNeConfig.type, rotate: 270 },
        { x: 4, y: 3, type: BeltConfig.type, rotate: 270 }
      ])
    })
  })

  describe('CASE3: 点击(3,4)作为起始点，结束点选为(4,5)', () => {
    it('should find path and compute 3 belt pieces', () => {
      const path = findPath(3, 4, 4, 5, [storageBox], true)
      expect(path).toEqual([
        { x: 3, y: 4 },
        { x: 4, y: 4 },
        { x: 4, y: 5 }
      ])

      const pieces = computeBeltPathPieces(path!, 'N', undefined)
      expect(pieces).toEqual([
        { x: 3, y: 4, type: BeltCornerNeConfig.type, rotate: 0 },
        { x: 4, y: 4, type: BeltCornerEnConfig.type, rotate: 180 },
        { x: 4, y: 5, type: BeltConfig.type, rotate: 90 }
      ])
    })
  })

  describe('CASE4: 点击(3,4)作为起始点，结束点选为(2,5)', () => {
    it('should find path and compute 3 belt pieces', () => {
      const path = findPath(3, 4, 2, 5, [storageBox], true)
      expect(path).toEqual([
        { x: 3, y: 4 },
        { x: 2, y: 4 },
        { x: 2, y: 5 }
      ])

      const pieces = computeBeltPathPieces(path!, 'N', undefined)
      expect(pieces).toEqual([
        { x: 3, y: 4, type: BeltCornerEnConfig.type, rotate: 270 },
        { x: 2, y: 4, type: BeltCornerNeConfig.type, rotate: 90 },
        { x: 2, y: 5, type: BeltConfig.type, rotate: 90 }
      ])
    })
  })

  describe('CASE5: 点击(3,4)作为起始点，结束点选为(0,2)', () => {
    it('should find path and compute 6 belt pieces', () => {
      const path = findPath(3, 4, 0, 2, [storageBox], true)
      expect(path).toEqual([
        { x: 3, y: 4 },
        { x: 2, y: 4 },
        { x: 1, y: 4 },
        { x: 0, y: 4 },
        { x: 0, y: 3 },
        { x: 0, y: 2 }
      ])

      const pieces = computeBeltPathPieces(path!, 'N', undefined)
      expect(pieces).toEqual([
        { x: 3, y: 4, type: BeltCornerEnConfig.type, rotate: 270 },
        { x: 2, y: 4, type: BeltConfig.type, rotate: 180 },
        { x: 1, y: 4, type: BeltConfig.type, rotate: 180 },
        { x: 0, y: 4, type: BeltCornerEnConfig.type, rotate: 0 },
        { x: 0, y: 3, type: BeltConfig.type, rotate: 270 },
        { x: 0, y: 2, type: BeltConfig.type, rotate: 270 }
      ])
    })
  })

  describe('CASE6: 点击(3,4)作为起始点，结束点选为(0,4)', () => {
    it('should find path and compute 4 belt pieces (straight line west)', () => {
      const path = findPath(3, 4, 0, 4, [storageBox], true)
      expect(path).toEqual([
        { x: 3, y: 4 },
        { x: 2, y: 4 },
        { x: 1, y: 4 },
        { x: 0, y: 4 }
      ])

      const pieces = computeBeltPathPieces(path!, 'N', undefined)
      expect(pieces).toEqual([
        { x: 3, y: 4, type: BeltCornerEnConfig.type, rotate: 270 },
        { x: 2, y: 4, type: BeltConfig.type, rotate: 180 },
        { x: 1, y: 4, type: BeltConfig.type, rotate: 180 },
        { x: 0, y: 4, type: BeltConfig.type, rotate: 180 }
      ])
    })
  })

  describe('CASE7: 点击(3,4)作为起始点，2个结束点(4,4)和(4,3)', () => {
    const beltAt44: PlacedMachine = { type: 'belt', x: 4, y: 4, rotate: 0 }

    describe('CASE7.1 到达结束点(4,4)', () => {
      it('should place belt_corner_ne@0 and belt@0', () => {
        const path = findPath(3, 4, 4, 4, [storageBox], true)
        expect(path).toEqual([
          { x: 3, y: 4 },
          { x: 4, y: 4 }
        ])

        const pieces = computeBeltPathPieces(path!, 'N', undefined)
        expect(pieces).toEqual([
          { x: 3, y: 4, type: BeltCornerNeConfig.type, rotate: 0 },
          { x: 4, y: 4, type: BeltConfig.type, rotate: 0 }
        ])
      })
    })

    describe('CASE7.2 到达结束点(4,3)，起始点为上一个结束点(4,4)', () => {
      it('should replace belt@0 with belt_corner_ne@270 and add belt@270', () => {
        const path = findPath(4, 4, 4, 3, [storageBox], true)
        expect(path).toEqual([
          { x: 4, y: 4 },
          { x: 4, y: 3 }
        ])

        const pieces = computeBeltPathPieces(path!, 'W', beltAt44)
        expect(pieces).toEqual([
          { x: 4, y: 4, type: BeltCornerNeConfig.type, rotate: 270 },
          { x: 4, y: 3, type: BeltConfig.type, rotate: 270 }
        ])
      })
    })
  })

  describe('Continuous placement (simulating handleClick sequence without React state)', () => {
    const storageBox: PlacedMachine = {
      type: 'storage_box',
      x: 1,
      y: 1,
      rotate: 0
    }

    it('CASE7 flow: first click (3,4) → second click (4,4) → third click (4,3) without canceling tool', () => {
      // --- Step 1: First click at (3,4) ---
      // beltStartPos is null → determine start position
      const step1BeltPos = { x: 3, y: 4 }
      const step1result = findAdjacentOutPort(step1BeltPos.x, step1BeltPos.y, [storageBox], ['S', 'E', 'N', 'W'])
      expect(step1result).toEqual({ dir: 'N' })

      let beltStartPos = { ...step1BeltPos }
      let beltStartDir = step1result!.dir
      let machines: PlacedMachine[] = []
      const OPPOSITE: Record<string, string> = { N: 'S', E: 'W', S: 'N', W: 'E' }

      // --- Step 2: Second click at (4,4) ---
      const step2End = { x: 4, y: 4 }
      const step2Path = findPath(beltStartPos.x, beltStartPos.y, step2End.x, step2End.y, [storageBox], true)
      expect(step2Path).toEqual([{ x: 3, y: 4 }, { x: 4, y: 4 }])

      // Simulate handleClick: find existingAtStart and compute pieces
      const step2StartPos = step2Path![0]
      const step2Existing = machines.find(m => m.x === step2StartPos.x && m.y === step2StartPos.y)
      const step2Pieces = computeBeltPathPieces(step2Path!, beltStartDir, step2Existing)
      expect(step2Pieces).toEqual([
        { x: 3, y: 4, type: BeltCornerNeConfig.type, rotate: 0 },
        { x: 4, y: 4, type: BeltConfig.type, rotate: 0 }
      ])

      // Apply filter + add pieces
      machines = [...machines.filter(m => !(m.x === step2StartPos.x && m.y === step2StartPos.y))]
      machines.push(...step2Pieces.map(p => ({ type: p.type, rotate: p.rotate, x: p.x, y: p.y })))

      // Update beltStartPos and beltStartDir for next click
      const last = step2Path![step2Path!.length - 1]
      const prev2 = step2Path![step2Path!.length - 2]
      const lastDir: 'N' | 'E' | 'S' | 'W' = prev2.x === last.x
        ? (prev2.y < last.y ? 'S' : 'N')
        : (prev2.x < last.x ? 'E' : 'W')
      beltStartPos = { x: last.x, y: last.y }
      beltStartDir = OPPOSITE[lastDir] as 'N' | 'E' | 'S' | 'W'

      // Verify: (4,4) has belt@0
      expect(machines.find(m => m.x === 4 && m.y === 4))
        .toEqual({ x: 4, y: 4, type: BeltConfig.type, rotate: 0 })

      // --- Step 3: Third click at (4,3) (continuous placement, NO cancel) ---
      const step3End = { x: 4, y: 3 }
      const step3Path = findPath(beltStartPos.x, beltStartPos.y, step3End.x, step3End.y, [...machines, storageBox], true)
      expect(step3Path).toEqual([{ x: 4, y: 4 }, { x: 4, y: 3 }])

      const step3StartPos = step3Path![0]
      const step3Existing = machines.find(m => m.x === step3StartPos.x && m.y === step3StartPos.y)
      expect(step3Existing).toEqual({ x: 4, y: 4, type: BeltConfig.type, rotate: 0 })

      const step3Pieces = computeBeltPathPieces(step3Path!, beltStartDir, step3Existing)
      expect(step3Pieces).toEqual([
        { x: 4, y: 4, type: BeltCornerNeConfig.type, rotate: 270 },
        { x: 4, y: 3, type: BeltConfig.type, rotate: 270 }
      ])

      // Apply filter + add pieces
      machines = [...machines.filter(m => !(m.x === step3StartPos.x && m.y === step3StartPos.y))]
      machines.push(...step3Pieces.map(p => ({ type: p.type, rotate: p.rotate, x: p.x, y: p.y })))

      // Verify: (4,4) now has belt_corner_ne@270 (NOT belt@0!)
      const machineAt44 = machines.find(m => m.x === 4 && m.y === 4)
      expect(machineAt44).toBeDefined()
      expect(machineAt44!.type).toBe(BeltCornerNeConfig.type)
      expect(machineAt44!.rotate).toBe(270)

      // Verify: no duplicate at (4,4)
      expect(machines.filter(m => m.x === 4 && m.y === 4)).toHaveLength(1)
    })
  })
})
import { describe, it, expect } from 'vitest'
import { findPath, computeBeltPathPieces, findMachineOutPort } from '../App'
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
})
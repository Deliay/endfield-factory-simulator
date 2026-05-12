import { describe, it, expect } from 'vitest'
import { findPath, computeBeltPathPieces } from '../App'
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
      // (3,3) is OUT port of storage_box, adjacent cell to south is (3,4)
      const result = findPath(3, 4, 3, 4, [storageBox], false)
      expect(result).toEqual([{ x: 3, y: 4 }])
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
})
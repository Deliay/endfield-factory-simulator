import { describe, it, expect } from 'vitest'
import { findPath, computeBeltPathPieces } from '../App'
import type { PlacedMachine } from '../types/Factory'
import '../machines/storage_box'
import { BeltCornerNeConfig, BeltCornerEnConfig } from '../machines/belt'

describe('Belt path computation with storage_box', () => {
  const storageBox: PlacedMachine = {
    type: 'storage_box',
    x: 0,
    y: 0,
    rotate: 0
  }

  describe('Path from storage_box OUT port to (3,2)', () => {
    it('should find L-shaped path [(2,3), (3,3), (3,2)]', () => {
      const path = findPath(2, 3, 3, 2, [storageBox], false)
      expect(path).toEqual([
        { x: 2, y: 3 },
        { x: 3, y: 3 },
        { x: 3, y: 2 }
      ])
    })

    it('should compute correct belt pieces with start direction N (no existing belt)', () => {
      const path = findPath(2, 3, 3, 2, [storageBox], false)!
      const pieces = computeBeltPathPieces(path, 'N', undefined)

      expect(pieces).toEqual([
        { x: 2, y: 3, type: BeltCornerNeConfig.type, rotate: 0 },
        { x: 3, y: 3, type: BeltCornerNeConfig.type, rotate: 270 },
        { x: 3, y: 2, type: 'belt', rotate: 270 }
      ])
    })
  })

  describe('Path with existing belt at start', () => {
    it('should create corner at start when existing belt has different direction', () => {
      const existingBelt: PlacedMachine = {
        type: 'belt',
        x: 2,
        y: 3,
        rotate: 0
      }
      const path = findPath(2, 3, 3, 2, [storageBox], true)!
      const pieces = computeBeltPathPieces(path, 'N', existingBelt)

      expect(pieces).toEqual([
        { x: 2, y: 3, type: BeltCornerNeConfig.type, rotate: 0 },
        { x: 3, y: 3, type: BeltCornerNeConfig.type, rotate: 270 },
        { x: 3, y: 2, type: 'belt', rotate: 270 }
      ])
    })
  })

  describe('Path verification details', () => {
    it('first piece at (2,3) should be corner belt turning from N to E', () => {
      const path = findPath(2, 3, 3, 2, [storageBox], false)!
      const pieces = computeBeltPathPieces(path, 'N', undefined)
      const firstPiece = pieces[0]
      expect(firstPiece.x).toBe(2)
      expect(firstPiece.y).toBe(3)
      expect(firstPiece.type).toBe(BeltCornerNeConfig.type)
      expect(firstPiece.rotate).toBe(0)
    })

    it('second piece at (3,3) should be corner turning from E to N', () => {
      const path = findPath(2, 3, 3, 2, [storageBox], false)!
      const pieces = computeBeltPathPieces(path, 'N', undefined)
      const secondPiece = pieces[1]
      expect(secondPiece.x).toBe(3)
      expect(secondPiece.y).toBe(3)
      expect(secondPiece.type).toBe(BeltCornerNeConfig.type)
      expect(secondPiece.rotate).toBe(270)
    })

    it('third piece at (3,2) should be regular belt rotated 270', () => {
      const path = findPath(2, 3, 3, 2, [storageBox], false)!
      const pieces = computeBeltPathPieces(path, 'N', undefined)
      const thirdPiece = pieces[2]
      expect(thirdPiece.x).toBe(3)
      expect(thirdPiece.y).toBe(2)
      expect(thirdPiece.type).toBe('belt')
      expect(thirdPiece.rotate).toBe(270)
    })
  })
})

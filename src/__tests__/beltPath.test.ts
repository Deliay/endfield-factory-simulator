import { describe, it, expect } from 'vitest'
import { findPath, computeBeltPathPieces } from '../App'
import type { PlacedMachine } from '../types/Factory'
import { machineRegistry } from '../types/Machine'
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

  describe('Path from storage_box OUT port to (3,4)', () => {
    it('should compute correct belt pieces for path to (3,4)', () => {
      // Path from (2,3) to (3,4) should be: (2,3) -> (3,3) -> (3,4)
      // Start direction is north (when clicking at (2,3) to place belt)
      const path = [
        { x: 2, y: 3 },
        { x: 3, y: 3 },
        { x: 3, y: 4 }
      ]
      
      // Start direction is north
      const pieces = computeBeltPathPieces(path, 'N', undefined)
      
      expect(pieces).toHaveLength(3)
      
      // First piece at (2,3): corner_ne, INN,OEE, no rotation (rotate 0)
      expect(pieces[0]).toEqual({ x: 2, y: 3, type: BeltCornerNeConfig.type, rotate: 0 })
      
      // Second piece at (3,3): corner turning from east to south (belt_corner_ne rotate 90)
      expect(pieces[1]).toEqual({ x: 3, y: 3, type: BeltCornerNeConfig.type, rotate: 90 })
      
      // Third piece at (3,4): regular belt, IWN,OES, rotation 90
      expect(pieces[2]).toEqual({ x: 3, y: 4, type: 'belt', rotate: 90 })
    })

    it('verify port directions for path to (3,4)', () => {
      // Note: We don't use computeBeltPathPieces here, we're testing machine definitions
      
      // First piece at (2,3): corner_ne (IN North, OUT East)
      const neDef = machineRegistry.get(BeltCornerNeConfig.type)
      expect(neDef?.ports.find(p => p.port === 'IN')?.direction).toBe('N')
      expect(neDef?.ports.find(p => p.port === 'OUT')?.direction).toBe('E')
      
      // Second piece at (3,3): corner_en rotated 180 degrees
      // Default corner_en: IN East, OUT North
      // Rotated 180: IN West, OUT South
      const enDef = machineRegistry.get(BeltCornerEnConfig.type)
      expect(enDef?.ports.find(p => p.port === 'IN')?.direction).toBe('E')
      expect(enDef?.ports.find(p => p.port === 'OUT')?.direction).toBe('N')
      
      // Third piece at (3,4): regular belt rotated 90 degrees
      // Default belt: IN West, OUT East
      // Rotated 90: IN North, OUT South
      const beltDef = machineRegistry.get('belt')
      expect(beltDef?.ports.find(p => p.port === 'IN')?.direction).toBe('W')
      expect(beltDef?.ports.find(p => p.port === 'OUT')?.direction).toBe('E')
    })
  })

  describe('Path with two straight belts then corner down', () => {
    it('should compute correct belt pieces for horizontal path then down', () => {
      // Path from (0,3) to (2,4) with two straight belts then corner
      // (0,3) -> (1,3) -> (2,3) -> (2,4)
      const path = [
        { x: 0, y: 3 },
        { x: 1, y: 3 },
        { x: 2, y: 3 },
        { x: 2, y: 4 }
      ]
      
      // Start direction is east (going right)
      const pieces = computeBeltPathPieces(path, 'E', undefined)
      
      expect(pieces).toHaveLength(4)
      
      // First piece at (0,3): regular belt going east (rotate 0)
      expect(pieces[0]).toEqual({ x: 0, y: 3, type: 'belt', rotate: 0 })
      
      // Second piece at (1,3): regular belt going east (rotate 0)
      expect(pieces[1]).toEqual({ x: 1, y: 3, type: 'belt', rotate: 0 })
      
      // Third piece at (2,3): corner turning from east to south (belt_corner_ne rotate 90)
      // 根据图像，拐角应该从东转向南，使用 belt_corner_ne 旋转 90 度
      expect(pieces[2]).toEqual({ x: 2, y: 3, type: BeltCornerNeConfig.type, rotate: 90 })
      
      // Fourth piece at (2,4): regular belt going south (rotate 90)
      expect(pieces[3]).toEqual({ x: 2, y: 4, type: 'belt', rotate: 90 })
    })

    it('verify port directions for horizontal then down path', () => {
      // Test the machine definitions
      // Corner at (2,3): belt_corner_en rotated 270 degrees
      // Default corner_en: IN East, OUT North
      // Rotated 270: IN South, OUT East
      const enDef = machineRegistry.get(BeltCornerEnConfig.type)
      expect(enDef?.ports.find(p => p.port === 'IN')?.direction).toBe('E')
      expect(enDef?.ports.find(p => p.port === 'OUT')?.direction).toBe('N')
      
      // Straight belts at (0,3) and (1,3): regular belt rotated 0
      // Default belt: IN West, OUT East
      const beltDef = machineRegistry.get('belt')
      expect(beltDef?.ports.find(p => p.port === 'IN')?.direction).toBe('W')
      expect(beltDef?.ports.find(p => p.port === 'OUT')?.direction).toBe('E')
      
      // End belt at (2,4): regular belt rotated 90
      // Rotated 90: IN North, OUT South
      // This means IES (IN East South?) - actually IN North, OUT South
    })
  })
})

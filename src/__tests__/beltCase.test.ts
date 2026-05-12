import { describe, it, expect } from 'vitest'
import { findPath, computeBeltPathPieces } from '../App'
import type { PlacedMachine } from '../types/Factory'
import '../machines/storage_box'
import '../machines/belt'
import { BeltCornerNeConfig, BeltCornerEnConfig, BeltConfig } from '../machines/belt'

describe('User specific case: storage box at (2,2) with belts to (3,2)', () => {
  const storageBox: PlacedMachine = {
    type: 'storage_box',
    x: 0,
    y: 0,
    rotate: 0
  }

  it('should find path from storage box OUT port at (2,2) to (2,3) start', () => {
    // Storage box OUT port at (2,2) faces South
    // The adjacent cell to the South is (2,3)
    const path = findPath(2, 3, 3, 2, [storageBox], false)
    expect(path).toEqual([
      { x: 2, y: 3 },
      { x: 3, y: 3 },
      { x: 3, y: 2 }
    ])
  })

  it('should compute correct belt pieces for the path', () => {
    const path = findPath(2, 3, 3, 2, [storageBox], false)!
    // Start direction should be N (from storage box OUT port facing South, so belt should face North to receive)
    const pieces = computeBeltPathPieces(path, 'N', undefined)

    expect(pieces).toEqual([
      { x: 2, y: 3, type: BeltCornerNeConfig.type, rotate: 0 },  // (2,3): corner_ne, rotation 0
      { x: 3, y: 3, type: BeltCornerNeConfig.type, rotate: 270 }, // (3,3): corner_ne, rotation 270
      { x: 3, y: 2, type: BeltConfig.type, rotate: 270 }          // (3,2): belt, rotation 270
    ])
  })

  it('verify (2,3) belt is corner_ne with INN and OEE', () => {
    const path = findPath(2, 3, 3, 2, [storageBox], false)!
    const pieces = computeBeltPathPieces(path, 'N', undefined)
    const piece = pieces[0]
    
    expect(piece.x).toBe(2)
    expect(piece.y).toBe(3)
    expect(piece.type).toBe(BeltCornerNeConfig.type)
    expect(piece.rotate).toBe(0)
    
    // Check ports: IN direction N, OUT direction E
    const def = BeltCornerNeConfig
    expect(def.ports).toEqual([
      { port: 'IN', x: 0, y: 0, direction: 'N' },
      { port: 'OUT', x: 0, y: 0, direction: 'E' }
    ])
  })

  it('verify (3,3) belt is corner_ne rotated 270 with INW and OEN', () => {
    const path = findPath(2, 3, 3, 2, [storageBox], false)!
    const pieces = computeBeltPathPieces(path, 'N', undefined)
    const piece = pieces[1]
    
    expect(piece.x).toBe(3)
    expect(piece.y).toBe(3)
    expect(piece.type).toBe(BeltCornerNeConfig.type)
    expect(piece.rotate).toBe(270)
    
    // Original ports: IN direction N, OUT direction E
    // After rotating 270 degrees:
    // IN direction N becomes IN direction W (N rotated 270° clockwise → W)
    // OUT direction E becomes OUT direction N (E rotated 270° clockwise → N)
    // So ports should be: INW, OEN
  })

  it('verify (3,2) belt is regular belt rotated 270 with IWS and OEN', () => {
    const path = findPath(2, 3, 3, 2, [storageBox], false)!
    const pieces = computeBeltPathPieces(path, 'N', undefined)
    const piece = pieces[2]
    
    expect(piece.x).toBe(3)
    expect(piece.y).toBe(2)
    expect(piece.type).toBe(BeltConfig.type)
    expect(piece.rotate).toBe(270)
    
    // Regular belt ports: IN direction W, OUT direction E
    // After rotating 270 degrees:
    // IN direction W becomes IN direction S (W rotated 270° clockwise → S)
    // OUT direction E becomes OUT direction N (E rotated 270° clockwise → N)
    // So ports should be: IWS, OEN
  })
})
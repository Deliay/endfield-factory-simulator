import { describe, it, expect } from 'vitest'
import { findAdjacentOutPort, findPath, computeBeltPathPieces } from '../App'
import type { PlacedMachine } from '../types/Factory'
import '../machines/storage_box'
import '../machines/belt'
import { machineRegistry } from '../types/Machine'

function createPlacedMachine(
  type: string,
  x: number,
  y: number,
  rotate: number = 0
): PlacedMachine {
  return { type, x, y, rotate }
}

describe('findAdjacentOutPort', () => {
  describe('storage_box (3x3) with no rotation', () => {
    const machine = createPlacedMachine('storage_box', 0, 0, 0)

    it('should find OUT port at south side for cells below', () => {
      expect(findAdjacentOutPort(0, 3, [machine], ['S', 'E', 'N', 'W'])).toEqual({ dir: 'N' })
      expect(findAdjacentOutPort(1, 3, [machine], ['S', 'E', 'N', 'W'])).toEqual({ dir: 'N' })
      expect(findAdjacentOutPort(2, 3, [machine], ['S', 'E', 'N', 'W'])).toEqual({ dir: 'N' })
    })

    it('should not find OUT port for cells above', () => {
      expect(findAdjacentOutPort(0, -1, [machine], ['S', 'E', 'N', 'W'])).toBeNull()
    })

    it('should not find OUT port for cells at sides', () => {
      expect(findAdjacentOutPort(-1, 2, [machine], ['S', 'E', 'N', 'W'])).toBeNull()
      expect(findAdjacentOutPort(3, 2, [machine], ['S', 'E', 'N', 'W'])).toBeNull()
    })
  })

  describe('storage_box (3x3) rotated 90 degrees', () => {
    const machine = createPlacedMachine('storage_box', 0, 0, 90)

    it('should find OUT port at west side for cells to the left', () => {
      expect(findAdjacentOutPort(-1, 0, [machine], ['S', 'E', 'N', 'W'])).toEqual({ dir: 'E' })
      expect(findAdjacentOutPort(-1, 1, [machine], ['S', 'E', 'N', 'W'])).toEqual({ dir: 'E' })
      expect(findAdjacentOutPort(-1, 2, [machine], ['S', 'E', 'N', 'W'])).toEqual({ dir: 'E' })
    })

    it('should not find OUT port at original south position', () => {
      expect(findAdjacentOutPort(0, 3, [machine], ['S', 'E', 'N', 'W'])).toBeNull()
    })
  })

  describe('storage_box (3x3) rotated 180 degrees', () => {
    const machine = createPlacedMachine('storage_box', 0, 0, 180)

    it('should find OUT port at north side for cells above', () => {
      expect(findAdjacentOutPort(0, -1, [machine], ['S', 'E', 'N', 'W'])).toEqual({ dir: 'S' })
      expect(findAdjacentOutPort(1, -1, [machine], ['S', 'E', 'N', 'W'])).toEqual({ dir: 'S' })
      expect(findAdjacentOutPort(2, -1, [machine], ['S', 'E', 'N', 'W'])).toEqual({ dir: 'S' })
    })
  })

  describe('storage_box (3x3) rotated 270 degrees', () => {
    const machine = createPlacedMachine('storage_box', 0, 0, 270)

    it('should find OUT port at east side for cells to the right', () => {
      expect(findAdjacentOutPort(3, 0, [machine], ['S', 'E', 'N', 'W'])).toEqual({ dir: 'W' })
      expect(findAdjacentOutPort(3, 1, [machine], ['S', 'E', 'N', 'W'])).toEqual({ dir: 'W' })
      expect(findAdjacentOutPort(3, 2, [machine], ['S', 'E', 'N', 'W'])).toEqual({ dir: 'W' })
    })
  })

  describe('belt (1x1) with no rotation', () => {
    const machine = createPlacedMachine('belt', 5, 5, 0)

    it('should find OUT port at west side', () => {
      expect(findAdjacentOutPort(4, 5, [machine], ['S', 'E', 'N', 'W'])).toEqual({ dir: 'E' })
    })

    it('should not find OUT port at other sides', () => {
      expect(findAdjacentOutPort(6, 5, [machine], ['S', 'E', 'N', 'W'])).toBeNull()
      expect(findAdjacentOutPort(5, 4, [machine], ['S', 'E', 'N', 'W'])).toBeNull()
      expect(findAdjacentOutPort(5, 6, [machine], ['S', 'E', 'N', 'W'])).toBeNull()
    })
  })

  describe('belt (1x1) rotated 90 degrees', () => {
    const machine = createPlacedMachine('belt', 5, 5, 90)

    it('should find OUT port at north side', () => {
      expect(findAdjacentOutPort(5, 4, [machine], ['S', 'E', 'N', 'W'])).toEqual({ dir: 'S' })
    })

    it('should not find OUT port at west side', () => {
      expect(findAdjacentOutPort(4, 5, [machine], ['S', 'E', 'N', 'W'])).toBeNull()
    })
  })

  describe('multiple machines', () => {
    const storageBox = createPlacedMachine('storage_box', 0, 0, 0)
    const belt = createPlacedMachine('belt', 5, 5, 0)

    it('should find OUT port from closest machine', () => {
      const result = findAdjacentOutPort(4, 5, [storageBox, belt], ['S', 'E', 'N', 'W'])
      expect(result).toEqual({ dir: 'E' })
    })
  })

  describe('priority', () => {
    const machine = createPlacedMachine('storage_box', 0, 0, 0)

    it('should respect priority order', () => {
      const result = findAdjacentOutPort(0, 3, [machine], ['E', 'S', 'N', 'W'])
      expect(result).toEqual({ dir: 'N' })
    })
  })

  describe('no adjacent ports', () => {
    const machine = createPlacedMachine('storage_box', 0, 0, 0)

    it('should return null when no ports are adjacent', () => {
      expect(findAdjacentOutPort(10, 10, [machine], ['S', 'E', 'N', 'W'])).toBeNull()
    })
  })
})

describe('Belt placement from storage_box to (3,2)', () => {
  const storageBox = createPlacedMachine('storage_box', 0, 0, 0)

  it('storage_box (2,2) should have OSS port', () => {
    const def = machineRegistry.get('storage_box')
    const port = def?.ports.find(p => p.x === 2 && p.y === 2)
    expect(port).toBeDefined()
    expect(port?.port).toBe('OUT')
    expect(port?.direction).toBe('S')
  })

  it('should create 3 belt pieces from (2,3) to (3,2)', () => {
    const path = findPath(2, 3, 3, 2, [storageBox], false)!
    expect(path).toEqual([
      { x: 2, y: 3 },
      { x: 3, y: 3 },
      { x: 3, y: 2 }
    ])

    const pieces = computeBeltPathPieces(path, 'N', undefined)
    expect(pieces).toHaveLength(3)

    // (2,3): belt_corner_nw with OWN and INE
    expect(pieces[0]).toEqual({ x: 2, y: 3, type: 'belt_corner_nw', rotate: 90 })
    const nwDef = machineRegistry.get('belt_corner_nw')
    expect(nwDef?.ports.find(p => p.port === 'IN')?.direction).toBe('N')
    expect(nwDef?.ports.find(p => p.port === 'OUT')?.direction).toBe('W')

    // (3,3): belt_corner_wn with ONE and IWN
    expect(pieces[1]).toEqual({ x: 3, y: 3, type: 'belt_corner_wn', rotate: 90 })
    const wnDef = machineRegistry.get('belt_corner_wn')
    expect(wnDef?.ports.find(p => p.port === 'IN')?.direction).toBe('W')
    expect(wnDef?.ports.find(p => p.port === 'OUT')?.direction).toBe('N')

    // (3,2): belt with ISS and ONN
    expect(pieces[2]).toEqual({ x: 3, y: 2, type: 'belt', rotate: 270 })
    const beltDef = machineRegistry.get('belt')
    expect(beltDef?.ports.find(p => p.port === 'IN')?.direction).toBe('E')
    expect(beltDef?.ports.find(p => p.port === 'OUT')?.direction).toBe('W')
  })
})

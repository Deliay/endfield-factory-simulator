import { describe, it, expect } from 'vitest'
import { findAdjacentOutPort, findAdjacentInPort, findPath, computeBeltPathPieces } from '../App'
import type { PlacedMachine } from '../types/Factory'
import '../machines/storage_box'
import { BeltCornerNeConfig } from '../machines/belt'
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

    it('should find OUT port at east side', () => {
      expect(findAdjacentOutPort(6, 5, [machine], ['S', 'E', 'N', 'W'])).toEqual({ dir: 'W' })
    })

    it('should not find OUT port at other sides', () => {
      expect(findAdjacentOutPort(4, 5, [machine], ['S', 'E', 'N', 'W'])).toBeNull()
      expect(findAdjacentOutPort(5, 4, [machine], ['S', 'E', 'N', 'W'])).toBeNull()
      expect(findAdjacentOutPort(5, 6, [machine], ['S', 'E', 'N', 'W'])).toBeNull()
    })
  })

  describe('belt (1x1) rotated 90 degrees', () => {
    const machine = createPlacedMachine('belt', 5, 5, 90)

    it('should find OUT port at south side', () => {
      expect(findAdjacentOutPort(5, 6, [machine], ['S', 'E', 'N', 'W'])).toEqual({ dir: 'N' })
    })

    it('should not find OUT port at west side', () => {
      expect(findAdjacentOutPort(4, 5, [machine], ['S', 'E', 'N', 'W'])).toBeNull()
    })
  })

  describe('multiple machines', () => {
    const storageBox = createPlacedMachine('storage_box', 0, 0, 0)
    const belt = createPlacedMachine('belt', 5, 5, 0)

    it('should not find OUT port when target is not on output side', () => {
      const result = findAdjacentOutPort(4, 5, [storageBox, belt], ['S', 'E', 'N', 'W'])
      expect(result).toBeNull()
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

    // (2,3): belt_corner_ne with INN and OEE
    expect(pieces[0]).toEqual({ x: 2, y: 3, type: BeltCornerNeConfig.type, rotate: 0 })
    const nwDef = machineRegistry.get(BeltCornerNeConfig.type)
    expect(nwDef?.ports.find(p => p.port === 'IN')?.direction).toBe('N')
    expect(nwDef?.ports.find(p => p.port === 'OUT')?.direction).toBe('E')

    // (3,3): belt_corner_ne rotated 270 degrees (INW and OEN)
    expect(pieces[1]).toEqual({ x: 3, y: 3, type: BeltCornerNeConfig.type, rotate: 270 })
    const neDef33 = machineRegistry.get(BeltCornerNeConfig.type)
    expect(neDef33?.ports.find(p => p.port === 'IN')?.direction).toBe('N')
    expect(neDef33?.ports.find(p => p.port === 'OUT')?.direction).toBe('E')

    // (3,2): regular belt rotated 270 degrees (IWS and OEN)
    expect(pieces[2]).toEqual({ x: 3, y: 2, type: 'belt', rotate: 270 })
    const beltDef = machineRegistry.get('belt')
    expect(beltDef?.ports.find(p => p.port === 'IN')?.direction).toBe('W')
    expect(beltDef?.ports.find(p => p.port === 'OUT')?.direction).toBe('E')
  })
})

describe('findAdjacentInPort', () => {
  describe('storage_box (3x3) at (1,1) no rotation', () => {
    const machine = createPlacedMachine('storage_box', 1, 1, 0)
    // storage_box IN ports at (1,1)N→(1,0), (2,1)N→(2,0), (3,1)N→(3,0)

    it('should snap to feeding cell when clicking on a machine cell', () => {
      const result = findAdjacentInPort(2, 1, [machine], ['S', 'E', 'N', 'W'])
      expect(result).toEqual({ x: 2, y: 0 })
    })

    it('should snap to IN port feeding cell when clicking on feeding cell itself', () => {
      const result = findAdjacentInPort(2, 0, [machine], ['S', 'E', 'N', 'W'])
      expect(result).toEqual({ x: 2, y: 0 })
    })

    it('should snap to the closest IN port when clicking inside machine', () => {
      const result = findAdjacentInPort(2, 2, [machine], ['S', 'E', 'N', 'W'])
      expect(result).toEqual({ x: 2, y: 0 })
    })

    it('should use priority when clicking adjacent to machines on multiple sides', () => {
      const result = findAdjacentInPort(2, -1, [machine], ['S', 'E', 'N', 'W'])
      // S of (2,-1) = (2,0) which is not a machine cell
      // E of (2,-1) = (3,-1) not a machine cell
      // N of (2,-1) = (2,-2) not a machine cell
      // W of (2,-1) = (1,-1) not a machine cell
      expect(result).toBeNull()
    })
  })

  describe('storage_box (3x3) rotated 90 degrees', () => {
    const machine = createPlacedMachine('storage_box', 1, 1, 90)
    // storage_box rotated 90: IN ports rotate to East side
    // Original IN at (0,0)N → rotated 90: (2,0)E → global (3,1)E → feeding (4,1)
    // Original IN at (1,0)N → rotated 90: (2,1)E → global (3,2)E → feeding (4,2)
    // Original IN at (2,0)N → rotated 90: (2,2)E → global (3,3)E → feeding (4,3)

    it('should find IN port on the east side when rotated 90', () => {
      const result = findAdjacentInPort(4, 2, [machine], ['S', 'E', 'N', 'W'])
      expect(result).toEqual({ x: 4, y: 2 })
    })

    it('should snap to feeding cell when clicking machine cell', () => {
      const result = findAdjacentInPort(3, 2, [machine], ['S', 'E', 'N', 'W'])
      expect(result).toEqual({ x: 4, y: 2 })
    })

    it('should NOT snap when port faces away from click', () => {
      // machine at (1,1) rot 90: IN port at (3,3) dir E, feeding=(4,3)
      // clicking north of port at (3,4) → port faces east, feeding=(4,3)≠(3,4)
      const result = findAdjacentInPort(3, 4, [machine], ['S', 'E', 'N', 'W'])
      expect(result).toBeNull()
    })
  })

  describe('storage_box (3x3) rotated 180 degrees', () => {
    const machine = createPlacedMachine('storage_box', 1, 1, 180)
    // Original IN at (0,0)N → rotated 180: (2,2)S → global (3,3)S → feeding (3,4)
    // Original IN at (1,0)N → rotated 180: (1,2)S → global (2,3)S → feeding (2,4)
    // Original IN at (2,0)N → rotated 180: (0,2)S → global (1,3)S → feeding (1,4)

    it('should find IN port on the south side when rotated 180', () => {
      const result = findAdjacentInPort(2, 4, [machine], ['S', 'E', 'N', 'W'])
      expect(result).toEqual({ x: 2, y: 4 })
    })

    it('should snap to feeding cell when clicking inside machine', () => {
      const result = findAdjacentInPort(2, 3, [machine], ['S', 'E', 'N', 'W'])
      expect(result).toEqual({ x: 2, y: 4 })
    })
  })

  describe('no adjacent IN port', () => {
    const machine = createPlacedMachine('storage_box', 0, 0, 0)

    it('should return null when no IN port nearby', () => {
      expect(findAdjacentInPort(10, 10, [machine], ['S', 'E', 'N', 'W'])).toBeNull()
    })
  })

  describe('priority order with multiple machines', () => {
    // Two storage_boxes: one at (5,5), one at (7,5)
    // Box at (5,5): IN ports at north edge → feeding cells at y=4
    // Box at (7,5): IN ports at north edge → feeding cells at y=4
    // Clicking at (6,4): adjacent S = (6,5) is the first box? No, (6,5) is inside box at (5,5) since box occupies (5,5)-(7,7)
    // Actually box at (5,5) occupies (5,5)-(7,7), so (6,5) is inside it
    // The box at (7,5) occupies (7,5)-(9,7)
    const box1 = createPlacedMachine('storage_box', 5, 5, 0)
    const box2 = createPlacedMachine('storage_box', 8, 5, 0)

    it('should find the first IN port in priority order', () => {
      // Click at (6,4): check (6,4) itself → not inside any machine
      // Priority S: (6,5) → inside box1, IN port, return
      const result = findAdjacentInPort(6, 4, [box1, box2], ['S', 'E', 'N', 'W'])
      expect(result).toEqual({ x: 6, y: 4 })
    })
  })
})

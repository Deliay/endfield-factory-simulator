import { describe, it, expect } from 'vitest'
import { rotateDir, rotatePortPosition } from '../rotation'

describe('rotateDir', () => {
  it('should return same direction for 0 rotation', () => {
    expect(rotateDir('N', 0)).toBe('N')
    expect(rotateDir('E', 0)).toBe('E')
    expect(rotateDir('S', 0)).toBe('S')
    expect(rotateDir('W', 0)).toBe('W')
  })

  it('should rotate 90 degrees clockwise', () => {
    expect(rotateDir('N', 90)).toBe('E')
    expect(rotateDir('E', 90)).toBe('S')
    expect(rotateDir('S', 90)).toBe('W')
    expect(rotateDir('W', 90)).toBe('N')
  })

  it('should rotate 180 degrees', () => {
    expect(rotateDir('N', 180)).toBe('S')
    expect(rotateDir('E', 180)).toBe('W')
    expect(rotateDir('S', 180)).toBe('N')
    expect(rotateDir('W', 180)).toBe('E')
  })

  it('should rotate 270 degrees clockwise', () => {
    expect(rotateDir('N', 270)).toBe('W')
    expect(rotateDir('E', 270)).toBe('N')
    expect(rotateDir('S', 270)).toBe('E')
    expect(rotateDir('W', 270)).toBe('S')
  })
})

describe('rotatePortPosition', () => {
  describe('3x3 machine (center at 1,1)', () => {
    const width = 3
    const height = 3

    it('should return same position for 0 rotation', () => {
      expect(rotatePortPosition(0, 0, width, height, 0)).toEqual({ x: 0, y: 0 })
      expect(rotatePortPosition(1, 0, width, height, 0)).toEqual({ x: 1, y: 0 })
      expect(rotatePortPosition(2, 0, width, height, 0)).toEqual({ x: 2, y: 0 })
    })

    it('should rotate 90 degrees clockwise: (0,0)->(2,0), (1,0)->(2,1), (2,0)->(2,2)', () => {
      expect(rotatePortPosition(0, 0, width, height, 90)).toEqual({ x: 2, y: 0 })
      expect(rotatePortPosition(1, 0, width, height, 90)).toEqual({ x: 2, y: 1 })
      expect(rotatePortPosition(2, 0, width, height, 90)).toEqual({ x: 2, y: 2 })
    })

    it('should rotate 90 degrees clockwise for other positions', () => {
      expect(rotatePortPosition(0, 1, width, height, 90)).toEqual({ x: 1, y: 0 })
      expect(rotatePortPosition(0, 2, width, height, 90)).toEqual({ x: 0, y: 0 })
      expect(rotatePortPosition(2, 1, width, height, 90)).toEqual({ x: 1, y: 2 })
      expect(rotatePortPosition(2, 2, width, height, 90)).toEqual({ x: 0, y: 2 })
    })

    it('should rotate 180 degrees', () => {
      expect(rotatePortPosition(0, 0, width, height, 180)).toEqual({ x: 2, y: 2 })
      expect(rotatePortPosition(1, 0, width, height, 180)).toEqual({ x: 1, y: 2 })
      expect(rotatePortPosition(2, 0, width, height, 180)).toEqual({ x: 0, y: 2 })
    })

    it('should rotate 270 degrees clockwise', () => {
      expect(rotatePortPosition(0, 0, width, height, 270)).toEqual({ x: 0, y: 2 })
      expect(rotatePortPosition(1, 0, width, height, 270)).toEqual({ x: 0, y: 1 })
      expect(rotatePortPosition(2, 0, width, height, 270)).toEqual({ x: 0, y: 0 })
    })
  })

  describe('storage_box IN ports (0,0)-N, (1,0)-N, (2,0)-N', () => {
    const width = 3
    const height = 3
    const ports = [
      { x: 0, y: 0, orientation: 'N' as const },
      { x: 1, y: 0, orientation: 'N' as const },
      { x: 2, y: 0, orientation: 'N' as const },
    ]

    it('should not change ports when rotation is 0', () => {
      const rotated = ports.map(p => ({
        pos: rotatePortPosition(p.x, p.y, width, height, 0),
        dir: rotateDir(p.orientation, 0)
      }))
      expect(rotated).toEqual([
        { pos: { x: 0, y: 0 }, dir: 'N' },
        { pos: { x: 1, y: 0 }, dir: 'N' },
        { pos: { x: 2, y: 0 }, dir: 'N' },
      ])
    })

    it('should become (2,0)-E, (2,1)-E, (2,2)-E after 90° rotation', () => {
      const rotated = ports.map(p => ({
        pos: rotatePortPosition(p.x, p.y, width, height, 90),
        dir: rotateDir(p.orientation, 90)
      }))
      expect(rotated).toEqual([
        { pos: { x: 2, y: 0 }, dir: 'E' },
        { pos: { x: 2, y: 1 }, dir: 'E' },
        { pos: { x: 2, y: 2 }, dir: 'E' },
      ])
    })

    it('should become (2,2)-S, (1,2)-S, (0,2)-S after 180° rotation', () => {
      const rotated = ports.map(p => ({
        pos: rotatePortPosition(p.x, p.y, width, height, 180),
        dir: rotateDir(p.orientation, 180)
      }))
      expect(rotated).toEqual([
        { pos: { x: 2, y: 2 }, dir: 'S' },
        { pos: { x: 1, y: 2 }, dir: 'S' },
        { pos: { x: 0, y: 2 }, dir: 'S' },
      ])
    })

    it('should become (0,2)-W, (0,1)-W, (0,0)-W after 270° rotation', () => {
      const rotated = ports.map(p => ({
        pos: rotatePortPosition(p.x, p.y, width, height, 270),
        dir: rotateDir(p.orientation, 270)
      }))
      expect(rotated).toEqual([
        { pos: { x: 0, y: 2 }, dir: 'W' },
        { pos: { x: 0, y: 1 }, dir: 'W' },
        { pos: { x: 0, y: 0 }, dir: 'W' },
      ])
    })
  })

  describe('2x2 machine (center at 0.5,0.5)', () => {
    const width = 2
    const height = 2

    it('should rotate 90 degrees clockwise', () => {
      expect(rotatePortPosition(0, 0, width, height, 90)).toEqual({ x: 1, y: 0 })
      expect(rotatePortPosition(1, 0, width, height, 90)).toEqual({ x: 1, y: 1 })
      expect(rotatePortPosition(0, 1, width, height, 90)).toEqual({ x: 0, y: 0 })
      expect(rotatePortPosition(1, 1, width, height, 90)).toEqual({ x: 0, y: 1 })
    })
  })

  describe('4x4 machine (center at 1.5,1.5)', () => {
    const width = 4
    const height = 4

    it('should rotate 90 degrees clockwise', () => {
      expect(rotatePortPosition(0, 0, width, height, 90)).toEqual({ x: 3, y: 0 })
      expect(rotatePortPosition(3, 0, width, height, 90)).toEqual({ x: 3, y: 3 })
      expect(rotatePortPosition(3, 3, width, height, 90)).toEqual({ x: 0, y: 3 })
      expect(rotatePortPosition(0, 3, width, height, 90)).toEqual({ x: 0, y: 0 })
    })
  })
})

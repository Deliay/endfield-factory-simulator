export type Dir = 'N' | 'E' | 'S' | 'W'

const ALL_DIRS: Dir[] = ['N', 'E', 'S', 'W']

export function rotateDir(dir: Dir, rot: number): Dir {
  const idx = ALL_DIRS.indexOf(dir)
  return ALL_DIRS[(idx + rot / 90) % 4]
}

export function rotatePortPosition(
  localX: number,
  localY: number,
  machineWidth: number,
  machineHeight: number,
  rot: number
): { x: number; y: number } {
  const cx = (machineWidth - 1) / 2
  const cy = (machineHeight - 1) / 2
  
  const relX = localX - cx
  const relY = localY - cy
  const steps = ((rot % 360) + 360) % 360 / 90
  
  let rotatedRelX = relX
  let rotatedRelY = relY
  for (let i = 0; i < steps; i++) {
    const newRelX = -rotatedRelY
    const newRelY = rotatedRelX
    rotatedRelX = newRelX
    rotatedRelY = newRelY
  }
  
  return {
    x: cx + rotatedRelX,
    y: cy + rotatedRelY
  }
}

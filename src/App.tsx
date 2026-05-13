/* eslint-disable @typescript-eslint/no-unused-vars, react-refresh/only-export-components */
import { useState, useEffect, useReducer, useRef } from 'react'
import { Stage, Layer, Line, Rect, Text } from 'react-konva'
import type { Stage as StageType } from 'konva/lib/Stage'
import { machineRegistry } from './types/Machine'
import type { PlacedMachine } from './types/Factory'
import { MachineImage } from './components/MachineImage'
import { ToolButton } from './components/ToolButton'
import { StorageDialog } from './components/StorageDialog'
import { rotateDir, rotatePortPosition, type Dir } from './utils/rotation'
import { FactoryEmulator } from './factory/FactoryEmulator'
import { emulatorRegistry } from './factory/emulatorRegistry'
import type { IEmulator } from './factory/IEmulator'
import './machines/belt'
import './machines/storage_box'

const GRID_COLS = 64
const GRID_ROWS = 64
const CELL_SIZE = 64

function getOccupiedCells(
  definition: { width: number; height: number },
  x: number,
  y: number,
  rotate: number,
): Set<string> {
  const w = rotate % 180 === 0 ? definition.width : definition.height
  const h = rotate % 180 === 0 ? definition.height : definition.width
  const cells = new Set<string>()
  for (let dx = 0; dx < w; dx++) {
    for (let dy = 0; dy < h; dy++) {
      cells.add(`${x + dx},${y + dy}`)
    }
  }
  return cells
}

function getOccupiedCellsByMachine(pm: PlacedMachine): Set<string> {
  const def = machineRegistry.get(pm.type)
  if (!def) return new Set()
  return getOccupiedCells(def, pm.x, pm.y, pm.rotate)
}

function canPlaceMachine(
  type: string,
  x: number,
  y: number,
  rotate: number,
  existing: PlacedMachine[],
): boolean {
  const def = machineRegistry.get(type)
  if (!def) return false

  const w = rotate % 180 === 0 ? def.width : def.height
  const h = rotate % 180 === 0 ? def.height : def.width
  if (x < 0 || y < 0 || x + w > GRID_COLS || y + h > GRID_ROWS) return false

  const newCells = getOccupiedCells(def, x, y, rotate)
  for (const pm of existing) {
    const occupied = getOccupiedCellsByMachine(pm)
    for (const cell of newCells) {
      if (occupied.has(cell)) return false
    }
  }
  return true
}


const DIR_DX: Record<Dir, number> = { N: 0, E: 1, S: 0, W: -1 }
const DIR_DY: Record<Dir, number> = { N: -1, E: 0, S: 1, W: 0 }

function getMachineCells(pm: PlacedMachine): Array<{ x: number; y: number }> {
  const def = machineRegistry.get(pm.type)
  if (!def) return []
  const w = pm.rotate % 180 === 0 ? def.width : def.height
  const h = pm.rotate % 180 === 0 ? def.height : def.width
  const cells: Array<{ x: number; y: number }> = []
  for (let dx = 0; dx < w; dx++) {
    for (let dy = 0; dy < h; dy++) {
      cells.push({ x: pm.x + dx, y: pm.y + dy })
    }
  }
  return cells
}

const DIR_OPPOSITE: Record<Dir, Dir> = { N: 'S', E: 'W', S: 'N', W: 'E' }

export function findAdjacentOutPort(
  targetX: number, targetY: number,
  existing: PlacedMachine[],
  priority: Dir[],
): { dir: Dir } | null {
  for (const dir of priority) {
    const adjX = targetX + DIR_DX[dir]
    const adjY = targetY + DIR_DY[dir]

    for (const pm of existing) {
      const cells = getMachineCells(pm)
      for (const cell of cells) {
        if (cell.x !== adjX || cell.y !== adjY) continue

        const def = machineRegistry.get(pm.type)
        if (!def) continue

        for (const port of def.ports) {
          if (port.port !== 'OUT') continue
          const rotatedDir = rotateDir(port.direction, pm.rotate)
          const outX = cell.x + DIR_DX[rotatedDir]
          const outY = cell.y + DIR_DY[rotatedDir]
          if (outX === targetX && outY === targetY) {
            return { dir: DIR_OPPOSITE[rotatedDir] }
          }
        }
      }
    }
  }
  return null
}

export function findAdjacentInPort(
  clickX: number, clickY: number,
  existing: PlacedMachine[],
  priority: Dir[],
): { x: number; y: number } | null {
  // Check if clicked cell is inside a machine → find closest IN port by Manhattan distance
  let best: { x: number; y: number; dist: number } | null = null
  for (const pm of existing) {
    if (!getMachineCells(pm).some(c => c.x === clickX && c.y === clickY)) continue
    const def = machineRegistry.get(pm.type)
    if (!def) continue
    for (const port of def.ports) {
      if (port.port !== 'IN') continue
      const rotatedPos = rotatePortPosition(port.x, port.y, def.width, def.height, pm.rotate)
      const portGlobalX = pm.x + rotatedPos.x
      const portGlobalY = pm.y + rotatedPos.y
      const rotatedDir = rotateDir(port.direction, pm.rotate)
      const feedingX = portGlobalX + DIR_DX[rotatedDir]
      const feedingY = portGlobalY + DIR_DY[rotatedDir]
      if (feedingX < 0 || feedingX >= GRID_COLS || feedingY < 0 || feedingY >= GRID_ROWS) continue
      const dist = Math.abs(clickX - portGlobalX) + Math.abs(clickY - portGlobalY)
      if (!best || dist < best.dist) {
        best = { x: feedingX, y: feedingY, dist }
      }
    }
    if (best) return { x: best.x, y: best.y }
  }

  // Check adjacent cells in priority order
  for (const dir of priority) {
    const adjX = clickX + DIR_DX[dir]
    const adjY = clickY + DIR_DY[dir]
    for (const pm of existing) {
      if (!getMachineCells(pm).some(c => c.x === adjX && c.y === adjY)) continue
      const def = machineRegistry.get(pm.type)
      if (!def) continue
      for (const port of def.ports) {
        if (port.port !== 'IN') continue
        const rotatedPos = rotatePortPosition(port.x, port.y, def.width, def.height, pm.rotate)
        const portGlobalX = pm.x + rotatedPos.x
        const portGlobalY = pm.y + rotatedPos.y
        if (portGlobalX !== adjX || portGlobalY !== adjY) continue
        const rotatedDir = rotateDir(port.direction, pm.rotate)
        const feedingX = portGlobalX + DIR_DX[rotatedDir]
        const feedingY = portGlobalY + DIR_DY[rotatedDir]
        if (feedingX < 0 || feedingX >= GRID_COLS || feedingY < 0 || feedingY >= GRID_ROWS) continue
        if (feedingX !== clickX || feedingY !== clickY) continue
        return { x: feedingX, y: feedingY }
      }
    }
  }
  return null
}

export function findMachineOutPort(
  clickX: number, clickY: number,
  existing: PlacedMachine[],
): { outX: number; outY: number; dir: Dir } | null {
  for (const pm of existing) {
    const def = machineRegistry.get(pm.type)
    if (!def) continue
    const cells = getMachineCells(pm)
    const clickedInside = cells.some(c => c.x === clickX && c.y === clickY)
    if (!clickedInside) continue

    let best: { outX: number; outY: number; dir: Dir; dist: number } | null = null
    for (const port of def.ports) {
      if (port.port !== 'OUT') continue
      const rotatedDir = rotateDir(port.direction, pm.rotate)
      const portGlobalX = pm.x + port.x
      const portGlobalY = pm.y + port.y
      const beltX = portGlobalX + DIR_DX[rotatedDir]
      const beltY = portGlobalY + DIR_DY[rotatedDir]
      const dist = Math.abs(clickX - portGlobalX) + Math.abs(clickY - portGlobalY)
      if (!best || dist < best.dist) {
        best = { outX: beltX, outY: beltY, dir: DIR_OPPOSITE[rotatedDir], dist }
      }
    }
    if (best) return { outX: best.outX, outY: best.outY, dir: best.dir }
  }
  return null
}

function isCellOccupied(x: number, y: number, existing: PlacedMachine[], excludeStartX?: number, excludeStartY?: number): boolean {
  for (const pm of existing) {
    if (pm.x === excludeStartX && pm.y === excludeStartY) continue
    const cells = getMachineCells(pm)
    for (const cell of cells) {
      if (cell.x === x && cell.y === y) return true
    }
  }
  return false
}

export function findPath(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  existing: PlacedMachine[],
  excludeStart: boolean,
): { x: number; y: number }[] | null {
  if (startX === endX && startY === endY) {
    return [{ x: startX, y: startY }]
  }

  const tryPath = (path: Array<{ x: number; y: number }>): boolean => {
    for (let i = excludeStart ? 1 : 0; i < path.length; i++) {
      if (isCellOccupied(path[i].x, path[i].y, existing)) {
        return false
      }
    }
    return true
  }

  if (startX === endX) {
    const path: Array<{ x: number; y: number }> = []
    if (startY < endY) {
      for (let y = startY; y <= endY; y++) path.push({ x: startX, y })
    } else {
      for (let y = startY; y >= endY; y--) path.push({ x: startX, y })
    }
    if (tryPath(path)) return path
  }

  if (startY === endY) {
    const path: Array<{ x: number; y: number }> = []
    if (startX < endX) {
      for (let x = startX; x <= endX; x++) path.push({ x, y: startY })
    } else {
      for (let x = startX; x >= endX; x--) path.push({ x, y: startY })
    }
    if (tryPath(path)) return path
  }

  const corner1 = { x: endX, y: startY }
  const path1 = [
    { x: startX, y: startY },
    ...(startX < endX ? range(startX + 1, endX) : range(startX - 1, endX, -1)).map(x => ({ x, y: startY })),
    ...(startY < endY ? range(startY + 1, endY) : range(startY - 1, endY, -1)).map(y => ({ x: endX, y })),
  ]
  if (tryPath(path1)) return path1

  const corner2 = { x: startX, y: endY }
  const path2 = [
    { x: startX, y: startY },
    ...(startY < endY ? range(startY + 1, endY) : range(startY - 1, endY, -1)).map(y => ({ x: startX, y })),
    ...(startX < endX ? range(startX + 1, endX) : range(startX - 1, endX, -1)).map(x => ({ x, y: endY })),
  ]
  if (tryPath(path2)) return path2

  return null
}

function range(start: number, end: number, step: number = 1): number[] {
  const result: number[] = []
  if (step > 0) {
    for (let i = start; i <= end; i++) {
      result.push(i)
    }
  } else {
    for (let i = start; i >= end; i--) {
      result.push(i)
    }
  }
  return result
}

function getCornerTypeAndRotation(inDir: Dir, outDir: Dir): { type: string; rotate: number } | null {
  if (inDir === outDir || inDir === DIR_OPPOSITE[outDir]) return null

  const dirs: Dir[] = ['N', 'E', 'S', 'W']
  const inIdx = dirs.indexOf(inDir)
  const outIdx = dirs.indexOf(outDir)
  const turnCW = (outIdx - inIdx + 4) % 4

  if (turnCW === 1) {
    const neRotations: Record<Dir, number> = { N: 0, E: 90, S: 180, W: 270 }
    return { type: 'belt_corner_ne', rotate: neRotations[inDir] }
  } else if (turnCW === 2) {
    const neRotations: Record<Dir, number> = { N: 180, E: 270, S: 0, W: 90 }
    return { type: 'belt_corner_ne', rotate: neRotations[inDir] }
  } else if (turnCW === 3) {
    const enRotations: Record<Dir, number> = { N: 270, E: 0, S: 90, W: 180 }
    return { type: 'belt_corner_en', rotate: enRotations[inDir] }
  }

  return null
}

function getBeltRotation(dir: Dir): number {
  const dirRotation: Record<Dir, number> = { N: 270, E: 0, S: 90, W: 180 }
  return dirRotation[dir]
}

function findEndInPortDir(
  endX: number, endY: number,
  existing: PlacedMachine[],
): Dir | null {
  const priority: Dir[] = ['S', 'E', 'N', 'W']
  for (const dir of priority) {
    const adjX = endX + DIR_DX[dir]
    const adjY = endY + DIR_DY[dir]
    for (const pm of existing) {
      if (!getMachineCells(pm).some(c => c.x === adjX && c.y === adjY)) continue
      const def = machineRegistry.get(pm.type)
      if (!def) continue
      for (const port of def.ports) {
        if (port.port !== 'IN') continue
        const rotatedPos = rotatePortPosition(port.x, port.y, def.width, def.height, pm.rotate)
        const portGlobalX = pm.x + rotatedPos.x
        const portGlobalY = pm.y + rotatedPos.y
        if (portGlobalX !== adjX || portGlobalY !== adjY) continue
        const rotatedDir = rotateDir(port.direction, pm.rotate)
        const feedingX = portGlobalX + DIR_DX[rotatedDir]
        const feedingY = portGlobalY + DIR_DY[rotatedDir]
        if (feedingX === endX && feedingY === endY) {
          return DIR_OPPOSITE[rotatedDir]
        }
      }
    }
  }
  return null
}

export function computeBeltPathPieces(
  path: { x: number; y: number }[],
  startDir: Dir,
  existingAtStart: PlacedMachine | undefined,
  existing?: PlacedMachine[],
): Array<{ x: number; y: number; type: string; rotate: number }> {
  if (path.length === 0) return []
  if (path.length === 1) {
    return [{ x: path[0].x, y: path[0].y, type: 'belt', rotate: getBeltRotation(startDir) }]
  }

  const pieces: Array<{ x: number; y: number; type: string; rotate: number }> = []
  let currentDir = startDir

  const OPPOSITE: Record<Dir, Dir> = { N: 'S', E: 'W', S: 'N', W: 'E' }

  for (let i = 0; i < path.length; i++) {
    const curr = path[i]
    const isStart = i === 0
    const isEnd = i === path.length - 1

    if (isStart && existingAtStart) {
      if (path.length > 1) {
        const next = path[i + 1]
        const exitDir: Dir = curr.x === next.x ? (curr.y < next.y ? 'S' : 'N') : (curr.x < next.x ? 'E' : 'W')
        const corner = getCornerTypeAndRotation(startDir, exitDir)
        if (corner) {
          pieces.push({ x: curr.x, y: curr.y, type: corner.type, rotate: corner.rotate })
        } else {
          pieces.push({ x: curr.x, y: curr.y, type: 'belt', rotate: getBeltRotation(exitDir) })
        }
        currentDir = OPPOSITE[exitDir]
      } else {
        pieces.push({ x: curr.x, y: curr.y, type: existingAtStart.type, rotate: existingAtStart.rotate })
      }
      continue
    }

    let exitDir: Dir
    if (isEnd) {
      if (existing) {
        const inPortDir = findEndInPortDir(curr.x, curr.y, existing)
        exitDir = inPortDir ?? OPPOSITE[currentDir]
      } else {
        exitDir = OPPOSITE[currentDir]
      }
    } else {
      const next = path[i + 1]
      exitDir = curr.x === next.x ? (curr.y < next.y ? 'S' : 'N') : (curr.x < next.x ? 'E' : 'W')
    }

    const corner = getCornerTypeAndRotation(currentDir, exitDir)
    if (corner) {
      pieces.push({ x: curr.x, y: curr.y, type: corner.type, rotate: corner.rotate })
    } else {
      pieces.push({ x: curr.x, y: curr.y, type: 'belt', rotate: getBeltRotation(exitDir) })
    }

    currentDir = OPPOSITE[exitDir]
  }

  return pieces
}

const OPPOSITE: Record<Dir, Dir> = { N: 'S', E: 'W', S: 'N', W: 'E' }

interface AppState {
  machines: PlacedMachine[]
  beltStartPos: { x: number; y: number } | null
  beltStartDir: Dir | null
}

type AppAction =
  | { type: 'BELT_SET_START'; pos: { x: number; y: number }; dir: Dir }
  | { type: 'BELT_PLACE'; x: number; y: number }
  | { type: 'PLACE_MACHINE'; machineType: string; rotate: number; x: number; y: number }
  | { type: 'RESET_BELT' }

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'BELT_SET_START':
      return { ...state, beltStartPos: action.pos, beltStartDir: action.dir }
    case 'BELT_PLACE': {
      const s = state.beltStartPos
      const d = state.beltStartDir
      if (!s || !d) return state
      const path = findPath(s.x, s.y, action.x, action.y, state.machines, true)
      if (!path) return state
      const startPos = path[0]
      const existingAtStart = state.machines.find(m => m.x === startPos.x && m.y === startPos.y)
      const pieces = computeBeltPathPieces(path, d, existingAtStart, state.machines)
      const machines = [
        ...state.machines.filter(m => !(m.x === startPos.x && m.y === startPos.y)),
        ...pieces.map(p => ({ type: p.type, rotate: p.rotate, x: p.x, y: p.y })),
      ]
      const last = path[path.length - 1]
      const prev2 = path[path.length - 2]
      const lastDir: Dir = prev2.x === last.x ? (prev2.y < last.y ? 'S' : 'N') : (prev2.x < last.x ? 'E' : 'W')
      return {
        machines,
        beltStartPos: { x: action.x, y: action.y },
        beltStartDir: OPPOSITE[lastDir],
      }
    }
    case 'PLACE_MACHINE':
      return {
        ...state,
        machines: [...state.machines, { type: action.machineType, rotate: action.rotate, x: action.x, y: action.y }],
      }
    case 'RESET_BELT':
      return { ...state, beltStartPos: null, beltStartDir: null }
  }
}

function App() {
  const stageRef = useRef<StageType | null>(null)
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  })
  const [state, dispatch] = useReducer(appReducer, { machines: [], beltStartPos: null, beltStartDir: null })
  const [placingMachine, setPlacingMachine] = useState<string | null>(null)
  const [previewPosition, setPreviewPosition] = useState<{ x: number; y: number } | null>(null)
  const [placingRotation, setPlacingRotation] = useState(0)
  const [beltEndPos, setBeltEndPos] = useState<{ x: number; y: number } | null>(null)
  const [beltPreviewPieces, setBeltPreviewPieces] = useState<Array<{ x: number; y: number; type: string; rotate: number }> | null>(null)
  const [beltStartPreview, setBeltStartPreview] = useState<{ x: number; y: number; dir: Dir } | null>(null)
  const [simRunning, setSimRunning] = useState(false)
  const [simTimeScale, setSimTimeScale] = useState(1)
  const [beltItems, setBeltItems] = useState<Map<string, string | null>>(new Map())
  const [storageDialog, setStorageDialog] = useState<{ machineIdx: number; storage: ({ id: string; amount: number } | null)[] } | null>(null)
  const [emulatorType, setEmulatorType] = useState('default')
  const emulatorRef = useRef<IEmulator | null>(null)

  const allMachines = machineRegistry.getAll()

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPlacingMachine(null)
        setPreviewPosition(null)
        dispatch({ type: 'RESET_BELT' })
        setBeltEndPos(null)
        setBeltStartPreview(null)
        if (stageRef.current) {
          stageRef.current.container().style.cursor = 'default'
        }
      }
      if (e.key === 'r' || e.key === 'R') {
        if (placingMachine) {
          setPlacingRotation(prev => (prev + 90) % 360)
        }
      }
      if (e.key === 'e' || e.key === 'E') {
        setPlacingMachine('belt')
        setPreviewPosition(null)
        setPlacingRotation(0)
        dispatch({ type: 'RESET_BELT' })
        setBeltEndPos(null)
        if (stageRef.current) {
          stageRef.current.container().focus()
        }
      }
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [placingMachine, stageRef])

  const simRunningRef = useRef(simRunning)
  const simTimeScaleRef = useRef(simTimeScale)
  useEffect(() => {
    simRunningRef.current = simRunning
  }, [simRunning])
  useEffect(() => {
    simTimeScaleRef.current = simTimeScale
  }, [simTimeScale])

  useEffect(() => {
    const entry = emulatorRegistry.get(emulatorType)
    if (!entry) return
    const emulator = new entry.ctor(state.machines)
    emulatorRef.current = emulator
    emulator.onTick = (items) => {
      setBeltItems(new Map(items))
    }
    setBeltItems(new Map(emulator.getItemMap())) // eslint-disable-line react-hooks/set-state-in-effect
    if (simRunningRef.current) {
      emulator.setTimeScale(simTimeScaleRef.current)
      emulator.start()
    }
    return () => {
      emulator.stop()
    }
  }, [state.machines, emulatorType])

  useEffect(() => {
    const emulator = emulatorRef.current
    if (!emulator) return
    if (simRunning) {
      emulator.setTimeScale(simTimeScale)
      emulator.start()
    } else {
      emulator.stop()
    }
  }, [simRunning, simTimeScale])

  useEffect(() => {
    return () => {
      emulatorRef.current?.stop()
    }
  }, [])

  const gridWidth = GRID_COLS * CELL_SIZE
  const gridHeight = GRID_ROWS * CELL_SIZE
  const offsetX = (dimensions.width - gridWidth) / 2
  const offsetY = (dimensions.height - gridHeight) / 2

  const handleCenterView = () => {
    if (stageRef.current) {
      stageRef.current.position({ x: 0, y: 0 })
      stageRef.current.scale({ x: 1, y: 1 })
      stageRef.current.batchDraw()
    }
  }

  const handleWheel = (e: unknown) => {
    const evt = (e as { evt: WheelEvent }).evt
    evt.preventDefault()
    const stage = stageRef.current
    if (!stage) return

    const oldScale = stage.scaleX()
    const pointer = stage.getPointerPosition()
    if (!pointer) return

    const scaleBy = 1.1
    const newScale = evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    }

    stage.scale({ x: newScale, y: newScale })
    stage.position({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    })
    stage.batchDraw()
  }

  const handleSimToggle = () => {
    setSimRunning(prev => !prev)
  }

  const handleSimSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSimTimeScale(Number(e.target.value))
  }

  const handleEmulatorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setEmulatorType(e.target.value)
  }

  const handleSelectMachine = (type: string) => {
    setPlacingMachine(type)
    setPreviewPosition(null)
    setPlacingRotation(0)
    dispatch({ type: 'RESET_BELT' })
    setBeltEndPos(null)
    setBeltStartPreview(null)
    if (stageRef.current) {
      stageRef.current.container().focus()
    }
  }

  const handleMouseMove = () => {
    if (!stageRef.current) return

    const pointer = stageRef.current.getPointerPosition()
    if (!pointer) return

    const stagePos = stageRef.current.position()
    const stageScale = stageRef.current.scaleX()

    const stageX = (pointer.x - stagePos.x) / stageScale
    const stageY = (pointer.y - stagePos.y) / stageScale
    const x = Math.floor((stageX - offsetX) / CELL_SIZE)
    const y = Math.floor((stageY - offsetY) / CELL_SIZE)

    if (x >= 0 && x < GRID_COLS && y >= 0 && y < GRID_ROWS) {
      setPreviewPosition({ x, y })
      if (!placingMachine) return
      if (placingMachine === 'belt' && state.beltStartPos) {
        const snap = findAdjacentInPort(x, y, state.machines, ['S', 'E', 'N', 'W'])
        const endX = snap ? snap.x : x
        const endY = snap ? snap.y : y
        setBeltEndPos({ x: endX, y: endY })
        const path = findPath(state.beltStartPos.x, state.beltStartPos.y, endX, endY, state.machines, true)
        if (path) {
          const pieces = computeBeltPathPieces(path, state.beltStartDir!, undefined, state.machines)
          setBeltPreviewPieces(pieces)
          stageRef.current.container().style.cursor = 'default'
        } else {
          setBeltPreviewPieces(null)
          stageRef.current.container().style.cursor = 'not-allowed'
        }
        return
      }
      if (placingMachine === 'belt' && !state.beltStartPos) {
        setBeltEndPos(null)
        setBeltPreviewPieces(null)
        const existingBelt = state.machines.find(
          m => m.x === x && m.y === y && (m.type === 'belt' || m.type.startsWith('belt_corner'))
        )
        if (existingBelt) {
          const def = machineRegistry.get(existingBelt.type)
          const inPort = def?.ports.find(p => p.port === 'IN')
          const entryDir = inPort ? rotateDir(inPort.direction, existingBelt.rotate) : 'N'
          setBeltStartPreview({ x, y, dir: entryDir })
          stageRef.current.container().style.cursor = 'default'
          return
        }
        const machinePort = findMachineOutPort(x, y, state.machines)
        if (machinePort) {
          setBeltStartPreview({ x: machinePort.outX, y: machinePort.outY, dir: machinePort.dir })
          stageRef.current.container().style.cursor = 'default'
          return
        }
        const result = findAdjacentOutPort(x, y, state.machines, ['S', 'E', 'N', 'W'])
        if (result) {
          setBeltStartPreview({ x, y, dir: result.dir })
          stageRef.current.container().style.cursor = 'default'
        } else {
          setBeltStartPreview(null)
          stageRef.current.container().style.cursor = 'not-allowed'
        }
        return
      }
      const allowed = canPlaceMachine(placingMachine, x, y, placingRotation, state.machines)
      stageRef.current.container().style.cursor = allowed ? 'default' : 'not-allowed'
    } else {
      stageRef.current.container().style.cursor = 'not-allowed'
      setBeltStartPreview(null)
    }
  }

  const handleClick = () => {
    if (!placingMachine || !previewPosition) {
      if (!placingMachine && previewPosition && stageRef.current) {
        const x = previewPosition.x
        const y = previewPosition.y
        const clickedMachine = state.machines.findIndex(
          m => m.type === 'storage_box' && (() => {
            const def = machineRegistry.get(m.type)
            if (!def) return false
            const w = m.rotate % 180 === 0 ? def.width : def.height
            const h = m.rotate % 180 === 0 ? def.height : def.width
            for (let dx = 0; dx < w; dx++) {
              for (let dy = 0; dy < h; dy++) {
                if (m.x + dx === x && m.y + dy === y) return true
              }
            }
            return false
          })()
        )
        if (clickedMachine !== -1 && emulatorRef.current) {
          const m = emulatorRef.current.machines[clickedMachine]
          setStorageDialog({
            machineIdx: clickedMachine,
            storage: m.inventory.storage.map(s => s ? { ...s } : null),
          })
        }
      }
      return
    }

    if (placingMachine === 'belt') {
      const x = previewPosition.x
      const y = previewPosition.y

      if (!state.beltStartPos) {
        const existingBelt = state.machines.find(
          m => m.x === x && m.y === y && (m.type === 'belt' || m.type.startsWith('belt_corner'))
        )
        if (existingBelt) {
          const def = machineRegistry.get(existingBelt.type)
          const inPort = def?.ports.find(p => p.port === 'IN')
          const entryDir = inPort ? rotateDir(inPort.direction, existingBelt.rotate) : 'N'
          dispatch({ type: 'BELT_SET_START', pos: { x, y }, dir: entryDir })
        } else {
          const machinePort = findMachineOutPort(x, y, state.machines)
          if (machinePort) {
            dispatch({ type: 'BELT_SET_START', pos: { x: machinePort.outX, y: machinePort.outY }, dir: machinePort.dir })
          } else {
            const result = findAdjacentOutPort(x, y, state.machines, ['S', 'E', 'N', 'W'])
            if (result) {
              dispatch({ type: 'BELT_SET_START', pos: { x, y }, dir: result.dir })
            }
          }
        }
      } else {
        const snap = findAdjacentInPort(x, y, state.machines, ['S', 'E', 'N', 'W'])
        const endX = snap ? snap.x : x
        const endY = snap ? snap.y : y
        const path = findPath(state.beltStartPos.x, state.beltStartPos.y, endX, endY, state.machines, true)
        if (!path) return
        dispatch({ type: 'BELT_PLACE', x: endX, y: endY })
        if (snap) {
          dispatch({ type: 'RESET_BELT' })
          setPlacingMachine(null)
          setPreviewPosition(null)
          setBeltEndPos(null)
          setBeltPreviewPieces(null)
          if (stageRef.current) {
            stageRef.current.container().style.cursor = 'default'
          }
        }
      }
      return
    }

    if (!canPlaceMachine(placingMachine, previewPosition.x, previewPosition.y, placingRotation, state.machines)) {
      return
    }

    dispatch({ type: 'PLACE_MACHINE', machineType: placingMachine, rotate: placingRotation, x: previewPosition.x, y: previewPosition.y })

    setPlacingMachine(null)
    setPreviewPosition(null)
    if (stageRef.current) {
      stageRef.current.container().style.cursor = 'default'
    }
  }

  const lines = []

  // Grid background
  lines.push(
    <Rect
      key="grid-bg"
      x={offsetX}
      y={offsetY}
      width={gridWidth}
      height={gridHeight}
      fill="#7f7f7f"
    />
  )

  // Vertical lines
  for (let i = 0; i <= GRID_COLS; i++) {
    const x = offsetX + i * CELL_SIZE
    lines.push(
      <Line
        key={`v-${i}`}
        points={[x, offsetY, x, offsetY + gridHeight]}
        stroke="#333"
        strokeWidth={1}
      />
    )
  }

  // Horizontal lines
  for (let j = 0; j <= GRID_ROWS; j++) {
    const y = offsetY + j * CELL_SIZE
    lines.push(
      <Line
        key={`h-${j}`}
        points={[offsetX, y, offsetX + gridWidth, y]}
        stroke="#333"
        strokeWidth={1}
      />
    )
  }

  const machines = state.machines.map((placedMachine, index) => {
    const definition = machineRegistry.get(placedMachine.type)
    if (!definition) return null

    const x = offsetX + placedMachine.x * CELL_SIZE
    const y = offsetY + placedMachine.y * CELL_SIZE

    return (
      <MachineImage
        key={`machine-${index}`}
        definition={definition}
        x={x}
        y={y}
        rotation={placedMachine.rotate}
        cellSize={CELL_SIZE}
        showPortLabels={false}
      />
    )
  })

  const placingDefinition = placingMachine
    ? machineRegistry.get(placingMachine)
    : null
  const isPreviewValid = placingMachine && placingMachine !== 'belt' && previewPosition
    ? canPlaceMachine(placingMachine, previewPosition.x, previewPosition.y, placingRotation, state.machines)
    : true
  const previewMachine = placingDefinition && previewPosition && placingMachine !== 'belt' ? (
    <MachineImage
      definition={placingDefinition}
      x={offsetX + previewPosition.x * CELL_SIZE}
      y={offsetY + previewPosition.y * CELL_SIZE}
      rotation={placingRotation}
      opacity={0.5}
      cellSize={CELL_SIZE}
      invalid={!isPreviewValid}
      showPortLabels={true}
    />
  ) : null

  const beltPreviewMachines = placingMachine === 'belt' && state.beltStartPos && beltPreviewPieces ? (
    beltPreviewPieces.map((piece, idx) => {
      const def = machineRegistry.get(piece.type)
      if (!def) return null
      return (
        <MachineImage
          key={`belt-preview-${idx}`}
          definition={def}
          x={offsetX + piece.x * CELL_SIZE}
          y={offsetY + piece.y * CELL_SIZE}
          rotation={piece.rotate}
          opacity={0.5}
          cellSize={CELL_SIZE}
        />
      )
    })
  ) : null

  const beltItemElements = state.machines.map((m, idx) => {
    if (m.type !== 'belt' && !m.type.startsWith('belt_corner')) return null
    const cellKey = `${m.x},${m.y}`
    const itemId = beltItems.get(cellKey)
    if (!itemId) return null
    return (
      <>
        <Rect
          key={`belt-item-bg-${idx}`}
          x={offsetX + m.x * CELL_SIZE + CELL_SIZE / 4}
          y={offsetY + m.y * CELL_SIZE + CELL_SIZE / 4}
          width={CELL_SIZE / 2}
          height={CELL_SIZE / 2}
          fill="#ffcc00"
          cornerRadius={4}
          shadowColor="black"
          shadowBlur={4}
          shadowOpacity={0.5}
        />
        <Text
          key={`belt-item-${idx}`}
          x={offsetX + m.x * CELL_SIZE}
          y={offsetY + m.y * CELL_SIZE}
          width={CELL_SIZE}
          height={CELL_SIZE}
          text={itemId}
          fontSize={11}
          fontStyle="bold"
          fill="#000"
          align="center"
          verticalAlign="middle"
        />
      </>
    )
  })

  const beltStartIndicator = placingMachine === 'belt' && state.beltStartPos && !beltEndPos ? (
    <Rect
      x={offsetX + state.beltStartPos.x * CELL_SIZE + 2}
      y={offsetY + state.beltStartPos.y * CELL_SIZE + 2}
      width={CELL_SIZE - 4}
      height={CELL_SIZE - 4}
      fill="rgba(0, 150, 255, 0.3)"
      stroke="rgba(0, 150, 255, 0.8)"
      strokeWidth={2}
    />
  ) : null

  const beltStartPreviewEl = placingMachine === 'belt' && !state.beltStartPos && beltStartPreview ? (
    <Rect
      x={offsetX + beltStartPreview.x * CELL_SIZE + 2}
      y={offsetY + beltStartPreview.y * CELL_SIZE + 2}
      width={CELL_SIZE - 4}
      height={CELL_SIZE - 4}
      fill="rgba(0, 200, 0, 0.3)"
      stroke="rgba(0, 200, 0, 0.8)"
      strokeWidth={2}
    />
  ) : null

  return (
    <>
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        draggable={!placingMachine}
        onWheel={handleWheel}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
      >
        <Layer>
          {lines}
          {machines}
          {beltItemElements}
          {previewMachine}
          {beltStartIndicator}
          {beltStartPreviewEl}
          {beltPreviewMachines}
        </Layer>
      </Stage>
      <div className="bottom-panel">
        <button className="tool-button" onClick={handleCenterView}>
          居中
        </button>
        {allMachines.filter(m => m.type !== 'belt_corner_en' && m.type !== 'belt_corner_ne').map(machine => (
          <ToolButton
            key={machine.type}
            definition={machine}
            isActive={placingMachine === machine.type}
            isPlacing={placingMachine === machine.type}
            onClick={() => handleSelectMachine(machine.type)}
          />
        ))}
        <div className="sim-controls">
          <button className="tool-button" onClick={handleSimToggle}>
            {simRunning ? '⏸ 暂停' : '▶ 运行'}
          </button>
          <label className="speed-label">
            速度: {Number(simTimeScale).toFixed(3)}x
            <input
              type="range"
              min="0.001"
              max="2"
              step="0.001"
               value={simTimeScale}
               onChange={handleSimSpeedChange}
               onDoubleClick={() => setSimTimeScale(1)}
               className="speed-slider"
            />
          </label>
          <select className="emulator-select" value={emulatorType} onChange={handleEmulatorChange}>
            {emulatorRegistry.getAll().map(e => (
              <option key={e.type} value={e.type}>{e.name}</option>
            ))}
          </select>
        </div>
      </div>
      {storageDialog && (
        <StorageDialog
          machineIdx={storageDialog.machineIdx}
          initialStorage={storageDialog.storage}
          emulatorRef={emulatorRef}
          onClose={() => {
            if (emulatorRef.current) {
              setBeltItems(new Map(emulatorRef.current.getItemMap()))
            }
            setStorageDialog(null)
          }}
        />
      )}

    </>
  )
}

export default App

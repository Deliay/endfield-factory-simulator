/* eslint-disable @typescript-eslint/no-unused-vars, react-refresh/only-export-components */
import { useState, useEffect, useRef } from 'react'
import { Stage, Layer, Line, Rect } from 'react-konva'
import type { Stage as StageType } from 'konva/lib/Stage'
import { machineRegistry } from './types/Machine'
import type { Factory, PlacedMachine } from './types/Factory'
import { MachineImage } from './components/MachineImage'
import { ToolButton } from './components/ToolButton'
import { rotateDir, type Dir } from './utils/rotation'
import './machines/belt'
import './machines/storage_box'

const GRID_COLS = 16
const GRID_ROWS = 16
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

class NotImplementedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotImplementedError'
  }
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

export function computeBeltPathPieces(
  path: { x: number; y: number }[],
  startDir: Dir,
  existingAtStart: PlacedMachine | undefined,
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
      exitDir = OPPOSITE[currentDir]
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

// Module-level mutable state for belt placement (avoids React stale closure in event handlers)

function App() {
  const stageRef = useRef<StageType>(null)
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  })
  const [factory, setFactory] = useState<Factory>({
    machines: [],
  })
  const [placingMachine, setPlacingMachine] = useState<string | null>(null)
  const [previewPosition, setPreviewPosition] = useState<{ x: number; y: number } | null>(null)
  const [placingRotation, setPlacingRotation] = useState(0)
  const [beltStartPos, setBeltStartPos] = useState<{ x: number; y: number } | null>(null)
  const [beltStartDir, setBeltStartDir] = useState<Dir | null>(null)
  const [beltEndPos, setBeltEndPos] = useState<{ x: number; y: number } | null>(null)
  const [beltPreviewPieces, setBeltPreviewPieces] = useState<Array<{ x: number; y: number; type: string; rotate: number }> | null>(null)
  // Refs for event handlers — avoids React 18 batching stale closure
  const beltStartPosRef = useRef(beltStartPos)
  const beltStartDirRef = useRef(beltStartDir)
  // Helpers that update ref and state synchronously (for use in event handlers only)
  const sp = (pos: typeof beltStartPos) => { beltStartPosRef.current = pos; setBeltStartPos(pos) }
  const sd = (dir: typeof beltStartDir) => { beltStartDirRef.current = dir; setBeltStartDir(dir) }

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
        sp(null)
        sd(null)
        setBeltEndPos(null)
        if (stageRef.current) {
          stageRef.current.container().style.cursor = 'default'
        }
      }
      if (e.key === 'r' || e.key === 'R') {
        if (placingMachine) {
          setPlacingRotation(prev => {
            return (prev + 90) % 360
          })
        }
      }
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [placingMachine])

  const gridWidth = GRID_COLS * CELL_SIZE
  const gridHeight = GRID_ROWS * CELL_SIZE
  const offsetX = (dimensions.width - gridWidth) / 2
  const offsetY = (dimensions.height - gridHeight) / 2

  const handleCenterView = () => {
    if (stageRef.current) {
      stageRef.current.position({ x: 0, y: 0 })
      stageRef.current.batchDraw()
    }
  }

  const handleSelectMachine = (type: string) => {
    setPlacingMachine(type)
    setPreviewPosition(null)
    setPlacingRotation(0)
    if (stageRef.current) {
      stageRef.current.container().focus()
    }
  }

  const handleMouseMove = () => {
    if (!placingMachine || !stageRef.current) return

    const stage = stageRef.current
    const pointer = stage.getPointerPosition()
    if (!pointer) return

    const stagePos = stage.position()
    const stageScale = stage.scaleX()

    const x = Math.floor((pointer.x - stagePos.x - offsetX) / (CELL_SIZE * stageScale))
    const y = Math.floor((pointer.y - stagePos.y - offsetY) / (CELL_SIZE * stageScale))

    if (x >= 0 && x < GRID_COLS && y >= 0 && y < GRID_ROWS) {
      setPreviewPosition({ x, y })
      if (placingMachine === 'belt' && beltStartPosRef.current) {
        setBeltEndPos({ x, y })
        const path = findPath(beltStartPosRef.current.x, beltStartPosRef.current.y, x, y, factory.machines, true)
        if (path) {
          const pieces = computeBeltPathPieces(path, beltStartDirRef.current!, undefined)
          setBeltPreviewPieces(pieces)
        } else {
          setBeltPreviewPieces(null)
        }
      }
      const allowed = canPlaceMachine(placingMachine, x, y, placingRotation, factory.machines)
      stage.container().style.cursor = allowed ? 'default' : 'not-allowed'
    } else {
      stage.container().style.cursor = 'not-allowed'
    }
  }

  const handleClick = () => {
    if (!placingMachine || !previewPosition) return

    if (placingMachine === 'belt') {
      const x = previewPosition.x
      const y = previewPosition.y

      if (!beltStartPosRef.current) {
        const existingBelt = factory.machines.find(
          m => m.x === x && m.y === y && (m.type === 'belt' || m.type.startsWith('belt_corner'))
        )
        if (existingBelt) {
          const def = machineRegistry.get(existingBelt.type)
          const inPort = def?.ports.find(p => p.port === 'IN')
          const entryDir = inPort ? rotateDir(inPort.direction, existingBelt.rotate) : 'N'
          sp({ x, y })
          sd(entryDir)
        } else {
          const machinePort = findMachineOutPort(x, y, factory.machines)
          if (machinePort) {
            sp({ x: machinePort.outX, y: machinePort.outY })
            sd(machinePort.dir)
          } else {
            const result = findAdjacentOutPort(x, y, factory.machines, ['S', 'E', 'N', 'W'])
            if (result) {
              sp({ x, y })
              sd(result.dir)
            }
          }
        }
      } else {
        const path = findPath(beltStartPosRef.current!.x, beltStartPosRef.current!.y, x, y, factory.machines, true)
        if (path) {
          const startPos = path[0]
          setFactory(prev => {
            const existingAtStart = prev.machines.find(
              m => m.x === startPos.x && m.y === startPos.y
            )
            const pieces = computeBeltPathPieces(path, beltStartDirRef.current!, existingAtStart)
            return {
              ...prev,
              machines: [
                ...prev.machines.filter(m => !(m.x === startPos.x && m.y === startPos.y)),
                ...pieces.map(p => ({ type: p.type, rotate: p.rotate, x: p.x, y: p.y })),
              ],
            }
          })
          const last = path[path.length - 1]
          const prev2 = path[path.length - 2]
          const lastDir: Dir = prev2.x === last.x
            ? (prev2.y < last.y ? 'S' : 'N')
            : (prev2.x < last.x ? 'E' : 'W')
          sp({ x, y })
          sd(OPPOSITE[lastDir])
        }
      }
      return
    }

    if (!canPlaceMachine(placingMachine, previewPosition.x, previewPosition.y, placingRotation, factory.machines)) {
      return
    }

    setFactory(prev => ({
      ...prev,
      machines: [
        ...prev.machines,
        {
          type: placingMachine,
          rotate: placingRotation,
          x: previewPosition.x,
          y: previewPosition.y,
        },
      ],
    }))

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

  const machines = factory.machines.map((placedMachine, index) => {
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
        showPortLabels={true}
      />
    )
  })

  const placingDefinition = placingMachine
    ? machineRegistry.get(placingMachine)
    : null
  const isPreviewValid = placingMachine && placingMachine !== 'belt' && previewPosition
    ? canPlaceMachine(placingMachine, previewPosition.x, previewPosition.y, placingRotation, factory.machines)
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

  const beltPreviewMachines = placingMachine === 'belt' && beltStartPos && beltPreviewPieces ? (
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

  const beltStartIndicator = placingMachine === 'belt' && beltStartPos && !beltEndPos ? (
    <Rect
      x={offsetX + beltStartPos.x * CELL_SIZE + 2}
      y={offsetY + beltStartPos.y * CELL_SIZE + 2}
      width={CELL_SIZE - 4}
      height={CELL_SIZE - 4}
      fill="rgba(0, 150, 255, 0.3)"
      stroke="rgba(0, 150, 255, 0.8)"
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
        onMouseMove={handleMouseMove}
        onClick={handleClick}
      >
        <Layer>
          {lines}
          {machines}
          {previewMachine}
          {beltStartIndicator}
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
      </div>
    </>
  )
}

export default App

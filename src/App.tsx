import { useState, useEffect, useRef, type ReactNode } from 'react'
import { Stage, Layer, Line, Rect } from 'react-konva'
import type { Stage as StageType } from 'konva/lib/Stage'
import { machineRegistry } from './types/Machine'
import type { Factory, PlacedMachine } from './types/Factory'
import { MachineImage } from './components/MachineImage'
import { ToolButton } from './components/ToolButton'
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

type Dir = 'N' | 'S' | 'E' | 'W'

function isCellOccupied(x: number, y: number, existing: PlacedMachine[]): boolean {
  for (const pm of existing) {
    const occupied = getOccupiedCellsByMachine(pm)
    if (occupied.has(`${x},${y}`)) return true
  }
  return false
}

function findAdjacentOutPort(
  targetX: number, targetY: number,
  existing: PlacedMachine[],
  priority: Dir[],
): { dir: Dir } | null {
  const allDirs: Dir[] = ['N', 'E', 'S', 'W']
  const candidates: { dir: Dir }[] = []
  for (const pm of existing) {
    const def = machineRegistry.get(pm.type)
    if (!def) continue
    const cx = (def.width - 1) / 2
    const cy = (def.height - 1) / 2
    for (const port of def.ports) {
      if (port.port !== 'OUT') continue
      let localX = port.x
      let localY = port.y
      let orientation = port.orientation as Dir
      if (pm.rotate % 360 !== 0) {
        const steps = ((pm.rotate % 360) + 360) % 360 / 90
        for (let i = 0; i < steps; i++) {
          const relX = localX - cx
          const relY = localY - cy
          const newX = cx - relY
          const newY = cy + relX
          localX = newX
          localY = newY
        }
        const idx = allDirs.indexOf(orientation)
        orientation = allDirs[(idx + pm.rotate / 90) % 4]
      }
      const portWorldX = pm.x + localX
      const portWorldY = pm.y + localY
      let dir: Dir | null = null
      if (orientation === 'E' && portWorldX + 1 === targetX && portWorldY === targetY) dir = 'W'
      else if (orientation === 'W' && portWorldX - 1 === targetX && portWorldY === targetY) dir = 'E'
      else if (orientation === 'S' && portWorldX === targetX && portWorldY + 1 === targetY) dir = 'N'
      else if (orientation === 'N' && portWorldX === targetX && portWorldY - 1 === targetY) dir = 'S'
      if (dir) candidates.push({ dir })
    }
  }
  if (candidates.length === 0) return null
  for (const p of priority) {
    const found = candidates.find(c => c.dir === p)
    if (found) return found
  }
  return candidates[0]
}

function findPath(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  existing: PlacedMachine[],
  excludeStart: boolean,
): { x: number; y: number }[] | null {
  if (startX === endX && startY === endY) return null
  if (startX !== endX && startY !== endY) {
    const path1 = buildLPath(startX, startY, endX, endY, true)
    if (path1 && isPathClear(path1, existing, excludeStart ? `${startX},${startY}` : null)) return path1
    const path2 = buildLPath(startX, startY, endX, endY, false)
    if (path2 && isPathClear(path2, existing, excludeStart ? `${startX},${startY}` : null)) return path2
    return null
  }
  const path = buildStraightPath(startX, startY, endX, endY)
  if (!isPathClear(path, existing, excludeStart ? `${startX},${startY}` : null)) return null
  return path
}

function buildStraightPath(sx: number, sy: number, ex: number, ey: number): { x: number; y: number }[] {
  const path: { x: number; y: number }[] = []
  if (sx === ex) {
    const step = sy < ey ? 1 : -1
    for (let y = sy; y !== ey + step; y += step) path.push({ x: sx, y })
  } else {
    const step = sx < ex ? 1 : -1
    for (let x = sx; x !== ex + step; x += step) path.push({ x, y: sy })
  }
  return path
}

function buildLPath(sx: number, sy: number, ex: number, ey: number, horizFirst: boolean): { x: number; y: number }[] | null {
  if (horizFirst) {
    if (sx === ex || sy === ey) return null
    const path: { x: number; y: number }[] = []
    const xStep = sx < ex ? 1 : -1
    for (let x = sx; x !== ex + xStep; x += xStep) path.push({ x, y: sy })
    const yStep = sy < ey ? 1 : -1
    for (let y = sy + yStep; y !== ey + yStep; y += yStep) path.push({ x: ex, y })
    return path
  } else {
    if (sx === ex || sy === ey) return null
    const path: { x: number; y: number }[] = []
    const yStep = sy < ey ? 1 : -1
    for (let y = sy; y !== ey + yStep; y += yStep) path.push({ x: sx, y })
    const xStep = sx < ex ? 1 : -1
    for (let x = sx + xStep; x !== ex + xStep; x += xStep) path.push({ x, y: ey })
    return path
  }
}

function isPathClear(path: { x: number; y: number }[], existing: PlacedMachine[], excludeKey: string | null): boolean {
  for (const cell of path) {
    if (excludeKey && `${cell.x},${cell.y}` === excludeKey) continue
    if (cell.x < 0 || cell.y < 0 || cell.x >= GRID_COLS || cell.y >= GRID_ROWS) return false
    if (isCellOccupied(cell.x, cell.y, existing)) return false
  }
  return true
}

function getDirectionRotation(dx: number, dy: number): number {
  if (dx === 1 && dy === 0) return 0
  if (dx === 0 && dy === 1) return 90
  if (dx === -1 && dy === 0) return 180
  return 270
}

function getCornerTypeAndRotation(curDir: Dir, nextDir: Dir): { type: string; rotate: number } | null {
  const opposite: Record<Dir, Dir> = { N: 'S', S: 'N', E: 'W', W: 'E' }
  const inDir = opposite[curDir]
  const key = `${inDir}→${nextDir}`
  const lookup: Record<string, { type: string; rotate: number }> = {
    'S→E': { type: 'belt_corner_wn', rotate: 90 },
    'N→E': { type: 'belt_corner_nw', rotate: 180 },
    'E→N': { type: 'belt_corner_wn', rotate: 0 },
    'W→S': { type: 'belt_corner_wn', rotate: 180 },
    'S→W': { type: 'belt_corner_nw', rotate: 0 },
    'N→W': { type: 'belt_corner_wn', rotate: 270 },
    'E→S': { type: 'belt_corner_nw', rotate: 270 },
    'W→N': { type: 'belt_corner_nw', rotate: 90 },
  }
  return lookup[key] ?? null
}

const DIR_DX: Record<Dir, number> = { E: 1, W: -1, N: 0, S: 0 }
const DIR_DY: Record<Dir, number> = { E: 0, W: 0, N: -1, S: 1 }

type BeltPiece = { x: number; y: number; type: string; rotate: number }

function computeBeltPathPieces(
  path: { x: number; y: number }[],
  startDir: Dir,
  existingAtStart: PlacedMachine | undefined,
): BeltPiece[] {
  const result: BeltPiece[] = []
  const allDirs: Dir[] = ['N', 'E', 'S', 'W']

  for (let i = 0; i < path.length; i++) {
    const cell = path[i]
    if (i === 0) {
      const firstDir: Dir = path.length > 1
        ? (() => {
            const d = { x: path[1].x - path[0].x, y: path[1].y - path[0].y }
            return d.x === 1 ? 'E' : d.x === -1 ? 'W' : d.y === 1 ? 'S' : 'N'
          })()
        : startDir

      if (existingAtStart && firstDir !== startDir) {
        const corner = getCornerTypeAndRotation(startDir, firstDir)
        if (corner) {
          result.push({ x: cell.x, y: cell.y, type: corner.type, rotate: corner.rotate })
          continue
        }
      }

      const rot = ((allDirs.indexOf(startDir) - allDirs.indexOf('E') + 4) % 4) * 90
      result.push({ x: cell.x, y: cell.y, type: 'belt', rotate: rot })
    } else {
      const prev = path[i - 1]
      const d = { x: cell.x - prev.x, y: cell.y - prev.y }
      const curDir: Dir = d.x === 1 ? 'E' : d.x === -1 ? 'W' : d.y === 1 ? 'S' : 'N'

      if (i < path.length - 1) {
        const next = path[i + 1]
        const nextD = { x: next.x - cell.x, y: next.y - cell.y }
        const nextDir: Dir = nextD.x === 1 ? 'E' : nextD.x === -1 ? 'W' : nextD.y === 1 ? 'S' : 'N'

        if (nextDir !== curDir) {
          const corner = getCornerTypeAndRotation(curDir, nextDir)
          if (corner) {
            result.push({ x: cell.x, y: cell.y, type: corner.type, rotate: corner.rotate })
            continue
          }
        }
      }

      const rot = getDirectionRotation(d.x, d.y)
      result.push({ x: cell.x, y: cell.y, type: 'belt', rotate: rot })
    }
  }
  return result
}

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
        setBeltStartPos(null)
        setBeltStartDir(null)
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
    setBeltStartPos(null)
    setBeltStartDir(null)
    setBeltEndPos(null)
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

    if (placingMachine === 'belt') {
      if (x >= 0 && x < GRID_COLS && y >= 0 && y < GRID_ROWS) {
        if (!beltStartPos) {
          setPreviewPosition({ x, y })
          const hasOut = !!findAdjacentOutPort(x, y, factory.machines, ['S', 'E', 'N', 'W'])
          if (!hasOut) {
            const clickedMachine = factory.machines.find(pm => {
              const def = machineRegistry.get(pm.type)
              if (!def) return false
              const w = pm.rotate % 180 === 0 ? def.width : def.height
              const h = pm.rotate % 180 === 0 ? def.height : def.width
              return x >= pm.x && x < pm.x + w && y >= pm.y && y < pm.y + h
            })
            if (clickedMachine) {
              const def = machineRegistry.get(clickedMachine.type)
              const hasOutPort = def?.ports.some(p => p.port === 'OUT')
              stage.container().style.cursor = hasOutPort ? 'default' : 'not-allowed'
            } else {
              stage.container().style.cursor = 'not-allowed'
            }
          } else {
            stage.container().style.cursor = 'default'
          }
        } else {
          setBeltEndPos({ x, y })
          const path = findPath(beltStartPos.x, beltStartPos.y, x, y, factory.machines, true)
          stage.container().style.cursor = path ? 'default' : 'not-allowed'
        }
      } else {
        stage.container().style.cursor = 'not-allowed'
      }
      return
    }

    if (x >= 0 && x < GRID_COLS && y >= 0 && y < GRID_ROWS) {
      setPreviewPosition({ x, y })
      const allowed = canPlaceMachine(placingMachine, x, y, placingRotation, factory.machines)
      stage.container().style.cursor = allowed ? 'default' : 'not-allowed'
    } else {
      stage.container().style.cursor = 'not-allowed'
    }
  }

  const handleClick = () => {
    if (!placingMachine || !previewPosition) return

    if (placingMachine === 'belt') {
      handleBeltClick()
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

  const handleBeltClick = () => {
    if (!previewPosition) return

    if (!beltStartPos) {
      const existingBelt = factory.machines.find(
        pm => pm.x === previewPosition.x && pm.y === previewPosition.y &&
          (pm.type === 'belt' || pm.type === 'belt_corner_wn' || pm.type === 'belt_corner_nw'),
      )
      if (existingBelt) {
        const def = machineRegistry.get(existingBelt.type)
        if (def) {
          const outPort = def.ports.find(p => p.port === 'OUT')
          if (outPort) {
            let outDir: Dir = outPort.orientation as Dir
            if (existingBelt.rotate % 360 !== 0) {
              const allDirs: Dir[] = ['N', 'E', 'S', 'W']
              const idx = allDirs.indexOf(outDir)
              outDir = allDirs[(idx + existingBelt.rotate / 90) % 4]
            }
            setBeltStartPos(previewPosition)
            setBeltStartDir(outDir)
            return
          }
        }
      }

      const clickedMachine = factory.machines.find(pm => {
        const def = machineRegistry.get(pm.type)
        if (!def) return false
        const w = pm.rotate % 180 === 0 ? def.width : def.height
        const h = pm.rotate % 180 === 0 ? def.height : def.width
        return previewPosition.x >= pm.x && previewPosition.x < pm.x + w &&
          previewPosition.y >= pm.y && previewPosition.y < pm.y + h
      })
      if (clickedMachine) {
        const def = machineRegistry.get(clickedMachine.type)
        if (def) {
          const allDirs: Dir[] = ['N', 'E', 'S', 'W']
          const candidates: { dir: Dir; x: number; y: number; portX: number; portY: number }[] = []
          const cx = (def.width - 1) / 2
          const cy = (def.height - 1) / 2
          for (const port of def.ports) {
            if (port.port !== 'OUT') continue
            let localX = port.x
            let localY = port.y
            let dir: Dir = port.orientation as Dir
            if (clickedMachine.rotate % 360 !== 0) {
              const steps = ((clickedMachine.rotate % 360) + 360) % 360 / 90
              for (let i = 0; i < steps; i++) {
                const relX = localX - cx
                const relY = localY - cy
                const newX = cx - relY
                const newY = cy + relX
                localX = newX
                localY = newY
              }
              const idx = allDirs.indexOf(dir)
              dir = allDirs[(idx + clickedMachine.rotate / 90) % 4]
            }
            const portWorldX = clickedMachine.x + localX
            const portWorldY = clickedMachine.y + localY
            const tx = portWorldX + DIR_DX[dir]
            const ty = portWorldY + DIR_DY[dir]
            if (tx >= 0 && tx < GRID_COLS && ty >= 0 && ty < GRID_ROWS && !isCellOccupied(tx, ty, factory.machines)) {
              candidates.push({ dir, x: tx, y: ty, portX: portWorldX, portY: portWorldY })
            }
          }
          const priority: Dir[] = ['S', 'E', 'N', 'W']
          const best = priority
            .map(d => candidates.filter(c => c.dir === d))
            .filter(c => c.length > 0)
            .map(c => c.reduce((closest, curr) => {
              const currDist = Math.abs(curr.portX - previewPosition.x) + Math.abs(curr.portY - previewPosition.y)
              const closestDist = Math.abs(closest.portX - previewPosition.x) + Math.abs(closest.portY - previewPosition.y)
              return currDist < closestDist ? curr : closest
            }))
            .find(Boolean)
          if (best) {
            setBeltStartPos({ x: best.x, y: best.y })
            setBeltStartDir(best.dir)
            return
          }
        }
        return
      }

      const outPort = findAdjacentOutPort(previewPosition.x, previewPosition.y, factory.machines, ['S', 'E', 'N', 'W'])
      if (!outPort) return

      setBeltStartPos(previewPosition)
      setBeltStartDir(outPort.dir)
      return
    }

    const targetX = previewPosition.x
    const targetY = previewPosition.y
    if (targetX === beltStartPos.x && targetY === beltStartPos.y) return

    const path = findPath(beltStartPos.x, beltStartPos.y, targetX, targetY, factory.machines, true)
    if (!path) return

    setFactory(prev => {
      let machines = [...prev.machines]

      const existingBelt = machines.find(
        pm => pm.x === beltStartPos.x && pm.y === beltStartPos.y &&
          (pm.type === 'belt' || pm.type === 'belt_corner_wn' || pm.type === 'belt_corner_nw'),
      )

      if (beltStartDir) {
        const pathBeltData = computeBeltPathPieces(path, beltStartDir, existingBelt)
        if (existingBelt) {
          machines = machines.filter(pm => pm !== existingBelt)
        }
        for (const bd of pathBeltData) {
          machines.push({ type: bd.type, rotate: bd.rotate, x: bd.x, y: bd.y })
        }
      }

      return { ...prev, machines }
    })

    const lastCell = path[path.length - 1]
    const lastD = path.length >= 2
      ? { x: lastCell.x - path[path.length - 2].x, y: lastCell.y - path[path.length - 2].y }
      : { x: DIR_DX[beltStartDir!], y: DIR_DY[beltStartDir!] }
    const lastDir: Dir = lastD.x === 1 ? 'E' : lastD.x === -1 ? 'W' : lastD.y === 1 ? 'S' : 'N'

    setBeltStartPos(lastCell)
    setBeltStartDir(lastDir)
    setBeltEndPos(null)
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

  const beltPathPreview: ReactNode[] = []
  if (placingMachine === 'belt') {
    if (beltStartPos) {
      beltPathPreview.push(
        <Rect
          key="belt-start"
          x={offsetX + beltStartPos.x * CELL_SIZE + 2}
          y={offsetY + beltStartPos.y * CELL_SIZE + 2}
          width={CELL_SIZE - 4}
          height={CELL_SIZE - 4}
          stroke="#4fc3f7"
          strokeWidth={3}
        />,
      )

      if (beltEndPos) {
        const path = findPath(beltStartPos.x, beltStartPos.y, beltEndPos.x, beltEndPos.y, factory.machines, true)
        if (path) {
          for (let i = 0; i < path.length; i++) {
            const cell = path[i]
            beltPathPreview.push(
              <Rect
                key={`belt-path-bg-${cell.x}-${cell.y}`}
                x={offsetX + cell.x * CELL_SIZE + 2}
                y={offsetY + cell.y * CELL_SIZE + 2}
                width={CELL_SIZE - 4}
                height={CELL_SIZE - 4}
                fill="rgba(0, 200, 83, 0.3)"
                stroke="#00c853"
                strokeWidth={2}
              />,
            )
          }

          if (beltStartDir) {
            const existingBelt = factory.machines.find(
              pm => pm.x === beltStartPos.x && pm.y === beltStartPos.y &&
                (pm.type === 'belt' || pm.type === 'belt_corner_wn' || pm.type === 'belt_corner_nw'),
            )
            const pathBeltData = computeBeltPathPieces(path, beltStartDir, existingBelt)

            for (const bd of pathBeltData) {
              const def = machineRegistry.get(bd.type)
              if (!def) continue
              beltPathPreview.push(
                <MachineImage
                  key={`belt-preview-${bd.x}-${bd.y}`}
                  definition={def}
                  x={offsetX + bd.x * CELL_SIZE}
                  y={offsetY + bd.y * CELL_SIZE}
                  rotation={bd.rotate}
                  opacity={0.5}
                  cellSize={CELL_SIZE}
                  showPortLabels={true}
                />,
              )
            }
          }
        } else {
          beltPathPreview.push(
            <Rect
              key="belt-path-invalid"
              x={offsetX + beltEndPos.x * CELL_SIZE + 2}
              y={offsetY + beltEndPos.y * CELL_SIZE + 2}
              width={CELL_SIZE - 4}
              height={CELL_SIZE - 4}
              fill="rgba(255, 0, 0, 0.3)"
              stroke="#ff0000"
              strokeWidth={2}
            />,
          )
        }
      }
    }
  }

  const placingDefinition = placingMachine && placingMachine !== 'belt'
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
          {beltPathPreview}
          {machines}
          {previewMachine}
        </Layer>
      </Stage>
      <div className="bottom-panel">
        <button className="tool-button" onClick={handleCenterView}>
          居中
        </button>
        {allMachines.filter(m => m.type !== 'belt_corner_wn' && m.type !== 'belt_corner_nw').map(machine => (
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

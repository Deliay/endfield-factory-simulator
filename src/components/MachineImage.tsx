import { Image as KonvaImage, Group, Rect, Text } from 'react-konva'
import type { MachineDefinition, SideImage } from '../types/Machine'
import { useImage } from '../hooks/useImage'

interface MachineImageProps {
  definition: MachineDefinition
  x: number
  y: number
  rotation: number
  opacity?: number
  cellSize: number
  invalid?: boolean
  showPortLabels?: boolean
}

interface SideImageProps {
  side: 'north' | 'south' | 'east' | 'west'
  sideImg: SideImage
  machineWidth: number
  machineHeight: number
  cellSize: number
}

function SideImageRenderer({ side, sideImg, machineWidth, machineHeight, cellSize }: SideImageProps) {
  const image = useImage(sideImg.url || null)
  if (!image) return null

  const rotate = sideImg.rotate ?? 0

  let x = 0
  let y = 0
  let width: number | undefined = cellSize
  let height: number | undefined = cellSize
  let oX = width > 0 ? width / 2 : undefined
  let oY = height > 0 ? height / 2 : undefined

  switch (side) {
    case 'north':
      x = 0
      y = -machineHeight / 2 + height / 2
      width = machineWidth
      oX = width > 0 ? width / 2 : undefined
      height = cellSize / 1.5
      break
    case 'south':
      x = 0
      y = machineHeight / 2 - height / 2
      width = machineWidth
      oX = width > 0 ? width / 2 : undefined
      height = cellSize / 1.5
      break
    case 'east':
      x = machineWidth / 2 - width / 2
      y = 0
      width = cellSize / 1.5
      height = machineHeight
      oY = height > 0 ? height / 2 : undefined
      break
    case 'west':
      x = -machineWidth / 2 + width / 2
      y = 0
      width = cellSize / 1.5
      height = machineHeight
      oY = height > 0 ? height / 2 : undefined
      break
  }

  return (
    <KonvaImage
      image={image}
      x={x}
      y={y}
      width={width}
      height={height}
      rotation={rotate}
      offsetX={oX}
      offsetY={oY}
    />
  )
}

export function MachineImage({ definition, x, y, rotation, opacity = 1, cellSize, invalid, showPortLabels }: MachineImageProps) {
  const backgroundUrl = definition.backgroundImg
  const backgroundImg = useImage(backgroundUrl || null)
  const gridIconUrl = definition.gridIcon
  const gridIconImg = useImage(gridIconUrl || null)

  const width = definition.width * cellSize
  const height = definition.height * cellSize
  const centerX = x + width / 2
  const centerY = y + height / 2

  const allDirs = ['N', 'E', 'S', 'W'] as const
  type Dir = typeof allDirs[number]

  function rotateDir(dir: Dir, rot: number): Dir {
    const idx = allDirs.indexOf(dir)
    return allDirs[(idx + rot / 90) % 4]
  }

  function rotatePortPosition(localX: number, localY: number, rot: number): { x: number; y: number } {
    const cx = (definition.width - 1) / 2
    const cy = (definition.height - 1) / 2
    const steps = ((rot % 360) + 360) % 360 / 90
    let x = localX
    let y = localY
    for (let i = 0; i < steps; i++) {
      const newX = cy + (y - cy)
      const newY = cy - (x - cx)
      x = newX
      y = newY
    }
    return { x, y }
  }

  function getPortPosition(portX: number, portY: number, orientation: Dir, portType: 'IN' | 'OUT', rot: number): { x: number; y: number; text: string } {
    const rotatedDir = rotateDir(orientation, rot)
    const rotatedPos = rotatePortPosition(portX, portY, rot)

    let labelX = rotatedPos.x * cellSize + cellSize / 2 - width / 2
    let labelY = rotatedPos.y * cellSize + cellSize / 2 - height / 2

    switch (rotatedDir) {
      case 'N':
        labelY = rotatedPos.y * cellSize + cellSize / 4 - height / 2
        break
      case 'S':
        labelY = (rotatedPos.y + 1) * cellSize - cellSize / 4 - height / 2
        break
      case 'E':
        labelX = (rotatedPos.x + 1) * cellSize - cellSize / 4 - width / 2
        break
      case 'W':
        labelX = rotatedPos.x * cellSize + cellSize / 4 - width / 2
        break
    }

    return { x: labelX, y: labelY, text: portType === 'IN' ? '入' : '出' }
  }

  return (
    <>
      <Group
        x={centerX}
        y={centerY}
        rotation={rotation}
        opacity={opacity}
      >
        {backgroundImg ? (
          <KonvaImage
            image={backgroundImg}
            x={-width / 2}
            y={-height / 2}
            width={width}
            height={height}
          />
        ) : (
          <Rect
            x={-width / 2 + 8}
            y={-height / 2 + 8}
            width={width - 16}
            height={height - 16}
            stroke="#000"
            strokeWidth={2}
          />
        )}
        {definition.northSideImg && (
          <SideImageRenderer
            side="north"
            sideImg={definition.northSideImg}
            machineWidth={width}
            machineHeight={height}
            cellSize={cellSize}
          />
        )}
        {definition.southSideImg && (
          <SideImageRenderer
            side="south"
            sideImg={definition.southSideImg}
            machineWidth={width}
            machineHeight={height}
            cellSize={cellSize}
          />
        )}
        {definition.eastSideImg && (
          <SideImageRenderer
            side="east"
            sideImg={definition.eastSideImg}
            machineWidth={width}
            machineHeight={height}
            cellSize={cellSize}
          />
        )}
        {definition.westSideImg && (
          <SideImageRenderer
            side="west"
            sideImg={definition.westSideImg}
            machineWidth={width}
            machineHeight={height}
            cellSize={cellSize}
          />
        )}
        {invalid && (
          <Rect
            x={-width / 2}
            y={-height / 2}
            width={width}
            height={height}
            fill="red"
            opacity={0.3}
          />
        )}
        {showPortLabels && definition.ports.map((port, index) => {
          const pos = getPortPosition(port.x, port.y, port.orientation, port.port, rotation)
          return (
            <Text
              key={`port-label-${index}`}
              text={pos.text}
              x={pos.x}
              y={pos.y}
              fontSize={12}
              fontStyle="bold"
              fill="white"
              stroke="black"
              strokeWidth={2}
              align="center"
              verticalAlign="middle"
              width={cellSize}
              height={cellSize}
              offsetX={cellSize / 2}
              offsetY={cellSize / 2}
            />
          )
        })}
      </Group>
      {gridIconImg && (
        <KonvaImage
          image={gridIconImg}
          x={centerX - cellSize / 2}
          y={centerY - cellSize / 2}
          width={cellSize}
          height={cellSize}
          opacity={opacity}
        />
      )}
    </>
  )
}

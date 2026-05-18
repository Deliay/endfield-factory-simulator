import { Image as KonvaImage, Group, Rect } from 'react-konva'
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
  isSelected?: boolean
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

export function MachineImage({ definition, x, y, rotation, opacity = 1, cellSize, invalid, isSelected }: MachineImageProps) {
  const backgroundUrl = definition.backgroundImg
  const backgroundImg = useImage(backgroundUrl || null)
  const gridIconUrl = definition.gridIcon
  const gridIconImg = useImage(gridIconUrl || null)

  const width = definition.width * cellSize
  const height = definition.height * cellSize
  const centerX = x + width / 2
  const centerY = y + height / 2

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
        {isSelected && (
          <Rect
            x={-width / 2}
            y={-height / 2}
            width={width}
            height={height}
            fill="rgba(0, 150, 255, 0.25)"
            stroke="#0088ff"
            strokeWidth={3}
          />
        )}
        {gridIconImg && (
          <KonvaImage
            image={gridIconImg}
            x={-cellSize / 2}
            y={-cellSize / 2}
            width={cellSize}
            height={cellSize}
          />
        )}
      </Group>
    </>
  )
}

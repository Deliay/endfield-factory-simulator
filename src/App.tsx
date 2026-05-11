import { useState, useEffect } from 'react'
import { Stage, Layer, Line } from 'react-konva'

const GRID_COLS = 64
const GRID_ROWS = 64
const CELL_SIZE = 64

function App() {
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  })

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const gridWidth = GRID_COLS * CELL_SIZE
  const gridHeight = GRID_ROWS * CELL_SIZE
  const offsetX = (dimensions.width - gridWidth) / 2
  const offsetY = (dimensions.height - gridHeight) / 2

  const lines = []

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

  return (
    <Stage width={dimensions.width} height={dimensions.height}>
      <Layer>
        {lines}
      </Layer>
    </Stage>
  )
}

export default App
# Endfield Factory Simulator - 应用逻辑规范

## 应用概述
基于 React + React Konva 的画布应用，显示一个可拖动的网格背景，支持放置和渲染机器。

## 技术栈
- **前端框架**: React 18+ (TypeScript)
- **构建工具**: Vite
- **画布库**: React Konva / Konva.js
- **状态管理**: React useState/useEffect

## 配置参数

```typescript
const GRID_COLS = 64      // 网格列数
const GRID_ROWS = 64      // 网格行数
const CELL_SIZE = 64      // 单元格尺寸 (px)
```

**计算值**:
- 网格总宽度: `GRID_COLS × CELL_SIZE = 4096px`
- 网格总高度: `GRID_ROWS × CELL_SIZE = 4096px`

## 数据模型

### Machine 抽象
```typescript
interface Port {
  port: 'IN' | 'OUT'
  x: number
  y: number
  orientation: 'N' | 'S' | 'E' | 'W'
}

interface SideImage {
  url: string
  rotate?: number
}

interface MachineDefinition {
  type: string
  name: string
  width: number
  height: number
  ports: Port[]
  backgroundImg?: string
  toolIcon?: string
  gridIcon?: string
  westSideImg?: SideImage
  northSideImg?: SideImage
  eastSideImg?: SideImage
  southSideImg?: SideImage
}
```
- `type`: 机器类型标识符
- `name`: 显示名称
- `width` 和 `height` 为整数，表示机器占用的网格数
- `ports` 数组定义输入/输出端口，`x` 和 `y` 为整数坐标
- `orientation`: 以 cell 为视角的端口方向 (N/S/E/W)
- `backgroundImg`: 背景图 (可选，无则显示方框)
- `toolIcon`: 工具栏图标
- `gridIcon`: 网格图标 (显示在机器中心)
- `*SideImg`: 四个方向的 side 图片 (可选)
- 使用 `MachineRegistry` (Map) 管理所有机器定义，key 为 `type`

### Factory 抽象
```typescript
interface PlacedMachine {
  type: string
  rotate: number
  x: number
  y: number
}

interface Factory {
  machines: PlacedMachine[]
}
```
- `rotate` 为旋转角度
- `x` 和 `y` 为网格坐标

### 传送带机器 (belt)
```typescript
machineRegistry.register({
  type: 'belt',
  name: '传送带',
  width: 1,
  height: 1,
  ports: [
    { port: 'IN', x: 0, y: 0, orientation: 'W' },
    { port: 'OUT', x: 1, y: 0, orientation: 'E' },
  ],
  backgroundImg: 'https://...',
  toolIcon: 'https://...',
})
```
- 尺寸: 1×1 网格
- 端口: 输入端口在西侧，输出端口在东侧

### 传送带弯角 (belt_corner_ws / belt_corner_sw)
```typescript
machineRegistry.register({
  type: 'belt_corner_ws',
  name: '传送带(西→南)',
  width: 1,
  height: 1,
  ports: [
    { port: 'IN', x: 0, y: 0, orientation: 'W' },
    { port: 'OUT', x: 0, y: 1, orientation: 'S' },
  ],
})

machineRegistry.register({
  type: 'belt_corner_sw',
  name: '传送带(南→西)',
  width: 1,
  height: 1,
  ports: [
    { port: 'IN', x: 0, y: 1, orientation: 'S' },
    { port: 'OUT', x: 0, y: 0, orientation: 'W' },
  ],
})
```
- 尺寸: 1×1 网格
- `belt_corner_ws`: 顺时针弯角 (IN→OUT 为 西→南, 东→北, 南→西, 北→东)
- `belt_corner_sw`: 逆时针弯角 (IN→OUT 为 南→西, 西→北, 北→东, 东→南)
- 通过旋转实现四种朝向，不作为工具栏选项显示

### 协议存储箱 (storage_box)
```typescript
machineRegistry.register({
  type: 'storage_box',
  name: '协议存储箱',
  width: 3,
  height: 3,
  ports: [
    { port: 'IN', x: 0, y: 0, orientation: 'N' },
    { port: 'IN', x: 1, y: 0, orientation: 'N' },
    { port: 'IN', x: 2, y: 0, orientation: 'N' },
    { port: 'OUT', x: 2, y: 0, orientation: 'S' },
    { port: 'OUT', x: 2, y: 1, orientation: 'S' },
    { port: 'OUT', x: 2, y: 2, orientation: 'S' },
  ],
  toolIcon: 'https://...',
  gridIcon: 'https://...',
  northSideImg: { url: 'https://...' },
  southSideImg: { url: 'https://...', rotate: 180 },
})
```
- 尺寸: 3×3 网格
- 北侧 3 个输入端口，东侧 3 个输出端口
- 无背景图，显示方框

## 碰撞检测

### getOccupiedCells
```typescript
function getOccupiedCells(
  definition: { width: number; height: number },
  x: number,
  y: number,
  rotate: number,
): Set<string>
```
- 计算机器在给定位置和旋转下所占用的所有网格单元
- 旋转 0° 或 180° 时使用原始 width/height，旋转 90° 或 270° 时交换
- 返回 `Set<string>`，每个元素格式为 `"col,row"`

### canPlaceMachine
```typescript
function canPlaceMachine(
  type: string,
  x: number,
  y: number,
  rotate: number,
  existing: PlacedMachine[],
): boolean
```
- 检查机器是否可以放置在指定位置
- 边界检查: 机器不能超出网格范围
- 重叠检查: 新机器的任何单元格不能与已有机器的单元格重叠
- 返回 `true` 表示允许放置，`false` 表示禁止

## 传送带放置模式

### 状态
```typescript
const [beltStartPos, setBeltStartPos] = useState<{ x: number; y: number } | null>(null)
const [beltStartDir, setBeltStartDir] = useState<Dir | null>(null)
const [beltEndPos, setBeltEndPos] = useState<{ x: number; y: number } | null>(null)
```
- `beltStartPos`: 起始cell坐标
- `beltStartDir`: 起始方向 (belt的OUT方向，即路径前进方向)
- `beltEndPos`: 鼠标当前指向的终点cell (用于路径预览)

### 起点确定 (第一次点击)
1. 如果点击的cell已有belt/belt_corner → 取其OUT方向作为 `beltStartDir`
2. 否则搜索四方向(N/S/E/W)相邻机器的OUT port，优先级：南 > 东 > 北 > 西
3. 如果无相邻OUT port → 禁止放置

### 路径计算 (第二次点击)
- 起点到终点必须在同一行或同一列，或构成L型 (最多一次弯折)
- L型路径有两种: 先水平后垂直 / 先垂直后水平，取第一个可行路径
- 路径上除起点外的所有cell不能有机器

### 放置逻辑
1. 如果起点已有belt且方向与路径第一段不同 → 删除旧belt，添加belt_corner
2. 如果起点无belt → 放置一个belt (方向由 `beltStartDir` 决定)
3. 路径上每个cell: 直线段放belt，弯折处放belt_corner
4. 放置后，终点变为新起点，`beltStartDir` 为路径最后一段方向
5. 可继续点击下一个终点，实现连续放置

### findAdjacentOutPort
```typescript
function findAdjacentOutPort(
  targetX: number, targetY: number,
  existing: PlacedMachine[],
  priority: Dir[],
): { dir: Dir } | null
```
- 搜索四方向相邻机器的OUT port
- 按 priority 顺序返回第一个匹配的方向

### findPath
```typescript
function findPath(
  startX: number, startY: number,
  endX: number, endY: number,
  existing: PlacedMachine[],
  excludeStart: boolean,
): { x: number; y: number }[] | null
```
- 计算从起点到终点的L型路径 (最多一次弯折)
- 返回路径cell数组，或 null (无可行路径)
- `excludeStart`: 是否排除起点的占用检查

### getCornerTypeAndRotation
```typescript
function getCornerTypeAndRotation(inDir: Dir, outDir: Dir): { type: string; rotate: number } | null
```
- 根据进入方向和离开方向确定corner类型和旋转
- 顺时针转弯 → `belt_corner_ws`，逆时针转弯 → `belt_corner_sw`

## 状态管理

### dimensions 状态
```typescript
const [dimensions, setDimensions] = useState({
  width: window.innerWidth,
  height: window.innerHeight,
})
```
- 存储窗口尺寸
- 监听 `resize` 事件自动更新

### factory 状态
```typescript
const [factory, setFactory] = useState<Factory>({
  machines: [],
})
```
- 存储工厂中放置的机器
- 通过 `setFactory` 更新机器列表

### placingMachine 状态
```typescript
const [placingMachine, setPlacingMachine] = useState<string | null>(null)
const [previewPosition, setPreviewPosition] = useState<{ x: number; y: number } | null>(null)
const [placingRotation, setPlacingRotation] = useState(0)
const [beltStartPos, setBeltStartPos] = useState<{ x: number; y: number } | null>(null)
const [beltStartDir, setBeltStartDir] = useState<Dir | null>(null)
const [beltEndPos, setBeltEndPos] = useState<{ x: number; y: number } | null>(null)
```
- `placingMachine`: 当前正在放置的机器类型，null 表示未在放置模式，`'belt'` 表示传送带放置模式
- `previewPosition`: 预览位置的网格坐标
- `placingRotation`: 当前放置机器的旋转角度 (0, 90, 180, 270)
- `beltStartPos`: 传送带放置的起始cell
- `beltStartDir`: 传送带起始方向 (OUT方向)
- `beltEndPos`: 传送带放置的终点cell (鼠标跟踪)

## 画布渲染逻辑

### 1. 网格居中计算
```typescript
const offsetX = (dimensions.width - gridWidth) / 2
const offsetY = (dimensions.height - gridHeight) / 2
```
- 网格在视口中居中显示

### 2. 网格背景与线条绘制

**网格背景**:
- 使用 `Rect` 绘制灰色背景
- 位置: `(offsetX, offsetY)`
- 尺寸: `gridWidth × gridHeight`
- 颜色: `#7f7f7f` (灰色)

**垂直线** (65 条):
- 循环: `i = 0` 到 `GRID_COLS`
- 坐标: `(offsetX + i * CELL_SIZE, offsetY)` → `(offsetX + i * CELL_SIZE, offsetY + gridHeight)`

**水平线** (65 条):
- 循环: `j = 0` 到 `GRID_ROWS`
- 坐标: `(offsetX, offsetY + j * CELL_SIZE)` → `(offsetX + gridWidth, offsetY + j * CELL_SIZE)`

**线条样式**:
- 颜色: `#333` (深灰色)
- 宽度: `1px`

### 3. 机器渲染
```typescript
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
    />
  )
})
```
- 根据机器类型从 Registry 获取定义
- 使用通用 `MachineImage` 组件渲染
- 支持旋转，围绕中心点旋转 (gridIcon 除外)

### 4. MachineImage 组件
```typescript
interface MachineImageProps {
  definition: MachineDefinition
  x: number
  y: number
  rotation: number
  opacity?: number
  cellSize: number
  invalid?: boolean
}
```
- 渲染顺序: backgroundImg/方框 → sideImg → gridIcon (gridIcon 不旋转)
- 无 backgroundImg 时显示 2px 粗的方框 (宽高各减 16px，颜色 `#000`)
- sideImg 位于机器边缘内侧
- gridIcon 位于机器中心，**不随机器旋转**
- sideImg 宽度/高度按机器边长缩放，N/S 方向高度为 `cellSize / 1.5`，E/W 方向宽度为 `cellSize / 1.5`
- `invalid` 为 true 时，在机器上方显示红色半透明覆盖层 (opacity 0.3)

### 5. 预览机器渲染
```typescript
const placingDefinition = placingMachine ? machineRegistry.get(placingMachine) : null
const isPreviewValid = placingMachine && previewPosition
  ? canPlaceMachine(placingMachine, previewPosition.x, previewPosition.y, placingRotation, factory.machines)
  : true
const previewMachine = placingDefinition && previewPosition ? (
  <MachineImage
    definition={placingDefinition}
    x={offsetX + previewPosition.x * CELL_SIZE}
    y={offsetY + previewPosition.y * CELL_SIZE}
    rotation={placingRotation}
    opacity={0.5}
    cellSize={CELL_SIZE}
    invalid={!isPreviewValid}
  />
) : null
```
- 仅在放置预览模式下显示
- 位置跟随鼠标指针
- 半透明效果 (opacity: 0.5)
- 支持旋转预览，围绕中心点旋转
- 当放置位置与已有机器重叠时，`invalid` 为 true，显示红色覆盖层

## 交互功能

### 画布拖动
- Stage 组件设置 `draggable` 属性
- 支持鼠标拖动平移视图
- 在放置预览模式下禁用拖动 (`draggable={!placingMachine}`)

### 居中工具
```typescript
const stageRef = useRef<StageType>(null)

const handleCenterView = () => {
  if (stageRef.current) {
    stageRef.current.position({ x: 0, y: 0 })
    stageRef.current.batchDraw()
  }
}
```
- 使用 `useRef` 引用 Stage 组件
- 点击按钮将画布位置重置到 `(0, 0)`
- 网格自动居中显示

### 机器选择工具
```typescript
const handleSelectMachine = (type: string) => {
  setPlacingMachine(type)
  setPreviewPosition(null)
  setPlacingRotation(0)
}
```
- 从 machineRegistry 自动生成工具栏按钮
- 使用 `ToolButton` 组件渲染

### 鼠标交互
```typescript
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
    const allowed = canPlaceMachine(placingMachine, x, y, placingRotation, factory.machines)
    stage.container().style.cursor = allowed ? 'default' : 'not-allowed'
  } else {
    stage.container().style.cursor = 'not-allowed'
  }
}

const handleClick = () => {
  if (!placingMachine || !previewPosition) return

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
}
```
- 鼠标移动时，预览位置跟随鼠标（半透明显示）
- 点击鼠标左键确认放置，写入 factory.machines
- 按 Escape 键取消放置
- 按 R 键旋转 90 度
- **放置限制**: 如果机器与已有机器重叠，不允许放置，鼠标指针变为禁止图标，预览显示红色覆盖层

### 键盘事件处理
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setPlacingMachine(null)
      setPreviewPosition(null)
      if (stageRef.current) {
        stageRef.current.container().style.cursor = 'default'
      }
    }
    if (e.key === 'r' || e.key === 'R') {
      if (placingMachine) {
        setPlacingRotation(prev => (prev + 90) % 360)
      }
    }
  }
  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [placingMachine])
```
- Escape: 取消放置模式，重置鼠标指针为默认
- R: 旋转机器 90 度
- 依赖数组包含 `placingMachine`，确保获取最新状态

## 响应式设计

### 窗口尺寸监听
```typescript
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
```
- 窗口大小变化时自动更新画布尺寸
- 网格始终保持居中

## 样式配置

### 背景色
- 应用背景: 黑色 (`#000`)
- 网格背景: 灰色 (`#7f7f7f`)
- 通过 CSS 变量 `--bg` 控制

### 画布尺寸
- 宽度: `window.innerWidth` (100vw)
- 高度: `window.innerHeight` (100vh)
- 溢出: 隐藏 (`overflow: hidden`)

### 底部悬浮面板
```css
.bottom-panel {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: fit-content;
  min-width: 128px;
  height: 128px;
  background: rgba(0, 0, 0, 0.8);
  border-top: 1px solid #333;
  border-left: 1px solid #333;
  border-right: 1px solid #333;
  border-radius: 8px 8px 0 0;
  z-index: 10;
}
```
- 位置: 固定在底部居中
- 尺寸: 宽度自适应内容，最小宽度 128px，高度 128px
- 样式: 半透明黑色背景，顶部圆角，灰色边框
- 层级: z-index 10，覆盖在画布之上

### 工具按钮
```css
.tool-button {
  background: #333;
  color: #fff;
  border: 1px solid #555;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
}
```
- 背景: 深灰色 (`#333`)
- 文字: 白色
- 悬停效果: 背景变亮 (`#444`)
- 点击效果: 背景更亮 (`#555`)

### 活动按钮
```css
.tool-button.active {
  background: #0066cc;
  border-color: #0088ff;
}
```
- 背景: 蓝色 (`#0066cc`)
- 边框: 亮蓝色 (`#0088ff`)
- 表示当前正在放置预览模式

### 工具图标
```css
.tool-icon {
  width: 20px;
  height: 20px;
  margin-right: 8px;
  vertical-align: middle;
}
```
- 尺寸: 20×20px
- 间距: 右侧 8px
- 对齐: 垂直居中

## 文件结构

```
src/
├── components/
│   ├── MachineImage.tsx    # 通用机器渲染组件
│   └── ToolButton.tsx      # 通用工具栏按钮组件
├── hooks/
│   └── useImage.ts         # 图片加载 hook
├── machines/
│   ├── belt.ts             # 传送带定义
│   └── storage_box.ts      # 协议存储箱定义
├── types/
│   ├── Machine.ts          # 机器类型定义和 Registry
│   └── Factory.ts          # 工厂类型定义
├── App.tsx                 # 主应用组件
└── main.tsx                # 入口文件
```

## 扩展方式

添加新机器只需:
1. 创建 `src/machines/xxx.ts`
2. 定义机器并调用 `machineRegistry.register()`
3. 在 `App.tsx` 导入该文件 (`import './machines/xxx'`)

工具栏和渲染逻辑会自动适配。

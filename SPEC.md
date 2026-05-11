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
- 端口: 输入端口在 (0,0)，输出端口在 (1,0)

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
```
- `placingMachine`: 当前正在放置的机器类型，null 表示未在放置模式
- `previewPosition`: 预览位置的网格坐标
- `placingRotation`: 当前放置机器的旋转角度 (0, 90, 180, 270)

## 画布渲染逻辑

### 1. 网格居中计算
```typescript
const offsetX = (dimensions.width - gridWidth) / 2
const offsetY = (dimensions.height - gridHeight) / 2
```
- 网格在视口中居中显示

### 2. 网格线绘制

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
- 支持旋转，围绕中心点旋转

### 4. MachineImage 组件
```typescript
interface MachineImageProps {
  definition: MachineDefinition
  x: number
  y: number
  rotation: number
  opacity?: number
  cellSize: number
}
```
- 渲染顺序: backgroundImg/方框 → sideImg → gridIcon
- 无 backgroundImg 时显示 4px 粗的方框 (宽高各减 16px)
- sideImg 位于机器边缘内侧
- gridIcon 位于机器中心
- sideImg 宽度/高度按机器边长缩放

### 5. 预览机器渲染
```typescript
const placingDefinition = placingMachine ? machineRegistry.get(placingMachine) : null
const previewMachine = placingDefinition && previewPosition ? (
  <MachineImage
    definition={placingDefinition}
    x={offsetX + previewPosition.x * CELL_SIZE}
    y={offsetY + previewPosition.y * CELL_SIZE}
    rotation={placingRotation}
    opacity={0.5}
    cellSize={CELL_SIZE}
  />
) : null
```
- 仅在放置预览模式下显示
- 位置跟随鼠标指针
- 半透明效果 (opacity: 0.5)
- 支持旋转预览，围绕中心点旋转

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
  }
}

const handleClick = () => {
  if (!placingMachine || !previewPosition) return

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

### 键盘事件处理
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setPlacingMachine(null)
      setPreviewPosition(null)
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
- Escape: 取消放置模式
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

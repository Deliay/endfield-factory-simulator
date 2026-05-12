# Endfield Factory Simulator - 应用逻辑规范

## 应用概述
基于 React + React Konva 的画布应用，显示一个可拖动的网格背景，支持放置和渲染机器。

## 技术栈
- **前端框架**: React 18+ (TypeScript)
- **构建工具**: Vite
- **画布库**: React Konva / Konva.js
- **状态管理**: React useReducer (工厂状态) + useState (UI 状态)

## 配置参数

```typescript
const GRID_COLS = 16      // 网格列数
const GRID_ROWS = 16      // 网格行数
const CELL_SIZE = 64      // 单元格尺寸 (px)
```

**计算值**:
- 网格总宽度: `GRID_COLS × CELL_SIZE = 1024px`
- 网格总高度: `GRID_ROWS × CELL_SIZE = 1024px`

## 数据模型

### Machine 抽象
```typescript
interface Port {
  port: 'IN' | 'OUT'
  x: number
  y: number
  direction: 'N' | 'S' | 'E' | 'W'
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
}
```
- `type`: 机器类型标识符
- `name`: 显示名称
- `width` 和 `height` 为整数，表示机器占用的网格数
- `ports` 数组定义输入/输出端口，`x` 和 `y` 为整数坐标 (相对于机器左上角)
- `direction`: 端口方向 (N/S/E/W)
- 使用 `MachineRegistry` (Map) 管理所有机器定义，key 为 `type`

### Factory 抽象
```typescript
interface PlacedMachine {
  type: string
  rotate: number
  x: number
  y: number
}
```
- `rotate` 为旋转角度 (0/90/180/270)
- `x` 和 `y` 为网格坐标

### 传送带机器 (belt)
```typescript
machineRegistry.register({
  type: 'belt',
  name: '传送带',
  width: 1, height: 1,
  ports: [
    { port: 'IN', x: 0, y: 0, direction: 'W' },
    { port: 'OUT', x: 0, y: 0, direction: 'E' },
  ],
})
```
- 尺寸: 1×1 网格
- 默认 IN=西, OUT=东 (流向 W→E)
- 旋转 90°: IN=北, OUT=南 (流向 N→S)
- 旋转 180°: IN=东, OUT=西 (流向 E→W)
- 旋转 270°: IN=南, OUT=北 (流向 S→N)

### 传送带弯角
**belt_corner_ne** (顺时针弯角):
```typescript
{ type: 'belt_corner_ne', IN→E, OUT→N }
```
- 默认: IN=北, OUT=东 (流向 N→E)
- 旋转 90°: IN=东, OUT=南
- 旋转 180°: IN=南, OUT=西
- 旋转 270°: IN=西, OUT=北

**belt_corner_en** (逆时针弯角):
```typescript
{ type: 'belt_corner_en', IN→E, OUT→N }
```
- 默认: IN=东, OUT=北 (流向 E→N)
- 旋转 90°: IN=南, OUT=东
- 旋转 180°: IN=西, OUT=南
- 旋转 270°: IN=北, OUT=西

- 不作为工具栏选项显示

### 协议存储箱 (storage_box)
```typescript
{
  type: 'storage_box',
  width: 3, height: 3,
  ports: [
    { port: 'IN', x: 0, y: 0, direction: 'N' },
    { port: 'IN', x: 1, y: 0, direction: 'N' },
    { port: 'IN', x: 2, y: 0, direction: 'N' },
    { port: 'OUT', x: 0, y: 2, direction: 'S' },
    { port: 'OUT', x: 1, y: 2, direction: 'S' },
    { port: 'OUT', x: 2, y: 2, direction: 'S' },
  ],
}
```
- 尺寸: 3×3 网格
- 北侧 3 个输入端口，南侧 3 个输出端口
- 未旋转时 OUT 方向为南

## 碰撞检测

### getOccupiedCells
- 计算机器在给定位置和旋转下所占用的所有网格单元
- 旋转 0°/180° 时使用原始 width/height，旋转 90°/270° 时交换
- 返回 `Set<string>`，每个元素格式为 `"col,row"`

### canPlaceMachine
- 检查机器是否可以放置在指定位置
- 边界检查: 机器不能超出网格范围
- 重叠检查: 新机器的任何单元格不能与已有机器的单元格重叠

## 状态管理

### useReducer (appReducer)
```typescript
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
```

- `BELT_SET_START`: 第一次点击传送带时，确定起点和方向
- `BELT_PLACE`: 后续点击传送带时，计算路径并放置，自动更新连续放置的起点
- `PLACE_MACHINE`: 放置非传送带机器
- `RESET_BELT`: 取消传送带放置 (Escape 或切换工具)

### useState (UI 状态)
```typescript
const [placingMachine, setPlacingMachine] = useState<string | null>(null)
const [previewPosition, setPreviewPosition] = useState<{ x: number; y: number } | null>(null)
const [placingRotation, setPlacingRotation] = useState(0)
const [beltEndPos, setBeltEndPos] = useState<{ x: number; y: number } | null>(null)
const [beltPreviewPieces, setBeltPreviewPieces] = useState<Array<...> | null>(null)
```

## 核心函数

### getMachineCells
```typescript
function getMachineCells(pm: PlacedMachine): Array<{ x: number; y: number }>
```
- 返回机器占用的所有网格单元

### findAdjacentOutPort
```typescript
function findAdjacentOutPort(
  targetX: number, targetY: number,
  existing: PlacedMachine[],
  priority: Dir[],
): { dir: Dir } | null
```
- 搜索四方向相邻机器的 OUT port
- 按 priority 顺序返回第一个匹配的方向
- 返回值: belt 的起始方向 (与机器 OUT port 方向相反，即 belt 的 IN 方向)

### findMachineOutPort
```typescript
function findMachineOutPort(
  clickX: number, clickY: number,
  existing: PlacedMachine[],
): { outX: number; outY: number; dir: Dir } | null
```
- 当点击在机器内部时，找到离点击位置最近的可用 OUT port
- 返回 out 口相邻的 belt 坐标和起始方向

### findPath
```typescript
function findPath(
  startX: number, startY: number,
  endX: number, endY: number,
  existing: PlacedMachine[],
  excludeStart: boolean,
): { x: number; y: number }[] | null
```
- 计算从起点到终点的路径 (直线或 L 型)
- 直线: 同行或同列
- L 型: 先水平后垂直 / 先垂直后水平，取第一个可行路径
- 路径上除起点外的所有 cell 不能有机器
- 路径起点为 start，终点为 end (从 start 到 end 的有序方向)

### getCornerTypeAndRotation
```typescript
function getCornerTypeAndRotation(inDir: Dir, outDir: Dir): { type: string; rotate: number } | null
```
- 根据进入方向和离开方向确定 corner 类型和旋转
- 顺时针转弯 (右转) → `belt_corner_ne`
- 逆时针转弯 (左转) → `belt_corner_en`
- 直线 (in === out 或 in === opposite(out)) → null
- 180° 掉头 → `belt_corner_ne` (用两段拼)

转弯判定:
- inDir → outDir 顺时针转一步 (N→E, E→S, S→W, W→N): ne, rotate=inDir
- inDir → outDir 顺时针转两步 (N→S, E→W, S→N, W→E): ne, rotate=opposite(inDir)
- inDir → outDir 顺时针转三步 (N→W, W→S, S→E, E→N): en, rotate=inDir

方向到旋转角度映射:
- belt_corner_ne: N:0, E:90, S:180, W:270 (入口方向对应角度)
- belt_corner_ne (掉头): N:180, E:270, S:0, W:90 (入口反向对应角度)
- belt_corner_en: N:270, E:0, S:90, W:180 (入口方向对应角度)

### getBeltRotation
```typescript
function getBeltRotation(dir: Dir): number
```
- N:270, E:0, S:90, W:180 (朝向出口方向)

### computeBeltPathPieces
```typescript
function computeBeltPathPieces(
  path: { x: number; y: number }[],
  startDir: Dir,
  existingAtStart: PlacedMachine | undefined,
): Array<{ x: number; y: number; type: string; rotate: number }>
```
- 遍历路径，计算每个 cell 的 belt 类型和旋转
- 关键逻辑:
  1. 起点已有 belt → 如果 direction 不变则保留，否则替换为 corner
  2. 直线段 (entry == opposite(exit)) → belt
  3. 弯折处 → getCornerTypeAndRotation 确定类型和旋转
  4. 终点 → exitDir = opposite(entryDir)，旋转由 exitDir 决定

## 传送带放置流程

### 选择工具
- 点击工具栏 belt 按钮 → `placingMachine = 'belt'`, 清除之前的起点

### 第一次点击 (确定起点)
1. `state.beltStartPos` 为 null → 进入起点确定逻辑
2. 如果点击 cell 已有 belt/belt_corner → 直接使用该 cell 作为起点，entryDir 来自机器的 IN port 方向
3. 如果点击 cell 在机器内部 → 调用 `findMachineOutPort`，找到最近的 OUT port
4. 否则 → 调用 `findAdjacentOutPort` 搜索相邻机器的 OUT port (优先级: 南 > 东 > 北 > 西)
5. dispatch `BELT_SET_START` 设置起点和方向

### 后续点击 (放置并继续)
1. `state.beltStartPos` 非 null → dispatch `BELT_PLACE`
2. reducer 中:
   a. `findPath` 计算路径
   b. `computeBeltPathPieces` 计算每段类型和旋转
   c. 删除起点原有机器 (filter)，添加新计算的 pieces
   d. 更新 `beltStartPos` 为当前点击位置，`beltStartDir` 为路径最后一段的 OPPOSITE 方向

### 预览
- `handleMouseMove`: 当 `placingMachine === 'belt'` 且 `state.beltStartPos` 非 null 时
  - 计算路径并调用 `computeBeltPathPieces` → 设置 `beltPreviewPieces`
  - 半透明渲染预览

### 取消
- Escape: dispatch `RESET_BELT` + 清除预览状态

## 放置测试用例

假定 storage_box 在 (1,1)放置且不旋转，左上角为(1,1)，右下角为(3,3)。

CASE1: 点击(3,3)作为起始点 → findMachineOutPort 返回 (3,4) dir=N

CASE2: 起点(3,4) dir=N, 终点(4,3)
- (3,4): belt_corner_ne@0
- (4,4): belt_corner_ne@270
- (4,3): belt@270

CASE3: 起点(3,4) dir=N, 终点(4,5)
- (3,4): belt_corner_ne@0
- (4,4): belt_corner_en@180
- (4,5): belt@90

CASE4: 起点(3,4) dir=N, 终点(2,5)
- (3,4): belt_corner_en@270
- (2,4): belt_corner_ne@90
- (2,5): belt@90

CASE5: 起点(3,4) dir=N, 终点(0,2)
- (3,4): belt_corner_en@270
- (2,4): belt@180
- (1,4): belt@180
- (0,4): belt_corner_en@0
- (0,3): belt@270
- (0,2): belt@270

CASE6: 起点(3,4) dir=N, 终点(0,4)
- (3,4): belt_corner_en@270
- (2,4): belt@180
- (1,4): belt@180
- (0,4): belt@180

CASE7: 连续放置
CASE7.1: 起点(3,4) dir=N, 终点(4,4)
- (3,4): belt_corner_ne@0
- (4,4): belt@0

CASE7.2: 起点(4,4) dir=W (上一次的结束方向), 终点(4,3)
- 此时 (4,4) 已有 belt@0, existingAtStart 为 belt@0
- computeBeltPathPieces 检查: startDir=W, exitDir=N → 弯折 → belt_corner_ne@270
- (4,4): belt_corner_ne@270 (替换原来的 belt@0)
- (4,3): belt@270

## 方向与旋转对照

### 流向映射
belt 默认流向 W→E (IN=西, OUT=东)
| 旋转 | IN方向 | OUT方向 | 流向 |
|------|--------|---------|------|
| 0°   | W      | E       | W→E  |
| 90°  | N      | S       | N→S  |
| 180° | E      | W       | E→W  |
| 270° | S      | N       | S→N  |

belt_corner_ne 默认流向 N→E
| 旋转 | IN方向 | OUT方向 |
|------|--------|---------|
| 0°   | N      | E       |
| 90°  | E      | S       |
| 180° | S      | W       |
| 270° | W      | N       |

belt_corner_en 默认流向 E→N
| 旋转 | IN方向 | OUT方向 |
|------|--------|---------|
| 0°   | E      | N       |
| 90°  | S      | E       |
| 180° | W      | S       |
| 270° | N      | W       |

## 画布渲染逻辑

### 网格居中
```typescript
const offsetX = (dimensions.width - gridWidth) / 2
const offsetY = (dimensions.height - gridHeight) / 2
```

### 渲染顺序
1. 网格背景 (Rect, `#7f7f7f`)
2. 垂直线和水平线 (Line, `#333`, 1px)
3. 已放置的机器 (state.machines.map → MachineImage)
4. 预览机器 (半透明 MachineImage)
5. Belt 起始指示器 (蓝色半透明 Rect)
6. Belt 预览 (半透明 MachineImage)

## 交互功能

### 画布拖动
- Stage `draggable={!placingMachine}`
- 放置模式下禁用拖动

### 鼠标移动 (handleMouseMove)
- 计算鼠标在网格中的坐标
- 设置 previewPosition
- Belt 预览: 计算路径并设置 beltPreviewPieces
- 碰撞检测: 改变光标样式

### 点击放置 (handleClick)
- Belt: 两阶段 (起点确定 → 放置并连续)
- 非 belt: 碰撞检测 → dispatch PLACE_MACHINE → 退出放置模式

### 键盘事件
- Escape: 取消放置，清除起点
- R: 旋转当前放置的机器 90°

## 文件结构

```
src/
├── components/
│   ├── MachineImage.tsx    # 通用机器渲染组件
│   └── ToolButton.tsx      # 通用工具栏按钮组件
├── hooks/
│   └── useImage.ts         # 图片加载 hook
├── machines/
│   ├── belt.ts             # 传送带定义 (belt, belt_corner_ne, belt_corner_en)
│   └── storage_box.ts      # 协议存储箱定义
├── types/
│   ├── Machine.ts          # 机器类型定义和 Registry
│   └── Factory.ts          # 工厂类型定义
├── utils/
│   └── rotation.ts         # 方向旋转工具函数
├── App.tsx                 # 主应用组件 (包含所有核心算法)
└── main.tsx                # 入口文件
```

## 扩展方式

添加新机器只需:
1. 创建 `src/machines/xxx.ts`
2. 定义机器并调用 `machineRegistry.register()`
3. 在 `App.tsx` 导入该文件 (`import './machines/xxx'`)

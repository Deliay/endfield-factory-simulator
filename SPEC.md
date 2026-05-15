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
  inventoryCapacity: number
  msPerRound: number
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
- `inventoryCapacity`: 库存容量 (belt=1, storage_box=6)
- `msPerRound`: 每轮毫秒数 (belt=2000, storage_box=2000)
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

### 分流器 (log_splitter)
```typescript
{
  type: 'log_splitter',
  width: 1, height: 1,
  ports: [
    { port: 'IN', x: 0, y: 0, direction: 'N' },
    { port: 'OUT', x: 0, y: 0, direction: 'E' },
    { port: 'OUT', x: 0, y: 0, direction: 'W' },
    { port: 'OUT', x: 0, y: 0, direction: 'S' },
  ],
}
```
- 尺寸: 1×1 网格
- 1 输入 (北), 3 输出 (东/西/南)
- 每次只输出 1 个物品 (inventoryCapacity=1)

### 汇流器 (log_converger)
```typescript
{
  type: 'log_converger',
  width: 1, height: 1,
  ports: [
    { port: 'IN', x: 0, y: 0, direction: 'N' },
    { port: 'IN', x: 0, y: 0, direction: 'E' },
    { port: 'IN', x: 0, y: 0, direction: 'W' },
    { port: 'OUT', x: 0, y: 0, direction: 'S' },
  ],
}
```
- 尺寸: 1×1 网格
- 3 输入 (北/东/西), 1 输出 (南)

### 物流桥 (log_connector)
```typescript
{
  type: 'log_connector',
  width: 1, height: 1,
  ports: [
    { port: 'IN', x: 0, y: 0, direction: 'N' },
    { port: 'IN', x: 0, y: 0, direction: 'E' },
    { port: 'IN', x: 0, y: 0, direction: 'S' },
    { port: 'IN', x: 0, y: 0, direction: 'W' },
    { port: 'OUT', x: 0, y: 0, direction: 'N' },
    { port: 'OUT', x: 0, y: 0, direction: 'E' },
    { port: 'OUT', x: 0, y: 0, direction: 'S' },
    { port: 'OUT', x: 0, y: 0, direction: 'W' },
  ],
}
```
- 尺寸: 1×1 网格
- 4 输入 + 4 输出 (全方向)

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

### findAdjacentInPort
```typescript
function findAdjacentInPort(
  clickX: number, clickY: number,
  existing: PlacedMachine[],
  priority: Dir[],
): { x: number; y: number } | null
```
- 搜索点击位置附近的机器 IN port，返回吸附后的传送带终点坐标
- **点击在机器内部时**：计算该机器的所有 IN port，返回曼哈顿距离最近的 IN port 的 feeding cell
- **点击在机器外部时**：按 priority 顺序检查相邻 4 个方向，若某个相邻 cell 属于机器且有 IN port 位于该 cell，返回该 IN port 的 feeding cell
- feeding cell 计算：`portGlobal + DIR_DX[rotatedDir]`（IN port 朝向方向向外一步，即传送带送达物品的位置）
- priority 默认 `['S', 'E', 'N', 'W']`，与 `findAdjacentOutPort` 保持一致
- 使用 `rotatePortPosition` 正确处理旋转后机器的 port 位置

### 使用场景
- **BELT_PLACE dispatch 前**：`handleClick` 中第二次点击（确定终点）时调用，若找到 IN port 则替换终点坐标
- **预览**：`handleMouseMove` 中同理，预览路径吸附到 feeding cell

### findEndInPortDir
```typescript
function findEndInPortDir(
  endX: number, endY: number,
  existing: PlacedMachine[],
): Dir | null
```
- 只在 `computeBeltPathPieces` 内部调用，用于终点 piece 的 IN port 吸附
- 按优先级 `['S', 'E', 'N', 'W']` 检查终点 cell 的相邻方向
- 若某个相邻 cell 属于机器且有 IN port 位于该 cell，且 feeding cell 等于终点位置
- 返回 `OPPOSITE[rotatedDir]`（传送带出口方向，即物品流向机器 IN port 的方向）
- 若找到，终点 piece 会被计算为弯角（entry=路径方向，exit=IN port 出口方向），而不是直线 belt

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
  existing?: PlacedMachine[],
): Array<{ x: number; y: number; type: string; rotate: number }>
```
- 遍历路径，计算每个 cell 的 belt 类型和旋转
- 关键逻辑:
  1. 起点已有 belt → 如果 direction 不变则保留，否则替换为 corner
  2. 直线段 (entry == opposite(exit)) → belt
  3. 弯折处 → getCornerTypeAndRotation 确定类型和旋转
  4. 终点 → 若提供了 `existing`，优先检查 `findEndInPortDir` 获取出口方向，否则用 `exitDir = opposite(entryDir)`
  5. 终点若检测到 IN port，变为弯角（entry=路径方向，exit=IN port 出口方向），而不是直线 belt

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

CASE8: 搜索机器IN接口
- 放置传送带，起点(3,4)，终点(4, 0)，此时(4, 0)应该是belt@270
- 从(4,0)开始连续放置，终点(3,0)，此时 (4,0)应该变为belt_corner_ne@180 (S→W 顺时针1步)
- 终点(3,0)因为附近有IN port (3, 1)，`findEndInPortDir` 检测到出口方向应为 S（IN port 方向 N → 传送带出口方向 OPPOSITE[N]=S），变为 belt_corner_ne@90 (E→S 顺时针1步)


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
- E: 切换到传送带放置工具

### 画布缩放
- 滚轮缩放: 向上放大，向下缩小 (以鼠标位置为中心)
- 缩放范围: 无限制

### 底部工具栏
- 宽度 90%，最大 1200px
- 机器选择按钮
- 居中按钮
- 模拟控制: 运行/暂停按钮 + 速度滑块 (0.001x–2x，双击重置为 1.0x)
- 模拟器选择下拉框 (基于 IEmulator 接口 + emulatorRegistry)

## 工厂模拟

工厂模拟系统基于 `IEmulator` 接口，支持多种模拟器实现，通过 `emulatorRegistry` 注册和切换。

### IEmulator 接口
```typescript
interface IEmulator {
  readonly name: string
  readonly machines: RuntimeMachine[]
  simulatorTimeScale: number
  running: boolean
  onTick: ((items: Map<string, string | null>) => void) | null
  getItemMap(): Map<string, string | null>
  tick(): void
  start(): void
  stop(): void
  setTimeScale(scale: number): void
}

interface RuntimeMachine {
  type: string
  rotate: number
  x: number
  y: number
  msPerRound: number
  progress: number
  round: number
  inventory: { storage: (ItemStack | null)[] }
  inputBuffer: (ItemStack | null)[]  // 每 IN port 一个缓冲槽
}
```

### FactoryEmulator (默认实现)
处理所有的 RuntimeMachine 的运作，使用 tick + postTick 两阶段模式。机器通过 `progress` / `round` / `msPerRound` 驱动机器执行频率，全局 tick 以所有机器中最小的 `msPerRound` 为步进。

0. Machine的定义增加如下字段
- inventoryCapacity: 传送带为1， storage_box为6
- ItemStack: { id: string, amount: number }

1. RuntimeMachine结构增加如下字段
```js
{
  inputBuffer: Array<ItemStack | null> // 输入口缓冲区，每 IN port 一个
  msPerRound,
  progress: 0,
  round: 1,      // 初始为 1，防止 round=0 时 progress>=0 恒真导致首次空转
  inventory: {
    storage: Array<ItemStack | null> // 放置机器时，按照inventory capacity数量初始化为null
  },
}
```
2. 工厂有ticking方法，也有progress值 `{ ticking(), progress, simulatorTimeScale: 1 }`

### 工厂ticking方法

1. 工厂ticking方法会先获得所有machines， 拿到最小的min(msPerRound)
2. progress递增msPerRound的值
3. 遍历machines，判断单个machine的progress是否大于round*msPerRound，大于则round+=1，并ticking这个machine
4. 所有 machine ticking 完成后，执行 postTicking 将输入缓冲区写入 storage
```js 伪代码
ticking() {
  while (工厂关闭) {
    const minMsPerRound = Math.min(machines.map((m) => m.msPerRound));
    await delay(minMsPerRound * simulatorTimeScale);
    for (const machine of machines) {
      machine.progress += minMsPerRound;
      if (machine.progress >= round * machine.msPerRound) {
        machine.round += 1;
        machine.ticking();   // 从上游取物品到 inputBuffer
      }
    }
    for (const machine of machines) {
      machine.postTicking();  // inputBuffer → storage
    }
  }
}
```

### machine的ticking

#### 概念
激活输入(activeInput)：找到in-port对应的out-port，例如，in-port的那个cell在 (1,1)，in-port在N，只会查找(0, 1)的S是否有out-port，有就可以激活输入。target_inventory为out-port对应的machine的inventory

#### 传送带

```js 伪代码
ticking() {
  // buffer 不为空则跳过（待 postTick 清空）
  if (this.inputBuffer[0]) return;
  const input = ports.filter((p) => p.type === 'IN')[0];
  const { machine, port } = activeInput(input);
  const item = machine.take(port, 1);
  if (item) {
    this.inputBuffer[0] = item; // 新物品进入缓冲
  }
  // 注意: tickMachine 不操作 storage，只填充 buffer
}
postTicking() {
  // 仅当 storage 为空时才从 buffer 移入，防止覆盖已有物品
  if (this.inputBuffer[0] && !this.inventory.storage[0]) {
    this.inventory.storage[0] = this.inputBuffer[0];
    this.inputBuffer[0] = null;
  }
}
peek() { return this.inventory.storage[0]?.id; }
take() {
  const item = this.inventory.storage[0];
  this.inventory.storage[0] = null;
  return item;
}
```

#### 存储箱
```js 伪代码
ticking() {
  if (this.inventory.storage.every((s) => s !== null && s.amount >= 50)) return;
  for (let pi = 0; pi < inPorts.length; pi++) {
    if (this.inputBuffer[pi]) continue;
    const { machine, port } = activeInput(inPorts[pi]);
    const type = machine.peek(port);
    if (!type) continue;
    const item = machine.take(port, 1);
    if (item) this.inputBuffer[pi] = item;
  }
}
postTicking() {
  for (let pi = 0; pi < inputBuffer.length; pi++) {
    const bufItem = this.inputBuffer[pi];
    if (!bufItem) continue;
    const inboxIndex = this.inventory.storage.findIndex(
      (s) => !s || (s.id === bufItem.id && s.amount < 50)
    );
    if (inboxIndex === -1) continue;
    if (this.inventory.storage[inboxIndex]) {
      this.inventory.storage[inboxIndex].amount += bufItem.amount;
    } else {
      this.inventory.storage[inboxIndex] = bufItem;
    }
    this.inputBuffer[pi] = null;
  }
}
peek() { return this.inventory.storage.filter((s) => s)[0]?.id || null; }
take() { return this.inventory.storage.filter((s) => s)[0] || null; }
```

### 模拟控制工具

工具栏中增加模拟控制工具，运行，暂停，默认为暂停，和一个slider bar，拖动simulatorTimeScale从 0.001-2，默认为1。双击 slider 重置为 1.0。

### 存储箱交互

在canvas上点击存储箱会弹出dialog，里面可见6个invetory slot（capacity），dialog可以指定哪个slot有物品什么，数量多少个（暂时使用文本框），关闭时写回模拟器。

### 物品展示

物品在传送带传递时显示黄色方块 + 物品 ID 文字，路径是从 IN port 流向 OUT port，从下一节传送带的IN port出来，又往下一节的 OUT port出去，直到流向机器的IN port，或者物品一直存在，没有inport来主动获取。

### 传送带起点预览

选择传送带工具后、第一次点击前，悬停时显示起点预览（绿色高亮）：
- 悬停在已有传送带上 → 显示该 cell 为起点
- 悬停在机器内部 → 显示最近的 OUT port feeding cell
- 悬停在空 cell → 检测相邻机器的 OUT port

### 测试用例

CASE1: 在(1,1)放置storage_box，初始化物品为 { id: 'item_test', amount: 1}
- storage_box出入口(3,3)连接传送带(3,4)-(4,4)-(4,3)-(4,2),(4,1),(4,0)-(3,0)，此时storage_box的out和in通过传送带相连接
- 需要 8 ticks 完成一次循环

CASE2: 50 items 通过 2-belt 管道从 A 传输到 B
- A(0,0) OUT:(1,2)S → belt1(1,3)rot=90 → belt2(1,4)rot=90 → B(0,5) IN:(1,0)N
- A 初始 50 个 ore，B 空
- 理论 ticks: belt 数量 + 物品数量 = 2 + 50 = 52
- [tick:0]factory第一次ticking，在传送带(3,4)ticking时，从storage_box take 1个 item_test，此时storage_box的storage为空，此时in-port取的物品存放在一个输入口缓冲区里
- [tick:0:post]: 将物品从缓冲区 写入库存
- [tick:1] 传送带(4,4)从传送带(3,4)的库存取到物品，进入(4,4)的缓冲区
- [tick:1:post]: 将物品从缓冲区 写入库存 (4, 4).cace -> (4, 4).storage
- [tick:2] (4, 4).storage -> (4, 3).cache
- [tick:2:post]: (4, 3).cache -> (4, 3).storage
- [tick:3] (4, 3).storage -> (4, 2).cache
- [tick:3:post]: (4, 2).cache -> (4, 2).storage
- [tick:4] (4, 2).storage -> (4, 1).cache
- [tick:4:post]: (4, 1).cache -> (4, 1).storage
- [tick:5] (4, 1).storage -> (4, 0).cache
- [tick:5:post]: (4, 0).cache -> (4, 0).storage
- [tick:6] (4, 0).storage -> (3, 0).cache
- [tick:6:post]: (3, 0).cache -> (3, 0).storage
- [tick:7]: storage_box的in接口 取到(3,0)传送带的物品，并进入缓冲区
- [tick:7:post]: 将缓冲区的物品写入storage

## 文件结构

```
src/
├── components/
│   ├── MachineImage.tsx    # 通用机器渲染组件
│   ├── ToolButton.tsx      # 通用工具栏按钮组件
│   └── StorageDialog.tsx   # 存储箱编辑对话框
├── factory/
│   ├── IEmulator.ts        # 模拟器接口 + RuntimeMachine 类型
│   ├── emulatorRegistry.ts # 模拟器注册表
│   └── FactoryEmulator.ts  # 默认模拟器实现
├── hooks/
│   └── useImage.ts         # 图片加载 hook
├── machines/
│   ├── belt.ts             # 传送带定义 (belt, belt_corner_ne, belt_corner_en)
│   ├── storage_box.ts      # 协议存储箱定义
│   ├── log_splitter.ts     # 分流器定义
│   ├── log_converger.ts    # 汇流器定义
│   └── log_connector.ts    # 物流桥定义
├── types/
│   ├── Machine.ts          # 机器类型定义和 Registry, ItemStack
│   └── Factory.ts          # 工厂类型定义 (PlacedMachine)
├── utils/
│   ├── rotation.ts         # 方向旋转工具函数
│   └── __tests__/
├── __tests__/
│   ├── App.test.ts         # App 组件算法测试
│   ├── beltPath.test.ts    # 传送带路径测试
│   ├── beltPlacement.spec.test.ts  # 传送带放置场景测试
│   ├── beltCase.test.ts    # 具体场景测试
│   └── factory.test.ts     # FactoryEmulator 单元测试 + CASE1 集成测试
├── App.tsx                 # 主应用组件 (包含所有核心算法)
├── App.css
├── index.css               # 全局样式 (含工具栏/对话框样式)
└── main.tsx                # 入口文件
```

## 扩展方式

添加新机器只需:
1. 创建 `src/machines/xxx.ts`
2. 定义机器并调用 `machineRegistry.register()`
3. 在 `App.tsx` 导入该文件 (`import './machines/xxx'`)

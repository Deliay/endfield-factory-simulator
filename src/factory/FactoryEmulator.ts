import { machineRegistry, type Port, type ItemStack } from '../types/Machine'
import type { PlacedMachine } from '../types/Factory'
import { rotateDir, rotatePortPosition, type Dir } from '../utils/rotation'
import type { IEmulator, RuntimeMachine } from './IEmulator'
import { emulatorRegistry } from './emulatorRegistry'

const DIR_DX: Record<Dir, number> = { N: 0, E: 1, S: 0, W: -1 }
const DIR_DY: Record<Dir, number> = { N: -1, E: 0, S: 1, W: 0 }

export class FactoryEmulator implements IEmulator {
  readonly name = 'Default'
  readonly machines: RuntimeMachine[]
  simulatorTimeScale: number = 1
  running: boolean = false
  onTick: ((items: Map<string, string | null>) => void) | null = null
  private tickTimer: ReturnType<typeof setTimeout> | null = null

  constructor(placedMachines: PlacedMachine[]) {
    this.machines = placedMachines.map(pm => {
      const def = machineRegistry.get(pm.type)
      if (!def) throw new Error(`Unknown machine type: ${pm.type}`)
      const inPortCount = def.ports.filter(p => p.port === 'IN').length
      return {
        type: pm.type,
        rotate: pm.rotate,
        x: pm.x,
        y: pm.y,
        msPerRound: def.msPerRound,
        progress: 0,
        round: 0,
        inventory: {
          storage: Array.from({ length: def.inventoryCapacity }, () => null),
        },
        inputBuffer: Array.from({ length: inPortCount }, () => null),
      }
    })
  }

  getItemMap(): Map<string, string | null> {
    const map = new Map<string, string | null>()
    for (const m of this.machines) {
      const item = m.inventory.storage.find(s => s !== null)
      map.set(`${m.x},${m.y}`, item?.id ?? null)
    }
    return map
  }

  tick(): void {
    const minMsPerRound = Math.min(...this.machines.map(m => m.msPerRound))
    if (!isFinite(minMsPerRound) || this.machines.length === 0) return
    const ticked: number[] = [];
    for (let i = 0; i < this.machines.length; i++) {
      const m = this.machines[i]
      m.progress += minMsPerRound
      if (m.progress >= m.round * m.msPerRound) {
        m.round += 1
        this.tickMachine(i)
        ticked.push(i);
      }
    }

    for (const i of ticked) {
      this.postTickMachine(i)
    }
  }

  private postTickMachine(machineIdx: number): void {
    const m = this.machines[machineIdx]

    if (m.type === 'belt' || m.type === 'belt_corner_ne' || m.type === 'belt_corner_en' || m.type === 'log_splitter') {
      if (m.inputBuffer[0]) {
        m.inventory.storage[0] = m.inputBuffer[0]
        m.inputBuffer[0] = null
      }
      return
    }

    if (m.type === 'storage_box') {
      for (let pi = 0; pi < m.inputBuffer.length; pi++) {
        const bufItem = m.inputBuffer[pi]
        if (!bufItem) continue
        const inboxIdx = m.inventory.storage.findIndex(
          s => !s || (s.id === bufItem.id && s.amount < 50)
        )
        if (inboxIdx === -1) continue
        if (m.inventory.storage[inboxIdx]) {
          m.inventory.storage[inboxIdx]!.amount += bufItem.amount
        } else {
          m.inventory.storage[inboxIdx] = bufItem
        }
        m.inputBuffer[pi] = null
      }
      return
    }
  }

  start(): void {
    if (this.running) return
    this.running = true
    const loop = () => {
      if (!this.running) return
      this.tick()
      this.onTick?.(this.getItemMap())
      const minMsPerRound = Math.min(...this.machines.map(m => m.msPerRound))
      this.tickTimer = setTimeout(loop, minMsPerRound * this.simulatorTimeScale)
    }
    this.tickTimer = setTimeout(loop, 0)
  }

  stop(): void {
    this.running = false
    if (this.tickTimer !== null) {
      clearTimeout(this.tickTimer)
      this.tickTimer = null
    }
  }

  setTimeScale(scale: number): void {
    this.simulatorTimeScale = Math.max(0.001, Math.min(scale, 2))
  }

  private getMachineCells(m: RuntimeMachine): { x: number; y: number }[] {
    const def = machineRegistry.get(m.type)
    if (!def) return []
    const w = m.rotate % 180 === 0 ? def.width : def.height
    const h = m.rotate % 180 === 0 ? def.height : def.width
    const cells: { x: number; y: number }[] = []
    for (let dx = 0; dx < w; dx++) {
      for (let dy = 0; dy < h; dy++) {
        cells.push({ x: m.x + dx, y: m.y + dy })
      }
    }
    return cells
  }

  private isCellOccupiedBy(x: number, y: number, excludeIdx: number): number | null {
    for (let i = 0; i < this.machines.length; i++) {
      if (i === excludeIdx) continue
      const m = this.machines[i]
      const def = machineRegistry.get(m.type)
      if (!def) continue
      const w = m.rotate % 180 === 0 ? def.width : def.height
      const h = m.rotate % 180 === 0 ? def.height : def.width
      for (let dx = 0; dx < w; dx++) {
        for (let dy = 0; dy < h; dy++) {
          if (m.x + dx === x && m.y + dy === y) return i
        }
      }
    }
    return null
  }

  activeInput(
    machineIdx: number,
    port: Port,
  ): { machineIndex: number; port: Port } | null {
    const m = this.machines[machineIdx]
    const def = machineRegistry.get(m.type)
    if (!def) return null

    const rotatedPos = rotatePortPosition(port.x, port.y, def.width, def.height, m.rotate)
    const portGlobalX = m.x + rotatedPos.x
    const portGlobalY = m.y + rotatedPos.y
    const rotatedDir = rotateDir(port.direction, m.rotate)
    const feedingX = portGlobalX + DIR_DX[rotatedDir]
    const feedingY = portGlobalY + DIR_DY[rotatedDir]

    const feederIdx = this.isCellOccupiedBy(feedingX, feedingY, machineIdx)
    if (feederIdx === null) return null

    const feeder = this.machines[feederIdx]
    const feederDef = machineRegistry.get(feeder.type)
    if (!feederDef) return null

    for (const fp of feederDef.ports) {
      if (fp.port !== 'OUT') continue
      const fRotatedPos = rotatePortPosition(fp.x, fp.y, feederDef.width, feederDef.height, feeder.rotate)
      const fGlobalX = feeder.x + fRotatedPos.x
      const fGlobalY = feeder.y + fRotatedPos.y
      const fRotatedDir = rotateDir(fp.direction, feeder.rotate)
      const fFeedingX = fGlobalX + DIR_DX[fRotatedDir]
      const fFeedingY = fGlobalY + DIR_DY[fRotatedDir]
      if (fFeedingX === portGlobalX && fFeedingY === portGlobalY) {
        return { machineIndex: feederIdx, port: { ...fp, direction: fRotatedDir } }
      }
    }
    return null
  }

  peek(machineIdx: number, _port: Port): string | null { // eslint-disable-line @typescript-eslint/no-unused-vars
    const m = this.machines[machineIdx]
    return m.inventory.storage.find(s => s !== null)?.id ?? null
  }

  take(machineIdx: number, _port: Port, amount: number): ItemStack | null {
    const m = this.machines[machineIdx]
    const idx = m.inventory.storage.findIndex(s => s !== null)
    if (idx === -1) return null
    const item = m.inventory.storage[idx]
    if (!item) return null
    const taken: ItemStack = { id: item.id, amount: Math.min(amount, item.amount) }
    item.amount -= taken.amount
    if (item.amount <= 0) {
      m.inventory.storage[idx] = null
    }
    return taken
  }

  tickMachine(machineIdx: number): void {
    const m = this.machines[machineIdx]
    const def = machineRegistry.get(m.type)
    if (!def) return

    if (m.type === 'belt' || m.type === 'belt_corner_ne' || m.type === 'belt_corner_en' || m.type === 'log_splitter') {
      if (m.inventory.storage[0] && m.inputBuffer[0]) return
      const inPort = def.ports.find(p => p.port === 'IN')
      if (!inPort) return
      const source = this.activeInput(machineIdx, inPort)
      if (!source) return
      const item = this.take(source.machineIndex, source.port, 1)
      if (item) {
        if (!m.inventory.storage[0]) {
          m.inventory.storage[0] = m.inputBuffer[0];
        }
          m.inputBuffer[0] = item
      }
      return
    }

    if (m.type === 'storage_box') {
      if (m.inventory.storage.every(s => s !== null && s.amount >= 50)) return
      const inPorts = def.ports.filter(p => p.port === 'IN')
      for (let pi = 0; pi < inPorts.length; pi++) {
        if (m.inputBuffer[pi]) continue
        const inPort = inPorts[pi]
        const source = this.activeInput(machineIdx, inPort)
        if (!source) continue
        const type = this.peek(source.machineIndex, source.port)
        if (!type) continue

        const item = this.take(source.machineIndex, source.port, 1)
        if (!item) continue

        m.inputBuffer[pi] = item
      }
      return
    }
  }
}

emulatorRegistry.register('default', 'Default', FactoryEmulator)

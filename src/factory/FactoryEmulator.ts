import { machineRegistry, type Port, type ItemStack } from '../types/Machine'
import type { PlacedMachine } from '../types/Factory'
import { rotateDir, rotatePortPosition, type Dir } from '../utils/rotation'
import type { IEmulator, RuntimeMachine, RuntimeStateSnapshot } from './IEmulator'
import { emulatorRegistry } from './emulatorRegistry'

export function snapshotRuntimeState(machines: RuntimeMachine[]): RuntimeStateSnapshot[] {
  return machines.map(m => ({
    x: m.x,
    y: m.y,
    type: m.type,
    progress: m.progress,
    round: m.round,
    storage: m.inventory.storage.map(s => s ? { ...s } : null),
    inputBuffer: m.inputBuffer.map(s => s ? { ...s } : null),
    nextOutSlot: m.nextOutSlot,
    nextOutPortX: m.nextOutPortX,
  }))
}

export function restoreRuntimeState(machines: RuntimeMachine[], snapshot: RuntimeStateSnapshot[]): void {
  const map = new Map(snapshot.map(s => [`${s.x},${s.y}`, s]))
  for (const m of machines) {
    const key = `${m.x},${m.y}`
    const s = map.get(key)
    if (!s || s.type !== m.type) continue
    m.progress = s.progress
    m.round = s.round
    m.nextOutSlot = s.nextOutSlot
    m.nextOutPortX = s.nextOutPortX
    for (let i = 0; i < Math.min(m.inventory.storage.length, s.storage.length); i++) {
      m.inventory.storage[i] = s.storage[i] ? { ...s.storage[i]! } : null
    }
    for (let i = 0; i < Math.min(m.inputBuffer.length, s.inputBuffer.length); i++) {
      m.inputBuffer[i] = s.inputBuffer[i] ? { ...s.inputBuffer[i]! } : null
    }
  }
}

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
        round: 1,
        inventory: {
          storage: Array.from({ length: def.inventoryCapacity }, () => null),
        },
        inputBuffer: Array.from({ length: inPortCount }, () => null),
        nextOutSlot: 0,
        nextOutPortX: 0,
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

    if (m.type === 'belt' || m.type === 'belt_corner_ne' || m.type === 'belt_corner_en') {
      if (m.inputBuffer[0] && !m.inventory.storage[0]) {
        m.inventory.storage[0] = m.inputBuffer[0]
        m.inputBuffer[0] = null
      }
      return
    }

    if (m.type === 'log_splitter') {
      if (!m.inputBuffer[0]) return
      for (let i = 0; i < m.inventory.storage.length; i++) {
        const slotIdx = (m.nextOutSlot + i) % m.inventory.storage.length
        if (m.inventory.storage[slotIdx]) continue
        m.inventory.storage[slotIdx] = m.inputBuffer[0]
        m.inputBuffer[0] = null
        m.nextOutSlot = (slotIdx + 1) % m.inventory.storage.length
        return
      }
      return
    }

    if (m.type === 'log_converger') {
      for (let pi = 0; pi < m.inputBuffer.length; pi++) {
        const bufItem = m.inputBuffer[pi]
        if (!bufItem) continue
        if (m.inventory.storage[0]) continue
        m.inventory.storage[0] = bufItem
        m.inputBuffer[pi] = null
      }
      return
    }

    if (m.type === 'log_connector') {
      for (let pi = 0; pi < m.inputBuffer.length; pi++) {
        const bufItem = m.inputBuffer[pi]
        if (!bufItem) continue
        if (m.inventory.storage[pi]) continue
        m.inventory.storage[pi] = bufItem
        m.inputBuffer[pi] = null
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

  take(machineIdx: number, port: Port, amount: number): ItemStack | null {
    const m = this.machines[machineIdx]

    if (m.type === 'log_splitter') {
      const OUT_DIR_TO_SLOT: Record<string, number> = { E: 0, W: 1, S: 2 }
      const slotIdx = OUT_DIR_TO_SLOT[port.direction]
      const item = m.inventory.storage[slotIdx]
      if (!item) return null
      const taken: ItemStack = { id: item.id, amount: Math.min(amount, item.amount) }
      item.amount -= taken.amount
      if (item.amount <= 0) {
        m.inventory.storage[slotIdx] = null
      }
      return taken
    }

    if (m.type === 'log_connector') {
      const OUT_DIR_TO_SLOT: Record<string, number> = { S: 0, W: 1, N: 2, E: 3 }
      const slotIdx = OUT_DIR_TO_SLOT[port.direction]
      const item = m.inventory.storage[slotIdx]
      if (!item) return null
      const taken: ItemStack = { id: item.id, amount: Math.min(amount, item.amount) }
      item.amount -= taken.amount
      if (item.amount <= 0) {
        m.inventory.storage[slotIdx] = null
      }
      return taken
    }

    if (m.type === 'storage_box') {
      if (!m._portMask) m._portMask = 0
      if (!m._portTick) m._portTick = 0
      const TICK_DECAY = 5
      if (m.round - m._portTick > TICK_DECAY) {
        m._portMask = 1 << port.x
      } else {
        m._portMask |= 1 << port.x
      }
      m._portTick = m.round
      const activeCount = (m._portMask & 1) + ((m._portMask >> 1) & 1) + ((m._portMask >> 2) & 1)

      if (activeCount > 1 && port.x !== m.nextOutPortX) {
        return null
      }
    }

    const idx = m.inventory.storage.findIndex(s => s !== null)
    if (idx === -1) {
      return null
    }
    const item = m.inventory.storage[idx]
    if (!item) return null
    const taken: ItemStack = { id: item.id, amount: Math.min(amount, item.amount) }
    item.amount -= taken.amount
    if (item.amount <= 0) {
      m.inventory.storage[idx] = null
    }
    if (m.type === 'storage_box') {
      let next = (m.nextOutPortX + 1) % 3
      for (let i = 0; i < 3; i++) {
        if (m._portMask! & (1 << next)) break
        next = (next + 1) % 3
      }
      m.nextOutPortX = next
    }
    return taken
  }

  tickMachine(machineIdx: number): void {
    const m = this.machines[machineIdx]
    const def = machineRegistry.get(m.type)
    if (!def) return

    if (m.type === 'belt' || m.type === 'belt_corner_ne' || m.type === 'belt_corner_en') {
      if (m.inputBuffer[0]) return
      const inPort = def.ports.find(p => p.port === 'IN')
      if (!inPort) return
      const source = this.activeInput(machineIdx, inPort)
      if (!source) return
      const item = this.take(source.machineIndex, source.port, 1)
      if (item) {
        m.inputBuffer[0] = item
      }
      return
    }

    if (m.type === 'log_splitter') {
      if (m.inputBuffer[0]) return
      if (m.inventory.storage.every(s => s !== null)) return
      const inPort = def.ports.find(p => p.port === 'IN')
      if (!inPort) return
      const source = this.activeInput(machineIdx, inPort)
      if (!source) return
      const item = this.take(source.machineIndex, source.port, 1)
      if (item) {
        m.inputBuffer[0] = item
      }
      return
    }

    if (m.type === 'log_converger') {
      if (m.inventory.storage[0]) return
      if (m.inputBuffer.some(b => b !== null)) return
      const inPorts = def.ports.filter(p => p.port === 'IN')
      for (let pi = 0; pi < inPorts.length; pi++) {
        if (m.inputBuffer[pi]) continue
        const inPort = inPorts[pi]
        const source = this.activeInput(machineIdx, inPort)
        if (!source) continue
        const item = this.take(source.machineIndex, source.port, 1)
        if (!item) continue
        m.inputBuffer[pi] = item
        return
      }
      return
    }

    if (m.type === 'log_connector') {
      const inPorts = def.ports.filter(p => p.port === 'IN')
      for (let pi = 0; pi < inPorts.length; pi++) {
        if (m.inputBuffer[pi]) continue
        if (m.inventory.storage[pi]) continue
        const inPort = inPorts[pi]
        const source = this.activeInput(machineIdx, inPort)
        if (!source) continue
        const item = this.take(source.machineIndex, source.port, 1)
        if (!item) continue
        m.inputBuffer[pi] = item
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

import type { ItemStack } from '../types/Machine'

export interface RuntimeStateSnapshot {
  x: number
  y: number
  type: string
  progress: number
  round: number
  storage: (ItemStack | null)[]
  inputBuffer: (ItemStack | null)[]
  nextOutSlot: number
  nextOutPortX: number
}

export interface RuntimeMachine {
  type: string
  rotate: number
  x: number
  y: number
  msPerRound: number
  progress: number
  round: number
  inventory: {
    storage: (ItemStack | null)[]
  }
  inputBuffer: (ItemStack | null)[]
  nextOutSlot: number
  nextOutPortX: number
}

export interface IEmulator {
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

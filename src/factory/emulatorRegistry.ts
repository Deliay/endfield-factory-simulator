import type { IEmulator } from './IEmulator'
import type { PlacedMachine } from '../types/Factory'

export type EmulatorConstructor = new (machines: PlacedMachine[]) => IEmulator

interface EmulatorEntry {
  type: string
  name: string
  ctor: EmulatorConstructor
}

class EmulatorRegistry {
  private entries: EmulatorEntry[] = []

  register(type: string, name: string, ctor: EmulatorConstructor): void {
    this.entries.push({ type, name, ctor })
  }

  getAll(): EmulatorEntry[] {
    return this.entries
  }

  get(type: string): EmulatorEntry | undefined {
    return this.entries.find(e => e.type === type)
  }
}

export const emulatorRegistry = new EmulatorRegistry()

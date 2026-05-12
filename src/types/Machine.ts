export interface Port {
  port: 'IN' | 'OUT'
  x: number
  y: number
  direction: 'N' | 'S' | 'E' | 'W'
}

export interface SideImage {
  url: string
  rotate?: number
}

export interface MachineDefinition {
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

class MachineRegistry {
  private machines: Map<string, MachineDefinition> = new Map()

  register(machine: MachineDefinition): void {
    this.machines.set(machine.type, machine)
  }

  get(type: string): MachineDefinition | undefined {
    return this.machines.get(type)
  }

  getAll(): MachineDefinition[] {
    return Array.from(this.machines.values())
  }
}

export const machineRegistry = new MachineRegistry()

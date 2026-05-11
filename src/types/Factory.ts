export interface PlacedMachine {
  type: string
  rotate: number
  x: number
  y: number
}

export interface Factory {
  machines: PlacedMachine[]
}

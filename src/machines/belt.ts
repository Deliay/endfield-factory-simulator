import { machineRegistry, type MachineDefinition } from '../types/Machine'

export const BELT_BACKGROUND_IMG = 'https://endfield-assets.fffdan.com/vfs/Bundle/file/assets/beyond/dynamicassets/gameplay/ui/sprites/blueprint/icon_belt_grid.png'
export const BELT_TOOL_ICON = 'https://endfield-assets.fffdan.com/vfs/Bundle/file/assets/beyond/dynamicassets/gameplay/ui/sprites/factory/buildingimage/image_grid_belt_01.png'
export const BELT_CORNER_1_IMG = 'https://endfield-assets.fffdan.com/vfs/Bundle/file/assets/beyond/dynamicassets/gameplay/ui/sprites/blueprint/icon_belt_corner_1.png'
export const BELT_CORNER_2_IMG = 'https://endfield-assets.fffdan.com/vfs/Bundle/file/assets/beyond/dynamicassets/gameplay/ui/sprites/blueprint/icon_belt_corner_2.png'

export const BeltConfig: MachineDefinition = {
  type: 'belt',
  name: '传送带',
  width: 1,
  height: 1,
  ports: [
    { port: 'IN', x: 0, y: 0, direction: 'W' },
    { port: 'OUT', x: 0, y: 0, direction: 'E' },
  ],
  inventoryCapacity: 1,
  msPerRound: 1000,
  backgroundImg: BELT_BACKGROUND_IMG,
  toolIcon: BELT_TOOL_ICON,
}

export const BeltCornerNeConfig: MachineDefinition = {
  type: 'belt_corner_ne',
  name: '传送带(北→东)',
  width: 1,
  height: 1,
  ports: [
    { port: 'IN', x: 0, y: 0, direction: 'N' },
    { port: 'OUT', x: 0, y: 0, direction: 'E' },
  ],
  inventoryCapacity: 1,
  msPerRound: 1000,
  backgroundImg: BELT_CORNER_1_IMG,
  toolIcon: BELT_TOOL_ICON,
}

export const BeltCornerEnConfig: MachineDefinition = {
  type: 'belt_corner_en',
  name: '传送带(东→北)',
  width: 1,
  height: 1,
  ports: [
    { port: 'IN', x: 0, y: 0, direction: 'E' },
    { port: 'OUT', x: 0, y: 0, direction: 'N' },
  ],
  inventoryCapacity: 1,
  msPerRound: 1000,
  backgroundImg: BELT_CORNER_2_IMG,
  toolIcon: BELT_TOOL_ICON,
}

// Register belt configurations
// Note: belt_corner_ne and belt_corner_en are internal machines used for auto-generated corners
// They are NOT shown in the toolbar (filtered out in App.tsx)
machineRegistry.register(BeltConfig)
machineRegistry.register(BeltCornerNeConfig)
machineRegistry.register(BeltCornerEnConfig)

import { machineRegistry } from '../types/Machine'

export const BELT_BACKGROUND_IMG = 'https://endfield-assets.fffdan.com/vfs/Bundle/file/assets/beyond/dynamicassets/gameplay/ui/sprites/blueprint/icon_belt_grid.png'
export const BELT_TOOL_ICON = 'https://endfield-assets.fffdan.com/vfs/Bundle/file/assets/beyond/dynamicassets/gameplay/ui/sprites/factory/buildingimage/image_grid_belt_01.png'
export const BELT_CORNER_1_IMG = 'https://endfield-assets.fffdan.com/vfs/Bundle/file/assets/beyond/dynamicassets/gameplay/ui/sprites/blueprint/icon_belt_corner_1.png'
export const BELT_CORNER_2_IMG = 'https://endfield-assets.fffdan.com/vfs/Bundle/file/assets/beyond/dynamicassets/gameplay/ui/sprites/blueprint/icon_belt_corner_2.png'

machineRegistry.register({
  type: 'belt',
  name: '传送带',
  width: 1,
  height: 1,
  ports: [
    { port: 'IN', x: 0, y: 0, direction: 'W' },
    { port: 'OUT', x: 0, y: 0, direction: 'E' },
  ],
  backgroundImg: BELT_BACKGROUND_IMG,
  toolIcon: BELT_TOOL_ICON,
})

machineRegistry.register({
  type: 'belt_corner_wn',
  name: '传送带(西→北)',
  width: 1,
  height: 1,
  ports: [
    { port: 'IN', x: 0, y: 0, direction: 'W' },
    { port: 'OUT', x: 0, y: 0, direction: 'N' },
  ],
  backgroundImg: BELT_CORNER_2_IMG,
  toolIcon: BELT_TOOL_ICON,
})

machineRegistry.register({
  type: 'belt_corner_nw',
  name: '传送带(北→西)',
  width: 1,
  height: 1,
  ports: [
    { port: 'IN', x: 0, y: 0, direction: 'N' },
    { port: 'OUT', x: 0, y: 0, direction: 'W' },
  ],
  backgroundImg: BELT_CORNER_1_IMG,
  toolIcon: BELT_TOOL_ICON,
})

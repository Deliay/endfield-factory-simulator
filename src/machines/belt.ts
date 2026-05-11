import { machineRegistry } from '../types/Machine'

export const BELT_BACKGROUND_IMG = 'https://endfield-assets.fffdan.com/vfs/Bundle/file/assets/beyond/dynamicassets/gameplay/ui/sprites/blueprint/icon_belt_grid.png'
export const BELT_TOOL_ICON = 'https://endfield-assets.fffdan.com/vfs/Bundle/file/assets/beyond/dynamicassets/gameplay/ui/sprites/factory/buildingimage/image_grid_belt_01.png'

machineRegistry.register({
  type: 'belt',
  name: '传送带',
  width: 1,
  height: 1,
  ports: [
    { port: 'IN', x: 0, y: 0, orientation: 'W' },
    { port: 'OUT', x: 1, y: 0, orientation: 'E' },
  ],
  backgroundImg: BELT_BACKGROUND_IMG,
  toolIcon: BELT_TOOL_ICON,
})

import { machineRegistry } from '../types/Machine'

export const SPLITTER_TOOL_ICON = 'https://endfield-assets.fffdan.com/vfs/Bundle/file/assets/beyond/dynamicassets/gameplay/ui/sprites/factory/buildingimage/image_log_splitter.png'
export const SPLITTER_GRID_ICON = 'https://endfield-assets.fffdan.com/vfs/Bundle/file/assets/beyond/dynamicassets/gameplay/ui/sprites/blueprint/bg_logistic_log_splitter.png'

machineRegistry.register({
  type: 'log_splitter',
  name: '分流器',
  width: 1,
  height: 1,
  ports: [
    { port: 'IN', x: 0, y: 0, direction: 'N' },
    { port: 'OUT', x: 0, y: 0, direction: 'E' },
    { port: 'OUT', x: 0, y: 0, direction: 'W' },
    { port: 'OUT', x: 0, y: 0, direction: 'S' },
  ],
  inventoryCapacity: 3,
  msPerRound: 2000,
  toolIcon: SPLITTER_TOOL_ICON,
  gridIcon: SPLITTER_GRID_ICON,
})

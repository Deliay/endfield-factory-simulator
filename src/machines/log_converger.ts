import { machineRegistry } from '../types/Machine'

export const CONVERGER_TOOL_ICON = 'https://endfield-assets.fffdan.com/vfs/Bundle/file/assets/beyond/dynamicassets/gameplay/ui/sprites/factory/buildingimage/image_log_converger.png'
export const CONVERGER_GRID_ICON = 'https://endfield-assets.fffdan.com/vfs/Bundle/file/assets/beyond/dynamicassets/gameplay/ui/sprites/blueprint/bg_logistic_log_converger.png'

machineRegistry.register({
  type: 'log_converger',
  name: '汇流器',
  width: 1,
  height: 1,
  ports: [
    { port: 'IN', x: 0, y: 0, direction: 'N' },
    { port: 'IN', x: 0, y: 0, direction: 'E' },
    { port: 'IN', x: 0, y: 0, direction: 'W' },
    { port: 'OUT', x: 0, y: 0, direction: 'S' },
  ],
  inventoryCapacity: 1,
  msPerRound: 2000,
  toolIcon: CONVERGER_TOOL_ICON,
  gridIcon: CONVERGER_GRID_ICON,
})

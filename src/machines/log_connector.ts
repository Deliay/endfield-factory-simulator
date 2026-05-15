import { machineRegistry } from '../types/Machine'

export const CONNECTOR_TOOL_ICON = 'https://endfield-assets.fffdan.com/vfs/Bundle/file/assets/beyond/dynamicassets/gameplay/ui/sprites/factory/buildingimage/image_log_connector.png'
export const CONNECTOR_GRID_ICON = 'https://endfield-assets.fffdan.com/vfs/Bundle/file/assets/beyond/dynamicassets/gameplay/ui/sprites/blueprint/bg_logistic_log_connector.png'

machineRegistry.register({
  type: 'log_connector',
  name: '物流桥',
  width: 1,
  height: 1,
  ports: [
    { port: 'IN', x: 0, y: 0, direction: 'N' },
    { port: 'IN', x: 0, y: 0, direction: 'E' },
    { port: 'IN', x: 0, y: 0, direction: 'S' },
    { port: 'IN', x: 0, y: 0, direction: 'W' },
    { port: 'OUT', x: 0, y: 0, direction: 'N' },
    { port: 'OUT', x: 0, y: 0, direction: 'E' },
    { port: 'OUT', x: 0, y: 0, direction: 'S' },
    { port: 'OUT', x: 0, y: 0, direction: 'W' },
  ],
  inventoryCapacity: 4,
  msPerRound: 2000,
  toolIcon: CONNECTOR_TOOL_ICON,
  gridIcon: CONNECTOR_GRID_ICON,
})

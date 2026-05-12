import { machineRegistry } from '../types/Machine'

export const STORAGE_BOX_TOOL_ICON = 'https://endfield-assets.fffdan.com/vfs/Bundle/file/assets/beyond/dynamicassets/gameplay/ui/sprites/factory/buildingimage/image_storager_1.png'
export const STORAGE_BOX_GRID_ICON = 'https://endfield-assets.fffdan.com/vfs/Bundle/file/assets/beyond/dynamicassets/gameplay/ui/sprites/factory/buildingpanelicon/icon_port_storager_1.png'
export const STORAGE_BOX_NORTH_SIDE_IMG = 'https://endfield-assets.fffdan.com/vfs/Bundle/file/assets/beyond/dynamicassets/gameplay/ui/sprites/blueprint/port_in_3.png'
export const STORAGE_BOX_SOUTH_SIDE_IMG = 'https://endfield-assets.fffdan.com/vfs/Bundle/file/assets/beyond/dynamicassets/gameplay/ui/sprites/blueprint/port_out_3.png'

machineRegistry.register({
  type: 'storage_box',
  name: '协议存储箱',
  width: 3,
  height: 3,
  ports: [
    { port: 'IN', x: 0, y: 0, direction: 'N' },
    { port: 'IN', x: 1, y: 0, direction: 'N' },
    { port: 'IN', x: 2, y: 0, direction: 'N' },
    { port: 'OUT', x: 0, y: 2, direction: 'S' },
    { port: 'OUT', x: 1, y: 2, direction: 'S' },
    { port: 'OUT', x: 2, y: 2, direction: 'S' },
  ],
  toolIcon: STORAGE_BOX_TOOL_ICON,
  gridIcon: STORAGE_BOX_GRID_ICON,
  northSideImg: { url: STORAGE_BOX_NORTH_SIDE_IMG },
  southSideImg: { url: STORAGE_BOX_SOUTH_SIDE_IMG, rotate: 180 },
})
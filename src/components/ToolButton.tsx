import type { MachineDefinition } from '../types/Machine'

interface ToolButtonProps {
  definition: MachineDefinition
  isActive: boolean
  isPlacing: boolean
  onClick: () => void
}

export function ToolButton({ definition, isActive, isPlacing, onClick }: ToolButtonProps) {
  if (!definition.toolIcon) return null

  return (
    <button
      className={`tool-button ${isActive ? 'active' : ''}`}
      onClick={onClick}
    >
      <img src={definition.toolIcon} alt={definition.name} className="tool-icon" />
      {isPlacing ? '放置中...' : definition.name}
    </button>
  )
}

import { IconButton, Separator } from '@chakra-ui/react';
import {
  LuCirclePlus,
  LuGitBranch,
  LuGrid3X3,
  LuMousePointer2,
  LuRedo2,
  LuTrash2,
  LuUndo2,
} from 'react-icons/lu';
import { Tooltip } from '@/components/ui/tooltip';
import { LifEditorPanel } from './lif-editor-panel';
import type { LifEditorPanelProps } from './lif-editor-panel';
import { useLifEditorSceneControl } from './use-lif-data';

export type LifEditorSceneControlProps = Omit<LifEditorPanelProps, 'variant'>;

export function LifEditorSceneControl(props: LifEditorSceneControlProps) {
  const {
    tool,
    selectTool,
    showGrid,
    viewMode,
    setShowGrid,
    hasSelection,
    deleteSelection,
    canUndo,
    canRedo,
    undo,
    redo,
  } = useLifEditorSceneControl();

  const buttons = [
    {
      id: 'select',
      label: 'Select / Pan',
      icon: <LuMousePointer2 />,
      active: tool === 'select',
      palette: 'blue',
      onClick: () => selectTool('select'),
    },
    {
      id: 'create-node',
      label: 'Create adjacent node',
      icon: <LuCirclePlus />,
      active: tool === 'createNode',
      palette: 'teal',
      onClick: () => selectTool('createNode'),
    },
    {
      id: 'create-edge',
      label: 'Connect edge — click two nodes',
      icon: <LuGitBranch />,
      active: tool === 'createEdge',
      palette: 'purple',
      onClick: () => selectTool('createEdge'),
    },
  ];

  return (
    <LifEditorPanel {...props} variant="left-panel">
      {buttons.map((button) => (
        <Tooltip key={button.id} content={button.label} showArrow>
          <IconButton
            aria-label={button.label}
            size="sm"
            variant={button.active ? 'solid' : 'ghost'}
            colorPalette={button.active ? button.palette : 'gray'}
            onClick={button.onClick}
          >
            {button.icon}
          </IconButton>
        </Tooltip>
      ))}

      <Tooltip content="Delete selected (Del)" showArrow>
        <IconButton
          aria-label="Delete selection"
          size="sm"
          variant="ghost"
          colorPalette="red"
          disabled={!hasSelection}
          onClick={deleteSelection}
        >
          <LuTrash2 />
        </IconButton>
      </Tooltip>

      <Tooltip content="Toggle grid" showArrow>
        <IconButton
          aria-label="Toggle grid"
          size="sm"
          variant={showGrid ? 'solid' : 'ghost'}
          colorPalette="gray"
          onClick={() => setShowGrid((current) => !current)}
          disabled={viewMode === 'map'}
        >
          <LuGrid3X3 />
        </IconButton>
      </Tooltip>

      <Separator orientation="horizontal" />

      <Tooltip content="Undo (Ctrl/Cmd+Z)" showArrow>
        <IconButton
          aria-label="Undo"
          size="sm"
          variant="ghost"
          disabled={!canUndo}
          onClick={undo}
        >
          <LuUndo2 />
        </IconButton>
      </Tooltip>
      <Tooltip content="Redo (Ctrl+Y)" showArrow>
        <IconButton
          aria-label="Redo"
          size="sm"
          variant="ghost"
          disabled={!canRedo}
          onClick={redo}
        >
          <LuRedo2 />
        </IconButton>
      </Tooltip>
    </LifEditorPanel>
  );
}

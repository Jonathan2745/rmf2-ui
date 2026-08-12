import { useMemo, useRef } from 'react';
import {
  Badge,
  Box,
  Button,
  Select,
  Text,
  createListCollection,
} from '@chakra-ui/react';
import {
  LuDownload,
  LuFolderOpen,
  LuImage,
  LuRefreshCw,
  LuSave,
} from 'react-icons/lu';
import { LifEditorPanel } from './lif-editor-panel';
import type { LifEditorPanelProps } from './lif-editor-panel';
import { useLifEditorCommandBar } from './use-lif-data';

export type LifEditorCommandBarProps = Omit<LifEditorPanelProps, 'variant'>;

export function LifEditorCommandBar(props: LifEditorCommandBarProps) {
  const lifInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const {
    document,
    layout,
    layoutIndex,
    isDirty,
    imageOverlay,
    saving,
    importing,
    exporting,
    switchLayout,
    saveDraft,
    importDraft,
    exportDraft,
    reloadDraft,
    importImage,
  } = useLifEditorCommandBar();

  const layoutCollection = useMemo(
    () =>
      createListCollection({
        items: (document?.layouts ?? []).map((item, index) => ({
          label: item.layoutName || item.layoutId,
          value: String(index),
        })),
      }),
    [document?.layouts],
  );

  return (
    <LifEditorPanel {...props} variant="top-panel">
      <input
        ref={lifInputRef}
        type="file"
        accept=".json,.lif"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void importDraft(file);
          event.target.value = '';
        }}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void importImage(file);
          event.target.value = '';
        }}
      />

      <Text fontWeight="semibold" fontSize="sm">
        LIF Editor
      </Text>

      {(document?.layouts.length ?? 0) > 1 && (
        <Select.Root
          collection={layoutCollection}
          value={[String(layoutIndex)]}
          onValueChange={({ value }) => switchLayout(Number(value[0]))}
          size="sm"
          w="190px"
        >
          <Select.Trigger>
            <Select.ValueText />
          </Select.Trigger>
          <Select.Content>
            {layoutCollection.items.map((item) => (
              <Select.Item key={item.value} item={item}>
                {item.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      )}

      {layout && (
        <Badge variant="outline">{layout.layoutName || layout.layoutId}</Badge>
      )}
      {isDirty && <Badge colorPalette="orange">Unsaved</Badge>}
      <Box flex={1} />

      <Button
        size="sm"
        variant="outline"
        loading={importing}
        onClick={() => lifInputRef.current?.click()}
      >
        <LuFolderOpen /> Import
      </Button>
      <Button
        size="sm"
        variant="outline"
        colorPalette={imageOverlay ? 'teal' : 'gray'}
        onClick={() => imageInputRef.current?.click()}
      >
        <LuImage /> {imageOverlay ? 'Change image' : 'Import image'}
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={!document}
        loading={exporting}
        onClick={() => void exportDraft()}
      >
        <LuDownload /> Export
      </Button>
      <Button size="sm" variant="outline" onClick={() => void reloadDraft()}>
        <LuRefreshCw /> Reload
      </Button>
      <Button
        size="sm"
        colorPalette="blue"
        disabled={!document || !isDirty}
        loading={saving}
        onClick={() => void saveDraft()}
      >
        <LuSave /> Save
      </Button>
    </LifEditorPanel>
  );
}

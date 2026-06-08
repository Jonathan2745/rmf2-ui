import { Button, HStack, Input } from '@chakra-ui/react';
import type { ChangeEvent } from 'react';

type LifEditorToolbarProps = {
  isSaving: boolean;
  isLoading: boolean;
  onRefresh: () => void;
  onSave: () => void;
  onImport: (file: File) => void;
  onExport: () => void;
};

export function LifEditorToolbar({
  isSaving,
  isLoading,
  onRefresh,
  onSave,
  onImport,
  onExport,
}: LifEditorToolbarProps) {
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onImport(file);

    event.target.value = '';
  };

  return (
    <HStack gap={2} wrap="wrap">
      <Button size="sm" onClick={onRefresh} loading={isLoading}>
        Refresh
      </Button>

      <Button size="sm" colorPalette="blue" onClick={onSave} loading={isSaving}>
        Save
      </Button>

      <Button size="sm" variant="surface" as="label">
        Import LIF
        <Input
          type="file"
          accept=".json,.lif"
          display="none"
          onChange={handleFileChange}
        />
      </Button>

      <Button size="sm" variant="surface" onClick={onExport}>
        Export LIF
      </Button>
    </HStack>
  );
}

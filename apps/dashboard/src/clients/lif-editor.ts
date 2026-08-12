import { useCallback, useMemo } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { MapAPI } from '@rmf2-ui/client';

import type {
  LifDocument,
  LoadMessage,
  LoadStatus,
} from '@/pages/dashboard/system/lif_editor/components/lif-types';

const LIF_BASE_URL =
  import.meta.env.VITE_LIF_BASE ??
  import.meta.env.VITE_MAP_BASE ??
  '';

const LIF_DOCUMENT_QUERY_KEY = [
  'lif-editor',
  'document',
] as const;

export interface ILifClient {
  getDocument(): Promise<LifDocument>;

  updateDocument(
    document: LifDocument,
  ): Promise<LifDocument>;

  importDocument(file: File): Promise<LifDocument>;

  exportDocument(
    document: LifDocument,
  ): Promise<Blob>;
}

class LiveLifClient implements ILifClient {
  private readonly client: MapAPI.Client;

  constructor(baseUrl: string) {
    this.client = new MapAPI.Client({
      baseUrl,
    });
  }

  async getDocument(): Promise<LifDocument> {
    return this.client.getLifEditorLayout() as Promise<LifDocument>;
  }

  async updateDocument(
    document: LifDocument,
  ): Promise<LifDocument> {
    return this.client.updateLifEditorLayout(
      document as unknown as MapAPI.LifDocument,
    ) as Promise<LifDocument>;
  }

  async importDocument(
    file: File,
  ): Promise<LifDocument> {
    return this.client.importLifEditorLayout(
      file,
    ) as Promise<LifDocument>;
  }

  exportDocument(
    document: LifDocument,
  ): Promise<Blob> {
    return this.client.exportLifEditorLayout(
      document as unknown as MapAPI.LifDocument,
    );
  }
}

export type LifEditorData = {
  lifClient: ILifClient;

  // Last document received from the backend.
  sourceDocument: LifDocument | null;

  loadStatus: LoadStatus;
  loadMessage?: LoadMessage;

  saving: boolean;
  importing: boolean;
  exporting: boolean;

  saveDocument(
    document: LifDocument,
  ): Promise<LifDocument>;

  importDocument(file: File): Promise<LifDocument>;

  exportDocument(document: LifDocument): Promise<void>;

  reload(): Promise<LifDocument | null>;
};

function downloadBlob(
  blob: Blob,
  filename: string,
): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = filename;
  anchor.click();

  URL.revokeObjectURL(url);
}

export function useLifEditor(): LifEditorData {
  const queryClient = useQueryClient();

  const lifClient = useMemo(
    () => new LiveLifClient(LIF_BASE_URL),
    [],
  );

  const documentQuery = useQuery({
    queryKey: LIF_DOCUMENT_QUERY_KEY,
    queryFn: () => lifClient.getDocument(),
    staleTime: Infinity,
    retry: 1,
  });

  const saveMutation = useMutation({
    mutationFn: (document: LifDocument) =>
      lifClient.updateDocument(document),

    onSuccess: (savedDocument) => {
      queryClient.setQueryData(
        LIF_DOCUMENT_QUERY_KEY,
        savedDocument,
      );
    },
  });

  const importMutation = useMutation({
    mutationFn: (file: File) =>
      lifClient.importDocument(file),

    onSuccess: (importedDocument) => {
      queryClient.setQueryData(
        LIF_DOCUMENT_QUERY_KEY,
        importedDocument,
      );
    },
  });

  const exportMutation = useMutation({
    mutationFn: async (document: LifDocument) => {
      const blob =
        await lifClient.exportDocument(document);

      downloadBlob(blob, 'layout.lif.json');
    },
  });

  const reload = useCallback(async () => {
    const result = await documentQuery.refetch();

    if (result.error) {
      throw result.error;
    }

    return result.data ?? null;
  }, [documentQuery.refetch]);

  const loadStatus: LoadStatus =
    documentQuery.isPending
      ? 'loading'
      : documentQuery.isError
        ? 'error'
        : 'success';

  const loadMessage: LoadMessage | undefined =
    documentQuery.isError
      ? {
          title: 'Unable to load LIF document',
          description:
            documentQuery.error instanceof Error
              ? documentQuery.error.message
              : String(documentQuery.error),
        }
      : undefined;

  return useMemo(
    () => ({
      lifClient,
      sourceDocument: documentQuery.data ?? null,
      loadStatus,
      loadMessage,

      saving: saveMutation.isPending,
      importing: importMutation.isPending,
      exporting: exportMutation.isPending,

      saveDocument: saveMutation.mutateAsync,
      importDocument: importMutation.mutateAsync,
      exportDocument: exportMutation.mutateAsync,
      reload,
    }),
    [
      lifClient,
      documentQuery.data,
      loadStatus,
      loadMessage,
      saveMutation.isPending,
      saveMutation.mutateAsync,
      importMutation.isPending,
      importMutation.mutateAsync,
      exportMutation.isPending,
      exportMutation.mutateAsync,
      reload,
    ],
  );
}

import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapAPI } from '@rmf2-ui/client';
import { toaster } from '@/components/ui/toaster';
import { FallbackLifClient } from './fallback-lif';

import type {
  LifDocument,
  LoadMessage,
  LoadStatus,
  MapImageMeta,
} from '@/pages/dashboard/system/lif_editor/components/lif-types';
import { BrokerStatusConfig } from './broker';

const LIF_BASE_URL =
  import.meta.env.VITE_LIF_BASE ?? import.meta.env.VITE_MAP_BASE ?? '';

const LIF_DOCUMENT_QUERY_KEY = ['lif-editor', 'document'] as const;
const MAP_IMAGE_QUERY_KEY = ['lif-editor', 'map-image'] as const;

async function getMapImage(): Promise<MapImageMeta | null> {
  const baseUrl = (BrokerStatusConfig.BASE ?? 'http://localhost:8000').replace(
    /\/$/,
    '',
  );
  const response = await fetch(`${baseUrl}/map/image/meta`);
  if (!response.ok) return null;
  const metadata = (await response.json()) as Omit<MapImageMeta, 'url'> & {
    url?: string;
  };
  return {
    ...metadata,
    url: `${baseUrl}${metadata.url ?? '/map/image'}`,
  };
}

export interface ILifClient {
  getDocument(): Promise<LifDocument>;

  updateDocument(document: LifDocument): Promise<LifDocument>;

  importDocument(file: File): Promise<LifDocument>;

  exportDocument(document: LifDocument): Promise<Blob>;
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

  async updateDocument(document: LifDocument): Promise<LifDocument> {
    return this.client.updateLifEditorLayout(
      document as unknown as MapAPI.LifDocument,
    ) as Promise<LifDocument>;
  }

  async importDocument(file: File): Promise<LifDocument> {
    return this.client.importLifEditorLayout(file) as Promise<LifDocument>;
  }

  exportDocument(document: LifDocument): Promise<Blob> {
    return this.client.exportLifEditorLayout(
      document as unknown as MapAPI.LifDocument,
    );
  }
}

class ResilientLifClient implements ILifClient {
  private readonly liveClient: ILifClient | null;
  private readonly fallbackClient = new FallbackLifClient();
  private usingFallback: boolean;

  constructor(baseUrl: string) {
    this.liveClient = baseUrl ? new LiveLifClient(baseUrl) : null;
    this.usingFallback = this.liveClient === null;
  }

  async getDocument(): Promise<LifDocument> {
    if (!this.liveClient) return this.fallbackClient.getDocument();

    try {
      return await this.liveClient.getDocument();
    } catch (error) {
      this.usingFallback = true;
      toaster.create({
        id: 'lif-editor-offline-fallback',
        title: 'LIF service unavailable',
        description: `Using the offline demo layout. ${String(error)}`,
        type: 'warning',
      });
      return this.fallbackClient.getDocument();
    }
  }

  updateDocument(document: LifDocument): Promise<LifDocument> {
    return this.usingFallback || !this.liveClient
      ? this.fallbackClient.updateDocument(document)
      : this.liveClient.updateDocument(document);
  }

  importDocument(file: File): Promise<LifDocument> {
    return this.usingFallback || !this.liveClient
      ? this.fallbackClient.importDocument(file)
      : this.liveClient.importDocument(file);
  }

  exportDocument(document: LifDocument): Promise<Blob> {
    return this.usingFallback || !this.liveClient
      ? this.fallbackClient.exportDocument(document)
      : this.liveClient.exportDocument(document);
  }
}

export type LifEditorData = {
  lifClient: ILifClient;

  // Last document received from the backend.
  sourceDocument: LifDocument | null;
  mapImage: MapImageMeta | null;

  loadStatus: LoadStatus;
  loadMessage?: LoadMessage;

  saving: boolean;
  importing: boolean;
  exporting: boolean;

  saveDocument(document: LifDocument): Promise<LifDocument>;

  importDocument(file: File): Promise<LifDocument>;

  exportDocument(document: LifDocument): Promise<void>;

  reload(): Promise<LifDocument | null>;
};

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = filename;
  anchor.click();

  URL.revokeObjectURL(url);
}

export function useLifEditor(): LifEditorData {
  const queryClient = useQueryClient();

  const lifClient = useMemo(() => new ResilientLifClient(LIF_BASE_URL), []);

  const documentQuery = useQuery({
    queryKey: LIF_DOCUMENT_QUERY_KEY,
    queryFn: () => lifClient.getDocument(),
    staleTime: Infinity,
    retry: 0,
  });
  const mapImageQuery = useQuery({
    queryKey: MAP_IMAGE_QUERY_KEY,
    queryFn: getMapImage,
    staleTime: Infinity,
    retry: 0,
  });

  const saveMutation = useMutation({
    mutationFn: (document: LifDocument) => lifClient.updateDocument(document),

    onSuccess: (savedDocument) => {
      queryClient.setQueryData(LIF_DOCUMENT_QUERY_KEY, savedDocument);
    },
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => lifClient.importDocument(file),

    onSuccess: (importedDocument) => {
      queryClient.setQueryData(LIF_DOCUMENT_QUERY_KEY, importedDocument);
    },
  });

  const exportMutation = useMutation({
    mutationFn: async (document: LifDocument) => {
      const blob = await lifClient.exportDocument(document);

      downloadBlob(blob, 'layout.lif.json');
    },
  });

  const reload = useCallback(async () => {
    const result = await documentQuery.refetch();

    if (result.error) {
      throw result.error;
    }

    return result.data ?? null;
  }, [documentQuery]);

  const loadStatus: LoadStatus = documentQuery.isPending
    ? 'loading'
    : documentQuery.isError
      ? 'error'
      : 'success';

  const loadMessage: LoadMessage | undefined = useMemo(
    () =>
      documentQuery.isError
        ? {
            title: 'Unable to load LIF document',
            description:
              documentQuery.error instanceof Error
                ? documentQuery.error.message
                : String(documentQuery.error),
          }
        : undefined,
    [documentQuery.error, documentQuery.isError],
  );

  return useMemo(
    () => ({
      lifClient,
      sourceDocument: documentQuery.data ?? null,
      mapImage: mapImageQuery.data ?? null,
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
      mapImageQuery.data,
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

import type { ILifClient } from './lif-editor';
import type { LifDocument } from '@/pages/dashboard/system/lif_editor/components/lif-types';

// Grid-style fallback based on rmf2-game's layout.lif.json fixture.
const FALLBACK_LIF_DOCUMENT: LifDocument = {
  metaInformation: {
    projectIdentification: 'RMF2 Offline Demo Layout',
    creator: 'RMF2 Dashboard',
    lifVersion: '1.0.0',
  },
  layouts: [
    {
      layoutId: 'offline-demo-layout',
      layoutName: 'Offline Demo Layout',
      layoutVersion: '1.0.0',
      layoutLevelId: '0',
      layoutDescription:
        'Fallback topology based on the rmf2-game LIF fixture.',
      nodes: [
        {
          nodeId: '1,2',
          nodeName: '1,2',
          mapId: 'offline-demo',
          nodePosition: { x: -6, y: 4 },
        },
        {
          nodeId: '2,2',
          nodeName: '2,2',
          mapId: 'offline-demo',
          nodePosition: { x: -2, y: 4 },
        },
        {
          nodeId: '3,2',
          nodeName: '3,2',
          mapId: 'offline-demo',
          nodePosition: { x: 2, y: 4 },
        },
        {
          nodeId: '4,2',
          nodeName: '4,2',
          mapId: 'offline-demo',
          nodePosition: { x: 6, y: 4 },
        },
        {
          nodeId: '1,1',
          nodeName: '1,1',
          mapId: 'offline-demo',
          nodePosition: { x: -6, y: 0 },
        },
        {
          nodeId: '2,1',
          nodeName: '2,1',
          mapId: 'offline-demo',
          nodePosition: { x: -2, y: 0 },
        },
        {
          nodeId: '3,1',
          nodeName: '3,1',
          mapId: 'offline-demo',
          nodePosition: { x: 2, y: 0 },
        },
        {
          nodeId: '4,1',
          nodeName: '4,1',
          mapId: 'offline-demo',
          nodePosition: { x: 6, y: 0 },
        },
      ],
      edges: [
        {
          edgeId: '1,2_TO_2,2',
          edgeName: '1,2 → 2,2',
          startNodeId: '1,2',
          endNodeId: '2,2',
        },
        {
          edgeId: '2,2_TO_3,2',
          edgeName: '2,2 → 3,2',
          startNodeId: '2,2',
          endNodeId: '3,2',
        },
        {
          edgeId: '3,2_TO_4,2',
          edgeName: '3,2 → 4,2',
          startNodeId: '3,2',
          endNodeId: '4,2',
        },
        {
          edgeId: '1,1_TO_2,1',
          edgeName: '1,1 → 2,1',
          startNodeId: '1,1',
          endNodeId: '2,1',
        },
        {
          edgeId: '2,1_TO_3,1',
          edgeName: '2,1 → 3,1',
          startNodeId: '2,1',
          endNodeId: '3,1',
        },
        {
          edgeId: '3,1_TO_4,1',
          edgeName: '3,1 → 4,1',
          startNodeId: '3,1',
          endNodeId: '4,1',
        },
        {
          edgeId: '1,1_TO_1,2',
          edgeName: '1,1 → 1,2',
          startNodeId: '1,1',
          endNodeId: '1,2',
        },
        {
          edgeId: '2,1_TO_2,2',
          edgeName: '2,1 → 2,2',
          startNodeId: '2,1',
          endNodeId: '2,2',
        },
        {
          edgeId: '3,1_TO_3,2',
          edgeName: '3,1 → 3,2',
          startNodeId: '3,1',
          endNodeId: '3,2',
        },
        {
          edgeId: '4,1_TO_4,2',
          edgeName: '4,1 → 4,2',
          startNodeId: '4,1',
          endNodeId: '4,2',
        },
      ],
      stations: [
        {
          stationId: 'offline-station',
          stationName: 'Offline Demo Station',
          stationPosition: { x: 6, y: 4 },
          interactionNodeIds: ['4,2'],
        },
      ],
    },
  ],
};

function cloneDocument(document: LifDocument): LifDocument {
  return structuredClone(document);
}

export class FallbackLifClient implements ILifClient {
  private document = cloneDocument(FALLBACK_LIF_DOCUMENT);

  async getDocument(): Promise<LifDocument> {
    return cloneDocument(this.document);
  }

  async updateDocument(document: LifDocument): Promise<LifDocument> {
    this.document = cloneDocument(document);
    return cloneDocument(this.document);
  }

  async importDocument(file: File): Promise<LifDocument> {
    const parsed = JSON.parse(await file.text()) as LifDocument;
    if (!Array.isArray(parsed.layouts)) {
      throw new Error('Invalid LIF file: layouts[] is required.');
    }
    return this.updateDocument(parsed);
  }

  async exportDocument(document: LifDocument): Promise<Blob> {
    return new Blob([JSON.stringify(document, null, 2)], {
      type: 'application/json',
    });
  }
}

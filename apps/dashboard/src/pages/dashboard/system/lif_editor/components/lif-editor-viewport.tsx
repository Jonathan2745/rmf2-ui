import '@xyflow/react/dist/style.css';

import type { BoxProps } from '@chakra-ui/react';
import { Box } from '@chakra-ui/react';
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useViewport,
  type NodeTypes,
  type OnEdgesDelete,
  type OnNodesDelete,
} from '@xyflow/react';
import { LifFlowNode } from './lif-flow-node';
import { LifMapCanvas } from './lif-map-canvas';
import { LIF_MAP_SCALE } from './constants';
import { useLifEditorViewport } from './use-lif-data';
import type { ImageOverlay } from './lif-types';

const NODE_TYPES: NodeTypes = { lifNode: LifFlowNode };

function ImageOverlayLayer({ overlay }: { overlay: ImageOverlay }) {
  const { x: tx, y: ty, zoom } = useViewport();
  const width = overlay.naturalW * overlay.scale;
  const height = overlay.naturalH * overlay.scale;
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    >
      <img
        src={overlay.url}
        draggable={false}
        alt="Imported map overlay"
        style={{
          position: 'absolute',
          left: tx + overlay.x * zoom,
          top: ty + overlay.y * zoom,
          width: width * zoom,
          height: height * zoom,
          opacity: overlay.opacity,
        }}
      />
    </div>
  );
}

function LifEditorViewportContent(props: BoxProps) {
  const context = useLifEditorViewport();
  const { screenToFlowPosition } = useReactFlow();
  const onNodesDelete: OnNodesDelete = (nodes) =>
    nodes.forEach((node) => context.deleteNode(node.id));
  const onEdgesDelete: OnEdgesDelete = (edges) =>
    edges.forEach((edge) => context.deleteEdge(edge.id));

  return (
    <Box flex={1} minW={0} minH={0} position="relative" bg="white" {...props}>
      {context.viewMode === 'editor' ? (
        <>
          {context.imageOverlay && (
            <ImageOverlayLayer overlay={context.imageOverlay} />
          )}
          <ReactFlow
            nodes={context.rfNodes}
            edges={context.rfEdges}
            nodeTypes={NODE_TYPES}
            onNodeClick={context.onNodeClick}
            onEdgeClick={context.onEdgeClick}
            onConnect={context.onConnect}
            onNodesDelete={onNodesDelete}
            onEdgesDelete={onEdgesDelete}
            deleteKeyCode={['Backspace', 'Delete']}
            onPaneClick={(event) => {
              if (context.tool === 'createNode') {
                context.createNodeAt(
                  screenToFlowPosition({ x: event.clientX, y: event.clientY }),
                );
              } else {
                context.onPaneClick();
              }
            }}
            nodesDraggable={false}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            style={{ background: 'transparent', cursor: undefined }}
          >
            {context.showGrid && (
              <Background
                variant={BackgroundVariant.Dots}
                gap={LIF_MAP_SCALE}
                size={1.5}
                color="#d0d0d0"
              />
            )}
            <Controls />
            <MiniMap
              nodeColor={(node) => (node.selected ? '#ff9800' : '#1abc9c')}
              maskColor="rgba(240,240,240,0.7)"
              style={{ bottom: 48 }}
            />
          </ReactFlow>
        </>
      ) : (
        <LifMapCanvas
          lifNodes={context.lifNodes}
          lifEdges={context.lifEdges}
          selectedNodeId={context.selectedNodeId}
          selectedEdgeId={context.selectedEdgeId}
          edgeStartNodeId={context.edgeStartNodeId}
          previewNode={context.adjacentNodePreview}
          tool={context.tool === 'createNode' ? 'select' : context.tool}
          onPickNode={context.pickNode}
          onPickEdge={context.pickEdge}
          onCreateNode={() => undefined}
          onCreateEdge={context.createEdgeBetween}
          rotated={context.mapRotated}
          onToggleRotate={() => context.setMapRotated((value) => !value)}
          mapImage={context.mapImage}
        />
      )}
    </Box>
  );
}

export type LifEditorViewportProps = BoxProps;

export function LifEditorViewport(props: LifEditorViewportProps) {
  return (
    <ReactFlowProvider>
      <LifEditorViewportContent {...props} />
    </ReactFlowProvider>
  );
}

'use client';

import { GraphData, GraphNode, GraphRel } from './graph-types';

type ApiNode = {
  id: string;
  labels: string[];
  properties: Record<string, string>;
};

type ApiEdge = {
  id: string;
  from: string;
  to: string;
  type: string;
};

type ApiGraphResponse = {
  nodes: ApiNode[];
  edges: ApiEdge[];
};

const NODE_SIZE = 20;

const isDocument = (labels: string[]) => labels.includes('Document');
const isChunk = (labels: string[]) => labels.includes('Chunk');

const getNodeCaption = (node: ApiNode) => {
  if (isDocument(node.labels)) return 'Document';
  if (isChunk(node.labels)) return 'Chunk';
  return node.properties.name || 'Entity';
};

const getNodeColor = (node: ApiNode) => {
  if (isDocument(node.labels)) return '#ffffff';
  if (isChunk(node.labels)) return '#f2b963';
  return '#58abc4';
};

const getNodeType = (node: ApiNode) => {
  if (isDocument(node.labels)) return node.properties.document_type || 'Document';
  if (isChunk(node.labels)) return 'Chunk';
  return node.labels[2] || 'Entity';
};

const getNodeDesc = (node: ApiNode) => {
  if (isDocument(node.labels)) return node.properties.path || '';
  if (isChunk(node.labels)) return node.properties.text || '';
  return 'None';
};

export const formatGraphResponse = (data: ApiGraphResponse): GraphData => {
  const nodes: GraphNode[] = data.nodes.map((node) => ({
    id: node.id,
    caption: getNodeCaption(node),
    size: NODE_SIZE,
    color: getNodeColor(node),
    type: getNodeType(node),
    desc: getNodeDesc(node),
    entryId: node.properties.id || null,
  }));

  const rels: GraphRel[] = data.edges.map((edge) => ({
    id: edge.id,
    from: edge.from,
    to: edge.to,
    caption: edge.type,
  }));

  return { nodes, rels };
};

export const normalizeRelCaption = (caption: string) =>
  caption.trim().toUpperCase().replace(/\s+/g, '_');

export const buildSavePayload = (graphData: GraphData) => {
  const nodes = graphData.nodes
    .filter((node) => node.entryId)
    .map((node) => ({
      id: node.entryId,
      labels:
        node.type === 'Document'
          ? ['Document']
          : node.type === 'Chunk'
            ? ['Chunk']
            : node.type
              ? ['Entity', node.type]
              : ['Entity'],
      properties:
        node.type === 'Document'
          ? { document_type: node.type, path: node.desc }
          : node.type === 'Chunk'
            ? { text: node.desc }
            : { name: node.caption },
    }));

  const edges = graphData.rels.map((rel) => ({
    from: rel.from,
    to: rel.to,
    type: rel.caption,
    properties: {},
  }));

  return { nodes, edges };
};

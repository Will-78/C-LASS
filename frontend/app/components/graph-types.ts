'use client';

export interface GraphNode {
  id: string;
  caption: string;
  size: number;
  color: string;
  type: string;
  desc: string;
  entryId: string | number | null;
}

export interface GraphRel {
  id: string;
  from: string;
  to: string;
  caption: string;
}

export interface GraphData {
  nodes: GraphNode[];
  rels: GraphRel[];
}

export type GraphEntity = GraphNode | GraphRel;

export interface GraphMenuPosition {
  x: number;
  y: number;
}

export interface RelationshipDraft {
  from: string;
  to: string;
  caption: string;
}

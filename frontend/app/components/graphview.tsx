'use client';
import { useState, useEffect } from 'react';
import { InteractiveNvlWrapper } from '@neo4j-nvl/react';
import  NodeView  from './nodeview';

interface GraphNode {
  id: string;
  caption: string;
  size: number;
  color: string;
  type: string;
  desc: string;
}

interface GraphRel {
  id: string;
  from: string;
  to: string;
  caption: string;
}

interface GraphData {
  nodes: GraphNode[];
  rels: GraphRel[];
}

export default function GraphView() {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], rels: [] });
  const [selectedNode, setSelectedNode] = useState<any | null>(null);

  // TODO: optimize label checks

  useEffect(() => {
    async function fetchData() {
      const response = await fetch('/api/get-graph-info');
      const data = await response.json();

      const formattedNodes = data.nodes.map((n: any) => ({
        id: n.id,
        caption: 
            n.labels.includes('Document') ? 'Document' :
            n.labels.includes('Chunk') ? 'Chunk' :
            n.properties.name,
        size: 20,
        color: 
            n.labels.includes('Document') ? '#ffffff' :  
            n.labels.includes('Chunk') ? '#f2b963' :
            '#58abc4',
        type: 
            n.labels.includes('Document') ? n.properties.document_type :
            n.labels.includes('Chunk') ? 'Chunk' :
            n.labels[2]
        ,
        desc: 
            n.labels.includes('Document') ? n.properties.path :
            n.labels.includes('Chunk') ? n.properties.text :
            'None',
      }));

      const formattedRels = data.edges.map((e: any) => ({
        id: e.id,
        from: e.from,
        to: e.to,
        caption: e.type,
      }));

      setGraphData({ nodes: formattedNodes, rels: formattedRels });
    }
    fetchData();
  }, []);

  return (
    <div className="graph-layout">
      {selectedNode && (
        <NodeView node={selectedNode} 
          onClose={() => setSelectedNode(null)}
          onSave={(updatedNode: GraphNode) => {
            
            setGraphData(prevData => ({
              ...prevData,
              nodes: prevData.nodes.map(n => n.id === updatedNode.id ? { ...n, ...updatedNode } : n),
            }));

            setSelectedNode(null);
          }}
        />
      )}

      <div className="graph-canvas">
        <InteractiveNvlWrapper 
          nodes={graphData.nodes} 
          rels={graphData.rels}
          mouseEventCallbacks={{
            onNodeClick(node, event) {
              setSelectedNode(null);
              setSelectedNode(node);
            },
            onDragStart: (node, event) => {
              console.log(`Drag started on ${node[0].id}`);
            },
            onDrag: (node, event) => {
              console.log(`Dragging node ${node[0].id}`);
            },
            onDragEnd: (node, event) => {
              console.log(`Drag ended on node ${node[0].id}`);
            },
            onPan: (panning, event) => {},
            onZoom: (zoomLevel, event) => {}
          }}
          nvlOptions={{
              layout: 'forceDirected',
              initialZoom: 1.0,
              minZoom: 0.05,
              maxZoom: 5.0,
              renderer: 'canvas'
            }}
        />
      </div>
    </div>
  );
}
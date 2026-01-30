'use client';
import { useState, useEffect } from 'react';
import { InteractiveNvlWrapper } from '@neo4j-nvl/react';

export default function GraphView() {
  const [graphData, setGraphData] = useState({ nodes: [], rels: [] });

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
            '#58abc4'
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
    <div className="h-screen w-full bg-zinc-950">
      <InteractiveNvlWrapper 
        nodes={graphData.nodes} 
        rels={graphData.rels}
        mouseEventCallbacks={{
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
  );
}
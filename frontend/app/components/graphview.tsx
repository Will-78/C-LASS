'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { InteractiveNvlWrapper } from '@neo4j-nvl/react';

export default function GraphView() {
  const [graphData, setGraphData] = useState({ nodes: [], rels: [] });
  const [menuData, setMenuData] = useState(null); // menu for adding nodes

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

  const handleCanvasClick = useCallback((event) => {
    setMenuData({
      x: event.clientX,
      y: event.clientY
    });
  }, []);

  const createNewNode = () => {
    if (!menuData) return;

    const newNode = {
      id: `node-${Date.now()}`,
      caption: 'New Entity',
      size: 20,
      color: '#10b981'
    };

    setGraphData(prev => ({
      ...prev,
      nodes: [...prev.nodes, newNode]
    }));
    
    setMenuData(null);
  };

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
          onZoom: (zoomLevel, event) => {},
          onCanvasClick: (event) => {handleCanvasClick(event)}
        }}
        nvlOptions={{
            layout: 'forceDirected',
            initialZoom: 1.0,
            minZoom: 0.05,
            maxZoom: 5.0,
            renderer: 'canvas'
          }}
      />

      {menuData && (
        <div 
          className="fixed z-[9999] bg-white text-slate-900 rounded-lg shadow-2xl py-2 w-48 border border-slate-200"
          style={{ 
            top: `${menuData.y}px`, 
            left: `${menuData.x}px` 
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-4 py-1 text-xs font-bold text-slate-400 uppercase tracking-wider">
            Actions
          </div>
          <button 
            onClick={createNewNode}
            className="w-full text-left px-4 py-2 hover:bg-blue-50 hover:text-blue-600 transition-colors flex items-center gap-2 font-medium"
          >
            <span>+</span> Add New Node
          </button>
        </div>
      )}
    </div>
  );
}
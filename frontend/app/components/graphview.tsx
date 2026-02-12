'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
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
  const [graphData, setGraphData] = useState({ nodes: [], rels: [] });
  const [menuData, setMenuData] = useState(null); // menu for adding nodes
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [changesMade, setChangesMade] = useState(false);

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

    setChangesMade(true);
    
    setMenuData(null);
  };

  return (
    <div className="graph-layout">
      {selectedNode && (
        <NodeView node={selectedNode} 
          onClose={() => setSelectedNode(null)}
          deleteNode={(deleteNode: GraphNode) => {
            setGraphData(prevData => ({
              ...prevData,
              nodes: prevData.nodes.filter(n => n.id !== deleteNode.id),
              rels: prevData.rels.filter(r => r.from !== deleteNode.id && r.to !== deleteNode.id)
            }));

            setSelectedNode(null);
            setChangesMade(true);
          }}
          onSave={(updatedNode: GraphNode) => {
            
            setGraphData(prevData => ({
              ...prevData,
              nodes: prevData.nodes.map(n => n.id === updatedNode.id ? { ...n, ...updatedNode } : n),
            }));

            setSelectedNode(null);
            setChangesMade(true);
          }}
        />
      )}

      {/* Backdrop allows clicking off menu to close it */}
      {menuData && (
        <div 
          className="fixed inset-0 z-10" 
          onClick={() => setMenuData(null)} 
        />
      )}

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
            Add New Node
          </button>
        </div>
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
      </div>

      <button 
        className="absolute bottom-4 left-4 rounded-lg shadow px-4 py-2 border transition-colors z-[9999] disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          backgroundColor: changesMade ? 'white' : '#f3f4f6',
          color: changesMade ? '#0f172a' : '#9ca3af',
          borderColor: changesMade ? '#e2e8f0' : '#d1d5db'
        }}
        disabled={!changesMade}
        onClick={() => {
          setSelectedNode(null);
          setMenuData(null);
          if (changesMade) {
            setChangesMade(false);
          }
        }}
      >
        Save Changes
      </button>
    </div>
  );
}
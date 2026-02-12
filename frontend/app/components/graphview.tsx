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
  const [menuData, setMenuData] = useState(null); // menu for adding nodes and relationship
  const [relMenu, setRelMenu] = useState(false); // menu for adding relationships
  const [newRelationship, setNewRelationship] = useState<GraphRel | null>(null);
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

  const createNewRelationship = () => {
    if (!menuData) return;
    setRelMenu(true);
    setMenuData(null);
  }

  const handleAddRelationship = () => {
    let nodeId1 = graphData.nodes.find(item => item.caption === newRelationship.from)?.id;
    let nodeId2 = graphData.nodes.find(item => item.caption === newRelationship.to)?.id;

    if (!nodeId1 || !nodeId2) {
      const missing = !nodeId1 && !nodeId2 ? "Both nodes" : !nodeId1 ? `'${newRelationship.from}'` : `'${newRelationship.to}'`;
      alert(`Error: ${missing} does not exist in the graph.`);
      return;
    }

    setRelMenu(false);

    const newRel = {
      id: `rel-${Date.now()}`,
      from: nodeId1,
      to: nodeId2,
      caption: newRelationship.caption
    };

    setGraphData(prev => ({
      ...prev,
      rels: [...prev.rels, newRel]
    }));

    setNewRelationship(null);
  }

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
          }}
          onSave={(updatedNode: GraphNode) => {
            
            setGraphData(prevData => ({
              ...prevData,
              nodes: prevData.nodes.map(n => n.id === updatedNode.id ? { ...n, ...updatedNode } : n),
            }));

            setSelectedNode(null);
          }}
        />
      )}

      {relMenu && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          {/* This wrapper centers it on the screen; the z-50 ensures it stays on top */}
          
          <div className="flex flex-col gap-3 h-auto w-80 p-6 bg-[#141414eb] text-white shadow-2xl rounded-lg border border-gray-700">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400">From:</label>
              <input 
                className="bg-gray-800 border border-gray-600 p-2 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500" 
                placeholder="Node Caption"
                value={newRelationship?.from || ""} 
                onChange={(e) => setNewRelationship({ ...newRelationship, from: e.target.value })}
              />
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Caption:</label>
              <input 
                className="bg-gray-800 border border-gray-600 p-2 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Relationship Caption"
                value={newRelationship?.caption || ""}  
                onChange={(e) => setNewRelationship({ ...newRelationship, caption: e.target.value })}
              />
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400">To:</label>
              <input 
                className="bg-gray-800 border border-gray-600 p-2 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Node Caption"
                value={newRelationship?.to || ""} 
                onChange={(e) => setNewRelationship({ ...newRelationship, to: e.target.value })} 
              />
            </div>

            <button 
              onClick={handleAddRelationship} 
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
            >
              Add Relationship
            </button>
            <button 
              onClick={ () => {
                  setNewRelationship(null);
                  setRelMenu(false);
                }
              }
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
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
          <button 
            onClick={createNewRelationship}
            className="w-full text-left px-4 py-2 hover:bg-blue-50 hover:text-blue-600 transition-colors flex items-center gap-2 font-medium"
          >
            Add Relationship
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
    </div>
  );
}
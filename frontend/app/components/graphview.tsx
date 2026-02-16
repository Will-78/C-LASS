'use client';
import { useState, useEffect, useCallback } from 'react';
import { InteractiveNvlWrapper } from '@neo4j-nvl/react';
import EntityView from './entityview';
import GraphCurationMenu from './graph-curation-menu';
import RelationshipMenu from './relationship-menu';
import {
  GraphData,
  GraphEntity,
  GraphMenuPosition,
  RelationshipDraft,
} from './graph-types';
import { buildSavePayload, formatGraphResponse, normalizeRelCaption } from './graph-utils';

export default function GraphView() {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], rels: [] });
  const [menuData, setMenuData] = useState<GraphMenuPosition | null>(null);
  const [relMenu, setRelMenu] = useState(false);
  const [newRelationship, setNewRelationship] = useState<RelationshipDraft | null>(
    null
  );
  const [selectedEntity, setSelectedEntity] = useState<GraphEntity | null>(null);
  const [changesMade, setChangesMade] = useState(false);

  // TODO: optimize label checks

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/get-graph-info');
        const data = await response.json();
        setGraphData(formatGraphResponse(data));
      } catch (error) {
        console.error('Error fetching graph data:', error);
      }
    };

    fetchData();
  }, []);

  const handleCanvasClick = useCallback(
    (event: { clientX: number; clientY: number }) => {
      setMenuData({
        x: event.clientX,
        y: event.clientY,
      });
    },
    []
  );

  const saveChanges = async () => {
    try {

      const reformattedGraphData = buildSavePayload(graphData);
      const response = await fetch('/api/save-graph-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reformattedGraphData)
      });

      if (!response.ok) {
        throw new Error('Failed to save graph changes');
      }

    } catch (error) {
      console.error('Error saving graph changes:', error);
    }
  };

  const createNewNode = () => {
    if (!menuData) return;
    const timestamp = Date.now();
    const newNode = {
      id: `node-${timestamp}`,
      caption: 'New Entity',
      size: 20,
      color: '#10b981',
      type: 'Entity',
      desc: '',
      entryId: `node-${timestamp}`
    };

    setGraphData(prev => ({
      ...prev,
      nodes: [...prev.nodes, newNode]
    }));

    setChangesMade(true);
    
    setMenuData(null);
  };

  const createNewRelationship = () => {
    if (!menuData) return;
    setNewRelationship({ from: '', to: '', caption: '' });
    setRelMenu(true);
    setMenuData(null);
  };

  const handleAddRelationship = () => {
    if (!newRelationship) return;

    const fromCaption = newRelationship.from.trim();
    const toCaption = newRelationship.to.trim();
    const caption = newRelationship.caption.trim();

    if (!fromCaption || !toCaption || !caption) {
      alert('Error: Please fill in all fields.');
      return;
    }

    const nodeId1 = graphData.nodes.find((item) => item.caption === fromCaption)?.id;
    const nodeId2 = graphData.nodes.find((item) => item.caption === toCaption)?.id;

    if (!nodeId1 || !nodeId2) {
      const missing =
        !nodeId1 && !nodeId2
          ? 'Both nodes'
          : !nodeId1
            ? `'${fromCaption}'`
            : `'${toCaption}'`;
      alert(`Error: ${missing} does not exist in the graph.`);
      return;
    }

    setRelMenu(false);

    const newRel = {
      id: `rel-${Date.now()}`,
      from: nodeId1,
      to: nodeId2,
      caption: normalizeRelCaption(caption),
    };

    setGraphData((prev) => ({
      ...prev,
      rels: [...prev.rels, newRel],
    }));

    setChangesMade(true);
    setNewRelationship(null);
  };

  return (
    <div className="relative h-[88vh]">
      {/* Node/relationship view */}
      {selectedEntity && (
        <EntityView entity={selectedEntity} 
          onClose={() => setSelectedEntity(null)}
          deleteEntity={(deletedEntity) => {
            setGraphData(prevData => ({
              ...prevData,
              nodes: prevData.nodes.filter(n => n.id !== deletedEntity.id),
              rels: prevData.rels.filter(r => r.from !== deletedEntity.id && r.to !== deletedEntity.id)
            }));

            setSelectedEntity(null);
            setChangesMade(true);
          }}
          onSave={(updatedEntity) => {
            
            setGraphData(prevData => ({
              ...prevData,
              nodes: prevData.nodes.map(n => n.id === updatedEntity.id ? { ...n, ...updatedEntity } : n)
            }));

            setSelectedEntity(null);
            setChangesMade(true);
          }}
        />
      )}

      {/* Add relationship menu */}
      {relMenu && newRelationship && (
        <RelationshipMenu
          draft={newRelationship}
          onChange={setNewRelationship}
          onAdd={handleAddRelationship}
          onCancel={() => {
            setNewRelationship(null);
            setRelMenu(false);
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

      {/* Graph curation menu */}
      {menuData && (
        <GraphCurationMenu
          position={menuData}
          onAddNode={createNewNode}
          onAddRelationship={createNewRelationship}
        />
      )}

      {/* Neo4j nvl wrapper */}
      <div className="absolute inset-0 box-border">
        <InteractiveNvlWrapper 
          nodes={graphData.nodes} 
          rels={graphData.rels}
          mouseEventCallbacks={{
            onNodeClick(node: any, event: any) {
              setSelectedEntity(null);
              setSelectedEntity(node);
            },
            onRelationshipClick(rel: any, event: any) {
              setSelectedEntity(null);
              setSelectedEntity(rel);
            },
            onDragStart: (node: any, event: any) => {
              console.log(`Drag started on ${node[0].id}`);
            },
            onDrag: (node: any, event: any) => {
              console.log(`Dragging node ${node[0].id}`);
            },
            onDragEnd: (node: any, event: any) => {
              console.log(`Drag ended on node ${node[0].id}`);
            },
            onPan: (panning: any, event: any) => {},
            onZoom: (zoomLevel: any, event: any) => {},
            onCanvasClick: (event: any) => {handleCanvasClick(event)}
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
      
      {/* Save changes button */}
      <button 
        className="absolute bottom-4 left-4 rounded-lg shadow px-4 py-2 border transition-colors z-[9999] disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          backgroundColor: changesMade ? 'white' : '#f3f4f6',
          color: changesMade ? '#0f172a' : '#9ca3af',
          borderColor: changesMade ? '#e2e8f0' : '#d1d5db'
        }}
        disabled={!changesMade}
        onClick={() => {
          setSelectedEntity(null);
          setMenuData(null);
          saveChanges();
          setChangesMade(false);
        }}
      >
        Save Changes
      </button>
    </div>
  );
}
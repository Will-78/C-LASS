'use client';
import { useState, useEffect, useCallback } from 'react';
import { InteractiveNvlWrapper } from '@neo4j-nvl/react';
import EntityView from './entity-view';
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
  const [newRelationship, setNewRelationship] = useState<RelationshipDraft | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<GraphEntity | null>(null);
  const [changesMade, setChangesMade] = useState(false);
  const [EntitiesToDelete, setEntitiesToDelete] = useState<Set<any>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  // Teacher prompt state
  const [teacherPrompt, setTeacherPrompt] = useState("");
  const [teacherPromptChanged, setTeacherPromptChanged] = useState(false);
  const [promptSaveMessage, setPromptSaveMessage] = useState("");

  // Load initial graph and teacher prompt
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/get-graph-info');
        const data = await response.json();
        setGraphData(formatGraphResponse(data));

        const username = localStorage.getItem("username");
        if (username) {
          const res = await fetch("/api/get-teacher-prompt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username })
          });
          const dataPrompt = await res.json();
          setTeacherPrompt(dataPrompt.prompt || "");
        }
      } catch (error) {
        console.error('Error fetching graph data or teacher prompt:', error);
      }
    };
    fetchData();
  }, []);

  const handleCanvasClick = useCallback(
    (event: { clientX: number; clientY: number }) => {
      setMenuData({ x: event.clientX, y: event.clientY });
    },
    []
  );

  const saveChanges = async () => {
    setIsSaving(true);
    try {
      // Save graph changes
      if (changesMade) {
        const reformattedGraphData = buildSavePayload(graphData, EntitiesToDelete);
        const response = await fetch('/api/save-graph-info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reformattedGraphData)
        });
        if (!response.ok) throw new Error('Failed to save graph changes');
        setEntitiesToDelete(new Set());
        setChangesMade(false);
      }

      // Save teacher prompt
      if (teacherPromptChanged) {
        const username = localStorage.getItem("username");
        if (username) {
          await fetch("/api/set-teacher-prompt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, prompt: teacherPrompt })
          });
          setPromptSaveMessage("Saved successfully!");
          setTimeout(() => setPromptSaveMessage(""), 3000); // Hide after 3 sec
          setTeacherPromptChanged(false);
        }
      }
    } catch (error) {
      console.error('Error saving graph changes or teacher prompt:', error);
    } finally {
      setIsSaving(false);
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
    setGraphData(prev => ({ ...prev, nodes: [...prev.nodes, newNode] }));
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
    const nodeId1 = graphData.nodes.find(n => n.caption === fromCaption)?.id;
    const nodeId2 = graphData.nodes.find(n => n.caption === toCaption)?.id;
    if (!nodeId1 || !nodeId2) {
      const missing = !nodeId1 && !nodeId2 ? 'Both nodes' : !nodeId1 ? `'${fromCaption}'` : `'${toCaption}'`;
      alert(`Error: ${missing} does not exist in the graph.`);
      return;
    }

    setRelMenu(false);
    const newRel = { id: `rel-${Date.now()}`, from: nodeId1, to: nodeId2, caption: normalizeRelCaption(caption) };
    setGraphData(prev => ({ ...prev, rels: [...prev.rels, newRel] }));
    setChangesMade(true);
    setNewRelationship(null);
  };

  return (
    <div className="relative h-[88vh]">
      {selectedEntity && (
        <EntityView
          entity={selectedEntity}
          onClose={() => setSelectedEntity(null)}
          deleteEntity={(deletedEntity) => {
            setGraphData(prev => ({
              ...prev,
              nodes: prev.nodes.filter(n => n.id !== deletedEntity.id),
              rels: prev.rels.filter(r => r.from !== deletedEntity.id && r.to !== deletedEntity.id && r.id !== deletedEntity.id)
            }));
            setSelectedEntity(null);
            setChangesMade(true);
            const entryId = deletedEntity.entryId ? ['node', deletedEntity.entryId.toString()] : ['rel', deletedEntity.id];
            setEntitiesToDelete(prev => new Set(prev).add(entryId));
          }}
          onSave={(updatedEntity) => {
            setGraphData(prev => ({
              ...prev,
              nodes: prev.nodes.map(n => n.id === updatedEntity.id ? { ...n, ...updatedEntity } : n)
            }));
            setSelectedEntity(null);
            setChangesMade(true);
          }}
        />
      )}

      {relMenu && newRelationship && (
        <RelationshipMenu
          draft={newRelationship}
          onChange={setNewRelationship}
          onAdd={handleAddRelationship}
          onCancel={() => { setNewRelationship(null); setRelMenu(false); }}
        />
      )}

      {menuData && <div className="fixed inset-0 z-10" onClick={() => setMenuData(null)} />}
      {menuData && <GraphCurationMenu position={menuData} onAddNode={createNewNode} onAddRelationship={createNewRelationship} />}

      <div className="absolute inset-0 box-border">
        <InteractiveNvlWrapper 
          nodes={graphData.nodes} 
          rels={graphData.rels}
          mouseEventCallbacks={{
            onNodeClick(node: any, event: any) { setSelectedEntity(node); },
            onRelationshipClick(rel: any, event: any) { setSelectedEntity(rel); },
            onDragStart: (node: any, event: any) => console.log(`Drag started on ${node[0].id}`),
            onDrag: (node: any, event: any) => console.log(`Dragging node ${node[0].id}`),
            onDragEnd: (node: any, event: any) => console.log(`Drag ended on node ${node[0].id}`),
            onPan: (panning: any, event: any) => {},
            onZoom: (zoomLevel: any, event: any) => {},
            onCanvasClick: (event: any) => { handleCanvasClick(event); }
          }}
          nvlOptions={{ layout: 'forceDirected', initialZoom: 1.0, minZoom: 0.05, maxZoom: 5.0, renderer: 'canvas' }}
        />
      </div>

      {/* Teacher prompt input */}
      <div className="absolute bottom-24 left-4 w-[320px]">
        <div className="font-semibold text-white mb-1">Teacher Prompt</div>
        <textarea
          className="w-full p-2 rounded bg-gray-700 text-white"
          placeholder="Enter custom instructions..."
          value={teacherPrompt}
          onChange={(e) => { setTeacherPrompt(e.target.value); setTeacherPromptChanged(true); }}
        />
        {promptSaveMessage && (
          <div className="text-green-400 text-sm mt-1">{promptSaveMessage}</div>
        )}
      </div>

      <button 
        className="absolute bottom-4 left-4 rounded-lg shadow px-4 py-2 border transition-colors z-[9999] disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          backgroundColor: changesMade || teacherPromptChanged ? 'white' : '#f3f4f6',
          color: changesMade || teacherPromptChanged ? '#0f172a' : '#9ca3af',
          borderColor: changesMade || teacherPromptChanged ? '#e2e8f0' : '#d1d5db'
        }}
        disabled={!(changesMade || teacherPromptChanged) || isSaving}
        onClick={() => { setSelectedEntity(null); setMenuData(null); saveChanges(); }}
      >
        {isSaving ? 'Saving…' : 'Save Changes'}
      </button>

      {isSaving && (
        <div className="absolute bottom-4 left-40 rounded-lg px-3 py-2 text-sm bg-slate-900 text-white shadow z-[9999]">
          Saving changes…
        </div>
      )}
    </div>
  );
}
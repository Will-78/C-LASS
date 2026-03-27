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
import DocumentUpload from './document-upload'

export default function GraphView() {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], rels: [] });
  const [menuData, setMenuData] = useState<GraphMenuPosition | null>(null);
  const [relMenu, setRelMenu] = useState(false);
  const [newRelationship, setNewRelationship] = useState<RelationshipDraft | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<GraphEntity | null>(null);
  const [changesMade, setChangesMade] = useState(false);
  const [EntitiesToDelete, setEntitiesToDelete] = useState<Set<any>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [documentUploadMenu, setDocumentUploadMenu] = useState(false);

  // Teacher prompt state
  const [teacherPrompt, setTeacherPrompt] = useState("");
  const [teacherPromptChanged, setTeacherPromptChanged] = useState(false);
  const [promptSaveMessage, setPromptSaveMessage] = useState("");

  // Load initial graph and teacher prompt
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
  
  useEffect(() => {
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
    const newNode = {
      id: `__Entity__:New Entity`,
      caption: 'New Entity',
      size: 20,
      color: '#38bdf8',
      type: 'Entity',
      desc: '',
      entryId: `__Entity__:New Entity`
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
    <div className="kg-shell relative h-[88vh] overflow-hidden rounded-3xl border border-sky-200/80 bg-sky-50/70 shadow-xl shadow-sky-100">
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
            const updatedCaption = String((updatedEntity as any).caption ?? '').trim();
            const updatedNodeId = updatedCaption ? `__Entity__:${updatedCaption}` : updatedEntity.id;

            if( updatedCaption )
              setEntitiesToDelete(prev => new Set(prev).add(['node', updatedEntity.entryId.toString()]));

            setGraphData(prevData => ({
              ...prevData,
              nodes: prevData.nodes.map(n =>
                n.id === updatedEntity.id
                  ? { ...n, ...updatedEntity, id: updatedNodeId, entryId: updatedNodeId }
                  : n
              ),
              rels: prevData.rels.map(r => ({
                ...r,
                from: r.from === updatedEntity.id ? updatedNodeId : r.from,
                to: r.to === updatedEntity.id ? updatedNodeId : r.to,
              })),
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

      {/* Graph menu toggle when clicking off */}
      {menuData && <div className="fixed inset-0 z-10" onClick={() => setMenuData(null)} />}
        {/* Graph curation menu */}
      {menuData && (
        <GraphCurationMenu
          position={menuData}
          onAddNode={createNewNode}
          onAddRelationship={createNewRelationship}
        />
      )}

      {/* Document upload */}
      {documentUploadMenu &&
        <DocumentUpload
          onFileUploadSuccess={() => {
            fetchData();
            setDocumentUploadMenu(false);
          }}
          onCancel={() => {
            setDocumentUploadMenu(false);
          }}  
        />
      }

      {/* Neo4j nvl wrapper */}
      <div className="absolute inset-0 box-border bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.92),_rgba(224,242,254,0.9)_40%,_rgba(186,230,253,0.72)_100%)]">
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
      <div className="kg-prompt-card absolute bottom-24 left-4 w-[320px] rounded-2xl border border-sky-200 bg-white/92 p-3 shadow-lg shadow-sky-100">
        <div className="mb-1 font-semibold text-sky-500">Teacher Prompt</div>
        <textarea
          className="min-h-28 w-full rounded-xl border border-sky-200 bg-sky-50 p-3 text-slate-800 placeholder:text-sky-900 focus:outline-none focus:ring-2 focus:ring-sky-300"
          placeholder="Enter custom instructions..."
          value={teacherPrompt}
          onChange={(e) => { setTeacherPrompt(e.target.value); setTeacherPromptChanged(true); }}
        />
        {promptSaveMessage && (
          <div className="mt-1 text-sm text-sky-600">{promptSaveMessage}</div>
        )}
      </div>

      <button 
        className="kg-save-button absolute bottom-4 left-4 z-[9999] rounded-xl border px-4 py-2 shadow-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        style={{
          backgroundColor: changesMade || teacherPromptChanged ? '#0ea5e9' : '#e0f2fe',
          color: changesMade || teacherPromptChanged ? '#ffffff' : '#7dd3fc',
          borderColor: changesMade || teacherPromptChanged ? '#0ea5e9' : '#bae6fd'
        }}
        disabled={!(changesMade || teacherPromptChanged) || isSaving}
        onClick={() => { setSelectedEntity(null); setMenuData(null); saveChanges(); }}
      >
        {isSaving ? 'Saving...' : 'Save Changes'}
      </button>

      {isSaving && (
        <div className="kg-saving-toast absolute bottom-4 left-40 z-[9999] rounded-xl border border-sky-200 bg-white/95 px-3 py-2 text-sm text-sky-800 shadow-lg shadow-sky-100">
          Saving changes...
        </div>
      )}

      {/* Document upload button */}
      <button 
        className={"kg-upload-button absolute bottom-4 right-4 z-[9999] rounded-xl border border-sky-200 bg-white/95 px-4 py-2 text-sky-900 shadow-lg shadow-sky-100 transition-colors hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50"}
        disabled={documentUploadMenu}
        onClick={() => {
          setMenuData(null);
          setDocumentUploadMenu(true);
        }}
      >
        Document KG Builder
      </button>
    </div>
  );
}

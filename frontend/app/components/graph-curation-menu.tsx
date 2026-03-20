'use client';

import { GraphMenuPosition } from './graph-types';

type GraphCurationMenuProps = {
  position: GraphMenuPosition;
  onAddNode: () => void;
  onAddRelationship: () => void
};

export default function GraphCurationMenu({
  position,
  onAddNode,
  onAddRelationship,
}: GraphCurationMenuProps) {
  return (
    <div
      className="fixed z-[9999] bg-white text-slate-900 rounded-lg shadow-2xl py-2 w-48 border border-slate-200"
      style={{
        top: `${position.y}px`,
        left: `${position.x}px`,
      }}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="px-4 py-1 text-xs font-bold text-slate-400 uppercase tracking-wider">
        Actions
      </div>
      <button
        onClick={onAddNode}
        className="w-full text-left px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors flex items-center gap-2 font-medium"
      >
        Add New Node
      </button>
      <button
        onClick={onAddRelationship}
        className="w-full text-left px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors flex items-center gap-2 font-medium"
      >
        Add New Relationship
      </button>
    </div>
  );
}

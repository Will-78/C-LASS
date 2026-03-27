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
      className="kg-context-menu fixed z-[9999] w-52 rounded-2xl border border-sky-200 bg-white/95 py-2 text-slate-900 shadow-2xl shadow-sky-100"
      style={{
        top: `${position.y}px`,
        left: `${position.x}px`,
      }}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="px-4 py-1 text-xs font-bold uppercase tracking-wider text-sky-500">
        Actions
      </div>
      <button
        onClick={onAddNode}
        className="kg-context-action flex w-full items-center gap-2 px-4 py-2 text-left font-medium text-sky-900 transition-colors hover:bg-sky-50"
      >
        Add New Node
      </button>
      <button
        onClick={onAddRelationship}
        className="kg-context-action flex w-full items-center gap-2 px-4 py-2 text-left font-medium text-sky-900 transition-colors hover:bg-sky-50"
      >
        Add New Relationship
      </button>
    </div>
  );
}

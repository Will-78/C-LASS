'use client';

import { RelationshipDraft } from './graph-types';

type RelationshipMenuProps = {
  draft: RelationshipDraft;
  onChange: (draft: RelationshipDraft) => void;
  onAdd: () => void;
  onCancel: () => void;
};

export default function RelationshipMenu({
  draft,
  onChange,
  onAdd,
  onCancel,
}: RelationshipMenuProps) {
  return (
    <div className="kg-relationship-overlay fixed inset-0 z-50 flex items-center justify-center bg-sky-950/20 backdrop-blur-sm">
      <div className="kg-relationship-card flex h-auto w-80 flex-col gap-3 rounded-2xl border border-sky-200 bg-white/95 p-6 text-slate-800 shadow-2xl shadow-sky-100">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase tracking-wider text-sky-500">
            From:
          </label>
          <input
            className="kg-relationship-input rounded-xl border border-sky-200 bg-sky-50 p-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-300"
            placeholder="Node Caption Source"
            value={draft.from}
            onChange={(event) => onChange({ ...draft, from: event.target.value })}
          />
          <label className="text-xs font-bold uppercase tracking-wider text-sky-500">
            Caption:
          </label>
          <input
            className="kg-relationship-input rounded-xl border border-sky-200 bg-sky-50 p-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-300"
            placeholder="Relationship Caption"
            value={draft.caption}
            onChange={(event) =>
              onChange({ ...draft, caption: event.target.value })
            }
          />
          <label className="text-xs font-bold uppercase tracking-wider text-sky-500">
            To:
          </label>
          <input
            className="kg-relationship-input rounded-xl border border-sky-200 bg-sky-50 p-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-300"
            placeholder="Node Caption Target"
            value={draft.to}
            onChange={(event) => onChange({ ...draft, to: event.target.value })}
          />
        </div>

        <button
          onClick={onAdd}
          className="kg-relationship-primary rounded-xl bg-sky-500 px-4 py-2 font-bold text-white transition-colors hover:bg-sky-400"
        >
          Add Relationship
        </button>
        <button
          onClick={onCancel}
          className="kg-relationship-secondary rounded-xl border border-sky-300 bg-white px-4 py-2 font-bold text-sky-700 transition-colors hover:bg-sky-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

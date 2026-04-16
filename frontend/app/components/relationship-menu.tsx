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
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="flex flex-col gap-3 h-auto w-80 p-6 bg-[#141414eb] text-white shadow-2xl rounded-lg border border-gray-700">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
            From:
          </label>
          <input
            className="bg-gray-800 border border-gray-600 p-2 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Node Caption Source"
            value={draft.from}
            onChange={(event) => onChange({ ...draft, from: event.target.value })}
          />
          <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Caption:
          </label>
          <input
            className="bg-gray-800 border border-gray-600 p-2 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Relationship Caption"
            value={draft.caption}
            onChange={(event) =>
              onChange({ ...draft, caption: event.target.value })
            }
          />
          <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
            To:
          </label>
          <input
            className="bg-gray-800 border border-gray-600 p-2 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Node Caption Target"
            value={draft.to}
            onChange={(event) => onChange({ ...draft, to: event.target.value })}
          />
        </div>

        <button
          onClick={onAdd}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
        >
          Add Relationship
        </button>
        <button
          onClick={onCancel}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

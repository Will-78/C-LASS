'use client';
import { useState, useEffect } from 'react';
import { GraphEntity } from './graph-types';

type EntityViewProps = {
    entity: GraphEntity;
    onClose?: () => void;
    deleteEntity?: (updatedEntity: GraphEntity) => void;
    onSave?: (updatedEntity: GraphEntity) => void;
};

const HIDDEN_KEYS = new Set(['id', 'finestIndex', 'size', 'entryId']);

export default function EntityView({
    entity,
    onClose,
    deleteEntity,
    onSave,
}: EntityViewProps) {
    const [tempEntity, setTempEntity] = useState<GraphEntity>({ ...entity });

    useEffect(() => {
        setTempEntity({ ...entity });
    }, [entity]);

    return (
        <div className="kg-entity-panel absolute right-3 top-3 bottom-3 z-[5] max-h-full w-[320px] rounded-[18px] border border-sky-200 bg-white/95 px-4 py-4 text-slate-800 shadow-[0_20px_50px_rgba(125,211,252,0.3)] backdrop-blur-[8px]">
            <div className="flex items-center justify-between">
                <h1 className="mb-3 text-[2em] font-bold text-sky-900">{entity.caption}</h1>
                <button
                    onClick={onClose}
                    className="rounded-full px-2 py-1 text-sky-700 transition hover:bg-sky-100"
                    style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}
                >
                    X
                </button>
            </div>

            {Object.entries(tempEntity)
                .filter(([key]) => !HIDDEN_KEYS.has(key))
                .map(([key, value]) => (
                    <div key={key}>
                        <div className="mt-3 font-semibold text-sky-800">{key}</div>
                        <input
                            className="kg-entity-input mt-1 inline-block w-full rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 leading-normal text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-300"
                            value={String(value)}
                            onChange={(event) =>
                                setTempEntity({ ...tempEntity, [key]: event.target.value })
                            }
                        />
                    </div>
                ))}

            <button
                onClick={() => onSave?.(tempEntity)}
                className="kg-entity-primary mt-4 rounded-xl bg-sky-500 px-4 py-2 text-white transition hover:bg-sky-400"
            >
                Save
            </button>

            <button
                onClick={() => deleteEntity?.(tempEntity)}
                className="kg-entity-secondary mt-2 rounded-xl border border-sky-300 bg-white px-4 py-2 text-sky-700 transition hover:bg-sky-50"
            >
                Delete
            </button>
        </div>
    );
}

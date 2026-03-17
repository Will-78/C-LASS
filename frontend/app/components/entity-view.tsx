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

    // Teacher Prompt State
    const [teacherPrompt, setTeacherPrompt] = useState("");

    useEffect(() => {
        setTempEntity({ ...entity });
    }, [entity]);

    // Fetch teacher prompt on load
    useEffect(() => {
        const fetchPrompt = async () => {
            const username = localStorage.getItem("username");
            if (!username) return;

            try {
                const res = await fetch("/api/get-teacher-prompt", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username })
                });

                const data = await res.json();
                setTeacherPrompt(data.prompt || "");
            } catch (err) {
                console.error("Failed to fetch teacher prompt:", err);
            }
        };

        fetchPrompt();
    }, []);

    return (
        <div className="absolute right-3 top-3 bottom-3 w-[320px] max-h-full px-3.5 py-3 rounded-[10px] bg-[rgba(20,20,20,0.92)] text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-[6px] z-[5]">
            <div className="flex justify-between items-center">
                <h1 className="text-[2em] font-bold mb-3">{entity.caption}</h1>
                <button
                    onClick={onClose}
                    style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}
                >
                    ✕
                </button>
            </div>

            {Object.entries(tempEntity)
                .filter(([key]) => !HIDDEN_KEYS.has(key))
                .map(([key, value]) => (
                    <div key={key}>
                        <div className="font-semibold mt-3">{key}</div>
                        <input
                            className="inline-block ml-2 px-3 py-1.5 text-[#ccc] bg-[rgba(100,100,100,0.3)] rounded-[20px] leading-normal"
                            value={String(value)}
                            onChange={(event) =>
                                setTempEntity({ ...tempEntity, [key]: event.target.value })
                            }
                        />
                    </div>
                ))}

            {/* Customize Tutor UI */}
            <div className="mt-4">
                <div className="font-semibold">Customize Tutor</div>
                <textarea
                    className="w-full mt-2 p-2 rounded bg-gray-700 text-white"
                    placeholder="Enter custom instructions..."
                    value={teacherPrompt}
                    onChange={(e) => setTeacherPrompt(e.target.value)}
                />
            </div>

            {/* Save button modified to also save teacher prompt*/}
            <button
                onClick={async () => {
                    const username = localStorage.getItem("username");

                    if (username) {
                        await fetch("/api/set-teacher-prompt", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                username,
                                prompt: teacherPrompt
                            })
                        });
                    }

                    onSave?.(tempEntity);
                }}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mt-3"
            >
                Save
            </button>

            <button
                onClick={() => deleteEntity?.(tempEntity)}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 mt-2"
            >
                Delete
            </button>
        </div>
    );
}
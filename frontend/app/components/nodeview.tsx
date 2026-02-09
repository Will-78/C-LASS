'use client';
import { useState, useEffect } from 'react';

export default function NodeView({ node, onClose, deleteNode, onSave }: { 
    node: any;
    onClose?: () => void;
    deleteNode?: (updatedNode: any) => void
    onSave?: (updatedNode: any) => void 
}) {

    const [isVisible, setIsVisible] = useState(true);

    const handleClose = () => {
        setIsVisible(false);
        onClose?.();
    };

    const handleDelete = () => {
        deleteNode?.(tempNode);
    };

    const handleSave = () => {
        onSave?.(tempNode);
    };

    const [tempNode, setTempNode] = useState({ ...node });

    useEffect(() => {
        setTempNode({ ...node });
    }, [node]);

    if (!isVisible) return null;

    return (
        <div className='node-panel'>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 className='node-title'>
                    {node.caption}
                </h1>
                <button onClick={handleClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>
                    ✕
                </button>
            </div>

            {Object.entries(tempNode)
            .filter(([key, _]) => !['id', 'finestIndex', 'size'].includes(key) )
            .map(([key, value]) => (
                <div key={key}>
                    <div className='field-label'>
                        {key}
                    </div>
                    <input className='field-value' value={String(value)} onChange={(e) => setTempNode({ ...tempNode, [key]: e.target.value })} />
                </div>
            ))}

            <button onClick={handleDelete} className='delete-button'>
                Delete
            </button>

            <button onClick={handleSave} className='save-button'>
                Save
            </button>
        </div>
    );
            

}
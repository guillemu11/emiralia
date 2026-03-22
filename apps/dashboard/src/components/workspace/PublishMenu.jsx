import { useEffect, useRef } from 'react';
import { PUBLISH_DESTINATIONS } from './artifactConstants.js';

export default function PublishMenu({ artifact, onPublish, onClose }) {
    const menuRef = useRef(null);
    const destinations = PUBLISH_DESTINATIONS[artifact.type] || [];

    // Click-outside-to-close
    useEffect(() => {
        function handleMouseDown(e) {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                onClose();
            }
        }
        document.addEventListener('mousedown', handleMouseDown);
        return () => document.removeEventListener('mousedown', handleMouseDown);
    }, [onClose]);

    if (destinations.length === 0) return null;

    return (
        <div ref={menuRef} className="publish-menu">
            <div style={{
                padding: '8px 14px 6px', fontSize: '0.72rem', fontWeight: 700,
                color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em',
                borderBottom: '1px solid #f1f5f9'
            }}>
                Enviar a...
            </div>
            {destinations.map(dest => (
                <button
                    key={dest.id}
                    className="publish-menu-item"
                    onClick={() => onPublish(artifact, dest.id)}
                >
                    {dest.label}
                </button>
            ))}
        </div>
    );
}

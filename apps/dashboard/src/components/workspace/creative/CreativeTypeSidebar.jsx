import React from 'react';
import { CREATIVE_TYPES } from '../creativeConstants.js';

// Lucide-style SVG icons for each creative type
const TypeIcon = ({ name, size = 20 }) => {
    const paths = {
        image: (
            <>
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="9" cy="9" r="2"/>
                <path d="M21 15l-5-5L5 21"/>
            </>
        ),
        video: (
            <>
                <rect x="2" y="4" width="20" height="16" rx="2"/>
                <path d="M10 9l5 3-5 3V9z"/>
            </>
        ),
        'image-play': (
            <>
                <rect x="2" y="2" width="20" height="14" rx="2"/>
                <circle cx="9" cy="8" r="1.5"/>
                <path d="M21 18l-5-5-3 3-2-2-5 5"/>
                <path d="M13 15l3-3"/>
            </>
        ),
        layers: (
            <>
                <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                <polyline points="2 17 12 22 22 17"/>
                <polyline points="2 12 12 17 22 12"/>
            </>
        ),
        mic: (
            <>
                <rect x="9" y="2" width="6" height="11" rx="3"/>
                <path d="M19 10a7 7 0 0 1-14 0"/>
                <line x1="12" y1="19" x2="12" y2="22"/>
                <line x1="8" y1="22" x2="16" y2="22"/>
            </>
        ),
        building: (
            <>
                <rect x="4" y="2" width="16" height="20" rx="1"/>
                <path d="M9 22V12h6v10"/>
                <rect x="8" y="6" width="3" height="3"/>
                <rect x="13" y="6" width="3" height="3"/>
            </>
        ),
        'layout-panel': (
            <>
                <rect x="2" y="2" width="6" height="20" rx="1"/>
                <rect x="10" y="2" width="6" height="9" rx="1"/>
                <rect x="10" y="13" width="6" height="9" rx="1"/>
                <rect x="18" y="2" width="4" height="9" rx="1"/>
                <rect x="18" y="13" width="4" height="9" rx="1"/>
            </>
        ),
        'bar-chart': (
            <>
                <line x1="18" y1="20" x2="18" y2="10"/>
                <line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="6"  y1="20" x2="6"  y2="14"/>
                <line x1="2"  y1="20" x2="22" y2="20"/>
            </>
        ),
    };

    return (
        <svg
            width={size}
            height={size}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            viewBox="0 0 24 24"
        >
            {paths[name] || paths['image']}
        </svg>
    );
};

export default function CreativeTypeSidebar({ selected, onSelect }) {
    return (
        <aside className="creative-sidebar">
            <div className="creative-sidebar-label">Tipo de contenido</div>
            <div className="creative-type-list">
                {CREATIVE_TYPES.map(type => (
                    <button
                        key={type.id}
                        className={`creative-type-card ${selected === type.id ? 'active' : ''}`}
                        onClick={() => onSelect(type.id)}
                        title={type.description}
                    >
                        <div className="creative-type-icon">
                            <TypeIcon name={type.icon} size={18} />
                        </div>
                        <div className="creative-type-info">
                            <span className="creative-type-label">{type.label}</span>
                            <span className="creative-type-desc">{type.description}</span>
                        </div>
                    </button>
                ))}
            </div>
        </aside>
    );
}

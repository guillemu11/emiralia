import React, { useState, useEffect, useRef } from 'react';
import { API_URL } from '../api.js';
import { CREATIVE_TYPES } from '../components/workspace/creativeConstants.js';
import WsIcon from '../components/workspace/WsIcon.jsx';

// Layout v2
import CreativeTypeTopNav from '../components/workspace/creative/CreativeTypeTopNav.jsx';
import AIBriefInput from '../components/workspace/creative/AIBriefInput.jsx';

// Brief forms
import ImageBriefForm from '../components/workspace/creative/ImageBriefForm.jsx';
import TextToVideoBriefForm from '../components/workspace/creative/TextToVideoBriefForm.jsx';
import ImageToVideoBriefForm from '../components/workspace/creative/ImageToVideoBriefForm.jsx';
import MultiframeBriefForm from '../components/workspace/creative/MultiframeBriefForm.jsx';
import PodcastBriefForm from '../components/workspace/creative/PodcastBriefForm.jsx';
import PropertyTourBriefForm from '../components/workspace/creative/PropertyTourBriefForm.jsx';

// Shared components
import AssetGallery from '../components/workspace/creative/AssetGallery.jsx';
import GenerationProgress from '../components/workspace/creative/GenerationProgress.jsx';
import CreativeAssetCard from '../components/workspace/creative/CreativeAssetCard.jsx';
import CreativePreviewModal from '../components/workspace/creative/CreativePreviewModal.jsx';
import AvatarProfilesTab from '../components/workspace/creative/AvatarProfilesTab.jsx';

// Secondary tabs (Galería, Calendario, Avatares)
const SECONDARY_TABS = [
    { id: 'gallery',   label: 'Galería' },
    { id: 'calendar',  label: 'Calendario' },
    { id: 'avatares',  label: 'Avatares' },
];

// Status text per type during generation
const GENERATION_STATUS = {
    image:          'Generando imagen con KIE AI...',
    text_to_video:  'ElevenLabs TTS → KIE AI Lip Sync → Video...',
    image_to_video: 'Animando imagen con KIE AI...',
    multiframe:     'Procesando frames y transiciones...',
    podcast:        'ElevenLabs TTS (hosts) → Lip Sync → Video Editing...',
    property_tour:  'ElevenLabs TTS (host) → Lip Sync → Video + overlays...',
    carousel:       'Generando slides secuencialmente...',
    infographic:    'Generando infografía estructurada...',
};

export default function CreativeStudio() {
    const [selectedType, setSelectedType] = useState(null);
    const [activeTab, setActiveTab]       = useState('generate');

    // Asset data (gallery — cursor-paginated)
    const [assets, setAssets]             = useState([]);
    const [assetsTotal, setAssetsTotal]   = useState(null);
    const [assetsCursor, setAssetsCursor] = useState(null); // next_cursor for infinite scroll
    const [loadingAssets, setLoadingAssets]   = useState(false);
    const [loadingMoreAssets, setLoadingMoreAssets] = useState(false);
    const [activeFilters, setActiveFilters] = useState({});
    const [typeAssets, setTypeAssets]     = useState([]);

    // Config
    const [config, setConfig]             = useState(null);

    // Generation flow
    const [generatingId, setGeneratingId] = useState(null);
    const [elapsed, setElapsed]           = useState(0);
    const [recentAsset, setRecentAsset]   = useState(null);

    // Modal
    const [previewAsset, setPreviewAsset] = useState(null);

    // AI brief suggestion
    const [suggestedBrief, setSuggestedBrief] = useState(null);

    // Chat history: { id, role: 'user'|'bot', type: 'brief'|'generating'|'result'|'error', label, summary, asset, timestamp }
    const [chatHistory, setChatHistory] = useState([]);
    const chatEndRef = useRef(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    /* Auto-scroll chat to bottom when new messages arrive */
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory]);

    /* ── Init ── */
    useEffect(() => {
        fetch(`${API_URL}/creative/config`)
            .then(r => r.json())
            .then(setConfig)
            .catch(() => null);
    }, []);

    /* Fetch assets cuando se activa la galería */
    useEffect(() => {
        if (activeTab === 'gallery') fetchAssets();
    }, [activeTab]);

    /* Fetch recientes del tipo activo cuando cambia el tipo */
    useEffect(() => {
        if (selectedType) fetchTypeAssets(selectedType);
        setSuggestedBrief(null);
        setRecentAsset(null);
    }, [selectedType]);

    /* ── API helpers ── */

    async function fetchAssets(filters = {}) {
        setLoadingAssets(true);
        setActiveFilters(filters);
        setAssetsCursor(null);
        try {
            const params = new URLSearchParams({ limit: 24, ...filters });
            const res = await fetch(`${API_URL}/creative/assets?${params}`);
            const data = await res.json();
            setAssets(data.items || []);
            setAssetsTotal(data.total ?? null);
            setAssetsCursor(data.next_cursor || null);
        } catch {
            setAssets([]);
            setAssetsTotal(null);
        } finally {
            setLoadingAssets(false);
        }
    }

    async function loadMoreAssets() {
        if (!assetsCursor || loadingMoreAssets) return;
        setLoadingMoreAssets(true);
        try {
            const params = new URLSearchParams({ limit: 24, cursor: assetsCursor, ...activeFilters });
            const res = await fetch(`${API_URL}/creative/assets?${params}`);
            const data = await res.json();
            setAssets(prev => [...prev, ...(data.items || [])]);
            setAssetsCursor(data.next_cursor || null);
        } catch {
            // keep existing assets on error
        } finally {
            setLoadingMoreAssets(false);
        }
    }

    async function fetchTypeAssets(type) {
        try {
            const params = new URLSearchParams({ type, limit: 6, status: 'pending_review' });
            const res = await fetch(`${API_URL}/creative/assets?${params}`);
            const data = await res.json();
            setTypeAssets(data.items || []);
        } catch {
            setTypeAssets([]);
        }
    }

    /* ── Brief submit → generation pipeline ── */

    async function handleBriefSubmit(type, { brief, outputConfig }) {
        const typeData = CREATIVE_TYPES.find(t => t.id === type);
        const msgId = Date.now().toString();

        // User bubble: brief summary
        const summary = brief.prompt?.substring(0, 80)
            || brief.script?.substring(0, 80)
            || brief.topic?.substring(0, 80)
            || brief.property_data?.title?.substring(0, 80)
            || 'Brief enviado';

        setChatHistory(h => [...h, {
            id: msgId + '-brief',
            role: 'user',
            type: 'brief',
            label: typeData?.label,
            summary,
            timestamp: new Date(),
        }]);

        try {
            const createRes = await fetch(`${API_URL}/creative/assets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type,
                    brief,
                    output_config: outputConfig,
                    title: brief.prompt?.substring(0, 100)
                        || brief.script?.substring(0, 100)
                        || brief.topic?.substring(0, 100)
                        || brief.property_data?.title?.substring(0, 100)
                        || 'Nuevo asset',
                }),
            });
            const asset = await createRes.json();
            if (!createRes.ok) throw new Error(asset.error || 'Error creating asset');

            setGeneratingId(asset.id);
            setElapsed(0);

            // Bot generating bubble
            setChatHistory(h => [...h, {
                id: msgId + '-gen',
                role: 'bot',
                type: 'generating',
                label: GENERATION_STATUS[type] || 'Generando...',
                timestamp: new Date(),
            }]);

            const endpoint = (type === 'image' || type === 'carousel' || type === 'infographic')
                ? 'image' : 'video';

            const genRes = await fetch(`${API_URL}/creative/generate/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ asset_id: asset.id, brief, output_config: outputConfig }),
            });
            if (!genRes.ok) {
                const err = await genRes.json();
                throw new Error(err.error || 'Error starting generation');
            }

            pollAsset(asset.id, msgId + '-gen');
        } catch (err) {
            console.error('[Creative] Submit error:', err);
            setGeneratingId(null);
            setChatHistory(h => [...h, {
                id: msgId + '-err',
                role: 'bot',
                type: 'error',
                label: 'Error: ' + err.message,
                timestamp: new Date(),
            }]);
        }
    }

    function pollAsset(id, genMsgId) {
        const start = Date.now();
        const interval = setInterval(async () => {
            setElapsed(Math.round((Date.now() - start) / 1000));
            try {
                const res = await fetch(`${API_URL}/creative/assets/${id}`);
                const asset = await res.json();
                if (asset.status !== 'generating') {
                    clearInterval(interval);
                    setGeneratingId(null);
                    setElapsed(0);
                    setRecentAsset(asset);
                    // Replace generating bubble with result bubble
                    setChatHistory(h => h.map(msg =>
                        msg.id === genMsgId
                            ? { ...msg, type: 'result', asset, timestamp: new Date() }
                            : msg
                    ));
                    if (selectedType) fetchTypeAssets(selectedType);
                }
            } catch { /* ignore poll errors */ }
            if (Date.now() - start > 900000) {
                clearInterval(interval);
                setGeneratingId(null);
                setElapsed(0);
                setChatHistory(h => h.map(msg =>
                    msg.id === genMsgId
                        ? { ...msg, type: 'error', label: 'Timeout: la generación tardó demasiado' }
                        : msg
                ));
            }
        }, 5000);
    }

    async function handleStatusChange(id, newStatus, rejectionReason) {
        await fetch(`${API_URL}/creative/assets/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus, rejection_reason: rejectionReason }),
        });
        if (previewAsset?.id === id) {
            const res = await fetch(`${API_URL}/creative/assets/${id}`);
            setPreviewAsset(await res.json());
        }
        if (recentAsset?.id === id) {
            const res = await fetch(`${API_URL}/creative/assets/${id}`);
            setRecentAsset(await res.json());
        }
        if (activeTab === 'gallery') fetchAssets();
        if (selectedType) fetchTypeAssets(selectedType);
        // Update result bubble if it's in chat
        setChatHistory(h => h.map(msg => {
            if (msg.type === 'result' && msg.asset?.id === id) {
                return { ...msg, asset: { ...msg.asset, status: newStatus } };
            }
            return msg;
        }));
    }

    /* ── Type change ── */

    function handleTypeSelect(typeId) {
        setSelectedType(typeId);
        setActiveTab('generate');
    }

    /* ── Render brief form for selected type ── */

    function renderBriefForm() {
        const commonProps = {
            onSubmit: (data) => handleBriefSubmit(selectedType, data),
            loading: !!generatingId,
            suggestedBrief,
        };

        switch (selectedType) {
            case 'image':
                return <ImageBriefForm {...commonProps} apiUrl={API_URL} />;
            case 'text_to_video':
                return <TextToVideoBriefForm {...commonProps} />;
            case 'image_to_video':
                return <ImageToVideoBriefForm {...commonProps} />;
            case 'multiframe':
                return <MultiframeBriefForm {...commonProps} />;
            case 'podcast':
                return <PodcastBriefForm {...commonProps} />;
            case 'property_tour':
                return <PropertyTourBriefForm {...commonProps} />;
            default: {
                const typeData = CREATIVE_TYPES.find(t => t.id === selectedType);
                return (
                    <div className="brief-coming-soon">
                        <p className="brief-coming-soon-title">{typeData?.label}</p>
                        <p className="brief-coming-soon-desc">
                            Pipeline: <strong>{typeData?.pipeline}</strong><br/>
                            Tiempo estimado: <strong>{typeData?.estimatedTime}</strong>
                        </p>
                        <p className="subtitle" style={{ marginTop: 8, fontSize: '0.8rem', opacity: 0.6 }}>
                            Formulario disponible en Fase 5 del proyecto.
                        </p>
                    </div>
                );
            }
        }
    }

    /* ── Render chat message ── */

    function renderChatMessage(msg) {
        if (msg.role === 'user') {
            return (
                <div key={msg.id} className="cs2-bubble-row user">
                    <div className="cs2-bubble user">
                        <span style={{ fontSize: '0.72rem', opacity: 0.75, display: 'block', marginBottom: 2 }}>
                            {msg.label}
                        </span>
                        <p style={{ margin: 0 }}>{msg.summary}</p>
                    </div>
                    <span className="cs2-bubble-meta">
                        {msg.timestamp.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
            );
        }

        if (msg.type === 'generating') {
            return (
                <div key={msg.id} className="cs2-bubble-row bot">
                    <div className="cs2-bubble generating">
                        <span className="cs2-bubble-spinner" />
                        <span>{msg.label}</span>
                        {elapsed > 0 && (
                            <span style={{ marginLeft: 'auto', fontSize: '0.72rem', flexShrink: 0 }}>
                                {elapsed}s
                            </span>
                        )}
                    </div>
                </div>
            );
        }

        if (msg.type === 'result') {
            return (
                <div key={msg.id} className="cs2-bubble-row bot">
                    <div className="cs2-bubble result">
                        <CreativeAssetCard
                            asset={msg.asset}
                            onPreview={setPreviewAsset}
                            onStatusChange={handleStatusChange}
                            onSendToCalendar={(a) => console.log('Send to calendar:', a.id)}
                        />
                    </div>
                    <span className="cs2-bubble-meta">
                        {msg.timestamp.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
            );
        }

        if (msg.type === 'error') {
            return (
                <div key={msg.id} className="cs2-bubble-row bot">
                    <div className="cs2-bubble error">{msg.label}</div>
                </div>
            );
        }

        return null;
    }

    /* ── ElevenLabs status pill ── */
    const elevenLabsActive = !!(config?.fernando_voice_id && config?.yolanda_voice_id);

    return (
        <div className="cs2-root animate-fade-in">

            {/* ── Header ── */}
            <div className="cs2-header">
                <div className="cs2-header-left">
                    <span className="cs2-header-icon"><WsIcon name="video" size={18} /></span>
                    <div>
                        <h1 className="cs2-title">Creative Studio</h1>
                        <p className="cs2-subtitle">Hub de producción de contenido</p>
                    </div>
                    {config && (
                        <div className="cs2-status-pills">
                            <span className={`cs2-pill ${config.kie_image_enabled ? 'pill-green' : 'pill-gray'}`}>
                                Imágenes {config.kie_image_enabled ? 'ON' : 'OFF'}
                            </span>
                            <span className={`cs2-pill ${config.video_enabled ? 'pill-green' : 'pill-gray'}`}>
                                Video {config.video_enabled ? 'ON' : 'OFF'}
                            </span>
                            <span className={`cs2-pill ${elevenLabsActive ? 'pill-green' : 'pill-gray'}`}>
                                ElevenLabs {elevenLabsActive ? '✓' : 'OFF'}
                            </span>
                        </div>
                    )}
                </div>
                <div className="cs2-header-right">
                    {/* Back button when in secondary tabs */}
                    {(activeTab === 'gallery' || activeTab === 'avatares' || activeTab === 'calendar') && (
                        <button
                            className="cs2-back-btn"
                            onClick={() => setActiveTab('generate')}
                        >
                            ← Generar
                        </button>
                    )}
                    {SECONDARY_TABS.map(tab => (
                        <button
                            key={tab.id}
                            className={`cs2-secondary-tab${activeTab === tab.id ? ' active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Type nav (solo en modo generate) ── */}
            {activeTab === 'generate' && (
                <CreativeTypeTopNav
                    selected={selectedType}
                    onSelect={handleTypeSelect}
                />
            )}

            {/* ── Generate workspace ── */}
            {activeTab === 'generate' && (
                <div className="cs2-workspace">

                    {/* LEFT: Chat canvas */}
                    <div className="cs2-chat-canvas">

                        {chatHistory.length === 0 ? (
                            <div className="cs2-chat-empty">
                                <div className="cs2-empty-icon">
                                    <WsIcon name="pen-tool" size={40} />
                                </div>
                                <h2 className="cs2-empty-title">Creative Studio</h2>
                                <p className="cs2-empty-desc">
                                    {selectedType
                                        ? 'Completa el brief en el panel derecho y pulsa Generar.'
                                        : 'Selecciona un tipo de contenido arriba para comenzar.'}
                                </p>
                                {!selectedType && (
                                    <div className="cs2-empty-type-pills">
                                        {CREATIVE_TYPES.map(t => (
                                            <button
                                                key={t.id}
                                                className="cs2-empty-type-pill"
                                                onClick={() => handleTypeSelect(t.id)}
                                            >
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="cs2-chat-messages">
                                {chatHistory.map(renderChatMessage)}
                                <div ref={chatEndRef} />
                            </div>
                        )}

                        {/* AI brief bar at bottom */}
                        {selectedType && (
                            <div className="cs2-chat-input-bar">
                                <AIBriefInput
                                    type={selectedType}
                                    onSuggest={setSuggestedBrief}
                                    compact={true}
                                />
                            </div>
                        )}
                    </div>

                    {/* Mobile toggle: ver/ocultar brief */}
                    <button
                        className="cs2-sidebar-toggle-btn"
                        onClick={() => setIsSidebarOpen(o => !o)}
                    >
                        {isSidebarOpen ? 'Ocultar brief' : 'Ver brief'}
                    </button>

                    {/* RIGHT: Brief form sidebar */}
                    <div className={`cs2-brief-sidebar${isSidebarOpen ? ' sidebar-open' : ''}`}>
                        <div className="cs2-brief-sidebar-scroll">
                            {selectedType ? renderBriefForm() : (
                                <div className="cs2-brief-sidebar-empty">
                                    <p className="cs2-brief-sidebar-empty-hint">
                                        Selecciona un tipo de contenido arriba para ver los parámetros del brief.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Secondary tab views ── */}
            {activeTab === 'gallery' && (
                <AssetGallery
                    items={assets}
                    total={assetsTotal}
                    hasMore={!!assetsCursor}
                    loading={loadingAssets}
                    loadingMore={loadingMoreAssets}
                    onFilter={fetchAssets}
                    onLoadMore={loadMoreAssets}
                    onRefresh={fetchAssets}
                    onPreview={setPreviewAsset}
                    onStatusChange={handleStatusChange}
                    onSendToCalendar={(asset) => console.log('Send to calendar:', asset.id)}
                />
            )}

            {activeTab === 'calendar' && (
                <div className="creative-empty-state">
                    <div className="creative-empty-icon">📅</div>
                    <h2 className="creative-empty-title">Calendario Editorial</h2>
                    <p className="creative-empty-desc">
                        Disponible en Fase 6. Aquí podrás asignar assets aprobados a slots semanales por plataforma.
                    </p>
                </div>
            )}

            {activeTab === 'avatares' && (
                <AvatarProfilesTab config={config} />
            )}

            {/* ── Preview Modal ── */}
            {previewAsset && (
                <CreativePreviewModal
                    asset={previewAsset}
                    onClose={() => setPreviewAsset(null)}
                    onStatusChange={handleStatusChange}
                    onSendToCalendar={(asset) => console.log('Send to calendar:', asset.id)}
                />
            )}
        </div>
    );
}

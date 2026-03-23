import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CREATIVE_TYPES, CREATIVE_STATUS } from '../creativeConstants.js';
import CreativeAssetCard from './CreativeAssetCard.jsx';

const STATUS_OPTIONS = ['all', 'draft', 'generating', 'pending_review', 'approved', 'rejected', 'scheduled', 'published'];
const TYPE_OPTIONS = [{ id: 'all', label: 'Todos' }, ...CREATIVE_TYPES.map(t => ({ id: t.id, label: t.label }))];

/**
 * AssetGallery — Gallery with server-side filtering and infinite scroll.
 *
 * Props:
 *   items        {Array}    — current page of assets
 *   total        {number}   — total count (from API, first page only)
 *   hasMore      {boolean}  — whether there are more pages
 *   loading      {boolean}  — initial load in progress
 *   loadingMore  {boolean}  — next-page load in progress
 *   onFilter     {fn}       — called with { type, status } when filters change (triggers fresh fetch)
 *   onLoadMore   {fn}       — called when sentinel enters viewport (loads next cursor page)
 *   onRefresh    {fn}       — called when user clicks Actualizar
 *   onPreview, onStatusChange, onSendToCalendar — card callbacks
 */
export default function AssetGallery({
    items = [],
    total = null,
    hasMore = false,
    loading = false,
    loadingMore = false,
    onFilter,
    onLoadMore,
    onRefresh,
    onPreview,
    onStatusChange,
    onSendToCalendar,
}) {
    const [filterType,   setFilterType]   = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');

    // Sentinel ref for IntersectionObserver (infinite scroll trigger)
    const sentinelRef = useRef(null);

    // Fire onFilter when filters change (including on mount for initial fetch)
    useEffect(() => {
        const filters = {};
        if (filterType   !== 'all') filters.type   = filterType;
        if (filterStatus !== 'all') filters.status = filterStatus;
        onFilter?.(filters);
    }, [filterType, filterStatus]);

    // IntersectionObserver — triggers onLoadMore when sentinel enters viewport
    const observerCallback = useCallback((entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
            onLoadMore?.();
        }
    }, [hasMore, loadingMore, loading, onLoadMore]);

    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel) return;
        const observer = new IntersectionObserver(observerCallback, { rootMargin: '200px' });
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [observerCallback]);

    return (
        <div className="creative-gallery">
            {/* Filters */}
            <div className="creative-gallery-filters">
                <div className="creative-filter-group">
                    <label className="creative-filter-label">Tipo</label>
                    <select
                        className="creative-filter-select"
                        value={filterType}
                        onChange={e => setFilterType(e.target.value)}
                        disabled={loading}
                    >
                        {TYPE_OPTIONS.map(t => (
                            <option key={t.id} value={t.id}>{t.label}</option>
                        ))}
                    </select>
                </div>

                <div className="creative-filter-group">
                    <label className="creative-filter-label">Estado</label>
                    <select
                        className="creative-filter-select"
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                        disabled={loading}
                    >
                        {STATUS_OPTIONS.map(s => (
                            <option key={s} value={s}>
                                {s === 'all' ? 'Todos' : (CREATIVE_STATUS[s]?.label || s)}
                            </option>
                        ))}
                    </select>
                </div>

                <button
                    className="creative-refresh-btn"
                    onClick={() => onRefresh?.({ type: filterType !== 'all' ? filterType : undefined, status: filterStatus !== 'all' ? filterStatus : undefined })}
                    disabled={loading}
                >
                    {loading ? 'Cargando...' : 'Actualizar'}
                </button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="creative-gallery-loading">
                    <p className="subtitle">Cargando assets...</p>
                </div>
            ) : items.length === 0 ? (
                <div className="creative-empty-state">
                    <div className="creative-empty-icon">📂</div>
                    <h2 className="creative-empty-title">Sin assets todavía</h2>
                    <p className="creative-empty-desc">
                        Ve a la pestaña "Generar" y crea tu primer contenido.
                    </p>
                </div>
            ) : (
                <>
                    <div className="creative-gallery-count">
                        {total !== null ? `${total} assets` : `${items.length} assets cargados`}
                        {(filterType !== 'all' || filterStatus !== 'all') && ' (filtrado)'}
                    </div>

                    <div className="creative-gallery-grid">
                        {items.map(asset => (
                            <CreativeAssetCard
                                key={asset.id}
                                asset={asset}
                                onPreview={onPreview}
                                onStatusChange={onStatusChange}
                                onSendToCalendar={onSendToCalendar}
                            />
                        ))}
                    </div>

                    {/* Infinite scroll sentinel */}
                    <div ref={sentinelRef} style={{ height: 1 }} />

                    {loadingMore && (
                        <div className="creative-gallery-loading" style={{ padding: '16px 0' }}>
                            <p className="subtitle">Cargando más...</p>
                        </div>
                    )}

                    {!hasMore && items.length > 0 && (
                        <div className="creative-gallery-end">
                            {total !== null ? `Todos los ${total} assets cargados` : 'No hay más assets'}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

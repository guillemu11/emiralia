import React, { useEffect, useState } from 'react';

/**
 * GenerationProgress
 *
 * Overlay de progreso mostrado mientras la IA genera un asset.
 * Muestra spinner animado, texto de estado con puntos dinámicos,
 * tiempo transcurrido y un hint de tiempo estimado según el tipo.
 *
 * Props:
 *   elapsed    {number}  — segundos transcurridos desde que empezó la generación
 *   statusText {string}  — texto de estado actual (ej: "Generando...", "Procesando...")
 *   type       {string}  — 'image' | cualquier tipo de video
 */
export default function GenerationProgress({
    elapsed = 0,
    statusText = 'Generando...',
    type = 'image',
}) {
    const [dots, setDots] = useState('.');

    useEffect(() => {
        const t = setInterval(() => {
            setDots(d => (d.length >= 3 ? '.' : d + '.'));
        }, 500);
        return () => clearInterval(t);
    }, []);

    const hint =
        type === 'image'
            ? 'Las imágenes tardan ~30 segundos'
            : 'Los videos pueden tardar 2–10 minutos';

    return (
        <div className="generation-progress">
            <div className="generation-spinner" />
            <p className="generation-status">
                {statusText}
                {dots}
            </p>
            {elapsed > 0 && (
                <p className="generation-elapsed">{elapsed}s transcurridos</p>
            )}
            <p className="generation-hint">{hint}</p>
        </div>
    );
}

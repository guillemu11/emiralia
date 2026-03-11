import './style.css'

// Remove FOUC guard
document.body.classList.add('styles-ready');

// ========== Developer Data ==========
const DEVELOPERS = {
    emaar: {
        name: 'Emaar Properties',
        icon: 'E',
        badge: 'Top Rated',
        badgeClass: 'text-primary bg-primary/20',
        founded: 'Fundado en 1997 · Dubai, UAE',
        description: 'Lider indiscutible en el desarrollo inmobiliario de Dubai con respaldo gubernamental y trayectoria global comprobada.',
        metaDescription: 'Emaar Properties: analisis de rendimiento historico, proyectos de excelencia y propiedades activas con mayor ROI en Emiratos Arabes Unidos.',
        heroRoi: '7.4%',
        heroRoiVs: '+1.2% vs mercado',
        heroProjects: '108,000+',
        heroProjectsLabel: 'Global Leader',
        kpis: [
            { icon: 'trending-up', iconBg: 'bg-primary/10', iconColor: 'text-primary', badgeText: '+1.2%', badgeClass: 'text-success bg-success-bg', label: 'ROI Medio Anual', value: '7.4%', sub: 'rendimiento neto estimado', barColor: 'bg-primary', barWidth: '74%' },
            { icon: 'home', iconBg: 'bg-primary/10', iconColor: 'text-primary', badgeText: 'Global Leader', badgeClass: 'text-primary bg-primary/10', label: 'Proyectos Entregados', value: '108,000+', sub: 'unidades desde 1997', barColor: 'bg-primary', barWidth: '95%' },
            { icon: 'check-circle', iconBg: 'bg-success/10', iconColor: 'text-success', badgeText: '+0.5%', badgeClass: 'text-success bg-success-bg', label: 'Puntualidad en Entrega', value: '96.5%', sub: 'cumplimiento a tiempo', barColor: 'bg-success', barWidth: '96.5%' },
            { icon: 'bar-chart-3', iconBg: 'bg-primary/10', iconColor: 'text-primary', badgeText: '+2.1% vs market', badgeClass: 'text-success bg-success-bg', label: 'Appreciation Index', value: '+12%', sub: 'sobre precio de lanzamiento', barColor: 'bg-primary', barWidth: '62%' },
        ],
        timeline: [
            { year: '2004', title: 'Dubai Marina', desc: 'Primer mega-proyecto residencial costero que redefinio el skyline de Dubai.', current: false },
            { year: '2010', title: 'Burj Khalifa', desc: 'El edificio mas alto del mundo. Icono global de ingenieria y ambicion.', current: false },
            { year: '2018', title: 'Dubai Mall Expansion', desc: 'Ampliacion del centro comercial mas visitado del planeta con 100M+ visitantes anuales.', current: false },
            { year: '2025', title: 'Dubai Creek Harbour', desc: 'El proximo distrito emblematico: Creek Tower superara al Burj Khalifa en altura.', current: true },
        ],
        properties: [
            { img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=600', alt: 'Apartamento en Downtown Dubai', roi: '8.2%', price: 'AED 1,250,000', title: 'Apartamento en Downtown Dubai', location: 'Downtown Dubai, Boulevard', beds: '1 Hab.', baths: '1 Bano', area: '78 m2' },
            { img: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&q=80&w=600', alt: 'Villa en Dubai Hills', roi: '7.8%', price: 'AED 3,450,000', title: 'Villa en Dubai Hills Estate', location: 'Dubai Hills, Golf Course', beds: '3 Hab.', baths: '3 Banos', area: '245 m2' },
            { img: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&q=80&w=600', alt: 'Penthouse en Creek Harbour', roi: '9.1%', price: 'AED 2,800,000', title: 'Penthouse en Creek Harbour', location: 'Dubai Creek Harbour', beds: '2 Hab.', baths: '2 Banos', area: '156 m2' },
        ],
        whyInvest: {
            title: 'Emaar',
            reason: 'La liquidez en el mercado secundario es el factor mas diferenciador de Emaar. Propiedades de este desarrollador se venden un 35% mas rapido que la media del mercado.',
            liquidityScore: 92,
            marketAvg: 64,
            trustCard: { title: 'Respaldo Gubernamental', desc: 'Emaar es parcialmente propiedad del ICD (Investment Corporation of Dubai), garantizando la seguridad de la inversion.' },
            expertise: 'Mas de 20 anos de datos transaccionales nos permiten analizar con precision el comportamiento del mercado de Emaar y proyectar rendimientos con alta confiabilidad.',
            checks: ['Mantenimiento de clase mundial garantizado.', 'Infraestructura comunitaria completa desde el dia 1.', 'Alta demanda de alquiler corporativo y turistico.'],
            stats: [{ value: '60+', label: 'Proyectos activos' }, { value: '36', label: 'Mercados internacionales' }, { value: '27', label: 'Anos de experiencia' }, { value: '#1', label: 'Developer en Dubai' }],
        },
        ctaText: 'Recibe analisis exclusivos de nuevos proyectos de Emaar antes de su lanzamiento al publico. Sin compromiso.',
        ctaSpam: 'Sin spam. Solo lanzamientos verificados de Emaar.',
    },
    damac: {
        name: 'Damac Properties',
        icon: 'D',
        badge: 'Luxury Leader',
        badgeClass: 'text-primary bg-primary/20',
        founded: 'Fundado en 2002 · Dubai, UAE',
        description: 'Pioneros del lujo inmobiliario en Dubai con colaboraciones exclusivas con marcas globales como Versace, Cavalli y de Grisogono.',
        metaDescription: 'Damac Properties: lujo inmobiliario, colaboraciones con marcas globales y propiedades con alto ROI en Emiratos Arabes Unidos.',
        heroRoi: '8.1%',
        heroRoiVs: '+1.9% vs mercado',
        heroProjects: '47,000+',
        heroProjectsLabel: 'Luxury Pioneer',
        kpis: [
            { icon: 'trending-up', iconBg: 'bg-primary/10', iconColor: 'text-primary', badgeText: '+1.9%', badgeClass: 'text-success bg-success-bg', label: 'ROI Medio Anual', value: '8.1%', sub: 'rendimiento neto estimado', barColor: 'bg-primary', barWidth: '81%' },
            { icon: 'home', iconBg: 'bg-primary/10', iconColor: 'text-primary', badgeText: 'Luxury Pioneer', badgeClass: 'text-primary bg-primary/10', label: 'Proyectos Entregados', value: '47,000+', sub: 'unidades desde 2002', barColor: 'bg-primary', barWidth: '78%' },
            { icon: 'check-circle', iconBg: 'bg-success/10', iconColor: 'text-success', badgeText: '-2%', badgeClass: 'text-warning bg-warning/10', label: 'Puntualidad en Entrega', value: '91%', sub: 'cumplimiento a tiempo', barColor: 'bg-warning', barWidth: '91%' },
            { icon: 'bar-chart-3', iconBg: 'bg-primary/10', iconColor: 'text-primary', badgeText: '+3.5% vs market', badgeClass: 'text-success bg-success-bg', label: 'Appreciation Index', value: '+18%', sub: 'sobre precio de lanzamiento', barColor: 'bg-primary', barWidth: '72%' },
        ],
        timeline: [
            { year: '2002', title: 'Fundacion', desc: 'Inicio de operaciones en Dubai con vision de lujo accesible para inversores internacionales.', current: false },
            { year: '2013', title: 'AKOYA Oxygen', desc: 'Primer proyecto residencial integrado con campo de golf profesional y mas de 20,000 unidades.', current: false },
            { year: '2018', title: 'Damac Tower by Versace', desc: 'Colaboracion iconita con la casa de moda italiana. Residencias de ultra-lujo en Business Bay.', current: false },
            { year: '2025', title: 'Damac Lagoons', desc: 'Mega-comunidad tematica con islas inspiradas en Maldivas, Bali y Costa Azul.', current: true },
        ],
        properties: [
            { img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=600', alt: 'Damac Lagoons Villa', roi: '9.2%', price: 'AED 1,600,000', title: 'Villa en Damac Lagoons', location: 'Damac Lagoons, Malta', beds: '3 Hab.', baths: '3 Banos', area: '210 m2' },
            { img: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&q=80&w=600', alt: 'Damac Bay by Cavalli', roi: '8.4%', price: 'AED 4,500,000', title: 'Apartamento Damac Bay by Cavalli', location: 'Dubai Marina, JBR', beds: '2 Hab.', baths: '2 Banos', area: '165 m2' },
            { img: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&q=80&w=600', alt: 'Damac Hills 2', roi: '7.8%', price: 'AED 890,000', title: 'Townhouse Damac Hills 2', location: 'Damac Hills 2', beds: '2 Hab.', baths: '2 Banos', area: '130 m2' },
        ],
        whyInvest: {
            title: 'Damac',
            reason: 'Las colaboraciones con marcas de lujo globales posicionan a Damac como el developer premium por excelencia. Propiedades branded generan un 25% mas de apreciacion.',
            liquidityScore: 78,
            marketAvg: 64,
            trustCard: { title: 'Branded Residences', desc: 'Unico developer con mas de 5 colaboraciones activas con marcas de lujo (Versace, Cavalli, Fendi, de Grisogono, Trump).' },
            expertise: 'Mas de 20 anos de enfoque en el segmento premium permiten analizar con precision el comportamiento del mercado de lujo y proyectar rendimientos diferenciados.',
            checks: ['Acabados de marcas de lujo internacionales.', 'Amenidades de hospitality 5 estrellas.', 'Programa de gestion de alquiler integrado.'],
            stats: [{ value: '82+', label: 'Proyectos activos' }, { value: '12', label: 'Paises con presencia' }, { value: '22', label: 'Anos de experiencia' }, { value: '#1', label: 'En branded residences' }],
        },
        ctaText: 'Recibe analisis exclusivos de nuevos proyectos de Damac antes de su lanzamiento al publico. Sin compromiso.',
        ctaSpam: 'Sin spam. Solo lanzamientos verificados de Damac.',
    },
    sobha: {
        name: 'Sobha Realty',
        icon: 'S',
        badge: 'Quality First',
        badgeClass: 'text-success bg-success-bg',
        founded: 'Fundado en 1976 · Dubai, UAE',
        description: 'Reconocidos por la calidad de construccion excepcional y acabados artesanales. Integracion vertical completa: diseno, construccion y entrega.',
        metaDescription: 'Sobha Realty: calidad de construccion excepcional, acabados premium y propiedades con alto ROI en Emiratos Arabes Unidos.',
        heroRoi: '7.5%',
        heroRoiVs: '+1.3% vs mercado',
        heroProjects: '50,000+',
        heroProjectsLabel: 'Quality Leader',
        kpis: [
            { icon: 'trending-up', iconBg: 'bg-primary/10', iconColor: 'text-primary', badgeText: '+1.3%', badgeClass: 'text-success bg-success-bg', label: 'ROI Medio Anual', value: '7.5%', sub: 'rendimiento neto estimado', barColor: 'bg-primary', barWidth: '75%' },
            { icon: 'home', iconBg: 'bg-primary/10', iconColor: 'text-primary', badgeText: 'Quality Leader', badgeClass: 'text-primary bg-primary/10', label: 'Proyectos Entregados', value: '50,000+', sub: 'unidades desde 1976', barColor: 'bg-primary', barWidth: '82%' },
            { icon: 'check-circle', iconBg: 'bg-success/10', iconColor: 'text-success', badgeText: '+1.2%', badgeClass: 'text-success bg-success-bg', label: 'Puntualidad en Entrega', value: '96%', sub: 'cumplimiento a tiempo', barColor: 'bg-success', barWidth: '96%' },
            { icon: 'bar-chart-3', iconBg: 'bg-primary/10', iconColor: 'text-primary', badgeText: '+1.8% vs market', badgeClass: 'text-success bg-success-bg', label: 'Appreciation Index', value: '+14%', sub: 'sobre precio de lanzamiento', barColor: 'bg-primary', barWidth: '66%' },
        ],
        timeline: [
            { year: '1976', title: 'Fundacion en India', desc: 'Inicio como empresa de ingenieria y construccion de alta calidad en Bangalore, India.', current: false },
            { year: '2012', title: 'Sobha Hartland', desc: 'Lanzamiento del primer mega-proyecto en Dubai: comunidad de 8M sqft en MBR City.', current: false },
            { year: '2020', title: 'Sobha Seahaven', desc: 'Residencias ultra-premium frente al mar en Dubai Harbour con vistas a Palm Jumeirah.', current: false },
            { year: '2025', title: 'Sobha Hartland II', desc: 'Expansion de la comunidad estrella con nuevas torres, villas y amenidades premium.', current: true },
        ],
        properties: [
            { img: 'https://images.unsplash.com/photo-1600573472550-8090b5e0745e?auto=format&fit=crop&q=80&w=600', alt: 'Sobha Hartland II', roi: '8.1%', price: 'AED 1,900,000', title: 'Apartamento Sobha Hartland II', location: 'MBR City, Hartland', beds: '2 Hab.', baths: '2 Banos', area: '120 m2' },
            { img: 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&q=80&w=600', alt: 'Sobha Seahaven', roi: '7.6%', price: 'AED 3,800,000', title: 'Penthouse Sobha Seahaven', location: 'Dubai Harbour', beds: '3 Hab.', baths: '3 Banos', area: '198 m2' },
            { img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=600', alt: 'Sobha Creek Vistas', roi: '7.2%', price: 'AED 1,400,000', title: 'Sobha Creek Vistas Reserve', location: 'Sobha Hartland, Creek', beds: '1 Hab.', baths: '1 Bano', area: '85 m2' },
        ],
        whyInvest: {
            title: 'Sobha',
            reason: 'La integracion vertical de Sobha (diseno, construccion y acabados propios) garantiza calidad consistente y control total del producto final. Menor riesgo de defectos post-entrega.',
            liquidityScore: 85,
            marketAvg: 64,
            trustCard: { title: 'Integracion Vertical', desc: 'Sobha controla toda la cadena: diseno, fabricacion de materiales, construccion y acabados. Cero dependencia de subcontratistas.' },
            expertise: 'Casi 50 anos de experiencia en construccion de alta calidad permiten analizar la durabilidad y valoracion a largo plazo de las propiedades Sobha.',
            checks: ['Acabados artesanales y materiales premium importados.', 'Espacios verdes integrados en cada comunidad.', 'Mantenimiento propio con estandares de hospitality.'],
            stats: [{ value: '38+', label: 'Proyectos activos' }, { value: '8', label: 'Paises con presencia' }, { value: '48', label: 'Anos de experiencia' }, { value: '#1', label: 'En calidad de acabados' }],
        },
        ctaText: 'Recibe analisis exclusivos de nuevos proyectos de Sobha antes de su lanzamiento al publico. Sin compromiso.',
        ctaSpam: 'Sin spam. Solo lanzamientos verificados de Sobha.',
    },
    nakheel: {
        name: 'Nakheel',
        icon: 'N',
        badge: 'Master Developer',
        badgeClass: 'text-primary bg-primary/20',
        founded: 'Fundado en 2000 · Dubai, UAE',
        description: 'Creadores de Palm Jumeirah y los proyectos mas iconicos de recuperacion de tierra en el mundo. Master developer respaldado por el gobierno de Dubai.',
        metaDescription: 'Nakheel: creadores de Palm Jumeirah, master developer respaldado por el gobierno de Dubai con propiedades de alto ROI.',
        heroRoi: '7.2%',
        heroRoiVs: '+1.0% vs mercado',
        heroProjects: '75,000+',
        heroProjectsLabel: 'Master Developer',
        kpis: [
            { icon: 'trending-up', iconBg: 'bg-primary/10', iconColor: 'text-primary', badgeText: '+1.0%', badgeClass: 'text-success bg-success-bg', label: 'ROI Medio Anual', value: '7.2%', sub: 'rendimiento neto estimado', barColor: 'bg-primary', barWidth: '72%' },
            { icon: 'home', iconBg: 'bg-primary/10', iconColor: 'text-primary', badgeText: 'Master Developer', badgeClass: 'text-primary bg-primary/10', label: 'Proyectos Entregados', value: '75,000+', sub: 'unidades desde 2000', barColor: 'bg-primary', barWidth: '88%' },
            { icon: 'check-circle', iconBg: 'bg-success/10', iconColor: 'text-success', badgeText: '+0.3%', badgeClass: 'text-success bg-success-bg', label: 'Puntualidad en Entrega', value: '94%', sub: 'cumplimiento a tiempo', barColor: 'bg-success', barWidth: '94%' },
            { icon: 'bar-chart-3', iconBg: 'bg-primary/10', iconColor: 'text-primary', badgeText: '+1.5% vs market', badgeClass: 'text-success bg-success-bg', label: 'Appreciation Index', value: '+15%', sub: 'sobre precio de lanzamiento', barColor: 'bg-primary', barWidth: '68%' },
        ],
        timeline: [
            { year: '2001', title: 'Palm Jumeirah', desc: 'Inicio de la isla artificial mas iconica del mundo. Redefinio lo posible en ingenieria costera.', current: false },
            { year: '2007', title: 'The World Islands', desc: 'Archipielago artificial con forma de mapamundi. 300 islas privadas frente a la costa de Dubai.', current: false },
            { year: '2017', title: 'Nakheel Mall', desc: 'Centro comercial premium en el tronco de Palm Jumeirah con 350+ tiendas y restaurantes.', current: false },
            { year: '2025', title: 'Palm Jebel Ali', desc: 'La nueva Palm: comunidad costera de 13.4 km2 con 80 hoteles y miles de residencias.', current: true },
        ],
        properties: [
            { img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=600', alt: 'Palm Jumeirah Villa', roi: '7.5%', price: 'AED 5,200,000', title: 'Villa en Palm Jumeirah', location: 'Palm Jumeirah, Frond', beds: '4 Hab.', baths: '4 Banos', area: '380 m2' },
            { img: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&q=80&w=600', alt: 'Dragon City', roi: '7.8%', price: 'AED 980,000', title: 'Apartamento en Dragon City', location: 'International City', beds: '1 Hab.', baths: '1 Bano', area: '72 m2' },
            { img: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&q=80&w=600', alt: 'Jumeirah Islands', roi: '6.9%', price: 'AED 7,800,000', title: 'Villa en Jumeirah Islands', location: 'Jumeirah Islands', beds: '5 Hab.', baths: '5 Banos', area: '520 m2' },
        ],
        whyInvest: {
            title: 'Nakheel',
            reason: 'Las propiedades de Nakheel en ubicaciones costeras iconicas mantienen una demanda constante y alta apreciacion. Palm Jumeirah es la direccion mas exclusiva de Dubai.',
            liquidityScore: 88,
            marketAvg: 64,
            trustCard: { title: 'Respaldo Gubernamental', desc: 'Nakheel es 100% propiedad del gobierno de Dubai a traves de Dubai World, garantizando estabilidad y respaldo institucional.' },
            expertise: 'Mas de 25 anos de datos en comunidades master-planned permiten analizar la evolucion de valor y demanda de las propiedades Nakheel con alta precision.',
            checks: ['Ubicaciones costeras premium e irrepetibles.', 'Comunidades master-planned con infraestructura completa.', 'Alta demanda de alquiler turistico y residencial.'],
            stats: [{ value: '18+', label: 'Proyectos activos' }, { value: '1', label: 'Mercado (Dubai-focused)' }, { value: '25', label: 'Anos de experiencia' }, { value: '#1', label: 'En islas artificiales' }],
        },
        ctaText: 'Recibe analisis exclusivos de nuevos proyectos de Nakheel antes de su lanzamiento al publico. Sin compromiso.',
        ctaSpam: 'Sin spam. Solo lanzamientos verificados de Nakheel.',
    },
};

// ========== Populate Developer Page ==========
const populateDeveloper = () => {
    const params = new URLSearchParams(window.location.search);
    const devKey = params.get('dev');
    if (!devKey || !DEVELOPERS[devKey]) return; // Keep Emaar defaults if no param

    const dev = DEVELOPERS[devKey];

    // Meta & title
    document.getElementById('page-title').textContent = `${dev.name} - Desarrollador | Emiralia`;
    document.getElementById('meta-description').content = dev.metaDescription;

    // Breadcrumb
    document.getElementById('breadcrumb-name').textContent = dev.name;

    // Hero
    document.getElementById('dev-icon').textContent = dev.icon;
    const badge = document.getElementById('dev-badge');
    badge.textContent = dev.badge;
    badge.className = `text-xs font-semibold px-3 py-1 rounded-full ${dev.badgeClass}`;
    document.getElementById('dev-founded').textContent = dev.founded;
    document.getElementById('dev-name').textContent = dev.name;
    document.getElementById('dev-description').textContent = dev.description;

    // Hero stats
    document.getElementById('hero-roi').textContent = dev.heroRoi;
    document.getElementById('hero-roi-vs').textContent = dev.heroRoiVs;
    document.getElementById('hero-projects').textContent = dev.heroProjects;
    document.getElementById('hero-projects-label').textContent = dev.heroProjectsLabel;

    // KPI Cards
    const kpiGrid = document.getElementById('kpi-grid');
    if (kpiGrid) {
        kpiGrid.innerHTML = dev.kpis.map(kpi => `
            <div class="bg-white rounded-2xl p-4 sm:p-5 border border-border-color shadow-sm hover:shadow-xl transition-shadow relative overflow-hidden reveal">
                <div class="flex items-center justify-between mb-3">
                    <div class="w-9 h-9 rounded-xl ${kpi.iconBg} flex items-center justify-center">
                        <i data-lucide="${kpi.icon}" class="w-4.5 h-4.5 ${kpi.iconColor}"></i>
                    </div>
                    <span class="text-[10px] sm:text-xs font-bold ${kpi.badgeClass} px-2 py-0.5 rounded-full flex items-center gap-1">
                        ${kpi.badgeText}
                        <i data-lucide="arrow-up-right" class="w-3 h-3"></i>
                    </span>
                </div>
                <p class="text-secondary-text text-xs sm:text-sm font-medium mb-1">${kpi.label}</p>
                <p class="text-primary-text text-2xl sm:text-3xl font-bold mb-1">${kpi.value}</p>
                <p class="text-muted-text text-[10px] sm:text-xs">${kpi.sub}</p>
                <div class="mt-3 h-1 bg-border-color rounded-full overflow-hidden">
                    <div class="h-full ${kpi.barColor} rounded-full" style="width: ${kpi.barWidth}"></div>
                </div>
            </div>
        `).join('');
    }

    // Timeline
    const timelineSection = document.getElementById('timeline-section');
    if (timelineSection) {
        const innerDiv = timelineSection.querySelector('.max-w-7xl');
        if (innerDiv) {
            innerDiv.innerHTML = `
                <div class="text-center mb-10 sm:mb-14 reveal">
                    <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <i data-lucide="star" class="w-5 h-5 text-primary"></i>
                    </div>
                    <h2 class="text-xl sm:text-2xl lg:text-3xl font-bold text-primary-text">Trayectoria de Excelencia</h2>
                    <p class="text-secondary-text text-sm sm:text-base mt-2 max-w-lg mx-auto">Hitos que definen la trayectoria de ${dev.name} en desarrollo inmobiliario.</p>
                </div>
                <div class="relative reveal">
                    <div class="hidden lg:block absolute top-[52px] h-[2px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" style="left: 8%; right: 8%;"></div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-5">
                        ${dev.timeline.map(m => m.current ? `
                        <div class="group">
                            <div class="flex flex-col items-center text-center">
                                <div class="relative z-10 w-[104px] h-[104px] rounded-full border-2 border-primary bg-primary/5 flex flex-col items-center justify-center mb-5 shadow-lg shadow-primary/15">
                                    <span class="text-primary text-[10px] font-medium uppercase tracking-wider">Ano</span>
                                    <span class="text-primary text-2xl font-bold">${m.year}</span>
                                </div>
                                <div class="bg-white rounded-2xl p-5 border-2 border-primary/20 shadow-lg shadow-primary/5 w-full">
                                    <div class="inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full mb-2">
                                        <i data-lucide="sparkles" class="w-3 h-3"></i> En curso
                                    </div>
                                    <h3 class="text-primary font-semibold text-sm sm:text-base mb-2">${m.title}</h3>
                                    <p class="text-secondary-text text-xs sm:text-sm leading-relaxed">${m.desc}</p>
                                </div>
                            </div>
                        </div>
                        ` : `
                        <div class="group">
                            <div class="flex flex-col items-center text-center">
                                <div class="relative z-10 w-[104px] h-[104px] rounded-full border-2 border-border-emphasis bg-white flex flex-col items-center justify-center mb-5 group-hover:border-primary group-hover:shadow-lg group-hover:shadow-primary/10 transition-all duration-300">
                                    <span class="text-muted-text text-[10px] font-medium uppercase tracking-wider">Ano</span>
                                    <span class="text-primary-text text-2xl font-bold group-hover:text-primary transition-colors">${m.year}</span>
                                </div>
                                <div class="bg-white rounded-2xl p-5 border border-border-color shadow-sm group-hover:shadow-lg transition-all duration-300 w-full">
                                    <h3 class="text-primary-text font-semibold text-sm sm:text-base mb-2">${m.title}</h3>
                                    <p class="text-secondary-text text-xs sm:text-sm leading-relaxed">${m.desc}</p>
                                </div>
                            </div>
                        </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
    }

    // Properties
    const propertiesGrid = document.getElementById('properties-grid');
    if (propertiesGrid) {
        propertiesGrid.innerHTML = dev.properties.map(p => `
            <div class="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group reveal border border-border-color">
                <div class="relative h-40 sm:h-44 overflow-hidden">
                    <img src="${p.img}" alt="${p.alt}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                    <div class="absolute top-3 right-3">
                        <span class="bg-success-bg text-green-700 text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-sm border border-success/20">ROI ${p.roi}</span>
                    </div>
                </div>
                <div class="p-4 sm:p-5">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-primary font-bold text-lg sm:text-xl">${p.price}</span>
                    </div>
                    <h3 class="font-semibold text-primary-text text-sm sm:text-base mb-2">${p.title}</h3>
                    <p class="text-secondary-text text-xs sm:text-sm flex items-center gap-1 mb-3">
                        <i data-lucide="map-pin" class="w-3 h-3"></i>
                        ${p.location}
                    </p>
                    <div class="flex items-center gap-4 text-xs text-muted-text">
                        <span class="flex items-center gap-1"><i data-lucide="bed-double" class="w-3.5 h-3.5"></i> ${p.beds}</span>
                        <span class="flex items-center gap-1"><i data-lucide="bath" class="w-3.5 h-3.5"></i> ${p.baths}</span>
                        <span class="flex items-center gap-1"><i data-lucide="maximize" class="w-3.5 h-3.5"></i> ${p.area}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Why Invest section
    const whySection = document.getElementById('why-invest-section');
    if (whySection) {
        const wi = dev.whyInvest;
        const innerDiv = whySection.querySelector('.max-w-7xl');
        if (innerDiv) {
            innerDiv.innerHTML = `
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-10 sm:gap-12 lg:gap-16">
                    <div class="reveal">
                        <h2 class="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-4 sm:mb-5">
                            Por que invertir en <span class="text-primary">${wi.title}</span>?
                        </h2>
                        <p class="text-slate-200 text-sm sm:text-base leading-relaxed mb-8 sm:mb-10">${wi.reason}</p>
                        <div class="space-y-5 mb-8 sm:mb-10">
                            <div>
                                <div class="flex items-center justify-between mb-2">
                                    <span class="text-slate-300 text-sm font-medium">Liquidez Mercado Secundario (${wi.title})</span>
                                    <span class="text-primary text-sm font-bold">${wi.liquidityScore}/100</span>
                                </div>
                                <div class="h-2.5 bg-slate-700 rounded-full overflow-hidden">
                                    <div class="h-full bg-primary rounded-full transition-all duration-1000" style="width: ${wi.liquidityScore}%"></div>
                                </div>
                            </div>
                            <div>
                                <div class="flex items-center justify-between mb-2">
                                    <span class="text-slate-300 text-sm font-medium">Media del Mercado Dubai</span>
                                    <span class="text-slate-200 text-sm font-bold">${wi.marketAvg}/100</span>
                                </div>
                                <div class="h-2.5 bg-slate-700 rounded-full overflow-hidden">
                                    <div class="h-full bg-slate-500 rounded-full transition-all duration-1000" style="width: ${wi.marketAvg}%"></div>
                                </div>
                            </div>
                        </div>
                        <div class="bg-slate-800/50 rounded-2xl p-5 sm:p-6 border border-slate-700/50">
                            <div class="flex items-start gap-4">
                                <div class="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
                                    <i data-lucide="shield-check" class="w-5 h-5 text-green-400"></i>
                                </div>
                                <div>
                                    <h3 class="text-white font-semibold text-sm sm:text-base mb-1">${wi.trustCard.title}</h3>
                                    <p class="text-slate-200 text-xs sm:text-sm leading-relaxed">${wi.trustCard.desc}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="reveal">
                        <h2 class="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-4 sm:mb-5">Expertise que genera confianza.</h2>
                        <p class="text-slate-200 text-sm sm:text-base leading-relaxed mb-8 sm:mb-10">${wi.expertise}</p>
                        <div class="space-y-4 sm:space-y-5">
                            ${wi.checks.map(c => `
                            <div class="flex items-start gap-3">
                                <div class="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                    <i data-lucide="check" class="w-3.5 h-3.5 text-primary"></i>
                                </div>
                                <p class="text-slate-300 text-sm sm:text-base">${c}</p>
                            </div>
                            `).join('')}
                        </div>
                        <div class="grid grid-cols-2 gap-3 sm:gap-4 mt-8 sm:mt-10">
                            ${wi.stats.map(s => `
                            <div class="bg-slate-800/50 rounded-2xl p-4 sm:p-5 text-center border border-slate-700/50">
                                <p class="text-2xl sm:text-3xl font-bold text-white mb-1">${s.value}</p>
                                <p class="text-slate-200 text-xs sm:text-sm">${s.label}</p>
                            </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
        }
    }

    // CTA section
    const ctaSection = document.getElementById('cta-dossier');
    if (ctaSection) {
        const ctaP = ctaSection.querySelector('p.text-secondary-text');
        if (ctaP) ctaP.textContent = dev.ctaText;
        const spamP = ctaSection.querySelector('p.text-muted-text');
        if (spamP) spamP.textContent = dev.ctaSpam;
    }
};


// ========== Scroll Animations ==========
const initAnimations = () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    document.body.classList.add('js-loaded');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.05,
        rootMargin: '0px 0px -20px 0px'
    });

    // Animate reveal elements on scroll
    document.querySelectorAll('.reveal').forEach((el, i) => {
        el.style.transitionDelay = `${Math.min(i * 0.06, 0.4)}s`;
        observer.observe(el);
    });

    // Fallback: reveal all after 3s
    setTimeout(() => {
        document.querySelectorAll('.reveal:not(.is-visible)').forEach(el => {
            el.classList.add('is-visible');
        });
    }, 3000);
}

// ========== Smooth scroll for anchor links ==========
const initSmoothScroll = () => {
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', (e) => {
            const target = document.querySelector(link.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}

// ========== Init ==========
document.addEventListener('DOMContentLoaded', () => {
    initDarkMode();
    populateDeveloper();
    initAnimations();
    initSmoothScroll();

    // Initialize Lucide icons
    if (window.lucide) {
        window.lucide.createIcons();
    }
});

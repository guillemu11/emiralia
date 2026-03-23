// CRM Constants — status colors, labels, stage configs

export const LEAD_STATUS = {
  captured:   { bg: '#eff6ff', text: '#2563eb', label: 'Capturado' },
  qualifying: { bg: '#fef3c7', text: '#d97706', label: 'Cualificando' },
  qualified:  { bg: '#dcfce7', text: '#16a34a', label: 'Cualificado' },
  assigned:   { bg: '#f0fdf4', text: '#15803d', label: 'Asignado' },
  converted:  { bg: '#d1fae5', text: '#065f46', label: 'Convertido' },
  lost:       { bg: '#fee2e2', text: '#dc2626', label: 'Perdido' },
};

export const LEAD_SOURCE = {
  interes:       { label: 'Interés general' },
  invertir:      { label: 'Quiero invertir' },
  'ai-insights': { label: 'AI Insights' },
  desarrollador: { label: 'Desarrollador' },
};

export const DEVELOPER_TIER = {
  prospect: { bg: '#f1f5f9', text: '#475569', label: 'Prospecto' },
  trial:    { bg: '#fef3c7', text: '#d97706', label: 'Trial' },
  active:   { bg: '#dcfce7', text: '#16a34a', label: 'Activo' },
  churned:  { bg: '#fee2e2', text: '#dc2626', label: 'Churned' },
};

export const DEAL_STAGES = [
  { id: 'prospecting',    label: 'Prospecting',    probability: 10 },
  { id: 'contacted',      label: 'Contactado',      probability: 20 },
  { id: 'demo_scheduled', label: 'Demo Agendado',   probability: 40 },
  { id: 'proposal_sent',  label: 'Propuesta',       probability: 60 },
  { id: 'negotiation',    label: 'Negociación',     probability: 80 },
  { id: 'closed_won',     label: 'Cerrado Won',     probability: 100 },
  { id: 'closed_lost',    label: 'Cerrado Lost',    probability: 0 },
];

export const DEAL_STAGE_COLORS = {
  prospecting:    { bg: '#f1f5f9', text: '#475569' },
  contacted:      { bg: '#eff6ff', text: '#2563eb' },
  demo_scheduled: { bg: '#fef3c7', text: '#d97706' },
  proposal_sent:  { bg: '#fdf4ff', text: '#9333ea' },
  negotiation:    { bg: '#fff7ed', text: '#ea580c' },
  closed_won:     { bg: '#dcfce7', text: '#16a34a' },
  closed_lost:    { bg: '#fee2e2', text: '#dc2626' },
};

export const COMM_CHANNEL = {
  email:    { label: 'Email',    icon: '✉' },
  whatsapp: { label: 'WhatsApp', icon: '💬' },
  call:     { label: 'Llamada',  icon: '📞' },
  meeting:  { label: 'Reunión',  icon: '🤝' },
  note:     { label: 'Nota',     icon: '📝' },
};

export const SUB_PLAN = {
  starter:    { label: 'Starter',    color: '#64748b' },
  pro:        { label: 'Pro',        color: '#2563eb' },
  enterprise: { label: 'Enterprise', color: '#7c3aed' },
};

export function fmtCurrency(val, currency = 'USD') {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency, maximumFractionDigits: 0 }).format(val ?? 0);
}

export function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

import { Stats } from '../types';

interface Props {
  stats: Stats | null;
}

export default function StatsCards({ stats }: Props) {
  if (!stats) return null;

  const cards = [
    { label: 'Total', value: stats.total, className: 'total', icon: '👥' },
    { label: 'Pendentes', value: stats.pendentes, className: 'pendente', icon: '⏳' },
    { label: 'Abordados', value: stats.abordados, className: 'abordado', icon: '📨' },
    { label: 'Responderam', value: stats.responderam, className: 'respondeu', icon: '💬' },
    { label: 'Convidados', value: stats.convidados, className: 'convidado', icon: '✅' },
    { label: 'Ignorados', value: stats.ignorados, className: 'ignorado', icon: '❌' },
    { label: 'Taxa de Resposta', value: `${stats.taxaResposta}%`, className: 'taxa', icon: '📊' },
  ];

  return (
    <div className="stats-grid">
      {cards.map((card) => (
        <div key={card.label} className={`stat-card ${card.className}`}>
          <div className="stat-icon">{card.icon}</div>
          <div className="stat-label">{card.label}</div>
          <div className="stat-value">{card.value}</div>
        </div>
      ))}
    </div>
  );
}

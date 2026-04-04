import React from 'react';
import { Building2, Mail, User, Globe, TrendingUp } from 'lucide-react';

export default function SummaryCards({ summary, selectedCategory }) {
  if (!summary) return null;

  const stats =
    selectedCategory === 'All'
      ? summary.overall
      : summary.categories.find((c) => c.name === selectedCategory) || summary.overall;

  const cards = [
    {
      label: 'Total Businesses',
      value: stats.total,
      icon: Building2,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'With Email',
      value: stats.withEmail,
      icon: Mail,
      color: 'bg-green-50 text-green-600',
    },
    {
      label: 'With Owner',
      value: stats.withOwner,
      icon: User,
      color: 'bg-purple-50 text-purple-600',
    },
    {
      label: 'With Website',
      value: stats.withWebsite,
      icon: Globe,
      color: 'bg-orange-50 text-orange-600',
    },
    {
      label: 'Enrichment Rate',
      value: `${stats.enrichRate}%`,
      icon: TrendingUp,
      color: 'bg-indigo-50 text-indigo-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 p-4 shrink-0">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3"
        >
          <div className={`p-2 rounded-lg ${card.color}`}>
            <card.icon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-lg font-bold text-gray-900 truncate">{card.value}</div>
            <div className="text-xs text-gray-500 truncate">{card.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

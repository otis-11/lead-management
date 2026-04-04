import React from 'react';
import { LayoutDashboard, ChevronLeft, Building2 } from 'lucide-react';

export default function Sidebar({ categories, selected, onSelect, summary, open, onToggle }) {
  const getCatCount = (cat) => {
    if (!summary) return 0;
    if (cat === 'All') return summary.overall.total;
    const found = summary.categories.find((c) => c.name === cat);
    return found ? found.total : 0;
  };

  const getCatEnrichRate = (cat) => {
    if (!summary) return '0';
    if (cat === 'All') return summary.overall.enrichRate;
    const found = summary.categories.find((c) => c.name === cat);
    return found ? found.enrichRate : '0';
  };

  return (
    <aside
      className={`${
        open ? 'w-72' : 'w-0'
      } transition-all duration-300 bg-white border-r border-gray-200 flex flex-col overflow-hidden shrink-0`}
    >
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <LayoutDashboard className="w-6 h-6 text-blue-600 shrink-0" />
          <h1 className="font-bold text-lg text-gray-800 truncate">Enrichment</h1>
        </div>
        <button
          onClick={onToggle}
          className="p-1 rounded hover:bg-gray-100 text-gray-500"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>

      {/* Category list */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        <button
          onClick={() => onSelect('All')}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm mb-1 transition-colors ${
            selected === 'All'
              ? 'bg-blue-50 text-blue-700 font-semibold'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <span className="flex items-center gap-2 truncate">
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            All Categories
          </span>
          <span className="text-xs bg-gray-100 rounded-full px-2 py-0.5 shrink-0">
            {getCatCount('All')}
          </span>
        </button>

        <div className="border-t border-gray-100 my-2"></div>

        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => onSelect(cat)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm mb-0.5 transition-colors ${
              selected === cat
                ? 'bg-blue-50 text-blue-700 font-semibold'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span className="flex items-center gap-2 truncate">
              <Building2 className="w-4 h-4 shrink-0 opacity-50" />
              <span className="truncate">{cat}</span>
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs text-gray-400">{getCatEnrichRate(cat)}%</span>
              <span className="text-xs bg-gray-100 rounded-full px-2 py-0.5">
                {getCatCount(cat)}
              </span>
            </div>
          </button>
        ))}
      </nav>

      {/* Footer */}
      {summary && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 shrink-0">
          <div className="text-xs text-gray-500 mb-1">Overall Enrichment</div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${summary.overall.enrichRate}%` }}
            ></div>
          </div>
          <div className="text-xs text-gray-500 mt-1 text-right">
            {summary.overall.enrichRate}%
          </div>
        </div>
      )}
    </aside>
  );
}

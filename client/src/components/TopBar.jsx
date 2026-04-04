import React from 'react';
import { Search, Plus, Download, Menu } from 'lucide-react';

export default function TopBar({
  searchQuery,
  onSearch,
  onAdd,
  onExport,
  resultCount,
  totalCount,
  onToggleSidebar,
}) {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 gap-3 shrink-0">
      <button
        onClick={onToggleSidebar}
        className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 lg:hidden"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Search */}
      <div className="flex-1 max-w-lg relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search businesses, owners, emails, phones..."
          className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
        />
      </div>

      <span className="text-sm text-gray-400 hidden sm:block">
        {resultCount} of {totalCount}
      </span>

      <div className="flex items-center gap-2 ml-auto">
        <button
          onClick={onExport}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Export</span>
        </button>
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Business</span>
        </button>
      </div>
    </header>
  );
}

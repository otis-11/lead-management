import React, { useState } from 'react';
import { Pencil, Trash2, ExternalLink, Star, Globe, Mail, Phone, MapPin, ChevronUp, ChevronDown } from 'lucide-react';

function rowColorClass(biz) {
  if (biz.email) return 'bg-green-50 hover:bg-green-100';
  if (biz.website_url || biz.owner_name) return 'bg-yellow-50 hover:bg-yellow-100';
  return 'bg-red-50 hover:bg-red-100';
}

function modernBadge(val) {
  if (val === 'yes') return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">Modern</span>;
  if (val === 'no') return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700">Outdated</span>;
  return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-500">None</span>;
}

export default function BusinessTable({ businesses, onEdit, onDelete }) {
  const [sortField, setSortField] = useState('business_name');
  const [sortDir, setSortDir] = useState('asc');
  const [expandedId, setExpandedId] = useState(null);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sorted = [...businesses].sort((a, b) => {
    const valA = (a[sortField] || '').toString().toLowerCase();
    const valB = (b[sortField] || '').toString().toLowerCase();
    const cmp = valA.localeCompare(valB);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? (
      <ChevronUp className="w-3 h-3 inline ml-0.5" />
    ) : (
      <ChevronDown className="w-3 h-3 inline ml-0.5" />
    );
  };

  const thClass =
    'px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none whitespace-nowrap';

  return (
    <div className="flex-1 overflow-auto p-4 pt-0">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className={thClass} onClick={() => handleSort('category')}>
                Category<SortIcon field="category" />
              </th>
              <th className={thClass} onClick={() => handleSort('business_name')}>
                Business<SortIcon field="business_name" />
              </th>
              <th className={thClass} onClick={() => handleSort('phone')}>
                Phone<SortIcon field="phone" />
              </th>
              <th className={thClass} onClick={() => handleSort('owner_name')}>
                Owner<SortIcon field="owner_name" />
              </th>
              <th className={thClass} onClick={() => handleSort('email')}>
                Email<SortIcon field="email" />
              </th>
              <th className={thClass} onClick={() => handleSort('google_rating')}>
                Rating<SortIcon field="google_rating" />
              </th>
              <th className={thClass}>Site</th>
              <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                  No businesses found
                </td>
              </tr>
            )}
            {sorted.map((biz) => (
              <React.Fragment key={biz.id}>
                <tr
                  className={`${rowColorClass(biz)} transition-colors cursor-pointer`}
                  onClick={() => setExpandedId(expandedId === biz.id ? null : biz.id)}
                >
                  <td className="px-3 py-2.5">
                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700 whitespace-nowrap">
                      {biz.category}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="text-sm font-medium text-gray-900 max-w-[200px] truncate">
                      {biz.business_name}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-sm text-gray-600 whitespace-nowrap">
                    {biz.phone ? (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-gray-400" />
                        {biz.phone}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-sm text-gray-700 max-w-[140px] truncate">
                    {biz.owner_name || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    {biz.email ? (
                      <a
                        href={`mailto:${biz.email}`}
                        className="text-sm text-blue-600 hover:underline flex items-center gap-1 max-w-[180px] truncate"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Mail className="w-3 h-3 shrink-0" />
                        <span className="truncate">{biz.email}</span>
                      </a>
                    ) : (
                      <span className="text-sm text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {biz.google_rating ? (
                      <span className="flex items-center gap-1 text-sm">
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        <span className="font-medium">{biz.google_rating}</span>
                        <span className="text-gray-400 text-xs">({biz.review_count})</span>
                      </span>
                    ) : (
                      <span className="text-sm text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">{modernBadge(biz.website_modern)}</td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      {biz.website_url && (
                        <a
                          href={biz.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg hover:bg-white/60 text-gray-400 hover:text-blue-600"
                          onClick={(e) => e.stopPropagation()}
                          title="Visit website"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(biz);
                        }}
                        className="p-1.5 rounded-lg hover:bg-white/60 text-gray-400 hover:text-blue-600"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Delete "${biz.business_name}"?`)) {
                            onDelete(biz.id);
                          }
                        }}
                        className="p-1.5 rounded-lg hover:bg-white/60 text-gray-400 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>

                {/* Expanded detail row */}
                {expandedId === biz.id && (
                  <tr className="bg-white">
                    <td colSpan={8} className="px-6 py-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="text-xs font-semibold text-gray-400 uppercase mb-1">Address</div>
                          <div className="flex items-start gap-1 text-gray-700">
                            <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                            {biz.address || 'Not available'}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-gray-400 uppercase mb-1">Website</div>
                          <div className="flex items-center gap-1">
                            <Globe className="w-4 h-4 text-gray-400 shrink-0" />
                            {biz.website_url ? (
                              <a
                                href={biz.website_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline truncate max-w-xs"
                              >
                                {biz.website_url}
                              </a>
                            ) : (
                              <span className="text-gray-400">Not available</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-gray-400 uppercase mb-1">Website Status</div>
                          {modernBadge(biz.website_modern)}
                        </div>
                        <div className="md:col-span-2 lg:col-span-3">
                          <div className="text-xs font-semibold text-gray-400 uppercase mb-1">Enrichment Notes</div>
                          <div className="text-gray-600 bg-gray-50 rounded-lg p-2 text-xs leading-relaxed">
                            {biz.enrichment_notes || 'No notes'}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

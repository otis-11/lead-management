import React, { useState } from 'react';
import { X, Save } from 'lucide-react';

const FIELDS = [
  { key: 'category', label: 'Category', type: 'text' },
  { key: 'business_name', label: 'Business Name', type: 'text' },
  { key: 'phone', label: 'Phone', type: 'text' },
  { key: 'owner_name', label: 'Owner / Manager', type: 'text' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'website_url', label: 'Website URL', type: 'url' },
  { key: 'address', label: 'Address', type: 'text' },
  { key: 'google_rating', label: 'Google Rating', type: 'text' },
  { key: 'review_count', label: 'Review Count', type: 'text' },
  {
    key: 'website_modern',
    label: 'Website Modern?',
    type: 'select',
    options: ['yes', 'no', 'none'],
  },
  { key: 'enrichment_notes', label: 'Enrichment Notes', type: 'textarea' },
];

export default function EditModal({ business, categories, onSave, onClose }) {
  const [form, setForm] = useState({ ...business });

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const { id, ...data } = form;
    onSave(business.id, data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-800">Edit Business</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FIELDS.map((f) => (
              <div
                key={f.key}
                className={f.type === 'textarea' ? 'md:col-span-2' : ''}
              >
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
                  {f.label}
                </label>

                {f.type === 'select' ? (
                  <select
                    value={form[f.key] || ''}
                    onChange={(e) => handleChange(f.key, e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {f.options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : f.type === 'textarea' ? (
                  <textarea
                    value={form[f.key] || ''}
                    onChange={(e) => handleChange(f.key, e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                ) : f.key === 'category' ? (
                  <div className="relative">
                    <input
                      list="category-options"
                      value={form[f.key] || ''}
                      onChange={(e) => handleChange(f.key, e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <datalist id="category-options">
                      {categories.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>
                ) : (
                  <input
                    type={f.type}
                    value={form[f.key] || ''}
                    onChange={(e) => handleChange(f.key, e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>
            ))}
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

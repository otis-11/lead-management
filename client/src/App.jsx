import React, { useState, useEffect, useCallback } from 'react';
import { api } from './api';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import SummaryCards from './components/SummaryCards';
import BusinessTable from './components/BusinessTable';
import EditModal from './components/EditModal';
import AddModal from './components/AddModal';
import Toast from './components/Toast';

export default function App() {
  const [businesses, setBusinesses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingBiz, setEditingBiz] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = useCallback(async () => {
    try {
      const [bizData, sumData] = await Promise.all([
        api.getBusinesses(),
        api.getSummary(),
      ]);
      setBusinesses(bizData);
      setSummary(sumData);
      const cats = [...new Set(bizData.map((b) => b.category).filter(Boolean))];
      setCategories(cats);
    } catch (err) {
      showToast('Failed to load data: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = businesses.filter((b) => {
    const catMatch =
      selectedCategory === 'All' || b.category === selectedCategory;
    if (!catMatch) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (b.business_name || '').toLowerCase().includes(q) ||
      (b.owner_name || '').toLowerCase().includes(q) ||
      (b.email || '').toLowerCase().includes(q) ||
      (b.phone || '').includes(q) ||
      (b.address || '').toLowerCase().includes(q)
    );
  });

  const handleSave = async (id, data) => {
    try {
      await api.updateBusiness(id, data);
      showToast('Business updated');
      setEditingBiz(null);
      fetchData();
    } catch (err) {
      showToast('Update failed: ' + err.message, 'error');
    }
  };

  const handleAdd = async (data) => {
    try {
      await api.addBusiness(data);
      showToast('Business added');
      setShowAddModal(false);
      fetchData();
    } catch (err) {
      showToast('Add failed: ' + err.message, 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteBusiness(id);
      showToast('Business deleted');
      fetchData();
    } catch (err) {
      showToast('Delete failed: ' + err.message, 'error');
    }
  };

  const handleExport = async () => {
    try {
      const result = await api.exportData();
      showToast(result.message || 'Exported successfully');
    } catch (err) {
      showToast('Export failed: ' + err.message, 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        categories={categories}
        selected={selectedCategory}
        onSelect={setSelectedCategory}
        summary={summary}
        open={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          searchQuery={searchQuery}
          onSearch={setSearchQuery}
          onAdd={() => setShowAddModal(true)}
          onExport={handleExport}
          resultCount={filtered.length}
          totalCount={businesses.length}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        <SummaryCards summary={summary} selectedCategory={selectedCategory} />

        <BusinessTable
          businesses={filtered}
          onEdit={setEditingBiz}
          onDelete={handleDelete}
        />
      </div>

      {editingBiz && (
        <EditModal
          business={editingBiz}
          categories={categories}
          onSave={handleSave}
          onClose={() => setEditingBiz(null)}
        />
      )}

      {showAddModal && (
        <AddModal
          categories={categories}
          onSave={handleAdd}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}

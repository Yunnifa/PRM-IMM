import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { departmentService } from '../services/apiService';

interface Department {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

const DataDepartment = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const data = await departmentService.getAll();
      setDepartments(data);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to fetch departments');
      console.error('Error fetching departments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    try {
      await departmentService.create({ name: formData.name, description: formData.description || undefined });
      await fetchDepartments();
      setFormData({ name: '', description: '' });
      setShowAddModal(false);
    } catch (err: any) {
      alert(err.message || 'Failed to add department');
      console.error('Error adding department:', err);
    }
  };

  const handleEdit = (dept: Department) => {
    setEditingDept(dept);
    setFormData({ name: dept.name, description: dept.description || '' });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (editingDept) {
      try {
        await departmentService.update(editingDept.id, formData);
        await fetchDepartments();
        setEditingDept(null);
        setFormData({ name: '', description: '' });
        setShowEditModal(false);
      } catch (err: any) {
        alert(err.message || 'Failed to update department');
        console.error('Error updating department:', err);
      }
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredDepartments.map(d => d.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleDelete = async () => {
    if (selectedIds.length === 0) {
      alert('Pilih data yang akan dihapus');
      return;
    }
    if (confirm(`Hapus ${selectedIds.length} data terpilih?`)) {
      try {
        await departmentService.bulkDelete(selectedIds);
        await fetchDepartments();
        setSelectedIds([]);
      } catch (err: any) {
        alert(err.message || 'Failed to delete departments');
        console.error('Error deleting departments:', err);
      }
    }
  };

  const exportToCSV = () => {
    setShowExportDropdown(false);
    const headers = ['ID', 'Nama Department', 'Deskripsi'];
    const csvData = filteredDepartments.map(d => [d.id, d.name, d.description || '-']);
    
    const csvContent = [headers.join(','), ...csvData.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `department-data-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const exportToExcel = () => {
    setShowExportDropdown(false);
    const data = filteredDepartments.map(d => ({
      'ID': d.id,
      'Nama Department': d.name,
      'Deskripsi': d.description || '-'
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Departments');
    XLSX.writeFile(wb, `department-data-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPDF = () => {
    setShowExportDropdown(false);
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Data Department', 14, 15);
    doc.setFontSize(10);
    doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, 14, 22);
    
    autoTable(doc, {
      startY: 30,
      head: [['ID', 'Nama Department', 'Deskripsi']],
      body: filteredDepartments.map(d => [d.id, d.name, d.description || '-']),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [79, 70, 229] }
    });
    
    doc.save(`department-data-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const filteredDepartments = departments.filter(dept =>
    dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (dept.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredDepartments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDepartments = filteredDepartments.slice(startIndex, endIndex);

  // Reset to page 1 when search or items per page changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, itemsPerPage]);

  return (
    <div className="p-6">
      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading departments...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          <p className="font-semibold">Error:</p>
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
      {/* Toolbar */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Tambah
          </button>

          <div className="flex-1 w-full">
            <input
              type="text"
              placeholder="Cari department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-2">
            <div className="relative">
              <button
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export
              </button>
              {showExportDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg z-10 border border-gray-200">
                  <button onClick={exportToExcel} className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 rounded-t-lg">
                    <span className="text-gray-700">Export to Excel</span>
                  </button>
                  <button onClick={exportToCSV} className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2">
                    <span className="text-gray-700">Export to CSV</span>
                  </button>
                  <button onClick={exportToPDF} className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 rounded-b-lg">
                    <span className="text-gray-700">Export to PDF</span>
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="max-h-[60vh] overflow-y-auto overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead className="bg-indigo-900 text-white sticky top-0 z-10">
            <tr>
              <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={selectedIds.length === paginatedDepartments.length && paginatedDepartments.length > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded border-gray-300"
                />
              </th>
              <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-semibold">ID</th>
              <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-semibold">Nama Department</th>
              <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-semibold">Deskripsi</th>
              <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedDepartments.map((dept, index) => (
              <tr key={dept.id} className="hover:bg-gray-50">
                <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(dept.id)}
                    onChange={() => handleSelectOne(dept.id)}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                </td>
                <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm font-medium text-gray-900">
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-mono">
                    DEPT-{startIndex + index + 1}
                  </span>
                </td>
                <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-900">{dept.name}</td>
                <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">{dept.description || '-'}</td>
                <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm">
                  <button
                    onClick={() => handleEdit(dept)}
                    className="px-2 lg:px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-xs font-medium"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        
        {/* Pagination Controls */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs lg:text-sm text-gray-600">
            <span>Tampilkan</span>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="px-2 py-1 border border-gray-300 rounded text-xs lg:text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={30}>30</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={150}>150</option>
              <option value={200}>200</option>
            </select>
            <span>data per halaman</span>
          </div>
          
          <div className="flex items-center gap-2 text-xs lg:text-sm text-gray-600">
            <span>Menampilkan {startIndex + 1}-{Math.min(endIndex, filteredDepartments.length)} dari {filteredDepartments.length} data</span>
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-2 py-1 border border-gray-300 rounded text-xs lg:text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              &laquo;
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded text-xs lg:text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              Back
            </button>
            <span className="px-3 py-1 text-xs lg:text-sm">
              Halaman {currentPage} dari {totalPages || 1}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-3 py-1 border border-gray-300 rounded text-xs lg:text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              Next
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-2 py-1 border border-gray-300 rounded text-xs lg:text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              &raquo;
            </button>
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Tambah Department</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Department</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleAdd}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
              >
                Simpan
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg font-medium"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingDept && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Edit Department</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Department</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleUpdate}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
              >
                Update
              </button>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingDept(null);
                  setFormData({ name: '', description: '' });
                }}
                className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg font-medium"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
};

export default DataDepartment;

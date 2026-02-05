import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { facilityService } from '../services/apiService';

interface Fasilitas {
  id: number;
  name: string;
  description: string | null;
  isActive: number;
  createdAt: string;
  updatedAt: string;
}

const DataFasilitas = () => {
  const [fasilitas, setFasilitas] = useState<Fasilitas[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [editingFasilitas, setEditingFasilitas] = useState<Fasilitas | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  
  // Import modal states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<{
    successCount: number;
    errorCount: number;
    totalRows: number;
    errors: Array<{ row: number; message: string; field?: string }>;
  } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    fetchFasilitas();
  }, []);

  const fetchFasilitas = async () => {
    try {
      setLoading(true);
      const data = await facilityService.getAll();
      setFasilitas(data);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to fetch facilities');
      console.error('Error fetching facilities:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    try {
      await facilityService.create(formData);
      await fetchFasilitas();
      setFormData({ name: '', description: '' });
      setShowAddModal(false);
    } catch (err: any) {
      alert(err.message || 'Failed to add facility');
      console.error('Error adding facility:', err);
    }
  };

  const handleEdit = (item: Fasilitas) => {
    setEditingFasilitas(item);
    setFormData({ 
      name: item.name, 
      description: item.description || ''
    });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (editingFasilitas) {
      try {
        await facilityService.update(editingFasilitas.id, formData);
        await fetchFasilitas();
        setEditingFasilitas(null);
        setFormData({ name: '', description: '' });
        setShowEditModal(false);
      } catch (err: any) {
        alert(err.message || 'Failed to update facility');
        console.error('Error updating facility:', err);
      }
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredFasilitas.map(f => f.id));
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
        await facilityService.bulkDelete(selectedIds);
        await fetchFasilitas();
        setSelectedIds([]);
      } catch (err: any) {
        alert(err.message || 'Failed to delete facilities');
      }
    }
  };

  const exportToCSV = () => {
    setShowExportDropdown(false);
    const headers = ['ID', 'Nama Fasilitas', 'Deskripsi'];
    const csvData = filteredFasilitas.map(f => [f.id, f.name, f.description || '']);
    
    const csvContent = [headers.join(','), ...csvData.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fasilitas-data-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const exportToExcel = () => {
    setShowExportDropdown(false);
    const data = filteredFasilitas.map(f => ({
      'ID': f.id,
      'Nama Fasilitas': f.name,
      'Deskripsi': f.description || '-'
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Fasilitas');
    XLSX.writeFile(wb, `fasilitas-data-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPDF = () => {
    setShowExportDropdown(false);
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Data Fasilitas', 14, 15);
    doc.setFontSize(10);
    doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, 14, 22);
    
    autoTable(doc, {
      startY: 30,
      head: [['ID', 'Nama Fasilitas', 'Deskripsi']],
      body: filteredFasilitas.map(f => [f.id, f.name, f.description || '-']),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [79, 70, 229] }
    });
    
    doc.save(`fasilitas-data-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const downloadTemplate = () => {
    const template = [
      { 'Nama Fasilitas': 'Contoh Projector', Deskripsi: 'Projector untuk presentasi' },
      { 'Nama Fasilitas': 'Contoh Whiteboard', Deskripsi: 'Whiteboard besar' },
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Fasilitas');
    
    // Set column widths
    ws['!cols'] = [
      { wch: 25 },  // Nama Fasilitas
      { wch: 15 },  // Kategori
      { wch: 10 },  // Jumlah
      { wch: 15 }   // Kondisi
    ];

    XLSX.writeFile(wb, 'Template_Fasilitas.xlsx');
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      alert('File harus berformat Excel (.xlsx atau .xls)');
      event.target.value = '';
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Ukuran file maksimal 10MB');
      event.target.value = '';
      return;
    }

    setSelectedFile(file);
    setUploadResult(null);
    setShowImportModal(true);
    event.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.match(/\.(xlsx|xls)$/i)) {
      if (file.size > 10 * 1024 * 1024) {
        alert('Ukuran file maksimal 10MB');
        return;
      }
      setSelectedFile(file);
      setUploadResult(null);
    } else {
      alert('File harus berformat Excel (.xlsx atau .xls)');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const processImport = () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadProgress(0);
    setUploadResult(null);

    const reader = new FileReader();
    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        setUploadProgress(Math.round((e.loaded / e.total) * 50));
      }
    };

    reader.onload = (e) => {
      try {
        setUploadProgress(50);
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        setUploadProgress(60);

        if (jsonData.length === 0) {
          setUploadResult({
            successCount: 0,
            errorCount: 0,
            totalRows: 0,
            errors: [{ row: 0, message: 'File Excel kosong!' }]
          });
          setUploading(false);
          return;
        }

        const firstRow = jsonData[0];
        const requiredColumns = ['Nama Fasilitas', 'Kategori', 'Jumlah', 'Kondisi'];
        const hasAllColumns = requiredColumns.every(col => col in firstRow);

        if (!hasAllColumns) {
          setUploadResult({
            successCount: 0,
            errorCount: 0,
            totalRows: 0,
            errors: [{ row: 0, message: `Format file tidak sesuai template! Kolom yang diperlukan: ${requiredColumns.join(', ')}` }]
          });
          setUploading(false);
          return;
        }

        setUploadProgress(70);

        const importedFasilitas: Fasilitas[] = [];
        const errors: Array<{ row: number; message: string; field?: string }> = [];

        jsonData.forEach((row, index) => {
          const rowNum = index + 2;
          const nama = row['Nama Fasilitas']?.toString().trim();
          const kategori = row['Kategori']?.toString().trim();
          const jumlah = parseInt(row['Jumlah']);
          const kondisi = row['Kondisi']?.toString().trim();

          if (!nama || !kategori || isNaN(jumlah) || !kondisi) {
            errors.push({ row: rowNum, message: 'Data tidak lengkap', field: !nama ? 'Nama Fasilitas' : !kategori ? 'Kategori' : isNaN(jumlah) ? 'Jumlah' : 'Kondisi' });
            return;
          }

          if (kondisi !== 'Baik' && kondisi !== 'Maintenance') {
            errors.push({ row: rowNum, message: `Kondisi harus 'Baik' atau 'Maintenance', bukan '${kondisi}'`, field: 'Kondisi' });
            return;
          }

          if (jumlah <= 0) {
            errors.push({ row: rowNum, message: 'Jumlah harus lebih dari 0', field: 'Jumlah' });
            return;
          }

          // Generate ID otomatis (numeric)
          const newId = fasilitas.length + importedFasilitas.length + 1;

          importedFasilitas.push({
            id: newId,
            name: nama,
            description: `${kategori} - ${jumlah} unit - ${kondisi}`,
            isActive: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        });

        setUploadProgress(90);

        if (importedFasilitas.length > 0) {
          setFasilitas([...fasilitas, ...importedFasilitas]);
        }

        setUploadProgress(100);
        setUploadResult({
          successCount: importedFasilitas.length,
          errorCount: errors.length,
          totalRows: jsonData.length,
          errors
        });

      } catch (error) {
        setUploadResult({
          successCount: 0,
          errorCount: 0,
          totalRows: 0,
          errors: [{ row: 0, message: 'Error membaca file Excel! Pastikan file sesuai dengan template.' }]
        });
        console.error(error);
      } finally {
        setUploading(false);
      }
    };

    reader.readAsBinaryString(selectedFile);
  };

  const resetImport = () => {
    setSelectedFile(null);
    setUploading(false);
    setUploadProgress(0);
    setUploadResult(null);
    setShowErrors(false);
  };

  const closeImportModal = () => {
    setShowImportModal(false);
    setTimeout(resetImport, 300);
  };

  const filteredFasilitas = fasilitas.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredFasilitas.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedFasilitas = filteredFasilitas.slice(startIndex, endIndex);

  // Reset to page 1 when search or items per page changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, itemsPerPage]);

  // getKondisiBadge is no longer needed since we simplified the data structure

  return (
    <div className="p-6">
      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading facilities...</span>
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

          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import
          </button>

          <div className="flex-1 w-full">
            <input
              type="text"
              placeholder="Cari fasilitas..."
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
                  checked={selectedIds.length === paginatedFasilitas.length && paginatedFasilitas.length > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded border-gray-300"
                />
              </th>
              <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-semibold">ID</th>
              <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-semibold">Nama Fasilitas</th>
              <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-semibold">Deskripsi</th>
              <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedFasilitas.map((item, index) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(item.id)}
                    onChange={() => handleSelectOne(item.id)}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                </td>
                <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm font-medium text-gray-900">
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-mono">
                    FAS-{startIndex + index + 1}
                  </span>
                </td>
                <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-900">{item.name}</td>
                <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">{item.description || '-'}</td>
                <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm">
                  <button
                    onClick={() => handleEdit(item)}
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
            <span>Menampilkan {startIndex + 1}-{Math.min(endIndex, filteredFasilitas.length)} dari {filteredFasilitas.length} data</span>
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
            <h2 className="text-xl font-bold mb-4">Tambah Fasilitas</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Fasilitas</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
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
      {showEditModal && editingFasilitas && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Edit Fasilitas</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Fasilitas</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
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
                  setEditingFasilitas(null);
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

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">Import Data Fasilitas</h3>
                <button
                  onClick={closeImportModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={uploading}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-4">
              {/* Instructions */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">📋 Instruksi Upload</h4>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>Download template terlebih dahulu</li>
                  <li>Isi data sesuai format yang tersedia</li>
                  <li>Upload file Excel (.xlsx atau .xls)</li>
                  <li>ID akan digenerate otomatis (FAS-1, FAS-2, ...)</li>
                  <li>Kondisi harus: <strong>Baik</strong> atau <strong>Maintenance</strong></li>
                  <li>Data yang error akan dilewati dan dilaporkan</li>
                </ul>
              </div>

              {/* Download Template Button */}
              <div className="mb-6">
                <button
                  onClick={downloadTemplate}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  disabled={uploading}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download Template
                </button>
              </div>

              {/* File Upload Area */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload File Excel
                </label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('import-file-input')?.click()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'
                  } ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <input
                    id="import-file-input"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleImport}
                    className="hidden"
                    disabled={uploading}
                  />
                  
                  {!selectedFile ? (
                    <>
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="mt-2 text-sm text-gray-600">
                        Klik atau drag & drop file Excel di sini
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Format: .xlsx atau .xls (Maks. 10MB)
                      </p>
                    </>
                  ) : (
                    <div className="flex items-center justify-center gap-3">
                      <svg className="h-10 w-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-left">
                        <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Upload Progress */}
              {uploading && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Memproses...</span>
                    <span className="text-sm text-gray-500">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Upload Result */}
              {uploadResult && (
                <div className="mb-6">
                  <div className={`p-4 rounded-lg border ${
                    uploadResult.errorCount === 0 ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
                  }`}>
                    <div className="flex items-start gap-3">
                      {uploadResult.errorCount === 0 ? (
                        <svg className="h-6 w-6 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : (
                        <svg className="h-6 w-6 text-yellow-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      )}
                      <div className="flex-1">
                        <h4 className={`font-semibold mb-2 ${
                          uploadResult.errorCount === 0 ? 'text-green-900' : 'text-yellow-900'
                        }`}>
                          Import Selesai
                        </h4>
                        <div className="text-sm space-y-1">
                          <p className={uploadResult.errorCount === 0 ? 'text-green-800' : 'text-yellow-800'}>
                            ✅ Berhasil: <strong>{uploadResult.successCount}</strong> dari {uploadResult.totalRows} baris
                          </p>
                          {uploadResult.errorCount > 0 && (
                            <p className="text-yellow-800">
                              ⚠️ Error: <strong>{uploadResult.errorCount}</strong> baris dilewati
                            </p>
                          )}
                        </div>

                        {/* Error Details */}
                        {uploadResult.errors && uploadResult.errors.length > 0 && (
                          <div className="mt-3">
                            <button
                              onClick={() => setShowErrors(!showErrors)}
                              className="text-sm font-medium text-yellow-700 hover:text-yellow-800 flex items-center gap-1"
                            >
                              {showErrors ? 'Sembunyikan' : 'Lihat'} Detail Error
                              <svg className={`w-4 h-4 transition-transform ${showErrors ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            
                            {showErrors && (
                              <div className="mt-2 max-h-48 overflow-y-auto">
                                <div className="bg-white rounded border border-yellow-300 divide-y divide-yellow-200">
                                  {uploadResult.errors.slice(0, 20).map((error, idx) => (
                                    <div key={idx} className="px-3 py-2 text-xs">
                                      <span className="font-semibold text-gray-900">Baris {error.row}:</span>
                                      <span className="text-gray-700 ml-1">{error.message}</span>
                                      {error.field && (
                                        <span className="text-gray-500 ml-1">(Field: {error.field})</span>
                                      )}
                                    </div>
                                  ))}
                                  {uploadResult.errors.length > 20 && (
                                    <div className="px-3 py-2 text-xs text-gray-600 italic">
                                      ... dan {uploadResult.errors.length - 20} error lainnya
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 rounded-b-lg flex justify-end gap-3">
              <button
                onClick={closeImportModal}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={uploading}
              >
                {uploadResult ? 'Tutup' : 'Batal'}
              </button>
              {selectedFile && !uploadResult && (
                <button
                  onClick={processImport}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={uploading || !selectedFile}
                >
                  {uploading ? 'Memproses...' : 'Upload Data'}
                </button>
              )}
              {uploadResult && (
                <button
                  onClick={resetImport}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Upload Lagi
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
};

export default DataFasilitas;

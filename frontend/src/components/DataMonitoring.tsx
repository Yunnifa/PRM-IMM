import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { meetingRequestService } from '../services/apiService';

interface HistoryEntry {
  timestamp: string;
  action: string;
  by: string;
  whatsapp: string | null;
  status: string;
  notes: string | null;
}

interface MeetingData {
  id: number;
  requestId: string;
  nama: string;
  whatsapp: string;
  department: string;
  tanggal: string;
  hari: string;
  jamMulai: string;
  jamBerakhir: string;
  jumlahPeserta: number;
  agenda: string;
  namaRuangan: string;
  fasilitas: string;
  headGA: 'pending' | 'approved' | 'rejected';
  headOS: 'pending' | 'approved' | 'rejected';
  history: HistoryEntry[];
}

const DataMonitoring = () => {
  const [meetings, setMeetings] = useState<MeetingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch meetings from backend
  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const data = await meetingRequestService.getAll();
      setMeetings(data);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to fetch meetings');
      console.error('Error fetching meetings:', err);
    } finally {
      setLoading(false);
    }
  };

  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<HistoryEntry[]>([]);
  const [selectedMeetingForHistory, setSelectedMeetingForHistory] = useState<MeetingData | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'approveGA' | 'rejectGA' | 'approveOS' | 'rejectOS';
    meetingId: number;
    meetingData: MeetingData | null;
  } | null>(null);
  const [confirmNotes, setConfirmNotes] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<MeetingData | null>(null);
  const [filters, setFilters] = useState({
    department: 'all',
    ruangan: 'all',
    hari: 'all'
  });

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredMeetings.map(m => m.id));
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

  const handleApproveGA = (id: number) => {
    const meeting = meetings.find(m => m.id === id);
    if (meeting) {
      setConfirmAction({ type: 'approveGA', meetingId: id, meetingData: meeting });
      setShowConfirmModal(true);
      setConfirmNotes('');
    }
  };

  const handleRejectGA = (id: number) => {
    const meeting = meetings.find(m => m.id === id);
    if (meeting) {
      setConfirmAction({ type: 'rejectGA', meetingId: id, meetingData: meeting });
      setShowConfirmModal(true);
      setConfirmNotes('');
    }
  };

  const handleApproveOS = (id: number) => {
    const meeting = meetings.find(m => m.id === id);
    if (meeting) {
      setConfirmAction({ type: 'approveOS', meetingId: id, meetingData: meeting });
      setShowConfirmModal(true);
      setConfirmNotes('');
    }
  };

  const handleRejectOS = (id: number) => {
    const meeting = meetings.find(m => m.id === id);
    if (meeting) {
      setConfirmAction({ type: 'rejectOS', meetingId: id, meetingData: meeting });
      setShowConfirmModal(true);
      setConfirmNotes('');
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;

    const { type, meetingId } = confirmAction;

    try {
      await meetingRequestService.updateApproval(meetingId, {
        type: type,
        notes: confirmNotes || undefined
      });

      // Refresh data after approval
      await fetchMeetings();
      
      setShowConfirmModal(false);
      setConfirmAction(null);
      setConfirmNotes('');
    } catch (err: any) {
      alert(err.message || 'Failed to update approval status');
      console.error('Error updating approval:', err);
    }
  };

  const handleShowHistory = (history: HistoryEntry[], meeting: MeetingData) => {
    setSelectedHistory(history);
    setSelectedMeetingForHistory(meeting);
    setShowHistoryModal(true);
  };

  const handleEditMeeting = (meeting: MeetingData) => {
    setEditingMeeting(meeting);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (editingMeeting) {
      try {
        await meetingRequestService.update(editingMeeting.id, {
          nama: editingMeeting.nama,
          whatsapp: editingMeeting.whatsapp,
          department: editingMeeting.department,
          tanggal: editingMeeting.tanggal,
          hari: editingMeeting.hari,
          jamMulai: editingMeeting.jamMulai,
          jamBerakhir: editingMeeting.jamBerakhir,
          jumlahPeserta: editingMeeting.jumlahPeserta,
          agenda: editingMeeting.agenda,
          namaRuangan: editingMeeting.namaRuangan,
          fasilitas: editingMeeting.fasilitas,
        });
        await fetchMeetings();
        setShowEditModal(false);
        setEditingMeeting(null);
        alert('Data berhasil diupdate');
      } catch (err: any) {
        alert(err.message || 'Failed to update meeting');
        console.error('Error updating meeting:', err);
      }
    }
  };

  const filteredMeetings = meetings.filter(meeting => {
    // For filter, check both headGA and headOS status
    let matchesStatus = false;
    if (filterStatus === 'all') {
      matchesStatus = true;
    } else if (filterStatus === 'pending') {
      matchesStatus = meeting.headGA === 'pending' || meeting.headOS === 'pending';
    } else if (filterStatus === 'approved') {
      matchesStatus = meeting.headGA === 'approved' && meeting.headOS === 'approved';
    } else if (filterStatus === 'rejected') {
      matchesStatus = meeting.headGA === 'rejected' || meeting.headOS === 'rejected';
    }
    
    const matchesSearch = 
      meeting.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      meeting.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      meeting.agenda.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Additional filters
    const matchesDepartment = filters.department === 'all' || meeting.department === filters.department;
    const matchesRuangan = filters.ruangan === 'all' || meeting.namaRuangan === filters.ruangan;
    const matchesHari = filters.hari === 'all' || meeting.hari === filters.hari;
    
    return matchesStatus && matchesSearch && matchesDepartment && matchesRuangan && matchesHari;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredMeetings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedMeetings = filteredMeetings.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, itemsPerPage, filterStatus, filters]);

  // Get unique values for filter options
  const departments = Array.from(new Set(meetings.map(m => m.department)));
  const ruangans = Array.from(new Set(meetings.map(m => m.namaRuangan)));
  const haris = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

  const resetFilters = () => {
    setFilters({
      department: 'all',
      ruangan: 'all',
      hari: 'all'
    });
    setShowFilterDropdown(false);
  };

  // Utility function for status badges (currently not used, but can be useful)
  // const getStatusBadge = (status: string) => {
  //   switch (status) {
  //     case 'pending':
  //       return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">Pending</span>;
  //     case 'approved':
  //       return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">Approved</span>;
  //     case 'rejected':
  //       return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">Rejected</span>;
  //     default:
  //       return null;
  //   }
  // };

  const exportToExcel = () => {
    setShowExportDropdown(false);
    const data = filteredMeetings.map(m => ({
      'ID': m.id,
      'Nama': m.nama,
      'Department': m.department,
      'Tanggal': m.tanggal,
      'Hari': m.hari,
      'Jam Mulai': m.jamMulai,
      'Jam Berakhir': m.jamBerakhir,
      'Jumlah Peserta': m.jumlahPeserta,
      'Agenda': m.agenda,
      'Ruangan': m.namaRuangan,
      'Fasilitas': m.fasilitas,
      'Head GA': m.headGA,
      'Head OS': m.headOS
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Monitoring');
    XLSX.writeFile(wb, `monitoring-data-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToCSV = () => {
    setShowExportDropdown(false);
    // CSV export implementation
    const headers = ['ID', 'Nama', 'Department', 'Tanggal', 'Hari', 'Jam Mulai', 'Jam Berakhir', 'Jumlah Peserta', 'Agenda', 'Ruangan', 'Fasilitas', 'Head GA', 'Head OS'];
    const csvData = filteredMeetings.map(m => [
      m.id, m.nama, m.department, m.tanggal, m.hari, m.jamMulai, m.jamBerakhir, 
      m.jumlahPeserta, m.agenda, m.namaRuangan, m.fasilitas, m.headGA, m.headOS
    ]);
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monitoring-data-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const exportToPDF = () => {
    setShowExportDropdown(false);
    const doc = new jsPDF('landscape');
    doc.setFontSize(16);
    doc.text('Data Monitoring Peminjaman Ruangan', 14, 15);
    doc.setFontSize(10);
    doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, 14, 22);
    
    autoTable(doc, {
      startY: 30,
      head: [['ID', 'Nama', 'Department', 'Tanggal', 'Jam', 'Peserta', 'Agenda', 'Ruangan', 'Head GA', 'Head OS']],
      body: filteredMeetings.map(m => [
        m.id, m.nama, m.department, m.tanggal, 
        `${m.jamMulai}-${m.jamBerakhir}`, m.jumlahPeserta, 
        m.agenda.substring(0, 30), m.namaRuangan, m.headGA, m.headOS
      ]),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [79, 70, 229] }
    });
    
    doc.save(`monitoring-data-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleDelete = async () => {
    if (selectedIds.length === 0) {
      alert('Pilih data yang akan dihapus');
      return;
    }
    const confirmed = window.confirm(`Hapus ${selectedIds.length} data terpilih?`);
    if (confirmed) {
      try {
        // Delete selected meetings one by one
        for (const id of selectedIds) {
          await meetingRequestService.delete(id);
        }
        await fetchMeetings();
        setSelectedIds([]);
        alert(`${selectedIds.length} data berhasil dihapus`);
      } catch (err: any) {
        alert(err.message || 'Failed to delete meetings');
        console.error('Error deleting meetings:', err);
      }
    }
  };

  return (
    <div className="p-6">
      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading data...</span>
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
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div 
          onClick={() => setFilterStatus('all')}
          className={`bg-white rounded-lg shadow-md p-6 cursor-pointer transition-all hover:shadow-lg ${
            filterStatus === 'all' ? 'ring-2 ring-blue-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-gray-600 text-sm font-medium">Total Permohonan</div>
              <div className="text-3xl font-bold text-gray-900 mt-2">{meetings.length}</div>
            </div>
            <div className="bg-blue-100 rounded-full p-3">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div 
          onClick={() => setFilterStatus('pending')}
          className={`bg-yellow-50 rounded-lg shadow-md p-6 cursor-pointer transition-all hover:shadow-lg ${
            filterStatus === 'pending' ? 'ring-2 ring-yellow-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-yellow-700 text-sm font-medium">Pending</div>
              <div className="text-3xl font-bold text-yellow-900 mt-2">
                {meetings.filter(m => m.headGA === 'pending' || m.headOS === 'pending').length}
              </div>
            </div>
            <div className="bg-yellow-200 rounded-full p-3">
              <svg className="w-8 h-8 text-yellow-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div 
          onClick={() => setFilterStatus('approved')}
          className={`bg-green-50 rounded-lg shadow-md p-6 cursor-pointer transition-all hover:shadow-lg ${
            filterStatus === 'approved' ? 'ring-2 ring-green-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-green-700 text-sm font-medium">Approved</div>
              <div className="text-3xl font-bold text-green-900 mt-2">
                {meetings.filter(m => m.headGA === 'approved' && m.headOS === 'approved').length}
              </div>
            </div>
            <div className="bg-green-200 rounded-full p-3">
              <svg className="w-8 h-8 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div 
          onClick={() => setFilterStatus('rejected')}
          className={`bg-red-50 rounded-lg shadow-md p-6 cursor-pointer transition-all hover:shadow-lg ${
            filterStatus === 'rejected' ? 'ring-2 ring-red-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-red-700 text-sm font-medium">Rejected</div>
              <div className="text-3xl font-bold text-red-900 mt-2">
                {meetings.filter(m => m.headGA === 'rejected' || m.headOS === 'rejected').length}
              </div>
            </div>
            <div className="bg-red-200 rounded-full p-3">
              <svg className="w-8 h-8 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Export */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          {/* Search */}
          <div className="flex-1 w-full">
            <input
              type="text"
              placeholder="Cari nama, department, atau agenda..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {/* Filter Button */}
            <div className="relative">
              <button
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filter
                {(filters.department !== 'all' || filters.ruangan !== 'all' || filters.hari !== 'all') && (
                  <span className="bg-red-500 text-white text-xs rounded-full w-2 h-2"></span>
                )}
              </button>

              {/* Filter Dropdown */}
              {showFilterDropdown && (
                <div className="absolute left-0 mt-2 w-64 bg-white rounded-lg shadow-lg z-10 border border-gray-200 p-4">
                  <div className="mb-3">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Department</label>
                    <select
                      value={filters.department}
                      onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      <option value="all">Semua Department</option>
                      {departments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Ruangan</label>
                    <select
                      value={filters.ruangan}
                      onChange={(e) => setFilters({ ...filters, ruangan: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      <option value="all">Semua Ruangan</option>
                      {ruangans.map(ruangan => (
                        <option key={ruangan} value={ruangan}>{ruangan}</option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Hari</label>
                    <select
                      value={filters.hari}
                      onChange={(e) => setFilters({ ...filters, hari: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      <option value="all">Semua Hari</option>
                      {haris.map(hari => (
                        <option key={hari} value={hari}>{hari}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={resetFilters}
                      className="flex-1 px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                    >
                      Reset
                    </button>
                    <button
                      onClick={() => setShowFilterDropdown(false)}
                      className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Terapkan
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Export Button with Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {showExportDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg z-10 border border-gray-200">
                  <button
                    onClick={exportToExcel}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 rounded-t-lg"
                  >
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-gray-700">Export to Excel</span>
                  </button>
                  <button
                    onClick={exportToCSV}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
                  >
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-gray-700">Export to CSV</span>
                  </button>
                  <button
                    onClick={exportToPDF}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 rounded-b-lg"
                  >
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span className="text-gray-700">Export to PDF</span>
                  </button>
                </div>
              )}
            </div>

            {/* Delete Button */}
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

      {/* Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
          <table className="w-full min-w-[1400px]">
            <thead className="bg-indigo-900 text-white sticky top-0 z-10">
              <tr>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === paginatedMeetings.length && paginatedMeetings.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                </th>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-semibold">ID</th>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-semibold">Nama</th>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-semibold">Department</th>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-semibold">Tanggal & Hari</th>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-semibold">Jam</th>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-semibold">Peserta</th>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-semibold">Agenda</th>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-semibold">Ruangan</th>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-semibold">Fasilitas</th>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-semibold">Head GA</th>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-semibold">Head OS</th>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-semibold">Edit</th>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-semibold">History</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedMeetings.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-4 py-8 text-center text-gray-500">
                    Tidak ada data yang ditemukan
                  </td>
                </tr>
              ) : (
                paginatedMeetings.map((meeting, index) => (
                  <tr key={meeting.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(meeting.id)}
                        onChange={() => handleSelectOne(meeting.id)}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                    </td>
                    <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm font-medium text-gray-900">
                      <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-xs font-mono">
                        MON-{startIndex + index + 1}
                      </span>
                    </td>
                    <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-900">{meeting.nama}</td>
                    <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">{meeting.department}</td>
                    <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                      <div className="text-xs text-gray-500">{meeting.hari}</div>
                      <div>{meeting.tanggal}</div>
                    </td>
                    <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                      {meeting.jamMulai} - {meeting.jamBerakhir}
                    </td>
                    <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700 text-center">{meeting.jumlahPeserta}</td>
                    <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700 max-w-xs">
                      <div className="truncate" title={meeting.agenda}>{meeting.agenda}</div>
                    </td>
                    <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">{meeting.namaRuangan}</td>
                    <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700 max-w-xs">
                      <div className="truncate" title={meeting.fasilitas}>{meeting.fasilitas}</div>
                    </td>
                    <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm">
                      {meeting.headGA === 'pending' ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleApproveGA(meeting.id)}
                            className="px-1 lg:px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectGA(meeting.id)}
                            className="px-1 lg:px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <div>
                          {meeting.headGA === 'approved' && (
                            <span className="px-2 lg:px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">Approved</span>
                          )}
                          {meeting.headGA === 'rejected' && (
                            <span className="px-2 lg:px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">Rejected</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm">
                      {/* Head OS - Approval Bertingkat */}
                      {/* Jika Head GA masih pending, tampilkan abu-abu (menunggu GA) */}
                      {meeting.headGA === 'pending' ? (
                        <div className="px-2 lg:px-3 py-1 rounded-full text-xs font-semibold bg-gray-200 text-gray-500 text-center">
                          Menunggu GA
                        </div>
                      ) : meeting.headGA === 'rejected' ? (
                        /* Jika Head GA reject, Head OS tidak bisa approve/reject */
                        <div className="px-2 lg:px-3 py-1 rounded-full text-xs font-semibold bg-gray-300 text-gray-600 text-center">
                          GA Ditolak
                        </div>
                      ) : meeting.headOS === 'pending' ? (
                        /* Head GA approved, Head OS bisa approve/reject */
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleApproveOS(meeting.id)}
                            className="px-1 lg:px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectOS(meeting.id)}
                            className="px-1 lg:px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <div>
                          {meeting.headOS === 'approved' && (
                            <span className="px-2 lg:px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">Approved</span>
                          )}
                          {meeting.headOS === 'rejected' && (
                            <span className="px-2 lg:px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">Rejected</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm">
                      <button
                        onClick={() => handleEditMeeting(meeting)}
                        className="p-1 lg:p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded border border-blue-300 transition-colors"
                        title="Edit"
                      >
                        <svg className="w-3 h-3 lg:w-4 lg:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    </td>
                    <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm">
                      <button
                        onClick={() => handleShowHistory(meeting.history, meeting)}
                        className="px-2 lg:px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-medium transition-colors"
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                ))
              )}
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
            <span>Menampilkan {filteredMeetings.length > 0 ? startIndex + 1 : 0}-{Math.min(endIndex, filteredMeetings.length)} dari {filteredMeetings.length} data</span>
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

      {/* History Modal */}
      {showHistoryModal && selectedMeetingForHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Riwayat Permohonan</h2>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Meeting Info */}
            <div className="bg-blue-50 rounded-lg p-4 mb-4 border border-blue-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="text-sm font-semibold text-blue-900">Pengaju</div>
                  <div className="text-sm text-gray-900">Oleh: {selectedMeetingForHistory.nama}</div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-blue-900">WhatsApp</div>
                  <a 
                    href={`https://wa.me/${selectedMeetingForHistory.whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-green-600 hover:text-green-700 underline"
                  >
                    wa.me/{selectedMeetingForHistory.whatsapp}
                  </a>
                </div>
                <div className="md:col-span-2">
                  <div className="text-sm font-semibold text-blue-900">Nama Agenda</div>
                  <div className="text-sm text-gray-900">{selectedMeetingForHistory.agenda}</div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {selectedHistory.map((entry, index) => (
                <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{entry.action}</div>
                      <div className="text-sm text-gray-600">
                        Oleh: {entry.by}
                        {entry.whatsapp && (
                          <span className="ml-2">
                            | WhatsApp: <a 
                              href={`https://wa.me/${entry.whatsapp}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-600 hover:text-green-700 underline"
                            >
                              wa.me/{entry.whatsapp}
                            </a>
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{entry.timestamp}</div>
                      {entry.notes && (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-700">
                          <span className="font-semibold">
                            {entry.status === 'rejected' ? 'Alasan Penolakan: ' : 'Catatan: '}
                          </span>
                          {entry.notes}
                        </div>
                      )}
                    </div>
                    <div>
                      {entry.status === 'submitted' && (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">Diajukan</span>
                      )}
                      {entry.status === 'approved' && (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">Approved</span>
                      )}
                      {entry.status === 'rejected' && (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">Rejected</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Action Modal */}
      {showConfirmModal && confirmAction && confirmAction.meetingData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`bg-white rounded-lg p-6 max-w-md w-full mx-4 border-t-4 ${
            confirmAction.type.includes('approve') ? 'border-green-500' : 'border-red-500'
          }`}>
            <div className="flex items-center gap-3 mb-4">
              {confirmAction.type.includes('approve') ? (
                <div className="bg-green-100 rounded-full p-3">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              ) : (
                <div className="bg-red-100 rounded-full p-3">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              )}
              <div>
                <h2 className={`text-2xl font-bold ${
                  confirmAction.type.includes('approve') ? 'text-green-700' : 'text-red-700'
                }`}>
                  {confirmAction.type.includes('approve') ? 'Approve Permohonan' : 'Reject Permohonan'}
                </h2>
                <p className="text-sm text-gray-600">
                  {confirmAction.type.includes('GA') ? 'Head GA' : 'Head OS'}
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div>
                  <div className="text-sm font-semibold text-gray-700">Tanggal Meeting</div>
                  <div className="text-sm text-gray-900">{confirmAction.meetingData.tanggal} ({confirmAction.meetingData.hari})</div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <div>
                  <div className="text-sm font-semibold text-gray-700">Ruangan Meeting</div>
                  <div className="text-sm text-gray-900">{confirmAction.meetingData.namaRuangan}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <div className="text-sm font-semibold text-gray-700">Waktu</div>
                  <div className="text-sm text-gray-900">{confirmAction.meetingData.jamMulai} - {confirmAction.meetingData.jamBerakhir}</div>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {confirmAction.type.includes('approve') ? 'Catatan (Opsional)' : 'Alasan Penolakan'}
              </label>
              <textarea
                value={confirmNotes}
                onChange={(e) => setConfirmNotes(e.target.value)}
                placeholder={confirmAction.type.includes('approve') 
                  ? 'Tambahkan catatan jika diperlukan...' 
                  : 'Jelaskan alasan penolakan...'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setConfirmAction(null);
                  setConfirmNotes('');
                }}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmAction}
                className={`flex-1 px-4 py-2 text-white rounded-lg font-medium transition-colors ${
                  confirmAction.type.includes('approve')
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {confirmAction.type.includes('approve') ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingMeeting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 my-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Edit Request Peminjaman Ruangan</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingMeeting(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nama */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Nama Lengkap</label>
                <input
                  type="text"
                  value={editingMeeting.nama}
                  onChange={(e) => setEditingMeeting({ ...editingMeeting, nama: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Masukkan nama lengkap"
                />
              </div>

              {/* WhatsApp */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Nomor WhatsApp</label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 text-sm text-gray-900 bg-gray-200 border border-r-0 border-gray-300 rounded-l-lg">
                    +62
                  </span>
                  <input
                    type="text"
                    value={editingMeeting.whatsapp.replace('62', '')}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      setEditingMeeting({ ...editingMeeting, whatsapp: '62' + value });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="8123456789"
                  />
                </div>
                {editingMeeting.whatsapp && (
                  <a
                    href={`https://wa.me/${editingMeeting.whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-green-600 hover:text-green-700 underline mt-1 inline-block"
                  >
                    Test: wa.me/{editingMeeting.whatsapp}
                  </a>
                )}
              </div>

              {/* Department */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Department</label>
                <select
                  value={editingMeeting.department}
                  onChange={(e) => setEditingMeeting({ ...editingMeeting, department: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Pilih Department</option>
                  <option value="IT Department">IT Department</option>
                  <option value="HR Department">HR Department</option>
                  <option value="Finance Department">Finance Department</option>
                  <option value="Marketing Department">Marketing Department</option>
                  <option value="Operations Department">Operations Department</option>
                </select>
              </div>

              {/* Tanggal */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Tanggal</label>
                <input
                  type="date"
                  value={editingMeeting.tanggal}
                  onChange={(e) => setEditingMeeting({ ...editingMeeting, tanggal: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Hari */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Hari</label>
                <select
                  value={editingMeeting.hari}
                  onChange={(e) => setEditingMeeting({ ...editingMeeting, hari: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Pilih Hari</option>
                  <option value="Senin">Senin</option>
                  <option value="Selasa">Selasa</option>
                  <option value="Rabu">Rabu</option>
                  <option value="Kamis">Kamis</option>
                  <option value="Jumat">Jumat</option>
                  <option value="Sabtu">Sabtu</option>
                  <option value="Minggu">Minggu</option>
                </select>
              </div>

              {/* Jam Mulai */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Jam Mulai</label>
                <input
                  type="time"
                  value={editingMeeting.jamMulai}
                  onChange={(e) => setEditingMeeting({ ...editingMeeting, jamMulai: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Jam Berakhir */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Jam Berakhir</label>
                <input
                  type="time"
                  value={editingMeeting.jamBerakhir}
                  onChange={(e) => setEditingMeeting({ ...editingMeeting, jamBerakhir: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Jumlah Peserta */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Jumlah Peserta</label>
                <input
                  type="number"
                  value={editingMeeting.jumlahPeserta}
                  onChange={(e) => setEditingMeeting({ ...editingMeeting, jumlahPeserta: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Masukkan jumlah peserta"
                />
              </div>

              {/* Ruangan */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Nama Ruangan</label>
                <select
                  value={editingMeeting.namaRuangan}
                  onChange={(e) => setEditingMeeting({ ...editingMeeting, namaRuangan: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Pilih Ruangan</option>
                  <option value="Meeting Room A">Meeting Room A</option>
                  <option value="Meeting Room B">Meeting Room B</option>
                  <option value="Meeting Room C">Meeting Room C</option>
                  <option value="Conference Hall">Conference Hall</option>
                </select>
              </div>

              {/* Agenda */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Agenda</label>
                <textarea
                  value={editingMeeting.agenda}
                  onChange={(e) => setEditingMeeting({ ...editingMeeting, agenda: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                  placeholder="Jelaskan agenda meeting"
                />
              </div>

              {/* Fasilitas */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Fasilitas yang Dibutuhkan</label>
                <textarea
                  value={editingMeeting.fasilitas}
                  onChange={(e) => setEditingMeeting({ ...editingMeeting, fasilitas: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={2}
                  placeholder="Contoh: Projector, Whiteboard, Video Conference"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingMeeting(null);
                }}
                className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Simpan Perubahan
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

export default DataMonitoring;

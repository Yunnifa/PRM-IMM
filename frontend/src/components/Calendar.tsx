import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { departmentService, roomService, facilityService, meetingRequestService } from '../services/apiService';

interface CalendarDay {
  date: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  fullDate: Date;
}

interface Department {
  id: number;
  name: string;
  description: string | null;
}

interface Room {
  id: number;
  name: string;
  capacity: number;
  location: string | null;
  isHybrid: number;
  description: string | null;
  isActive: number;
}

interface Facility {
  id: number;
  name: string;
  description: string | null;
  isActive: number;
}

interface Meeting {
  id: number;
  requestId: string;
  nama: string;
  whatsapp: string;
  department: string;
  namaRuangan: string;
  jamMulai: string;
  jamBerakhir: string;
  jumlahPeserta: number;
  fasilitas: string;
  agenda: string;
  tanggal: string; // format: YYYY-MM-DD
  hari: string;
  headGA: 'pending' | 'approved' | 'rejected';
  headOS: 'pending' | 'approved' | 'rejected';
}

const Calendar = () => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [showMonthYearPicker, setShowMonthYearPicker] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDateDetail, setShowDateDetail] = useState(false);
  const [showAddMeeting, setShowAddMeeting] = useState(false);
  const [newMeeting, setNewMeeting] = useState({
    nama: '',
    whatsapp: '',
    department: '',
    ruangan: '',
    jamMulai: '',
    jamBerakhir: '',
    jumlahPeserta: '',
    fasilitas: [] as string[],
    agenda: ''
  });

  // Master data from backend
  const [departments, setDepartments] = useState<Department[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loadingMaster, setLoadingMaster] = useState(true);

  // Check if user is admin or came from login
  const isAdmin = localStorage.getItem('isAdminLoggedIn') === 'true';
  const fromLogin = sessionStorage.getItem('fromLogin') === 'true';

  // Fetch master data on mount
  useEffect(() => {
    fetchMasterData();
    fetchMeetings();
  }, []);

  const fetchMasterData = async () => {
    try {
      setLoadingMaster(true);
      const [deptData, roomData, facilityData] = await Promise.all([
        departmentService.getAll(),
        roomService.getAll(),
        facilityService.getAll()
      ]);
      setDepartments(deptData);
      setRooms(roomData.filter((r: Room) => r.isActive === 1)); // Only active rooms
      setFacilities(facilityData.filter((f: Facility) => f.isActive === 1)); // Only active facilities
    } catch (error) {
      console.error('Error fetching master data:', error);
    } finally {
      setLoadingMaster(false);
    }
  };

  const fetchMeetings = async () => {
    try {
      const data = await meetingRequestService.getAll();
      setMeetings(data);
    } catch (error) {
      console.error('Error fetching meetings:', error);
    }
  };

  const handleBack = () => {
    sessionStorage.removeItem('fromLogin');
    navigate('/');
  };

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  useEffect(() => {
    generateCalendar();
  }, [currentDate]);

  const generateCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Get first day of month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Get the day of week for first day (0 = Sunday, 1 = Monday, etc.)
    const firstDayOfWeek = firstDay.getDay();
    
    // Get previous month's last day
    const prevMonthLastDay = new Date(year, month, 0);
    
    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Add previous month's days
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = prevMonthLastDay.getDate() - i;
      const fullDate = new Date(year, month - 1, date);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        fullDate
      });
    }

    // Add current month's days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const fullDate = new Date(year, month, i);
      fullDate.setHours(0, 0, 0, 0);
      days.push({
        date: i,
        isCurrentMonth: true,
        isToday: fullDate.getTime() === today.getTime(),
        fullDate
      });
    }

    // Add next month's days to complete the grid
    const remainingDays = 42 - days.length; // 6 rows * 7 days = 42
    for (let i = 1; i <= remainingDays; i++) {
      const fullDate = new Date(year, month + 1, i);
      days.push({
        date: i,
        isCurrentMonth: false,
        isToday: false,
        fullDate
      });
    }

    setCalendarDays(days);
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const handleMonthSelect = (monthIndex: number) => {
    setCurrentDate(new Date(selectedYear, monthIndex));
    setShowMonthYearPicker(false);
  };

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
  };

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  // Ruangan yang tidak memerlukan jumlah peserta
  const roomsWithoutPesertaRequired = ['ulin', 'tpm', 'meranti', 'gaharu', 'vip room', 'vip'];
  
  // Check apakah ruangan memerlukan jumlah peserta
  const isJumlahPesertaRequired = (roomName: string): boolean => {
    const normalizedName = roomName.toLowerCase();
    return !roomsWithoutPesertaRequired.some(name => normalizedName.includes(name));
  };

  // Check apakah ruangan sudah dibooking pada jam tertentu
  const isRoomBooked = (roomName: string, jamMulai: string, jamBerakhir: string): boolean => {
    if (!selectedDate || !jamMulai || !jamBerakhir) return false;
    
    const dateStr = formatDate(selectedDate);
    const bookedMeetings = meetings.filter(m => 
      m.tanggal === dateStr && 
      m.namaRuangan === roomName &&
      m.headGA === 'approved' && 
      m.headOS === 'approved'
    );
    
    // Convert time strings to minutes for comparison
    const toMinutes = (time: string): number => {
      const [h, m] = time.split(':').map(Number);
      return h * 60 + m;
    };
    
    const newStart = toMinutes(jamMulai);
    const newEnd = toMinutes(jamBerakhir);
    
    // Check for time overlap
    return bookedMeetings.some(m => {
      const existingStart = toMinutes(m.jamMulai);
      const existingEnd = toMinutes(m.jamBerakhir);
      // Check overlap: new meeting starts before existing ends AND new meeting ends after existing starts
      return newStart < existingEnd && newEnd > existingStart;
    });
  };

  // Get booking info for a room
  const getRoomBookingInfo = (roomName: string): { isBooked: boolean; bookedTimes: string[] } => {
    if (!selectedDate) return { isBooked: false, bookedTimes: [] };
    
    const dateStr = formatDate(selectedDate);
    const bookedMeetings = meetings.filter(m => 
      m.tanggal === dateStr && 
      m.namaRuangan === roomName &&
      m.headGA === 'approved' && 
      m.headOS === 'approved'
    );
    
    return {
      isBooked: bookedMeetings.length > 0,
      bookedTimes: bookedMeetings.map(m => `${m.jamMulai}-${m.jamBerakhir}`)
    };
  };


  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDayName = (date: Date): string => {
    return dayNames[date.getDay()];
  };

  const getMeetingsForDate = (date: Date): Meeting[] => {
    const dateStr = formatDate(date);
    return meetings.filter(m => m.tanggal === dateStr);
  };

  const handleDateClick = (day: CalendarDay) => {
    if (!day.isCurrentMonth) return;
    setSelectedDate(day.fullDate);
    setShowDateDetail(true);
  };

  const handleAddMeetingClick = () => {
    setShowAddMeeting(true);
    setShowDateDetail(false);
  };

  const handleSubmitMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate) return;

    try {
      // Get user data if logged in
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      const userId = user?.id || 0;

      await meetingRequestService.create({
        userId: userId,
        nama: newMeeting.nama,
        whatsapp: newMeeting.whatsapp,
        department: newMeeting.department,
        tanggal: formatDate(selectedDate),
        hari: getDayName(selectedDate),
        jamMulai: newMeeting.jamMulai,
        jamBerakhir: newMeeting.jamBerakhir,
        jumlahPeserta: parseInt(newMeeting.jumlahPeserta),
        agenda: newMeeting.agenda,
        namaRuangan: newMeeting.ruangan,
        fasilitas: newMeeting.fasilitas.join(', ')
      });

      // Refresh meetings data
      await fetchMeetings();
      
      setShowAddMeeting(false);
      setShowDateDetail(true);
      setNewMeeting({
        nama: '',
        whatsapp: '',
        department: '',
        ruangan: '',
        jamMulai: '',
        jamBerakhir: '',
        jumlahPeserta: '',
        fasilitas: [],
        agenda: ''
      });
      
      alert('Request peminjaman ruangan berhasil diajukan!');
    } catch (error: any) {
      alert(error.message || 'Gagal mengajukan request');
      console.error('Error submitting meeting:', error);
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col p-2 sm:p-3 bg-white">
      {/* Loading Overlay */}
      {loadingMaster && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            <span className="mt-2 text-gray-600">Memuat data...</span>
          </div>
        </div>
      )}

      {/* Back Button - hanya muncul jika non-admin dari halaman login */}
      {!isAdmin && fromLogin && (
        <div className="absolute top-4 left-4 z-50">
          <button
            onClick={handleBack}
            className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-200"
          >
            ← Kembali
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white shadow-lg p-2 sm:p-3 pb-0">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-center text-indigo-900">
          Monitoring Penggunaan Ruangan Meeting PT Indominco Mandiri
        </h1>
        
        {/* Month and Year Navigation */}
        <div className="flex items-center justify-between max-w-2xl mx-auto gap-3">
          <button
            onClick={goToPreviousMonth}
            className="p-2 rounded-lg hover:bg-indigo-100 transition-colors"
          >
            <svg className="w-8 h-8 text-indigo-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <div className="text-center flex-1 relative">
            <button
              onClick={() => {
                setSelectedYear(currentDate.getFullYear());
                setShowMonthYearPicker(!showMonthYearPicker);
              }}
              className="text-2xl font-bold text-indigo-800 hover:text-indigo-600 transition-colors px-3 py-1 rounded-lg hover:bg-indigo-50"
            >
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </button>

            {/* Month Year Picker Modal */}
            {showMonthYearPicker && (
              <div className="absolute top-full mt-4 left-1/2 transform -translate-x-1/2 bg-white rounded-2xl shadow-2xl p-6 z-50 border-2 border-indigo-200 w-96">
                {/* Year Selector */}
                <div className="mb-6">
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => handleYearChange(selectedYear - 1)}
                      className="p-2 rounded-lg hover:bg-indigo-100 transition-colors"
                    >
                      <svg className="w-6 h-6 text-indigo-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <span className="text-2xl font-bold text-indigo-900 min-w-[100px] text-center">
                      {selectedYear}
                    </span>
                    <button
                      onClick={() => handleYearChange(selectedYear + 1)}
                      className="p-2 rounded-lg hover:bg-indigo-100 transition-colors"
                    >
                      <svg className="w-6 h-6 text-indigo-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Month Grid */}
                <div className="grid grid-cols-3 gap-3">
                  {monthNames.map((month, index) => (
                    <button
                      key={index}
                      onClick={() => handleMonthSelect(index)}
                      className={`py-3 px-4 rounded-lg font-semibold transition-all ${
                        currentDate.getMonth() === index && currentDate.getFullYear() === selectedYear
                          ? 'bg-indigo-600 text-white shadow-lg'
                          : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                      }`}
                    >
                      {month}
                    </button>
                  ))}
                </div>

                {/* Close Button */}
                <button
                  onClick={() => setShowMonthYearPicker(false)}
                  className="mt-4 w-full py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors"
                >
                  Tutup
                </button>
              </div>
            )}
          </div>
          
          <button
            onClick={goToNextMonth}
            className="p-2 rounded-lg hover:bg-indigo-100 transition-colors"
          >
            <svg className="w-8 h-8 text-indigo-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white shadow-lg px-2 sm:px-3 pb-2 sm:pb-3 flex-1 flex flex-col overflow-y-auto">
        {/* Day Names */}
        <div className="sticky top-0 bg-white z-10 grid grid-cols-7 gap-1 sm:gap-2 mb-3 sm:mb-4">
          {dayNames.map((day, idx) => (
            <div
              key={day}
              className={`text-center font-bold py-1 sm:py-1.5 text-xs sm:text-sm md:text-base lg:text-lg ${
                idx === 0 ? 'text-red-600' : 'text-indigo-700'
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {calendarDays.map((day, index) => {
            const dayMeetings = getMeetingsForDate(day.fullDate);
            return (
              <div
                key={index}
                onClick={() => handleDateClick(day)}
                className={`
                  relative flex flex-col items-center justify-start p-1 sm:p-2 rounded-lg
                  min-h-[60px] sm:min-h-[80px] md:min-h-[100px] lg:min-h-[120px]
                  transition-all cursor-pointer overflow-hidden
                  ${day.isCurrentMonth 
                    ? 'bg-white hover:bg-indigo-50 border border-gray-200 hover:border-indigo-300' 
                    : 'bg-gray-50 text-gray-400 border border-gray-100'
                  }
                  ${day.isToday 
                    ? 'ring-2 ring-indigo-500 bg-indigo-100 border-indigo-500' 
                    : ''
                  }
                `}
              >
                <span
                  className={`
                    text-xs sm:text-sm md:text-base font-bold mb-0.5
                    ${day.isToday ? 'text-indigo-900' : ''}
                    ${day.isCurrentMonth && !day.isToday ? 'text-gray-700' : ''}
                  `}
                >
                  {day.date}
                </span>

                {/* Meeting Indicators */}
                {dayMeetings.length > 0 && (
                  <div className="w-full flex flex-col gap-0.5 overflow-hidden">
                    {dayMeetings.slice(0, 2).map((meeting) => {
                      // Status based on both approvals
                      const isApproved = meeting.headGA === 'approved' && meeting.headOS === 'approved';
                      const isRejected = meeting.headGA === 'rejected' || meeting.headOS === 'rejected';
                      return (
                        <div 
                          key={meeting.id} 
                          className={`text-[8px] sm:text-[9px] px-1 py-1 sm:py-1.5 rounded truncate ${
                            isApproved
                              ? 'bg-green-500 text-white border-l-4 border-green-700' 
                              : isRejected
                              ? 'bg-red-500 text-white border-l-4 border-red-700'
                              : 'bg-yellow-400 text-yellow-900 border-l-4 border-yellow-600'
                          }`}
                        >
                          {meeting.jamMulai} - {meeting.namaRuangan}
                        </div>
                      );
                    })}
                    {dayMeetings.length > 2 && (
                      <div className="text-[8px] sm:text-[9px] text-indigo-600 font-semibold text-center py-0.5">
                        +{dayMeetings.length - 2} lagi
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Date Detail Modal */}
      {showDateDetail && selectedDate && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowDateDetail(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-4 max-w-xl w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <button
                onClick={() => setShowDateDetail(false)}
                className="flex items-center gap-2 text-gray-700 hover:text-indigo-600 font-medium transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Kembali
              </button>
              <h2 className="text-xl font-bold text-indigo-900">
                {selectedDate.getDate()} {monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}
              </h2>
              <button
                onClick={() => setShowDateDetail(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {getMeetingsForDate(selectedDate).length === 0 ? (
              <p className="text-gray-500 text-center py-4 text-sm">Tidak ada peminjaman ruangan pada tanggal ini</p>
            ) : (
              <div className="space-y-2">
                {getMeetingsForDate(selectedDate).map((meeting) => {
                  const isApproved = meeting.headGA === 'approved' && meeting.headOS === 'approved';
                  const isRejected = meeting.headGA === 'rejected' || meeting.headOS === 'rejected';
                  const statusText = isApproved ? 'Disetujui' : isRejected ? 'Ditolak' : 'Menunggu';
                  const statusColor = isApproved ? 'bg-green-100 text-green-800' : isRejected ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800';
                  
                  return (
                    <div key={meeting.id} className="border border-indigo-200 rounded-lg p-3 hover:bg-indigo-50 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-mono text-gray-500">{meeting.requestId}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor}`}>
                          {statusText}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-xs text-gray-600">Nama Peminjam</p>
                          <p className="font-semibold text-indigo-900">{meeting.nama}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Department</p>
                          <p className="font-semibold text-indigo-900">{meeting.department}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Ruangan</p>
                          <p className="font-semibold text-indigo-900">{meeting.namaRuangan}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Waktu</p>
                          <p className="font-semibold text-indigo-900">{meeting.jamMulai} - {meeting.jamBerakhir}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Agenda</p>
                          <p className="font-semibold text-indigo-900">{meeting.agenda}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Fasilitas</p>
                          <p className="font-semibold text-indigo-900">{meeting.fasilitas}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Jumlah Peserta</p>
                          <p className="font-semibold text-indigo-900">{meeting.jumlahPeserta} orang</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Status Approval</p>
                          {meeting.headGA === 'pending' ? (
                            <p className="font-semibold text-yellow-600">Menunggu Head GA</p>
                          ) : meeting.headGA === 'rejected' ? (
                            <p className="font-semibold text-red-600">Ditolak Head GA</p>
                          ) : meeting.headOS === 'pending' ? (
                            <p className="font-semibold text-yellow-600">Menunggu Head OS</p>
                          ) : meeting.headOS === 'rejected' ? (
                            <p className="font-semibold text-red-600">Ditolak Head OS</p>
                          ) : (
                            <p className="font-semibold text-green-600">Approved</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Button Tambah Request */}
            <button
              onClick={handleAddMeetingClick}
              className="mt-3 w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2.5 rounded-lg shadow-lg transition-all hover:scale-105 flex items-center justify-center gap-2 text-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Tambah Request Peminjaman Ruangan
            </button>
          </div>
        </div>
      )}

      {/* Add Meeting Modal */}
      {showAddMeeting && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddMeeting(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-4 max-w-xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-xl font-bold text-indigo-900">Request Peminjaman Ruangan</h2>
              <button
                onClick={() => setShowAddMeeting(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmitMeeting} className="space-y-3">
              {/* Section 1: Informasi Peminjam */}
              <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                <h3 className="text-sm font-bold text-indigo-900">Informasi Peminjam</h3>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Nama Peminjam *</label>
                    <input
                      type="text"
                      required
                      value={newMeeting.nama}
                      onChange={(e) => setNewMeeting({...newMeeting, nama: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none transition-colors"
                      placeholder="Masukkan nama lengkap"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">No. WhatsApp *</label>
                    <input
                      type="text"
                      required
                      value={newMeeting.whatsapp}
                      onChange={(e) => setNewMeeting({...newMeeting, whatsapp: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none transition-colors"
                      placeholder="08xxxxxxxxxx"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Department *</label>
                  <select
                    required
                    value={newMeeting.department}
                    onChange={(e) => setNewMeeting({...newMeeting, department: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none transition-colors"
                  >
                    <option value="">Pilih Department</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.name}>{dept.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Section 2: Detail Ruangan & Waktu */}
              <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                <h3 className="text-sm font-bold text-indigo-900">Detail Ruangan & Waktu</h3>
                
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Ruangan Meeting *</label>
                  <select
                    required
                    value={newMeeting.ruangan}
                    onChange={(e) => {
                      const selectedRoom = e.target.value;
                      // Check if room is booked
                      if (selectedRoom && isRoomBooked(selectedRoom, newMeeting.jamMulai, newMeeting.jamBerakhir)) {
                        alert('Ruangan ini sudah dibooking pada jam yang dipilih. Silakan pilih ruangan lain atau ubah jam meeting.');
                        return;
                      }
                      setNewMeeting({...newMeeting, ruangan: selectedRoom});
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none transition-colors"
                  >
                    <option value="">Pilih Ruangan</option>
                    {rooms.map(room => {
                      const bookingInfo = getRoomBookingInfo(room.name);
                      const isBooked = bookingInfo.isBooked;
                      const hybridText = room.isHybrid === 1 ? ' | Hybrid' : '';
                      return (
                        <option 
                          key={room.id} 
                          value={room.name}
                          disabled={isBooked}
                          style={{ 
                            color: isBooked ? '#dc2626' : 'inherit',
                            backgroundColor: isBooked ? '#fef2f2' : 'inherit'
                          }}
                        >
                          {room.name} (Kapasitas: {room.capacity}{hybridText}){isBooked ? ` - (Sudah dibooking: ${bookingInfo.bookedTimes.join(', ')})` : ''}
                        </option>
                      );
                    })}
                  </select>
                  {/* Info ruangan terpilih dengan Hybrid bold */}
                  {newMeeting.ruangan && (() => {
                    const selectedRoom = rooms.find(r => r.name === newMeeting.ruangan);
                    if (selectedRoom) {
                      return (
                        <div className="mt-1 px-2 py-1.5 bg-indigo-50 rounded-lg text-xs text-gray-700 border border-indigo-200">
                          <span className="font-medium">{selectedRoom.name}</span>
                          <span className="mx-1">•</span>
                          <span>Kapasitas: {selectedRoom.capacity} orang</span>
                          {selectedRoom.isHybrid === 1 && (
                            <>
                              <span className="mx-1">•</span>
                              <span className="font-bold text-indigo-700">Hybrid</span>
                            </>
                          )}
                          {selectedRoom.location && (
                            <>
                              <span className="mx-1">•</span>
                              <span>{selectedRoom.location}</span>
                            </>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Jam Mulai *</label>
                    <div className="flex items-center gap-1 bg-white p-1.5 border border-gray-300 rounded-lg focus-within:border-indigo-500 transition-colors">
                      <select
                        required
                        value={newMeeting.jamMulai.split(':')[0] || ''}
                        onChange={(e) => {
                          const minutes = newMeeting.jamMulai.split(':')[1] || '00';
                          setNewMeeting({...newMeeting, jamMulai: `${e.target.value}:${minutes}`});
                        }}
                        className="flex-1 px-1 py-1 focus:outline-none text-center text-sm font-semibold"
                      >
                        <option value="">HH</option>
                        {hours.map(hour => (
                          <option key={hour} value={hour}>{hour}</option>
                        ))}
                      </select>
                      <span className="text-sm font-bold text-gray-600">:</span>
                      <select
                        required
                        value={newMeeting.jamMulai.split(':')[1] || ''}
                        onChange={(e) => {
                          const hour = newMeeting.jamMulai.split(':')[0] || '00';
                          setNewMeeting({...newMeeting, jamMulai: `${hour}:${e.target.value}`});
                        }}
                        className="flex-1 px-1 py-1 focus:outline-none text-center text-sm font-semibold"
                      >
                        <option value="">MM</option>
                        {minutes.map(minute => (
                          <option key={minute} value={minute}>{minute}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Jam Berakhir *</label>
                    <div className="flex items-center gap-1 bg-white p-1.5 border border-gray-300 rounded-lg focus-within:border-indigo-500 transition-colors">
                      <select
                        required
                        value={newMeeting.jamBerakhir.split(':')[0] || ''}
                        onChange={(e) => {
                          const minutes = newMeeting.jamBerakhir.split(':')[1] || '00';
                          setNewMeeting({...newMeeting, jamBerakhir: `${e.target.value}:${minutes}`});
                        }}
                        className="flex-1 px-1 py-1 focus:outline-none text-center text-sm font-semibold"
                      >
                        <option value="">HH</option>
                        {hours.map(hour => (
                          <option key={hour} value={hour}>{hour}</option>
                        ))}
                      </select>
                      <span className="text-sm font-bold text-gray-600">:</span>
                      <select
                        required
                        value={newMeeting.jamBerakhir.split(':')[1] || ''}
                        onChange={(e) => {
                          const hour = newMeeting.jamBerakhir.split(':')[0] || '00';
                          setNewMeeting({...newMeeting, jamBerakhir: `${hour}:${e.target.value}`});
                        }}
                        className="flex-1 px-1 py-1 focus:outline-none text-center text-sm font-semibold"
                      >
                        <option value="">MM</option>
                        {minutes.map(minute => (
                          <option key={minute} value={minute}>{minute}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Detail Meeting */}
              <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                <h3 className="text-sm font-bold text-indigo-900">Detail Meeting</h3>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Jumlah Peserta {isJumlahPesertaRequired(newMeeting.ruangan) ? '*' : '(Opsional)'}
                    </label>
                    <input
                      type="number"
                      required={isJumlahPesertaRequired(newMeeting.ruangan)}
                      min="1"
                      value={newMeeting.jumlahPeserta}
                      onChange={(e) => setNewMeeting({...newMeeting, jumlahPeserta: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none transition-colors"
                      placeholder="Jumlah peserta"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Fasilitas yang Digunakan</label>
                    <div className="flex flex-wrap gap-2 p-2 border border-gray-300 rounded-lg bg-white max-h-24 overflow-y-auto">
                      {facilities.length === 0 ? (
                        <span className="text-xs text-gray-400">Loading...</span>
                      ) : (
                        facilities.map(facility => (
                          <label key={facility.id} className="flex items-center gap-1 text-xs cursor-pointer">
                            <input
                              type="checkbox"
                              checked={newMeeting.fasilitas.includes(facility.name)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewMeeting({...newMeeting, fasilitas: [...newMeeting.fasilitas, facility.name]});
                                } else {
                                  setNewMeeting({...newMeeting, fasilitas: newMeeting.fasilitas.filter(f => f !== facility.name)});
                                }
                              }}
                              className="w-3 h-3 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span>{facility.name}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Agenda Meeting *</label>
                  <textarea
                    required
                    value={newMeeting.agenda}
                    onChange={(e) => setNewMeeting({...newMeeting, agenda: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none transition-colors resize-none"
                    placeholder="Jelaskan agenda dan tujuan meeting"
                    rows={3}
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddMeeting(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition-all text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl text-sm"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;

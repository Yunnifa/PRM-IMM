import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const Header = () => {
  const location = useLocation();
  const [currentDate, setCurrentDate] = useState('');

  // Map route paths ke header titles
  const routeToHeaderMap: { [key: string]: string } = {
    '/admin/monitoring': 'Data Monitoring',
    '/admin/department': 'Data Master - Department',
    '/admin/user': 'Data Master - User',
    '/admin/fasilitas': 'Data Master - Fasilitas',
    '/admin/ruangan': 'Data Master - Ruangan Meeting',
    '/admin/calendar': 'Kalender Peminjaman Ruangan',
  };

  const getHeaderTitle = () => {
    const currentPath = location.pathname;
    return routeToHeaderMap[currentPath] || 'Admin Panel';
  };

  useEffect(() => {
    // Format tanggal hari ini
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    setCurrentDate(today.toLocaleDateString('id-ID', options));
  }, []);

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-6 flex items-center justify-between">
      {/* Left Section - Title & Date */}
      <div className="flex flex-col flex-1 min-w-0">
        <h1 className="text-2xl font-bold text-indigo-900">
          {getHeaderTitle()}
        </h1>
        <p className="text-sm text-gray-500 mt-1">{currentDate}</p>
      </div>

      {/* Right Section - Admin Info */}
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-base font-semibold text-gray-800">Administrator</p>
          <p className="text-sm text-gray-500">Admin</p>
        </div>
        {/* User Circle Icon */}
        <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
          <svg className="w-7 h-7 text-indigo-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default Header;

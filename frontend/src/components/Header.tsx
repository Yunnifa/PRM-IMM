import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

interface HeaderProps {
  onToggleSidebar: () => void;
}

const Header = ({ onToggleSidebar }: HeaderProps) => {
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
    <div className="bg-white border-b border-gray-200 px-4 py-4 lg:px-6 lg:py-6 flex items-center justify-between">
      {/* Left Section - Hamburger + Title & Date */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Hamburger toggle for mobile */}
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="Toggle sidebar"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="flex flex-col min-w-0">
          <h1 className="text-lg lg:text-2xl font-bold text-indigo-900 truncate">
            {getHeaderTitle()}
          </h1>
          <p className="text-xs lg:text-sm text-gray-500 mt-0.5 lg:mt-1">{currentDate}</p>
        </div>
      </div>

      {/* Right Section - Admin Info */}
      <div className="flex items-center gap-2 lg:gap-4">
        <div className="text-right hidden sm:block">
          <p className="text-sm lg:text-base font-semibold text-gray-800">Administrator</p>
          <p className="text-xs lg:text-sm text-gray-500">Admin</p>
        </div>
        {/* User Circle Icon */}
        <div className="w-10 h-10 lg:w-12 lg:h-12 bg-indigo-100 rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 lg:w-7 lg:h-7 text-indigo-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default Header;

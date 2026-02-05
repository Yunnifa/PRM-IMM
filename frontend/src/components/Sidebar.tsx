import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

const Sidebar = () => {
  const navigate = useNavigate();
  const [isDataMasterOpen, setIsDataMasterOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('isAdminLoggedIn');
    navigate('/');
  };

  return (
    <div className="w-64 bg-indigo-900 text-white h-screen flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-indigo-700">
        <h2 className="text-xl font-bold">Admin Panel</h2>
        <p className="text-sm text-indigo-300 mt-1">PRM-IMM</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {/* Data Monitoring */}
        <NavLink
          to="/admin/monitoring"
          className={({ isActive }) =>
            `block px-4 py-3 rounded-lg transition-colors ${
              isActive
                ? 'bg-indigo-700 text-white'
                : 'text-indigo-100 hover:bg-indigo-800'
            }`
          }
        >
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="font-medium">Data Monitoring</span>
          </div>
        </NavLink>

        {/* Data Master Dropdown */}
        <div>
          <button
            onClick={() => setIsDataMasterOpen(!isDataMasterOpen)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-indigo-100 hover:bg-indigo-800 transition-colors"
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
              <span className="font-medium">Data Master</span>
            </div>
            <svg
              className={`w-4 h-4 transition-transform ${isDataMasterOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Submenu */}
          {isDataMasterOpen && (
            <div className="ml-4 mt-2 space-y-1">
              <NavLink
                to="/admin/department"
                className={({ isActive }) =>
                  `block px-4 py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-indigo-700 text-white'
                      : 'text-indigo-200 hover:bg-indigo-800'
                  }`
                }
              >
                Department
              </NavLink>
              <NavLink
                to="/admin/user"
                className={({ isActive }) =>
                  `block px-4 py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-indigo-700 text-white'
                      : 'text-indigo-200 hover:bg-indigo-800'
                  }`
                }
              >
                User
              </NavLink>
              <NavLink
                to="/admin/fasilitas"
                className={({ isActive }) =>
                  `block px-4 py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-indigo-700 text-white'
                      : 'text-indigo-200 hover:bg-indigo-800'
                  }`
                }
              >
                Fasilitas
              </NavLink>
              <NavLink
                to="/admin/ruangan"
                className={({ isActive }) =>
                  `block px-4 py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-indigo-700 text-white'
                      : 'text-indigo-200 hover:bg-indigo-800'
                  }`
                }
              >
                Ruangan Meeting
              </NavLink>
            </div>
          )}
        </div>

        {/* Calendar Link */}
        <NavLink
          to="/admin/calendar"
          className={({ isActive }) =>
            `block px-4 py-3 rounded-lg transition-colors ${
              isActive
                ? 'bg-indigo-700 text-white'
                : 'text-indigo-100 hover:bg-indigo-800'
            }`
          }
        >
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="font-medium">Kalender</span>
          </div>
        </NavLink>
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-indigo-700">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-red-600 hover:bg-red-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;

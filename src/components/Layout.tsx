import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Home, PlusCircle, List, RefreshCw, LogOut, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-16">
      {/* Sticky Top Header Bar */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-200 z-50 px-4 py-3 shadow-sm">
        <div className="flex justify-between items-center max-w-md mx-auto">
          {/* Brand Logo */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-orange-50 border border-orange-100 rounded-lg text-primary">
              <Shield size={20} />
            </div>
            <span className="font-extrabold text-lg text-gray-900 tracking-tight">
              FloodSync
            </span>
          </div>

          {/* User profile & logout controls */}
          {user && (
            <div className="flex items-center gap-3">
              {/* Profile details */}
              <div className="flex flex-col items-end">
                <span className="text-xs font-bold text-gray-800 leading-tight">
                  {user.username}
                </span>
              </div>

              {/* User Avatar Circle */}
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white text-xs font-black shadow-inner">
                {user.username.charAt(0).toUpperCase()}
              </div>

              {/* Separator */}
              <div className="h-6 w-[1px] bg-gray-200"></div>

              {/* Log out */}
              <button
                onClick={handleLogout}
                title="Log Out"
                className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut size={18} />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Page Content */}
      <main className="flex-grow overflow-y-auto">
        <Outlet />
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 shadow-lg">
        <div className="flex justify-around items-center h-16 max-w-md mx-auto">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full h-full space-y-1 ${
                isActive ? 'text-primary' : 'text-gray-500 hover:text-gray-900'
              }`
            }
          >
            <Home size={22} />
            <span className="text-[10px] font-bold">Home</span>
          </NavLink>
          
          <NavLink
            to="/new"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full h-full space-y-1 ${
                isActive ? 'text-primary' : 'text-gray-500 hover:text-gray-900'
              }`
            }
          >
            <PlusCircle size={22} />
            <span className="text-[10px] font-bold">New</span>
          </NavLink>

          <NavLink
            to="/assessments"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full h-full space-y-1 ${
                isActive ? 'text-primary' : 'text-gray-500 hover:text-gray-900'
              }`
            }
          >
            <List size={22} />
            <span className="text-[10px] font-bold">Assessments</span>
          </NavLink>

          {/* Sync button rendered directly for all authenticated users */}
          <NavLink
            to="/sync"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full h-full space-y-1 ${
                isActive ? 'text-primary' : 'text-gray-500 hover:text-gray-900'
              }`
            }
          >
            <RefreshCw size={22} />
            <span className="text-[10px] font-bold">Sync</span>
          </NavLink>
        </div>
      </nav>
    </div>
  );
}

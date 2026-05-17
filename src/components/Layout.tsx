import { Outlet, NavLink } from 'react-router-dom';
import { Home, PlusCircle, List, RefreshCw } from 'lucide-react';

export default function Layout() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-16">
      <main className="flex-grow overflow-y-auto">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="flex justify-around items-center h-16 max-w-md mx-auto">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full h-full space-y-1 ${
                isActive ? 'text-primary' : 'text-gray-500 hover:text-gray-900'
              }`
            }
          >
            <Home size={24} />
            <span className="text-xs font-medium">Home</span>
          </NavLink>
          
          <NavLink
            to="/new"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full h-full space-y-1 ${
                isActive ? 'text-primary' : 'text-gray-500 hover:text-gray-900'
              }`
            }
          >
            <PlusCircle size={24} />
            <span className="text-xs font-medium">New</span>
          </NavLink>

          <NavLink
            to="/assessments"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full h-full space-y-1 ${
                isActive ? 'text-primary' : 'text-gray-500 hover:text-gray-900'
              }`
            }
          >
            <List size={24} />
            <span className="text-xs font-medium">All</span>
          </NavLink>

          <NavLink
            to="/sync"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full h-full space-y-1 ${
                isActive ? 'text-primary' : 'text-gray-500 hover:text-gray-900'
              }`
            }
          >
            <RefreshCw size={24} />
            <span className="text-xs font-medium">Sync</span>
          </NavLink>
        </div>
      </nav>
    </div>
  );
}

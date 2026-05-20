import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Unauthorized() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-6 py-12 text-center">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-gray-100 shadow-xl flex flex-col items-center">
        
        {/* Animated Icon Container */}
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center border border-red-100 shadow-sm mb-6 animate-bounce">
          <ShieldAlert size={44} />
        </div>

        <h1 className="text-2xl font-black text-gray-900 mb-2">
          Access Denied
        </h1>
        
        <p className="text-gray-500 text-sm font-medium leading-relaxed mb-6">
          Your current account role <span className="font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md text-xs">{user?.role}</span> is not authorized to view this page. This action requires Administrator clearance level.
        </p>

        <div className="w-full space-y-3">
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center justify-center gap-2 py-3 bg-primary hover:bg-orange-700 active:scale-95 text-white font-bold rounded-xl transition-all shadow-md shadow-orange-500/20 cursor-pointer text-sm"
          >
            <ArrowLeft size={16} />
            <span>Return to Dashboard</span>
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3 bg-white hover:bg-gray-50 active:scale-95 border border-gray-200 text-gray-700 font-bold rounded-xl transition-all shadow-sm cursor-pointer text-sm"
          >
            <LogOut size={16} className="text-gray-500" />
            <span>Sign Out & Switch Account</span>
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-6 font-medium">
        FloodSync Assessment Portal • Secured Session
      </p>
    </div>
  );
}

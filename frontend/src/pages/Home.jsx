import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import api from "../api.js";
import { setUserData } from "../redux/userSlice";
import ChatList from "../components/ChatList";
import ChatWindow from "../components/ChatWindow";
import { FaUser, FaRightFromBracket, FaBars, FaXmark } from "react-icons/fa6";

function Home() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const userData = useSelector((state) => state.user.userData);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  React.useEffect(() => {
    if (!userData) {
      navigate('/login');
    }
  }, [userData, navigate]);

  const handleLogout = async () => {
    console.log('Logout clicked');
    try {
      await api.get('/api/auth/logout');
    } catch (error) {
      console.error('Logout API failed:', error);
    }
    dispatch(setUserData(null));
    // Force navigation
    window.location.href = '/login';
  };

  if (!userData) {
    return null;
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 text-white flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-slate-900/90 backdrop-blur-xl border-b border-slate-700/50 px-3 sm:px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile menu toggle */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 hover:bg-slate-800/60 rounded-lg transition text-cyan-400"
            >
              {sidebarOpen ? <FaXmark className="w-5 h-5" /> : <FaBars className="w-5 h-5" />}
            </button>

            <div className="relative">
              <img
                src="/logo.png"
                alt="BlinkUpZ Logo"
                className="w-8 sm:w-9 h-8 sm:h-9 object-contain rounded-xl shadow-lg shadow-cyan-500/20"
              />
              <div className="absolute -bottom-0.5 -right-0.5 w-2 sm:w-3 h-2 sm:h-3 bg-cyan-500 rounded-full border-2 border-slate-900"></div>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-cyan-400 to-cyan-300 bg-clip-text text-transparent">BlinkUpZ</h1>
              <p className="text-[10px] text-slate-500 -mt-0.5">Friends. Fast. Fun.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-800/60 transition px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium"
            >
              <img
                src={userData.image || "/default-avatar.svg"}
                alt="Profile"
                className="w-6 sm:w-7 h-6 sm:h-7 rounded-full object-cover border border-slate-600"
              />
              <span className="hidden sm:inline">Profile</span>
            </button>
            <div
              onClick={handleLogout}
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg transition text-xs sm:text-sm font-medium border border-red-500/20 cursor-pointer"
            >
              <FaRightFromBracket className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Layout - Responsive Grid */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-20 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar - Chat List - Responsive */}
        <aside className={`
          absolute md:relative md:flex
          ${sidebarOpen ? 'left-0 right-0' : '-left-full'}
          top-0 h-full md:h-auto
          w-full md:w-80 md:w-72 lg:w-80
          bg-slate-900/95 md:bg-slate-900/60 
          border-r border-slate-700/50 
          flex flex-col backdrop-blur-sm
          transition-all duration-300 ease-in-out
          z-30
        `}>
          <ChatList onChatSelect={() => setSidebarOpen(false)} />
        </aside>

        {/* Main Chat Area */}
        <section className="flex-1 bg-slate-950/30 flex flex-col w-full md:w-auto">
          <ChatWindow />
        </section>
      </main>
    </div>
  );
}

export default Home;

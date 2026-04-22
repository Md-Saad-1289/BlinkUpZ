import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaTriangleExclamation, FaHouse, FaArrowLeft } from 'react-icons/fa6';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 flex items-center justify-center px-4">
      <div className="text-center">
        {/* Logo & App Name */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <img
            src="/logo.png"
            alt="BlinkUpZ Logo"
            className="h-12 w-12 object-contain rounded-xl shadow-lg shadow-cyan-500/20"
          />
          <div className="text-left">
            <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-cyan-300 bg-clip-text text-transparent">BlinkUpZ</h1>
            <p className="text-[10px] text-slate-500 -mt-0.5">Friends. Fast. Fun.</p>
          </div>
        </div>

        <div className="flex justify-center mb-6">
          <FaTriangleExclamation className="w-24 h-24 text-red-500 opacity-80" />
        </div>
        <h1 className="text-6xl font-bold text-white mb-2">404</h1>
        <h2 className="text-3xl font-semibold text-cyan-400 mb-4">Page Not Found</h2>
        <p className="text-slate-300 mb-8 text-lg max-w-md">
          Sorry, the page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => navigate('/home')}
            className="flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg transition"
          >
            <FaHouse className="w-5 h-5" />
            Go Home
          </button>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition"
          >
            <FaArrowLeft className="w-5 h-5" />
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;

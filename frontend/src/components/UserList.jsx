import React, { useState, useEffect } from "react";
import axios from "axios";
import { serverUrl } from "../config.js";
import { FaMagnifyingGlass, FaSpinner, FaUser } from "react-icons/fa6";

const UserList = ({ onSelectUser, onClose }) => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!search.trim()) {
        setUsers([]);
        return;
      }

      setLoading(true);
      try {
        const res = await axios.get(`${serverUrl}/api/user/search?q=${encodeURIComponent(search)}`, {
          withCredentials: true,
        });
        setUsers(res.data);
      } catch (error) {
        console.error("Search users failed:", error);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchUsers, 300);
    return () => clearTimeout(debounceTimer);
  }, [search]);

  return (
    <div className="absolute top-full left-0 right-0 bg-slate-900/98 backdrop-blur-2xl border border-slate-700/60 rounded-2xl mt-2 z-30 max-h-96 overflow-hidden shadow-2xl shadow-black/50">
      {/* Header */}
      <div className="p-4 border-b border-slate-700/50 bg-gradient-to-r from-slate-800/40 to-slate-800/20">
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <FaMagnifyingGlass className="text-cyan-500 w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-10 py-3 bg-slate-800/80 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:bg-slate-800 placeholder-slate-500 transition-all border border-slate-700/50"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {loading && (
          <div className="p-8 text-center">
            <FaSpinner className="w-6 h-6 animate-spin text-cyan-500 mx-auto mb-2" />
            <span className="text-slate-400 text-sm">Searching...</span>
          </div>
        )}

        {!loading && users.length > 0 && (
          <div className="p-2">
            {users.map((user) => (
              <div
                key={user._id}
                onClick={() => {
                  onSelectUser(user);
                  onClose();
                }}
                className="p-3 mx-2 my-1 rounded-xl hover:bg-gradient-to-r hover:from-cyan-500/15 hover:to-transparent cursor-pointer transition-all duration-200 group"
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img
                      src={user.image || "/default-avatar.svg"}
                      alt={user.username}
                      className="w-12 h-12 rounded-2xl object-cover border-2 border-slate-700 group-hover:border-cyan-500/60 shadow-md group-hover:shadow-cyan-500/20 transition-all"
                    />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-900"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold group-hover:text-cyan-400 transition truncate">{user.name || user.username}</p>
                    <p className="text-slate-500 text-xs truncate">{user.email}</p>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-slate-800/60 flex items-center justify-center group-hover:bg-cyan-500/20 group-hover:scale-110 transition-all">
                    <FaUser className="w-4 h-4 text-slate-500 group-hover:text-cyan-400" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && search && users.length === 0 && (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-800/60 flex items-center justify-center mx-auto mb-3">
              <FaUser className="w-5 h-5 text-slate-600" />
            </div>
            <p className="text-slate-400 text-sm">No users found</p>
            <p className="text-slate-600 text-xs mt-1">Try a different search term</p>
          </div>
        )}

        {!loading && !search && (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-800/60 flex items-center justify-center mx-auto mb-3">
              <FaMagnifyingGlass className="w-5 h-5 text-slate-600" />
            </div>
            <p className="text-slate-500 text-sm">Type to search users</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserList;
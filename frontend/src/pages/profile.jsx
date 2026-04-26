import React, { useState, useRef, useEffect } from "react"
import { useSelector, useDispatch } from "react-redux"
import { IoCameraOutline } from "react-icons/io5"
import { useNavigate } from "react-router-dom"
import api from "../api.js"
import { setUserData } from "../redux/userSlice"
import { FaArrowLeft, FaUser, FaEnvelope, FaFloppyDisk, FaSpinner, FaBell, FaBellSlash } from "react-icons/fa6"
import { enableNotifications, disableNotifications, isPushSupported, getNotificationPermission } from "../utils/notifications.js"

function Profile() {
  const { userData } = useSelector((state) => state.user)
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const [name, setName] = useState(userData?.name || "")
  const [frontendImage, setFrontendImage] = useState(userData?.image || "/default-avatar.svg")
  const [backendImage, setBackendImage] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [notificationSupported, setNotificationSupported] = useState(true)
  const [notificationPermission, setNotificationPermission] = useState('default')

  const imageRef = useRef()

  useEffect(() => {
    setName(userData?.name || "")
    setFrontendImage(userData?.image || "/default-avatar.svg")
    
    // Check notification status
    if (isPushSupported()) {
      setNotificationSupported(true)
      const permission = getNotificationPermission();
      setNotificationPermission(permission);
      setNotificationsEnabled(permission === 'granted');
    } else {
      setNotificationSupported(false)
    }
  }, [userData])

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setBackendImage(file)
    setFrontendImage(URL.createObjectURL(file))
  }

  const handleProfile = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError("")
    setSuccess("")
    try {
      const formData = new FormData()
      formData.append("name", name)
      if (backendImage) formData.append("image", backendImage)

      const result = await api.post('/api/user/profile', formData)

      dispatch(setUserData(result.data))
      setSuccess("Profile updated successfully!")
      setTimeout(() => setSuccess(""), 3000)
    } catch (err) {
      console.error("Profile update failed:", err)
      setError(
        err.response?.data?.message || err.response?.data?.Message || "Failed to update profile. Please try again."
      )
      setTimeout(() => setError(""), 5000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 flex items-center justify-center px-3 sm:px-4 py-8 sm:py-12">
      <button
        onClick={() => navigate('/home')}
        className="absolute top-4 sm:top-6 left-4 sm:left-6 cursor-pointer text-cyan-400 hover:text-cyan-300 transition p-2 hover:bg-slate-800 rounded-lg z-10"
      >
        <FaArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      <form
        onSubmit={handleProfile}
        className="w-full max-w-lg rounded-2xl sm:rounded-3xl bg-slate-900/95 p-5 sm:p-8 shadow-2xl shadow-cyan-900/30 backdrop-blur-md text-white"
      >
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 text-xs sm:text-sm text-center">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-xl text-green-400 text-xs sm:text-sm text-center">
            {success}
          </div>
        )}

        {/* Logo & App Name */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <img
            src="/logo.png"
            alt="BlinkUpZ Logo"
            className="h-8 w-8 object-contain rounded-lg shadow-lg shadow-cyan-500/20"
          />
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-cyan-300 bg-clip-text text-transparent">BlinkUpZ</h1>
            <p className="text-[8px] text-slate-500 -mt-0.5">Profile Settings</p>
          </div>
        </div>

        <h2 className="text-xl sm:text-2xl font-semibold text-center mb-4 sm:mb-6 flex items-center justify-center gap-2">
          <FaUser className="text-cyan-400 w-5 h-5 sm:w-6 sm:h-6" />
          My Profile
        </h2>

        <div className="flex flex-col items-center gap-4 sm:gap-5">
          <div
            className="relative cursor-pointer group"
            onClick={() => imageRef.current.click()}
          >
            <img
              src={frontendImage}
              alt="Profile"
              className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-cyan-500 group-hover:border-cyan-300 transition"
            />
            <div className="absolute bottom-1 sm:bottom-2 right-1 sm:right-2 rounded-full bg-cyan-500 p-2 sm:p-3 border-2 border-slate-900 group-hover:bg-cyan-400 transition">
              <IoCameraOutline className="text-white w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <input
              type="file"
              accept="image/*"
              ref={imageRef}
              hidden
              onChange={handleImageChange}
            />
          </div>

          <div className="text-center">
            <h2 className="text-xl sm:text-2xl font-semibold">{userData?.username || "Username"}</h2>
            <div className="flex items-center justify-center gap-2 mt-1 text-slate-400 text-xs sm:text-sm">
              <FaEnvelope className="w-3 h-3 sm:w-4 sm:h-4" />
              <p>{userData?.email}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 sm:mt-8 space-y-4 sm:space-y-5">
          <div>
            <label className="flex text-slate-300 font-semibold mb-2 items-center gap-2 text-sm sm:text-base">
              <FaUser className="w-3 h-3 sm:w-4 sm:h-4 text-cyan-400" />
              Username
            </label>
            <input
              type="text"
              value={userData?.username || ""}
              readOnly
              className="w-full rounded-xl sm:rounded-2xl bg-slate-700/50 p-3 sm:p-4 text-white outline-none border border-slate-600 cursor-not-allowed text-sm sm:text-base"
            />
          </div>

          <div>
            <label className="flex text-slate-300 font-semibold mb-2 items-center gap-2 text-sm sm:text-base">
              <FaUser className="w-3 h-3 sm:w-4 sm:h-4 text-cyan-400" />
              Full Name
            </label>
            <input
              type="text"
              placeholder="Enter your display name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl sm:rounded-2xl bg-slate-800 p-3 sm:p-4 text-white outline-none placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 border border-slate-700 transition text-sm sm:text-base"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="mt-6 sm:mt-8 w-full rounded-xl sm:rounded-2xl bg-cyan-500 py-3 sm:py-4 text-sm sm:text-base font-semibold text-white transition hover:bg-cyan-600 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <FaSpinner className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
              <span className="hidden sm:inline">Saving...</span>
              <span className="sm:hidden">Saving</span>
            </>
          ) : (
            <>
              <FaFloppyDisk className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Save Changes</span>
              <span className="sm:hidden">Save</span>
            </>
          )}
        </button>

        {/* Notification Settings */}
        {notificationSupported && (
          <div className="mt-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {notificationsEnabled ? (
                  <FaBell className="w-5 h-5 text-cyan-400" />
                ) : (
                  <FaBellSlash className="w-5 h-5 text-slate-400" />
                )}
                <div>
                  <h3 className="text-sm font-semibold text-white">Push Notifications</h3>
                  <p className="text-xs text-slate-400">
                    {notificationsEnabled ? "Enabled - You'll receive message alerts" : notificationPermission === 'denied' ? "Disabled - browser permission denied. Update notification permissions in your browser settings." : "Disabled - Enable to get notified"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={async () => {
                  if (notificationsEnabled) {
                    await disableNotifications();
                    setNotificationsEnabled(false);
                    setNotificationPermission(getNotificationPermission());
                  } else {
                    const granted = await enableNotifications();
                    setNotificationsEnabled(granted);
                    setNotificationPermission(getNotificationPermission());
                  }
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  notificationsEnabled
                    ? "bg-slate-600 text-slate-300 hover:bg-slate-500"
                    : "bg-cyan-500 text-white hover:bg-cyan-600"
                }`}
              >
                {notificationsEnabled ? "Disable" : "Enable"}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}

export default Profile

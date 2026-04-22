import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import api from '../api.js'
import { setUserData } from '../redux/userSlice'
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaSpinner } from 'react-icons/fa6'

function Login() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data } = await api.post(
        '/api/auth/login',
        { email, password }
      )

      dispatch(setUserData(data))
      setEmail('')
      setPassword('')
      navigate('/home')
    } catch (err) {
      console.error('Login error:', err.response?.data || err.message)
      setError(err.response?.data?.Message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-cyan-900 flex justify-center items-center px-3 sm:px-4 py-6 sm:py-8">
      <div className="bg-slate-900/95 p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-2xl shadow-cyan-800/20 w-full max-w-md backdrop-blur-sm">
        <div className="flex flex-col items-center mb-6 sm:mb-8">
          <img
            src="/logo.png"
            alt="BlinkUpZ Logo"
            className="h-14 w-14 sm:h-16 sm:w-16 object-contain rounded-2xl sm:rounded-3xl"
          />
          <h1 className="mt-4 text-2xl sm:text-3xl font-semibold text-white">BlinkUpZ</h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-400 text-center">
            Secure sign in to your BlinkUpZ dashboard.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:gap-4">
          <div className="relative">
            <FaEnvelope className="absolute left-3 top-3.5 text-cyan-400 w-4 h-4 sm:w-5 sm:h-5" />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="p-2.5 sm:p-3 pl-10 sm:pl-11 h-11 sm:h-12 rounded-xl sm:rounded-2xl bg-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 w-full text-sm sm:text-base"
              required
            />
          </div>

          <div className="relative">
            <FaLock className="absolute left-3 top-3.5 text-cyan-400 w-4 h-4 sm:w-5 sm:h-5" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="p-2.5 sm:p-3 pl-10 sm:pl-11 h-11 sm:h-12 w-full rounded-xl sm:rounded-2xl bg-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm sm:text-base"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3.5 text-slate-400 hover:text-cyan-400 transition p-1"
            >
              {showPassword ? <FaEyeSlash className="w-4 h-4 sm:w-5 sm:h-5" /> : <FaEye className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
          </div>

          {error && (
            <p className="text-red-400 text-xs sm:text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl text-white font-semibold transition flex items-center justify-center gap-2 text-sm sm:text-base ${
              loading
                ? 'bg-slate-600 cursor-not-allowed'
                : 'bg-cyan-500 hover:bg-cyan-600 active:scale-[0.98]'
            }`}
          >
            {loading ? (
              <>
                <FaSpinner className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                <span className="hidden sm:inline">Logging in...</span>
                <span className="sm:hidden">Loading...</span>
              </>
            ) : (
              'Login'
            )}
          </button>
        </form>

        <p className="mt-5 sm:mt-6 text-center text-slate-400 text-xs sm:text-sm">
          Don’t have an account?{' '}
          <button
            type="button"
            onClick={() => navigate('/signup')}
            className="text-cyan-400 font-semibold hover:text-cyan-200"
          >
            Sign Up
          </button>
        </p>
      </div>
    </div>
  )
}

export default Login

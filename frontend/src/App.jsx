import { Routes, Route, Navigate } from "react-router-dom"
import { useSelector } from "react-redux"
import { useEffect } from "react"
import Login from "./pages/login.jsx"
import SignUp from "./pages/Signup.jsx"
import Home from "./pages/Home.jsx"
import Profile from "./pages/profile.jsx"
import NotFound from "./pages/NotFound.jsx"
import useGetCurrentUser from "./Hooks/useGetCurrentUser"

function App() {
  useGetCurrentUser()

  const { userData } = useSelector((state) => state.user)

  useEffect(() => {
    // Request notification permission
    if ('Notification' in window && 'serviceWorker' in navigator) {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          console.log('Notification permission granted');
        }
      });
    }
  }, []);

  return (
    <Routes>
      <Route path="/" element={userData ? <Navigate to="/home" /> : <Navigate to="/login" />} />
      <Route path="/login" element={!userData ? <Login /> : <Navigate to="/home" />} />
      <Route path="/signup" element={!userData ? <SignUp /> : <Navigate to="/profile" />} />
      <Route path="/home" element={userData ? <Home /> : <Navigate to="/login" />} />
      <Route path="/profile" element={userData ? <Profile /> : <Navigate to="/login" />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default App

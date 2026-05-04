import React, { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom'
import Home from './pages/Home'
import Movie from './pages/Movie'
import Profile from './pages/Profile'
import Login from './pages/Login'
import { onAuthStateChanged, signOut } from './auth/firebase'

function Navigation() {
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(setUser)
    return () => unsub()
  }, [])

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <nav>
      <div className="nav-inner">
        <Link to="/" className="nav-logo">Film Diary</Link>
        <div className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/profile">Profile</Link>
          {user ? (
            <button type="button" onClick={handleSignOut} className="btn-nav">Sign Out</button>
          ) : (
            <Link to="/login" className="btn-nav">Sign In</Link>
          )}
        </div>
      </div>
    </nav>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Navigation />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/movie/:id" element={<Movie />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </BrowserRouter>
  )
}

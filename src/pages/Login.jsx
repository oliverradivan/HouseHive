import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { login } from '../features/auth/authSlice'
import '../css/Login.css'

function Login() {
  const navigate = useNavigate()
  const dispatch = useDispatch()

  const [form, setForm] = useState({
    identifier: '',
    password: ''
  })

  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      await dispatch(login(form)).unwrap()
      navigate('/FindHouse')
    } catch (err) {
      setError(typeof err === 'string' ? err : err?.message || 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-container">

        <div className="login-icon">
          🔐
        </div>

        <h1>Welcome back</h1>
        <p className="subtitle">
          Log in to your account
        </p>

        <div className="login-card">

          {error && (
            <p className="error-msg">{error}</p>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>

            <label>Email or Username</label>

            <input
              type="text"
              name="identifier"
              placeholder="you@example.com"
              value={form.identifier}
              onChange={handleChange}
              required
            />

            <div className="password-row">
              <label>Password</label>
            </div>

            <input
              type="password"
              name="password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              required
            />

            <button
              className="login-btn"
              type="submit"
              disabled={submitting}
            >
              {submitting ? 'Signing in...' : 'Log In'}
            </button>

          </form>

        </div>

        <p className="signup-text">
          Don't have an account?
          <Link to="/register"> Create one</Link>
        </p>

      </div>
    </div>
  )
}

export default Login

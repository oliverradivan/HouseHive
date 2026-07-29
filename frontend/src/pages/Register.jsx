import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { register } from '../features/auth/authSlice'
import '../css/Login.css'

function Register() {
  const navigate = useNavigate()
  const dispatch = useDispatch()

  const [form, setForm] = useState({
    email: '',
    username: '',
    first_name: '',
    last_name: '',
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
      await dispatch(register(form)).unwrap()
      navigate('/FindHouse')
    } catch (err) {
      setError(typeof err === 'string' ? err : err?.message || 'Registration failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
  <div className="login-page register-page">
    <div className="login-container register-container">

      <div className="login-icon">
        👤
      </div>

      <h1>Create account</h1>
      <p className="subtitle">
        Join HouseHive and create your profile
      </p>

      <div className="login-card register-card">

        {error && <p className="error-msg">{error}</p>}

        <form className="auth-form" onSubmit={handleSubmit}>

          <label>Email</label>
          <input
            type="email"
            name="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={handleChange}
            maxLength={255}
            required
          />

          <label>Username</label>
          <input
            type="text"
            name="username"
            placeholder="Choose a username"
            value={form.username}
            onChange={handleChange}
            maxLength={100}
            required
          />

          <div className="name-row">

            <div>
              <label>First name</label>
              <input
                type="text"
                name="first_name"
                placeholder="First name"
                value={form.first_name}
                onChange={handleChange}
                maxLength={30}
                required
              />
            </div>

            <div>
              <label>Last name</label>
              <input
                type="text"
                name="last_name"
                placeholder="Last name"
                value={form.last_name}
                onChange={handleChange}
                maxLength={30}
                required
              />
            </div>

          </div>

          <label>Password</label>
          <input
            type="password"
            name="password"
            placeholder="••••••••"
            value={form.password}
            onChange={handleChange}
            minLength={8}
            required
          />

          <button
            className="login-btn"
            type="submit"
            disabled={submitting}
          >
            {submitting ? "Creating account..." : "Create Account"}
          </button>

        </form>

      </div>

      <p className="signup-text">
        Already have an account?
        <Link to="/login"> Log in</Link>
      </p>

    </div>
  </div>
)
}

export default Register

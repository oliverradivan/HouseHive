import { NavLink, useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { logout } from '../features/auth/authSlice'

function Navbar() {
  const navigate = useNavigate()
  const dispatch = useDispatch()

  const user = useSelector((state) => state.auth.user)

  const linkClass = ({ isActive }) =>
    isActive ? 'nav-link active' : 'nav-link'

  const handleLogout = async () => {
    await dispatch(logout())
    navigate('/login')
  }

  return (
    <nav className="navbar">
      <div className="navbar-brand">HouseHive</div>

      <div className="navbar-links">

        {user ? (
          <>
            <NavLink to="/profile" className={linkClass}>
              Profile
            </NavLink>

            <button
              type="button"
              className="nav-button"
              onClick={handleLogout}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <NavLink to="/login" className={linkClass}>
              Login
            </NavLink>

            <NavLink to="/register" className={linkClass}>
              Register
            </NavLink>
          </>
        )}

      </div>
    </nav>
  )
}

export default Navbar
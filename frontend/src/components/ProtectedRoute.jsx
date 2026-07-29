import { Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'

function ProtectedRoute({ children }) {
  const { user, loading } = useSelector(
    (state) => state.auth
  )

  if (loading) {
    return <p className="page-message">Checking authentication...</p>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default ProtectedRoute
import { Link } from 'react-router-dom'
import '../css/NotFound.css'

function NotFound() {
  return (
    <div className="page not-found">
      <h1>404</h1>
      <h2>Page Not Found</h2>
      <p>Sorry, the page you're looking for doesn't exist.</p>
      <Link to="/" className="jello-horizontal">
        🏠 Back to Login
      </Link>
    </div>
  )
}

export default NotFound

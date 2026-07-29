import { Outlet } from 'react-router-dom'

function Layout() {
  return (
    <>
      <main className="content">
        <Outlet />
      </main>
      <footer className="footer">
        <p>HouseHive by M&O</p>
      </footer>
    </>
  )
}

export default Layout

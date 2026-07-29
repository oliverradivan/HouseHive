import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux"; //for redux
import { getMe } from "./features/auth/authSlice";

import Layout from './components/Layout.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import FindHouse from './pages/FindHouse.jsx'
import Login from './pages/Login.jsx'
import NotFound from './pages/NotFound.jsx'
import Register from './pages/Register.jsx'
import JoinHouse from './pages/JoinHouse.jsx';
import CreateHouse from './pages/CreateHouse.jsx';
import House from './pages/House.jsx';
import Profile from './pages/Profile.jsx';


const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <NotFound />,
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute>
            <Navigate to="/FindHouse" replace />
          </ProtectedRoute>
        ),
      },
      { path: 'login', element: <Login /> },
      { path: 'register', element: <Register /> },
      {
        path: 'profile',
        element: (
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        ),
      },
      {
        path: 'FindHouse',
        element: (
          <ProtectedRoute>
            <FindHouse />
          </ProtectedRoute>
        ),
      },
      {
        path: 'JoinHouse',
        element: (
          <ProtectedRoute>
            <JoinHouse />
          </ProtectedRoute>
        ),
      },
            {
        path: 'CreateHouse',
        element: (
          <ProtectedRoute>
            <CreateHouse />
          </ProtectedRoute>
        ),
      },
      {
        path: 'houses/:house_Id',
        element: (
          <ProtectedRoute>
            <House />
          </ProtectedRoute>
        ),
      },
      { path: '*', element: <NotFound /> },
    ],
  },
])

function App() {
  const dispatch = useDispatch();
  
  const { loading } = useSelector((state) => state.auth);

  useEffect(() => {

    dispatch(getMe());
  }, [dispatch]);

  if (loading) {
    return (
      <div className="app-loading-screen">
        <p className="page-message">Loading HouseHive...</p>
      </div>
    );
  }

  return <RouterProvider router={router} />;
}

export default App

import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Home as HomeIcon, KeyRound, LogOut, Plus } from "lucide-react";
import { useDispatch } from "react-redux";
import { logout } from "../features/auth/authSlice.js";
import { listHouses } from "../api/houses.js";
import "../css/FindHouse.css";

export default function Home() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [houses, setHouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadHouses() {
      try {
        const result = await listHouses();
        if (active) {
          setHouses(result);
          setError("");
        }
      } catch (requestError) {
        if (active) {
          setError(requestError.message || "Could not load your houses.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadHouses();

    return () => {
      active = false;
    };
  }, []);

  const handleLogout = async () => {
    await dispatch(logout());
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="home-loading" aria-label="Loading">
        <div className="home-spinner" />
      </div>
    );
  }

  return (
    <div className="home-page">
      <nav className="home-nav">
        <div className="home-brand">
          <div className="home-brand-icon"><HomeIcon size={30} /></div>
          <span>HouseHive</span>
        </div>

        <button type="button" className="logout-button" onClick={handleLogout}>
          <LogOut size={16} /> Log out
        </button>
      </nav>

      <main className="home-content">
        <header className="home-intro">
          <h1>Welcome to your hive</h1>
          <p>Join an existing house or start a new one.</p>
        </header>

        {error && <p className="home-error">{error}</p>}

        {houses.map((house) => (
          <Link to={`/houses/${house.id}`} className="membership-link" key={house.id}>
            <section className="membership-card">
              <div className="membership-icon"><HomeIcon size={20} /></div>
              <div className="membership-copy">
                <strong>{house.name}</strong>
                <span>{house.address} · {house.rooms} room{house.rooms === 1 ? "" : "s"}</span>
              </div>
              <ArrowRight className="membership-arrow" size={20} />
            </section>
          </Link>
        ))}

        <div className="home-actions">
          <Link to="/JoinHouse" className="action-card action-card-light">
            <div className="action-icon action-icon-light"><KeyRound size={24} /></div>
            <h2>Join a house</h2>
            <p>Got a join code from a housemate? Enter it and request to join.</p>
            <span className="action-link">Find your house <ArrowRight size={14} /></span>
          </Link>

          <Link to="/CreateHouse" className="action-card action-card-dark">
            <div className="action-icon action-icon-dark"><Plus size={24} /></div>
            <h2>Create a house</h2>
            <p>Start a new group house. You&apos;ll be the admin and can accept join requests.</p>
            <span className="action-link">Get started <ArrowRight size={14} /></span>
          </Link>
        </div>
      </main>
    </div>
  );
}

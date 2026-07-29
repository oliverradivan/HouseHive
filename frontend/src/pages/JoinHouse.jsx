import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Home as HomeIcon, KeyRound, ArrowLeft, Check } from "lucide-react";
import { joinHouse as joinHouseById } from "../api/houses.js";
import "../css/JoinHouse.css";

export default function JoinHouse() {
  const [house_Id, setHouse_Id] = useState("");
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleJoin = async (e) => {
    e.preventDefault();
    const trimmedHouseId = house_Id.trim();
    if (!trimmedHouseId) return;

    setJoining(true);
    setError("");
    try {
      await joinHouseById(trimmedHouseId);
      setJoined(true);
    } catch (requestError) {
      if (requestError.status === 404) {
        setError("No house found with that ID. Double-check and try again.");
      } else {
        setError(requestError.message || "Couldn't join that house. You might need to log in first.");
      }
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="jh-page">
      {/* Nav */}
      <nav className="jh-nav">
        <Link to="/FindHouse" className="jh-brand">
          <div className="jh-brand-icon">
            <HomeIcon size={20} color="#fff" />
          </div>
          <span className="jh-brand-name">HouseHive</span>
        </Link>
        <Link to="/FindHouse" className="jh-back-link">
          <ArrowLeft size={16} />
          Back
        </Link>
      </nav>

      <div className="jh-container">
        <div className="jh-header">
          <div className="jh-header-icon">
            <KeyRound size={28} color="#fff" />
          </div>
          <h1 className="jh-title">Join a group house</h1>
          <p className="jh-subtitle">Enter the house ID your housemate shared with you.</p>
        </div>

        <form onSubmit={handleJoin} className="jh-form">
          <input
            className="jh-code-input"
            value={house_Id}
            onChange={(e) => setHouse_Id(e.target.value)}
            placeholder="House ID"
            disabled={joining || joined}
          />
          {error && <p className="jh-error">{error}</p>}
          <button
            type="submit"
            disabled={joining || !house_Id.trim() || joined}
            className="jh-button jh-button-dark"
          >
            {joining ? "Joining..." : "Join house"}
          </button>
        </form>

        {joined && (
          <div className="jh-confirm">
            <div className="jh-confirm-icon">
              <Check size={28} color="#d97706" />
            </div>
            <h2 className="jh-card-title">You've joined the house.</h2>
            <p className="jh-confirm-text">Welcome in. You can see the full house from your dashboard.</p>
            <button onClick={() => navigate("/")} className="jh-button jh-button-dark jh-button-inline">
              Back to home
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

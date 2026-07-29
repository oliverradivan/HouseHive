import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Home as HomeIcon, Mail, UserRound } from "lucide-react";
import { useSelector } from "react-redux";
import { listHouses } from "../api/houses.js";

function Profile() {
  const user = useSelector((state) => state.auth.user);
  const [houses, setHouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    try {
      const housesData = await listHouses();
      setHouses(housesData);
      setError("");
    } catch (requestError) {
      setError(requestError.message || "Could not load your houses.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);


  return (
    <div className="page dashboard-page">

      <section className="profile-header">

        <h1>
          {user?.display_name || `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() || user?.username}
        </h1>

        <p>
          @{user?.username}
        </p>

        <div className="profile-stats">

          <div>
            <strong>
              {houses.length}
            </strong>
            <span>
              Houses
            </span>
          </div>

        </div>

      </section>

      <section className="profile-section">

        <div className="section-header">
          <h2>Account</h2>
        </div>

        <div className="profile-info-grid">
          <div className="profile-info-row">
            <UserRound size={18} />
            <span>{user?.first_name} {user?.last_name}</span>
          </div>
          <div className="profile-info-row">
            <Mail size={18} />
            <span>{user?.email}</span>
          </div>
        </div>
      </section>

      <section className="profile-section">
        <div className="section-header">
          <h2>Your Houses</h2>
          <Link to="/CreateHouse" className="button button-primary">
            Create house
          </Link>
        </div>

        {error && <p className="profile-error" role="alert">{error}</p>}

        {loading ? (
          <p>
            Loading houses...
          </p>
        ) : houses.length === 0 ? (
          <p>
            You have not joined any houses yet.
          </p>
        ) : (
          <div className="profile-house-grid">
            {houses.map((house) => (
              <Link key={house.id} to={`/houses/${house.id}`} className="profile-house-card">
                <HomeIcon size={20} />
                <div>
                  <strong>{house.name}</strong>
                  <span>{house.address} · {house.rooms} room{house.rooms === 1 ? "" : "s"}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}


export default Profile;

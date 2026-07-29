import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { ArrowLeft, CalendarClock, Check, ChevronDown, Copy, Home as HomeIcon, MapPin, Users } from "lucide-react";
import { getHouse, listHouseMembers } from "../api/houses.js";
import {
  listHouseChores,
  createChore,
  updateChore,
  deleteChore,
  listChoreCompletions,
  createChoreCompletion,
} from "../api/chores.js";
import { createEvent, listHouseEvents } from "../api/events.js";
import HouseExpenses from "../components/HouseExpenses.jsx";
import "../css/House.css";

function toEventFormDate(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function toEventFormTime(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function parseEventFormDateTime(dateValue, timeValue) {
  const dateMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dateValue.trim());
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(timeValue.trim());

  if (!dateMatch || !timeMatch) {
    return null;
  }

  const [, day, month, year] = dateMatch;
  const [, hour, minute] = timeMatch;
  const parsedDate = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute)
  );

  if (
    parsedDate.getFullYear() !== Number(year)
    || parsedDate.getMonth() !== Number(month) - 1
    || parsedDate.getDate() !== Number(day)
    || parsedDate.getHours() !== Number(hour)
    || parsedDate.getMinutes() !== Number(minute)
  ) {
    return null;
  }

  return parsedDate;
}

function formatEventTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function getEventTime(value) {
  return new Date(value).getTime();
}

export default function House() {
  const { house_Id } = useParams();
  const currentUser = useSelector((state) => state.auth.user);
  const [house, setHouse] = useState(null);
  const [members, setMembers] = useState([]);
  const [chores, setChores] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState("");
  const [eventForm, setEventForm] = useState({
    name: "",
    description: "",
    starts_date: toEventFormDate(),
    starts_time: toEventFormTime(),
    finishes_date: toEventFormDate(new Date(Date.now() + 60 * 60 * 1000)),
    finishes_time: toEventFormTime(new Date(Date.now() + 60 * 60 * 1000)),
  });
  const [showEventForm, setShowEventForm] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [choresLoading, setChoresLoading] = useState(true);
  const [choresError, setChoresError] = useState("");
  const [choreForm, setChoreForm] = useState({ name: "", description: "" });
  const [showChoreForm, setShowChoreForm] = useState(false);
  const [editingChoreId, setEditingChoreId] = useState(null);
  const [savingChore, setSavingChore] = useState(false);
  const [completingChoreId, setCompletingChoreId] = useState(null);
  const [copiedHouseId, setCopiedHouseId] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadHouse() {
      try {
        const [houseResult, membersResult] = await Promise.all([
          getHouse(house_Id),
          listHouseMembers(house_Id),
        ]);
        if (active) {
          setHouse(houseResult);
          setMembers(membersResult);
          setError("");
        }
      } catch (requestError) {
        if (active) {
          setError(requestError.message || "Could not load this house.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadHouse();

    return () => {
      active = false;
    };
  }, [house_Id]);

  useEffect(() => {
    let active = true;

    async function loadEvents() {
      setEventsLoading(true);
      try {
        const result = await listHouseEvents(house_Id);
        if (active) {
          setEvents(result);
          setEventsError("");
        }
      } catch (requestError) {
        if (active) {
          setEventsError(requestError.message || "Could not load events.");
        }
      } finally {
        if (active) {
          setEventsLoading(false);
        }
      }
    }

    loadEvents();

    return () => {
      active = false;
    };
  }, [house_Id]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setEvents((current) => (
      current.filter((event) => getEventTime(event.finishes_at) > now)
    ));
  }, [now]);

  useEffect(() => {
    let active = true;

    async function loadChores() {
      setChoresLoading(true);
      try {
        const result = await listHouseChores(house_Id);
        const completionGroups = await Promise.all(
          result.map((chore) => listChoreCompletions(chore.id))
        );
        if (active) {
          setChores(result);
          setCompletions(completionGroups.flat());
          setChoresError("");
        }
      } catch (requestError) {
        if (active) {
          setChoresError(requestError.message || "Could not load chores.");
        }
      } finally {
        if (active) {
          setChoresLoading(false);
        }
      }
    }

    loadChores();

    return () => {
      active = false;
    };
  }, [house_Id]);

  const handleEventFieldChange = (event) => {
    const { name, value } = event.target;
    setEventForm((current) => ({ ...current, [name]: value }));
  };

  const resetEventForm = () => {
    const defaultFinishTime = new Date(Date.now() + 60 * 60 * 1000);
    setEventForm({
      name: "",
      description: "",
      starts_date: toEventFormDate(),
      starts_time: toEventFormTime(),
      finishes_date: toEventFormDate(defaultFinishTime),
      finishes_time: toEventFormTime(defaultFinishTime),
    });
  };

  const handleEventSubmit = async (event) => {
    event.preventDefault();
    setSavingEvent(true);
    setEventsError("");

    const startsAt = parseEventFormDateTime(eventForm.starts_date, eventForm.starts_time);
    const finishesAt = parseEventFormDateTime(eventForm.finishes_date, eventForm.finishes_time);
    const name = eventForm.name.trim();
    const description = eventForm.description.trim();

    if (!name || !description) {
      setEventsError("Enter an event name and description.");
      setSavingEvent(false);
      return;
    }

    if (!startsAt || !finishesAt) {
      setEventsError("Use DD/MM/YYYY dates and HH:mm times.");
      setSavingEvent(false);
      return;
    }

    if (finishesAt <= startsAt) {
      setEventsError("Finish time must be after start time.");
      setSavingEvent(false);
      return;
    }

    if (finishesAt <= new Date()) {
      setEventsError("Finish time must be in the future.");
      setSavingEvent(false);
      return;
    }

    const payload = {
      name,
      description,
      house_id: house_Id,
      starts_at: startsAt.toISOString(),
      finishes_at: finishesAt.toISOString(),
    };

    try {
      const result = await createEvent(payload);
      setEvents((current) => [...current, result].sort(
        (first, second) => new Date(first.starts_at) - new Date(second.starts_at)
      ));
      resetEventForm();
      setShowEventForm(false);
    } catch (requestError) {
      setEventsError(requestError.message || "Unable to save event.");
    } finally {
      setSavingEvent(false);
    }
  };

  const resetChoreForm = () => {
    setChoreForm({ name: "", description: "" });
    setEditingChoreId(null);
  };

  const handleChoreFieldChange = (event) => {
    const { name, value } = event.target;
    setChoreForm((current) => ({ ...current, [name]: value }));
  };

  const handleChoreSubmit = async (event) => {
    event.preventDefault();
    setSavingChore(true);

    const payload = {
      name: choreForm.name.trim(),
      description: choreForm.description.trim(),
      house_id: house_Id,
    };

    if (!payload.name || !payload.description) {
      setChoresError("Enter a chore name and description.");
      setSavingChore(false);
      return;
    }

    try {
      const result = editingChoreId
        ? await updateChore(editingChoreId, {
            name: payload.name,
            description: payload.description,
          })
        : await createChore(payload);

      setChores((current) => {
        if (editingChoreId) {
          return current.map((item) => (item.id === result.id ? result : item));
        }
        return [result, ...current];
      });
      resetChoreForm();
      setShowChoreForm(false);
      setChoresError("");
    } catch (requestError) {
      setChoresError(requestError.message || "Unable to save chore.");
    } finally {
      setSavingChore(false);
    }
  };

  const handleEditChore = (chore) => {
    setEditingChoreId(chore.id);
    setChoreForm({ name: chore.name, description: chore.description });
    setShowChoreForm(true);
    setChoresError("");
  };

  const handleDeleteChore = async (choreId) => {
    if (!window.confirm("Delete this chore?")) {
      return;
    }

    try {
      await deleteChore(choreId);
      setChores((current) => current.filter((item) => item.id !== choreId));
      setCompletions((current) => current.filter((item) => item.chore_id !== choreId));
    } catch (requestError) {
      setChoresError(requestError.message || "Unable to delete chore.");
    }
  };

  const handleCompleteChore = async (choreId) => {
    setCompletingChoreId(choreId);
    setChoresError("");

    try {
      const completion = await createChoreCompletion(choreId);
      setCompletions((current) => [completion, ...current]);
      if (editingChoreId === choreId) {
        resetChoreForm();
      }
    } catch (requestError) {
      setChoresError(requestError.message || "Unable to complete chore.");
    } finally {
      setCompletingChoreId(null);
    }
  };

  const handleCopyHouseId = async () => {
    try {
      await navigator.clipboard.writeText(house.id);
      setCopiedHouseId(true);
      window.setTimeout(() => setCopiedHouseId(false), 1600);
    } catch {
      setError("Could not copy house ID.");
    }
  };

  const completedChoreIds = new Set(completions.map((completion) => completion.chore_id));
  const activeChores = chores.filter((chore) => !completedChoreIds.has(chore.id));
  const completedChores = completions.map((completion) => ({
    ...completion,
    chore: chores.find((chore) => chore.id === completion.chore_id),
  }));
  const visibleEvents = useMemo(() => (
    events.filter((event) => getEventTime(event.finishes_at) > now)
  ), [events, now]);
  const happeningNowEvents = visibleEvents.filter((event) => getEventTime(event.starts_at) <= now);
  const upcomingEvents = visibleEvents.filter((event) => getEventTime(event.starts_at) > now);

  if (loading) {
    return (
      <div className="house-loading" aria-label="Loading house">
        <div className="house-spinner" />
      </div>
    );
  }

  return (
    <div className="house-page">
      <nav className="house-nav">
        <Link to="/FindHouse" className="house-back-link">
          <ArrowLeft size={16} />
          Back to dashboard
        </Link>
        {currentUser && (
          <div className="house-user">
            <strong>@{currentUser.username}</strong>
            <span aria-hidden="true">·</span>
            <span>{currentUser.email}</span>
          </div>
        )}
      </nav>

      <main className="house-container">
        {error ? (
          <section className="house-panel">
            <div className="house-icon house-icon-error">
              <HomeIcon size={28} />
            </div>
            <h1>House unavailable</h1>
            <p>{error}</p>
          </section>
        ) : (
          <div className="house-layout">
            <aside className="house-sidebar">
              <section className="house-panel house-summary-panel">
                <div className="house-icon">
                  <HomeIcon size={28} />
                </div>
                <h1>{house.name}</h1>
                <div className="house-details">
                  <p>
                    <MapPin size={18} />
                    {house.address}
                  </p>
                  <p>
                    <Users size={18} />
                    {house.rooms} room{house.rooms === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="house-id-field">
                  <button type="button" onClick={handleCopyHouseId} aria-label="Copy house ID">
                    <Copy size={15} />
                    {copiedHouseId ? "Copied house ID" : "Copy house ID"}
                  </button>
                </div>
              </section>

              <section className="house-panel house-members-panel">
                <div className="house-section-header">
                  <h2>Members</h2>
                  <span>{members.length}</span>
                </div>

                {members.length === 0 ? (
                  <p className="house-empty">No members found.</p>
                ) : (
                  <ul className="member-list">
                    {members.map((member) => (
                      <li className="member-row" key={member.user.id}>
                        <div className="member-avatar" aria-hidden="true">
                          {(member.user.first_name?.[0] || member.user.username?.[0] || "?").toUpperCase()}
                        </div>
                        <div className="member-copy">
                          <strong>
                            {member.user.first_name} {member.user.last_name}
                          </strong>
                          <span className="member-username">@{member.user.username}</span>
                          <span className="member-email">{member.user.email}</span>
                        </div>
                        <span className="member-role">{member.role}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </aside>

            <div className="house-main-column">
              <section className="house-panel house-events-panel">
                <div className="house-section-header">
                  <div>
                    <h2>Events</h2>
                    <p className="house-section-subtitle">Share quiet hours, guests, plans, and anything time-sensitive.</p>
                  </div>
                  <span>{visibleEvents.length}</span>
                </div>

                <button
                  type="button"
                  className={`form-dropdown-toggle ${showEventForm ? "is-open" : ""}`}
                  onClick={() => setShowEventForm((current) => !current)}
                  aria-expanded={showEventForm}
                  aria-controls="event-form"
                >
                  <span>
                    <CalendarClock size={15} />
                    Add event
                  </span>
                  <ChevronDown className="form-dropdown-icon" size={17} />
                </button>

                {!showEventForm && eventsError && <p className="house-error form-dropdown-error" role="alert">{eventsError}</p>}

                {showEventForm && (
                  <form id="event-form" className="event-form" onSubmit={handleEventSubmit}>
                    <div className="event-field">
                      <label htmlFor="event-name">Event</label>
                      <input
                        id="event-name"
                        name="name"
                        value={eventForm.name}
                        onChange={handleEventFieldChange}
                        placeholder="e.g. Studying for exam"
                        maxLength={100}
                        disabled={savingEvent}
                        required
                      />
                    </div>

                    <div className="event-field">
                      <label htmlFor="event-starts-date">Start date</label>
                      <input
                        id="event-starts-date"
                        name="starts_date"
                        value={eventForm.starts_date}
                        onChange={handleEventFieldChange}
                        inputMode="numeric"
                        placeholder="DD/MM/YYYY"
                        disabled={savingEvent}
                        required
                      />
                    </div>

                    <div className="event-field">
                      <label htmlFor="event-starts-time">Start time</label>
                      <input
                        id="event-starts-time"
                        name="starts_time"
                        value={eventForm.starts_time}
                        onChange={handleEventFieldChange}
                        inputMode="numeric"
                        placeholder="HH:mm"
                        disabled={savingEvent}
                        required
                      />
                    </div>

                    <div className="event-field">
                      <label htmlFor="event-finishes-date">Finish date</label>
                      <input
                        id="event-finishes-date"
                        name="finishes_date"
                        value={eventForm.finishes_date}
                        onChange={handleEventFieldChange}
                        inputMode="numeric"
                        placeholder="DD/MM/YYYY"
                        disabled={savingEvent}
                        required
                      />
                    </div>

                    <div className="event-field">
                      <label htmlFor="event-finishes-time">Finish time</label>
                      <input
                        id="event-finishes-time"
                        name="finishes_time"
                        value={eventForm.finishes_time}
                        onChange={handleEventFieldChange}
                        inputMode="numeric"
                        placeholder="HH:mm"
                        disabled={savingEvent}
                        required
                      />
                    </div>

                    <div className="event-field event-description-field">
                      <label htmlFor="event-description">Description</label>
                      <input
                        id="event-description"
                        name="description"
                        value={eventForm.description}
                        onChange={handleEventFieldChange}
                        placeholder="e.g. No loud sounds!"
                        disabled={savingEvent}
                        required
                      />
                    </div>

                    {eventsError && <p className="house-error event-error" role="alert">{eventsError}</p>}

                    <button type="submit" className="house-button" disabled={savingEvent}>
                      <CalendarClock size={15} />
                      {savingEvent ? "Adding..." : "Add event"}
                    </button>
                  </form>
                )}

                <div className="event-grid">
                  <section className="event-subsection event-now-section">
                    <div className="event-subsection-header">
                      <h3>Happening Now</h3>
                      <span>{happeningNowEvents.length}</span>
                    </div>

                    {eventsLoading ? (
                      <p className="house-empty">Loading events...</p>
                    ) : happeningNowEvents.length === 0 ? (
                      <p className="house-empty">Nothing happening now.</p>
                    ) : (
                      <ul className="event-list">
                        {happeningNowEvents.map((event) => (
                          <li key={event.id} className="event-row event-row-active">
                            <div className="event-row-icon">
                              <CalendarClock size={16} />
                            </div>
                            <div className="event-copy">
                              <strong>{event.name}</strong>
                              <p>{event.description}</p>
                              <span>
                                Ends {formatEventTime(event.finishes_at)} · @{event.creator_username}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  <section className="event-subsection">
                    <div className="event-subsection-header">
                      <h3>Upcoming</h3>
                      <span>{upcomingEvents.length}</span>
                    </div>

                    {eventsLoading ? (
                      <p className="house-empty">Loading events...</p>
                    ) : upcomingEvents.length === 0 ? (
                      <p className="house-empty">No upcoming events.</p>
                    ) : (
                      <ul className="event-list">
                        {upcomingEvents.map((event) => (
                          <li key={event.id} className="event-row">
                            <div className="event-row-icon">
                              <CalendarClock size={16} />
                            </div>
                            <div className="event-copy">
                              <strong>{event.name}</strong>
                              <p>{event.description}</p>
                              <span>
                                Starts {formatEventTime(event.starts_at)} · Ends {formatEventTime(event.finishes_at)} · @{event.creator_username}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </div>
              </section>

              <section className="house-panel house-chores-panel">
                <div className="house-chores">
                  <div className="house-section-header">
                    <div>
                      <h2>Chores</h2>
                      <p className="house-section-subtitle">Create and complete active house tasks.</p>
                    </div>
                    <span>{activeChores.length}</span>
                  </div>

                  <button
                    type="button"
                    className={`form-dropdown-toggle ${showChoreForm ? "is-open" : ""}`}
                    onClick={() => setShowChoreForm((current) => !current)}
                    aria-expanded={showChoreForm}
                    aria-controls="chore-form"
                  >
                    <span>
                      <Check size={15} />
                      {editingChoreId ? "Edit chore" : "Add chore"}
                    </span>
                    <ChevronDown className="form-dropdown-icon" size={17} />
                  </button>

                  {!showChoreForm && choresError && <p className="house-error form-dropdown-error" role="alert">{choresError}</p>}

                  {showChoreForm && (
                    <form id="chore-form" className="chore-form" onSubmit={handleChoreSubmit}>
                      <div className="chore-field">
                        <label htmlFor="chore-name">Chore name</label>
                        <input
                          id="chore-name"
                          name="name"
                          value={choreForm.name}
                          onChange={handleChoreFieldChange}
                          placeholder="e.g. Take out trash"
                          disabled={savingChore}
                          required
                        />
                      </div>

                      <div className="chore-field">
                        <label htmlFor="chore-description">Description</label>
                        <textarea
                          id="chore-description"
                          name="description"
                          value={choreForm.description}
                          onChange={handleChoreFieldChange}
                          placeholder="e.g. Empty the kitchen bin"
                          disabled={savingChore}
                          required
                        />
                      </div>

                      {choresError && <p className="house-error" role="alert">{choresError}</p>}
                      <div className="chore-actions">
                        <button type="submit" className="house-button" disabled={savingChore}>
                          {editingChoreId ? (savingChore ? "Saving..." : "Update") : (savingChore ? "Adding..." : "Add")}
                        </button>
                        {editingChoreId && (
                          <button
                            type="button"
                            className="house-button house-button-muted"
                            onClick={() => {
                              resetChoreForm();
                              setShowChoreForm(false);
                            }}
                            disabled={savingChore}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </form>
                  )}

                  {choresLoading ? (
                    <p className="house-empty">Loading chores...</p>
                  ) : activeChores.length === 0 ? (
                    <p className="house-empty">No active chores.</p>
                  ) : (
                    <ul className="chore-list">
                      {activeChores.map((chore) => {
                        const isCompleting = completingChoreId === chore.id;

                        return (
                          <li key={chore.id} className="chore-row">
                            <div>
                              <strong>{chore.name}</strong>
                              <p>{chore.description}</p>
                              <span className="chore-meta">Created by {chore.creator_username}</span>
                            </div>
                            <div className="chore-row-actions">
                              <button
                                type="button"
                                className="house-button house-button-complete"
                                onClick={() => handleCompleteChore(chore.id)}
                                disabled={isCompleting}
                              >
                                <Check size={15} />
                                {isCompleting ? "Completing..." : "Complete"}
                              </button>
                              <button type="button" className="house-button house-button-inline" onClick={() => handleEditChore(chore)}>
                                Edit
                              </button>
                              <button type="button" className="house-button house-button-delete" onClick={() => handleDeleteChore(chore.id)}>
                                Delete
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                <div className="completed-chores">
                  <div className="house-section-header">
                    <h2>Completed Chores</h2>
                    <span>{completedChores.length}</span>
                  </div>

                  {choresLoading ? (
                    <p className="house-empty">Loading completed chores...</p>
                  ) : completedChores.length === 0 ? (
                    <p className="house-empty">No completed chores yet.</p>
                  ) : (
                    <ul className="completed-list">
                      {completedChores.map((completion) => (
                        <li key={completion.id} className="completed-row">
                          <div className="completed-icon">
                            <Check size={16} />
                          </div>
                          <div>
                            <strong>{completion.chore?.name || "Deleted chore"}</strong>
                            <span>Completed by {completion.completed_by_username}</span>
                            {completion.chore?.description && <p>{completion.chore.description}</p>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>

              <HouseExpenses houseId={house_Id} members={members} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

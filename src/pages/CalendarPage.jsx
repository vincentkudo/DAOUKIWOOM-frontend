import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { api } from "../api/client";

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export default function CalendarPage() {
  const { token } = useAuth();
  const [anchor, setAnchor] = useState(() => startOfWeek(new Date()));
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);

  const from = anchor;
  const to = addDays(anchor, 5);

  useEffect(() => {
    api("/api/v1/rooms", { token }).then(setRooms).catch(() => setRooms([]));
  }, [token]);

  useEffect(() => {
    api(`/api/v1/calendar?from=${from.toISOString()}&to=${to.toISOString()}`, { token })
      .then(setBookings)
      .catch(() => setBookings([]));
  }, [token, from, to]);

  const days = useMemo(() => [0, 1, 2, 3, 4].map((n) => addDays(anchor, n)), [anchor]);
  const confirmed = bookings.filter((b) => b.status === "CONFIRMED");

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Lịch phòng</p>
          <h1>Ai đang giữ phòng tuần này</h1>
        </div>
        <div className="row">
          <button className="btn ghost" type="button" onClick={() => setAnchor(addDays(anchor, -7))}>Tuần trước</button>
          <button className="btn ghost" type="button" onClick={() => setAnchor(startOfWeek(new Date()))}>Tuần này</button>
          <button className="btn ghost" type="button" onClick={() => setAnchor(addDays(anchor, 7))}>Tuần sau</button>
        </div>
      </header>

      <div className="calendar card">
        <div className="cal-head">
          <span>Phòng</span>
          {days.map((d) => (
            <span key={d.toISOString()}>
              {d.toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" })}
            </span>
          ))}
        </div>
        {rooms.filter((r) => r.status === "ACTIVE").map((room) => (
          <div className="cal-row" key={room.id}>
            <div className="cal-room">
              <strong>{room.name}</strong>
              <small>{room.capacity} chỗ</small>
            </div>
            {days.map((d) => {
              const dayBookings = confirmed.filter((b) => {
                const start = new Date(b.startAt);
                return b.room.id === room.id && start.toDateString() === d.toDateString();
              });
              return (
                <div className="cal-cell" key={d.toISOString()}>
                  {dayBookings.map((b) => (
                    <div className="cal-event" key={b.id} title={b.title}>
                      <b>{new Date(b.startAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</b>
                      <span>{b.title}</span>
                      <small>{b.attendeeCount} người</small>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

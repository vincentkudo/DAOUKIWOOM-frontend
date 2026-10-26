import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { api } from "../api/client";
import { addDays, dateKey, endOfDay, formatTime, startOfWeek } from "../lib/datetime";

const WEEKDAYS = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6"];

export default function CalendarPage() {
  const { token } = useAuth();
  const [anchor, setAnchor] = useState(() => startOfWeek(new Date()));
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);

  const days = useMemo(() => [0, 1, 2, 3, 4].map((n) => addDays(anchor, n)), [anchor]);
  const from = days[0];
  const to = endOfDay(days[4]);
  const rangeLabel = `${days[0].toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })} – ${days[4].toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}`;

  useEffect(() => {
    api("/api/v1/rooms", { token }).then(setRooms).catch(() => setRooms([]));
  }, [token]);

  useEffect(() => {
    api(`/api/v1/calendar?from=${from.toISOString()}&to=${to.toISOString()}`, { token })
      .then(setBookings)
      .catch(() => setBookings([]));
  }, [token, from, to]);

  const confirmed = bookings.filter((b) => b.status === "CONFIRMED");
  const todayKey = dateKey(new Date());

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Lịch phòng</p>
          <h1>Ai đang giữ phòng tuần này</h1>
          <p className="muted">Tuần {rangeLabel} · Thứ 2 đến Thứ 6</p>
        </div>
        <div className="row">
          <button className="btn ghost" type="button" onClick={() => setAnchor(addDays(anchor, -7))}>
            Tuần trước
          </button>
          <button className="btn ghost" type="button" onClick={() => setAnchor(startOfWeek(new Date()))}>
            Tuần này
          </button>
          <button className="btn ghost" type="button" onClick={() => setAnchor(addDays(anchor, 7))}>
            Tuần sau
          </button>
        </div>
      </header>

      <div className="calendar-wrap card">
        <div className="calendar">
          <div className="cal-head">
            <span className="cal-room">Phòng</span>
            {days.map((d, index) => (
              <span key={d.toISOString()} className={dateKey(d) === todayKey ? "is-today" : undefined}>
                <em>{WEEKDAYS[index]}</em>
                <small>
                  {d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
                </small>
              </span>
            ))}
          </div>
          {rooms
            .filter((r) => r.status === "ACTIVE")
            .map((room) => (
              <div className="cal-row" key={room.id}>
                <div className="cal-room">
                  <strong>{room.name}</strong>
                  <small>{room.capacity} chỗ</small>
                </div>
                {days.map((d) => {
                  const key = dateKey(d);
                  const dayBookings = confirmed.filter((b) => b.room.id === room.id && dateKey(b.startAt) === key);
                  return (
                    <div className={`cal-cell ${key === todayKey ? "is-today" : ""}`} key={d.toISOString()}>
                      {dayBookings.map((b) => (
                        <div className="cal-event" key={b.id} title={b.title}>
                          <b>{formatTime(b.startAt)}</b>
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
    </div>
  );
}

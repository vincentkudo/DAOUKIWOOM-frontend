import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { api } from "../api/client";
import { formatDateTime } from "../lib/datetime";

export default function DashboardPage() {
  const { token, user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [mine, setMine] = useState([]);

  useEffect(() => {
    api("/api/v1/rooms", { token }).then(setRooms).catch(() => setRooms([]));
    api("/api/v1/bookings/mine", { token }).then(setMine).catch(() => setMine([]));
  }, [token]);

  const activeRooms = rooms.filter((r) => r.status === "ACTIVE");
  const upcoming = mine.filter((b) => b.status === "CONFIRMED" && new Date(b.endAt) > new Date());

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Xin chào, {user.fullName}</p>
          <h1>Tổng quan đặt phòng</h1>
          <p className="muted">
            {activeRooms.length} phòng đang dùng, sức chứa từ{" "}
            {activeRooms.length ? Math.min(...activeRooms.map((r) => r.capacity)) : "—"} đến{" "}
            {activeRooms.length ? Math.max(...activeRooms.map((r) => r.capacity)) : "—"} người.
          </p>
        </div>
        <Link className="btn primary" to="/find">Tìm phòng</Link>
      </header>

      <section className="stats">
        <article className="card stat">
          <small>Phòng đang dùng</small>
          <strong>{activeRooms.length}</strong>
        </article>
        <article className="card stat">
          <small>Sức chứa nhỏ nhất / lớn nhất</small>
          <strong>
            {activeRooms.length ? Math.min(...activeRooms.map((r) => r.capacity)) : "—"}
            <span> / </span>
            {activeRooms.length ? Math.max(...activeRooms.map((r) => r.capacity)) : "—"}
          </strong>
        </article>
        <article className="card stat">
          <small>Lịch sắp tới của bạn</small>
          <strong>{upcoming.length}</strong>
        </article>
      </section>

      <section className="split">
        <div className="card">
          <h2>Dải phòng theo sức chứa</h2>
          <ul className="capacity-list">
            {activeRooms.map((room) => (
              <li key={room.id}>
                <span>{room.name}</span>
                <b>{room.capacity} người</b>
              </li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h2>Lịch gần nhất</h2>
          {upcoming.length === 0 ? (
            <p className="muted">Chưa có lịch. Hãy tìm phòng theo số người rồi đặt.</p>
          ) : (
            <ul className="plain-list">
              {upcoming.slice(0, 5).map((b) => (
                <li key={b.id}>
                  <strong>{b.title}</strong>
                  <small>
                    {b.room.name} · {b.attendeeCount}/{b.room.capacity} người ·{" "}
                    {formatDateTime(b.startAt)}
                  </small>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { api } from "../api/client";

export default function BookingsPage() {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  async function load() {
    const data = await api("/api/v1/bookings/mine", { token });
    setItems(data);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [token]);

  async function cancel(id) {
    if (!window.confirm("Hủy lịch đặt này?")) {
      return;
    }
    try {
      await api(`/api/v1/bookings/${id}/cancel`, { method: "POST", token, body: { reason: "Hủy từ ứng dụng" } });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Cá nhân</p>
          <h1>Lịch đặt của tôi</h1>
        </div>
      </header>
      {error ? <p className="error">{error}</p> : null}
      <div className="stack">
        {items.length === 0 ? <p className="muted">Bạn chưa có lịch đặt.</p> : null}
        {items.map((b) => (
          <article className="card booking-row" key={b.id}>
            <div>
              <strong>{b.title}</strong>
              <small>
                {b.room.name} · {b.attendeeCount}/{b.room.capacity} người ·{" "}
                {new Date(b.startAt).toLocaleString("vi-VN")} – {new Date(b.endAt).toLocaleTimeString("vi-VN")}
              </small>
            </div>
            <div className="row">
              <span className={`fit ${b.status === "CONFIRMED" ? "tight" : "spacious"}`}>{b.status}</span>
              {b.status === "CONFIRMED" && new Date(b.startAt) > new Date() ? (
                <button type="button" className="btn ghost" onClick={() => cancel(b.id)}>Hủy</button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

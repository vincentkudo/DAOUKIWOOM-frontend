import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { amenityLabel, api } from "../api/client";

const EMPTY = {
  code: "",
  name: "",
  floor: 7,
  location: "",
  capacity: 6,
  description: "",
  status: "ACTIVE",
  amenities: ["TV"],
};

const AMENITIES = Object.keys(amenityLabel);

export default function RoomsPage() {
  const { token } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");

  async function load() {
    setRooms(await api("/api/v1/rooms", { token }));
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [token]);

  function toggleAmenity(value) {
    setForm((current) => {
      const has = current.amenities.includes(value);
      return {
        ...current,
        amenities: has ? current.amenities.filter((a) => a !== value) : [...current.amenities, value],
      };
    });
  }

  async function save(event) {
    event.preventDefault();
    setError("");
    try {
      if (editingId) {
        await api(`/api/v1/rooms/${editingId}`, { method: "PUT", token, body: form });
      } else {
        await api("/api/v1/rooms", { method: "POST", token, body: form });
      }
      setForm(EMPTY);
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Quản trị</p>
          <h1>Quản lý phòng họp</h1>
        </div>
      </header>
      {error ? <p className="error">{error}</p> : null}

      <div className="split">
        <form className="card" onSubmit={save}>
          <h2>{editingId ? "Sửa phòng" : "Thêm phòng"}</h2>
          <label>Mã<input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required /></label>
          <label>Tên<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
          <label>Tầng<input type="number" min="1" value={form.floor} onChange={(e) => setForm({ ...form, floor: Number(e.target.value) })} /></label>
          <label>Vị trí<input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} required /></label>
          <label>Sức chứa (số người)<input type="number" min="1" max="200" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} required /></label>
          <label>Mô tả<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
          <label>
            Trạng thái
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="ACTIVE">Đang dùng</option>
              <option value="INACTIVE">Ngưng</option>
            </select>
          </label>
          <div className="chips clickable">
            {AMENITIES.map((a) => (
              <button type="button" key={a} className={form.amenities.includes(a) ? "on" : ""} onClick={() => toggleAmenity(a)}>
                {amenityLabel[a]}
              </button>
            ))}
          </div>
          <div className="row">
            {editingId ? (
              <button type="button" className="btn ghost" onClick={() => { setEditingId(null); setForm(EMPTY); }}>
                Hủy sửa
              </button>
            ) : null}
            <button className="btn primary" type="submit">{editingId ? "Lưu" : "Tạo phòng"}</button>
          </div>
        </form>

        <div className="stack">
          {rooms.map((room) => (
            <article className="card booking-row" key={room.id}>
              <div>
                <strong>{room.name} · {room.capacity} người</strong>
                <small>{room.code} · Tầng {room.floor} · {room.status}</small>
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setEditingId(room.id);
                  setForm({
                    code: room.code,
                    name: room.name,
                    floor: room.floor,
                    location: room.location,
                    capacity: room.capacity,
                    description: room.description || "",
                    status: room.status,
                    amenities: room.amenities || [],
                  });
                }}
              >
                Sửa
              </button>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

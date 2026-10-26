import { useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { amenityLabel, api } from "../api/client";
import Select from "../components/Select";
import Pager from "../components/Pager";

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Đang dùng" },
  { value: "INACTIVE", label: "Ngưng" },
];

const STATUS_LABEL = Object.fromEntries(STATUS_OPTIONS.map((item) => [item.value, item.label]));

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
const MIN_PAGE = 5;
const MAX_PAGE = 50;
const FALLBACK_ROW = 56;
const FALLBACK_HEAD = 48;

function rowsThatFit(wrap) {
  if (!wrap) {
    return 8;
  }
  const head = wrap.querySelector("thead");
  const row = wrap.querySelector("tbody tr");
  const headH = head?.getBoundingClientRect().height || FALLBACK_HEAD;
  const rowH = row?.getBoundingClientRect().height || FALLBACK_ROW;
  return Math.max(MIN_PAGE, Math.min(MAX_PAGE, Math.floor((wrap.clientHeight - headH) / rowH)));
}

export default function RoomsPage() {
  const { token } = useAuth();
  const wrapRef = useRef(null);
  const sizeRef = useRef(0);
  const [rooms, setRooms] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [mode, setMode] = useState("create");
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");

  async function load(nextPage, size) {
    const data = await api(`/api/v1/rooms?page=${nextPage}&size=${size}`, { token });
    const next = data.page ?? nextPage;
    if ((data.items?.length ?? 0) === 0 && next > 0) {
      await load(next - 1, size);
      setPage(next - 1);
      return;
    }
    setRooms(data.items || []);
    setPage(next);
    setTotalPages(data.totalPages || 1);
    setTotalItems(data.totalItems || 0);
  }

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) {
      return undefined;
    }
    function apply() {
      const next = rowsThatFit(wrap);
      if (next === sizeRef.current) {
        return;
      }
      sizeRef.current = next;
      setPage(0);
      setPageSize(next);
    }
    const observer = new ResizeObserver(apply);
    observer.observe(wrap);
    apply();
    return () => observer.disconnect();
  }, [rooms.length, error, notice]);

  useEffect(() => {
    if (!pageSize) {
      return;
    }
    load(page, pageSize).catch((err) => setError(err.message));
  }, [token, page, pageSize]);

  function toggleAmenity(value) {
    setForm((current) => {
      const has = current.amenities.includes(value);
      return {
        ...current,
        amenities: has ? current.amenities.filter((a) => a !== value) : [...current.amenities, value],
      };
    });
  }

  function fillRoom(room) {
    return {
      code: room.code,
      name: room.name,
      floor: room.floor,
      location: room.location,
      capacity: room.capacity,
      description: room.description || "",
      status: room.status,
      amenities: room.amenities || [],
    };
  }

  function openCreate() {
    setMode("create");
    setEditingId(null);
    setForm(EMPTY);
    setFormError("");
    setError("");
    setNotice("");
    setOpen(true);
  }

  function openView(room) {
    setMode("view");
    setEditingId(room.id);
    setForm(fillRoom(room));
    setFormError("");
    setError("");
    setNotice("");
    setOpen(true);
  }

  function openEdit(room) {
    if (room.locked) {
      return;
    }
    setMode("edit");
    setEditingId(room.id);
    setForm(fillRoom(room));
    setFormError("");
    setError("");
    setNotice("");
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
    setMode("create");
    setEditingId(null);
    setForm(EMPTY);
    setFormError("");
  }

  async function save(event) {
    event.preventDefault();
    setFormError("");
    try {
      if (editingId) {
        await api(`/api/v1/rooms/${editingId}`, { method: "PUT", token, body: form });
        setNotice("Đã lưu phòng.");
      } else {
        await api("/api/v1/rooms", { method: "POST", token, body: form });
        setNotice("Đã tạo phòng.");
      }
      closeModal();
      await load(page, pageSize || sizeRef.current);
    } catch (err) {
      setFormError(err.message);
    }
  }

  async function remove(room) {
    if (room.locked) {
      return;
    }
    if (!window.confirm(`Xóa phòng ${room.code}?`)) {
      return;
    }
    setError("");
    setNotice("");
    try {
      await api(`/api/v1/rooms/${room.id}`, { method: "DELETE", token });
      setNotice("Đã xóa phòng.");
      await load(page, pageSize || sizeRef.current);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page rooms-page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Quản trị</p>
          <h1>Quản lý phòng họp</h1>
        </div>
        <button type="button" className="btn primary" onClick={openCreate}>
          Thêm mới
        </button>
      </header>
      {error ? <p className="banner error">{error}</p> : null}
      {notice ? <p className="banner success">{notice}</p> : null}

      <div className="card table-card">
        <div className="table-wrap" ref={wrapRef}>
          <table className="data-table">
            <thead>
              <tr>
                <th>STT</th>
                <th>Mã</th>
                <th>Tên</th>
                <th>Tầng</th>
                <th>Sức chứa</th>
                <th>Vị trí</th>
                <th>Trạng thái</th>
                <th>Tác vụ</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room, index) => (
                <tr key={room.id} className={room.locked ? "is-locked" : undefined}>
                  <td>{page * pageSize + index + 1}</td>
                  <td>{room.code}</td>
                  <td>{room.name}</td>
                  <td>{room.floor}</td>
                  <td>{room.capacity} người</td>
                  <td>{room.location || "—"}</td>
                  <td>
                    <span className={`status-pill ${room.locked ? "busy" : room.status === "ACTIVE" ? "on" : "off"}`}>
                      {room.locked ? "Đang họp" : STATUS_LABEL[room.status] || room.status}
                    </span>
                  </td>
                  <td>
                    <div className="row">
                      <button type="button" className="btn ghost compact" onClick={() => openView(room)}>
                        Xem
                      </button>
                      {room.locked ? null : (
                        <>
                          <button type="button" className="btn ghost compact" onClick={() => openEdit(room)}>
                            Sửa
                          </button>
                          <button type="button" className="btn danger compact" onClick={() => remove(room)}>
                            Xóa
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pager page={page} totalPages={totalPages} totalItems={totalItems} unit="phòng" onChange={setPage} />
      </div>

      {open ? (
        <div className="modal" onClick={closeModal}>
          <form className="card modal-card wide" onClick={(e) => e.stopPropagation()} onSubmit={mode === "view" ? (event) => event.preventDefault() : save}>
            <h2>{mode === "view" ? "Chi tiết phòng" : mode === "edit" ? "Sửa phòng" : "Thêm phòng"}</h2>
            {formError ? <p className="banner error">{formError}</p> : null}
            <div className="form-grid">
              <label>
                Mã
                <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required disabled={mode === "view"} />
              </label>
              <label>
                Tên
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required disabled={mode === "view"} />
              </label>
              <label>
                Tầng
                <input type="number" min="1" value={form.floor} onChange={(e) => setForm({ ...form, floor: Number(e.target.value) })} disabled={mode === "view"} />
              </label>
              <label>
                Sức chứa
                <input type="number" min="1" max="200" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} required disabled={mode === "view"} />
              </label>
              <label className="span-2">
                Vị trí
                <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} required disabled={mode === "view"} />
              </label>
              <label className="span-2">
                Mô tả
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} disabled={mode === "view"} />
              </label>
            </div>
            {mode === "view" ? (
              <label>
                Trạng thái
                <input value={STATUS_LABEL[form.status] || form.status} disabled />
              </label>
            ) : (
              <Select label="Trạng thái" value={form.status} options={STATUS_OPTIONS} onChange={(status) => setForm({ ...form, status })} />
            )}
            <div className={`chips ${mode === "view" ? "" : "clickable"}`}>
              {AMENITIES.map((a) =>
                mode === "view" ? (
                  <span key={a} className={form.amenities.includes(a) ? "on" : ""}>
                    {amenityLabel[a]}
                  </span>
                ) : (
                  <button type="button" key={a} className={form.amenities.includes(a) ? "on" : ""} onClick={() => toggleAmenity(a)}>
                    {amenityLabel[a]}
                  </button>
                )
              )}
            </div>
            <div className="row end">
              <button type="button" className="btn ghost" onClick={closeModal}>
                {mode === "view" ? "Đóng" : "Hủy"}
              </button>
              {mode === "view" ? null : (
                <button className="btn primary" type="submit">
                  {mode === "edit" ? "Lưu" : "Tạo phòng"}
                </button>
              )}
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

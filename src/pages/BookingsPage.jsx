import { useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { amenityLabel, api } from "../api/client";
import Pager from "../components/Pager";
import { formatDateLong, formatTime } from "../lib/datetime";

const STATUS = {
  CONFIRMED: "Đã xác nhận",
  CANCELLED: "Đã hủy",
};

const MIN_PAGE = 4;
const MAX_PAGE = 20;
const FALLBACK_ROW = 88;

function rowsThatFit(wrap) {
  if (!wrap) {
    return 6;
  }
  const row = wrap.querySelector(".booking-row");
  const styles = getComputedStyle(wrap);
  const gap = Number.parseFloat(styles.rowGap || styles.gap) || 12;
  const rowH = row?.getBoundingClientRect().height || FALLBACK_ROW;
  return Math.max(MIN_PAGE, Math.min(MAX_PAGE, Math.floor((wrap.clientHeight + gap) / (rowH + gap))));
}

function canCancel(booking) {
  return booking.status === "CONFIRMED" && new Date(booking.startAt) > new Date();
}

export default function BookingsPage() {
  const { token } = useAuth();
  const wrapRef = useRef(null);
  const sizeRef = useRef(0);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load(nextPage, size) {
    const data = await api(`/api/v1/bookings/mine?page=${nextPage}&size=${size}`, { token });
    const next = data.page ?? nextPage;
    if ((data.items?.length ?? 0) === 0 && next > 0) {
      await load(next - 1, size);
      setPage(next - 1);
      return;
    }
    setItems(data.items || []);
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
  }, [items.length, error]);

  useEffect(() => {
    if (!pageSize) {
      return;
    }
    setLoading(true);
    load(page, pageSize)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token, page, pageSize]);

  async function cancel(id) {
    if (!window.confirm("Hủy lịch đặt này?")) {
      return;
    }
    try {
      await api(`/api/v1/bookings/${id}/cancel`, { method: "POST", token, body: { reason: "Hủy từ ứng dụng" } });
      setSelected(null);
      await load(page, pageSize);
    } catch (err) {
      setError(err.message);
    }
  }

  const room = selected?.room;

  return (
    <div className="page bookings-page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Cá nhân</p>
          <h1>Lịch đặt của tôi</h1>
          <p className="muted">Các cuộc họp bạn đã đặt. Bấm vào dòng để xem phòng và chi tiết.</p>
        </div>
      </header>
      {error ? <p className="error">{error}</p> : null}
      <div className="card table-card">
        <div className="stack booking-list" ref={wrapRef}>
          {items.length === 0 && !loading ? <p className="muted empty-hint">Bạn chưa có lịch đặt.</p> : null}
          {items.map((b) => (
            <article className="card booking-row is-openable" key={b.id} onClick={() => setSelected(b)}>
              <div>
                <strong>{b.title}</strong>
                <small>
                  {b.room.name} · {b.attendeeCount}/{b.room.capacity} người · {formatDateLong(b.startAt)} · {formatTime(b.startAt)}–{formatTime(b.endAt)}
                </small>
              </div>
              <div className="booking-actions">
                <span className={`status-pill ${b.status === "CONFIRMED" ? "on" : "off"}`}>{STATUS[b.status] || b.status}</span>
                <button type="button" className="btn ghost compact" onClick={() => setSelected(b)}>
                  Xem
                </button>
                {canCancel(b) ? (
                  <button
                    type="button"
                    className="btn ghost compact"
                    onClick={(event) => {
                      event.stopPropagation();
                      cancel(b.id);
                    }}
                  >
                    Hủy
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
        <Pager page={page} totalPages={totalPages} totalItems={totalItems} unit="lịch" onChange={setPage} />
      </div>

      {selected ? (
        <div className="modal" onClick={() => setSelected(null)}>
          <div className="card modal-card wide" onClick={(event) => event.stopPropagation()}>
            <h2>Chi tiết lịch đặt</h2>
            <div className="form-grid">
              <label className="span-2">
                Tiêu đề
                <input value={selected.title || ""} disabled />
              </label>
              <label className="span-2">
                Mục đích
                <textarea value={selected.purpose || "—"} disabled />
              </label>
              <label>
                Ngày
                <input value={formatDateLong(selected.startAt)} disabled />
              </label>
              <label>
                Giờ
                <input value={`${formatTime(selected.startAt)} – ${formatTime(selected.endAt)}`} disabled />
              </label>
              <label>
                Số người
                <input value={`${selected.attendeeCount}/${room?.capacity || "?"} người`} disabled />
              </label>
              <label>
                Trạng thái
                <input value={STATUS[selected.status] || selected.status} disabled />
              </label>
              {selected.cancelReason ? (
                <label className="span-2">
                  Lý do hủy
                  <input value={selected.cancelReason} disabled />
                </label>
              ) : null}
            </div>
            <h3>Phòng họp</h3>
            <div className="form-grid">
              <label>
                Mã
                <input value={room?.code || "—"} disabled />
              </label>
              <label>
                Tên
                <input value={room?.name || "—"} disabled />
              </label>
              <label>
                Tầng
                <input value={room?.floor ?? "—"} disabled />
              </label>
              <label>
                Sức chứa
                <input value={room?.capacity ? `${room.capacity} người` : "—"} disabled />
              </label>
              <label className="span-2">
                Vị trí
                <input value={room?.location || "—"} disabled />
              </label>
              <label className="span-2">
                Mô tả
                <textarea value={room?.description || "—"} disabled />
              </label>
            </div>
            <div className="chips">
              {(room?.amenities || []).map((a) => (
                <span key={a} className="on">
                  {amenityLabel[a] || a}
                </span>
              ))}
            </div>
            <div className="row end">
              <button type="button" className="btn ghost" onClick={() => setSelected(null)}>
                Đóng
              </button>
              {canCancel(selected) ? (
                <button type="button" className="btn danger" onClick={() => cancel(selected.id)}>
                  Hủy lịch
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

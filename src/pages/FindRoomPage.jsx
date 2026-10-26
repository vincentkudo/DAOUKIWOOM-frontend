import { useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { amenityLabel, api, fitTone } from "../api/client";
import { ensureFutureWindow, nextWorkdayWindow, toLocalIso } from "../lib/datetime";

const DEFAULT = nextWorkdayWindow();

export default function FindRoomPage() {
  const { token, user } = useAuth();
  const [attendeeCount, setAttendeeCount] = useState(6);
  const [date, setDate] = useState(DEFAULT.date);
  const [start, setStart] = useState(DEFAULT.start);
  const [end, setEnd] = useState(DEFAULT.end);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [bookingRoom, setBookingRoom] = useState(null);
  const [title, setTitle] = useState("");
  const [purpose, setPurpose] = useState("");
  const [notice, setNotice] = useState(`Mặc định: ${DEFAULT.label}`);

  const query = useMemo(() => {
    const params = new URLSearchParams({ attendeeCount: String(attendeeCount) });
    if (date && start && end) {
      params.set("startAt", toLocalIso(date, start));
      params.set("endAt", toLocalIso(date, end));
    }
    return params.toString();
  }, [attendeeCount, date, start, end]);

  function jumpToWorkday() {
    const next = nextWorkdayWindow();
    setDate(next.date);
    setStart(next.start);
    setEnd(next.end);
    setNotice(`Đã chuyển sang ${next.label}`);
    setError("");
  }

  async function search(event) {
    event?.preventDefault();
    const slot = ensureFutureWindow(date, start, end);
    if (slot.adjusted) {
      setDate(slot.date);
      setStart(slot.start);
      setEnd(slot.end);
      setNotice(`Khung giờ đã qua — đã nhảy sang ${slot.label}`);
    }
    const params = new URLSearchParams({ attendeeCount: String(attendeeCount) });
    params.set("startAt", toLocalIso(slot.date, slot.start));
    params.set("endAt", toLocalIso(slot.date, slot.end));
    setError("");
    setLoading(true);
    try {
      const data = await api(`/api/v1/rooms/suggestions?${params}`, { token });
      setResult(data);
    } catch (err) {
      setError(err.message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  async function book(event) {
    event.preventDefault();
    const slot = ensureFutureWindow(date, start, end);
    if (slot.adjusted) {
      setDate(slot.date);
      setStart(slot.start);
      setEnd(slot.end);
      setError(`Khung giờ đã qua — đã chuyển sang ${slot.label}. Bấm xác nhận lại.`);
      return;
    }
    setError("");
    try {
      await api("/api/v1/bookings", {
        method: "POST",
        token,
        body: {
          roomId: bookingRoom.room.id,
          title,
          purpose,
          startAt: toLocalIso(slot.date, slot.start),
          endAt: toLocalIso(slot.date, slot.end),
          attendeeCount,
          attendeeIds: [user.id],
        },
      });
      const bookedName = bookingRoom.room.name;
      setBookingRoom(null);
      setTitle("");
      setPurpose("");
      setNotice(`Đã đặt ${bookedName} cho ${attendeeCount} người · ${slot.date} ${slot.start}–${slot.end}`);
      setLoading(true);
      try {
        const params = new URLSearchParams({ attendeeCount: String(attendeeCount) });
        params.set("startAt", toLocalIso(slot.date, slot.start));
        params.set("endAt", toLocalIso(slot.date, slot.end));
        setResult(await api(`/api/v1/rooms/suggestions?${params}`, { token }));
      } finally {
        setLoading(false);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Nghiệp vụ cốt lõi</p>
          <h1>Tìm phòng theo số người</h1>
          <p className="muted">
            Nhập sĩ số trước. RoomFlow chỉ đề xuất phòng còn chỗ và xếp phòng vừa nhất lên đầu.
          </p>
        </div>
      </header>

      <form className="card search-bar" onSubmit={search}>
        <div className="field people">
          <span className="field-label">Số người</span>
          <div className="stepper">
            <button type="button" aria-label="Giảm số người" onClick={() => setAttendeeCount((n) => Math.max(1, n - 1))}>
              −
            </button>
            <strong>{attendeeCount}</strong>
            <button type="button" aria-label="Tăng số người" onClick={() => setAttendeeCount((n) => Math.min(30, n + 1))}>
              +
            </button>
          </div>
        </div>
        <label>
          Ngày
          <input type="date" value={date} min={DEFAULT.date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <label>
          Bắt đầu
          <input type="time" step="900" value={start} onChange={(e) => setStart(e.target.value)} required />
        </label>
        <label>
          Kết thúc
          <input type="time" step="900" value={end} onChange={(e) => setEnd(e.target.value)} required />
        </label>
        <div className="search-actions">
          <button className="btn primary" disabled={loading} type="submit">
            {loading ? "Đang tìm…" : "Đề xuất phòng"}
          </button>
          <button className="btn ghost" type="button" onClick={jumpToWorkday}>
            Ngày làm việc tới · 09:00
          </button>
        </div>
      </form>

      {error ? <p className="banner error">{error}</p> : null}
      {notice ? <p className="banner success">{notice}</p> : null}

      {result ? (
        <>
          <section>
            <h2>Phòng phù hợp còn trống · {result.recommendedCount}</h2>
            <div className="grid">
              {result.recommended.length === 0 ? (
                <p className="muted">Không còn phòng đủ chỗ cho {attendeeCount} người trong khung giờ này.</p>
              ) : (
                result.recommended.map((item) => (
                  <article key={item.room.id} className="card room-card">
                    <div className="room-card-top">
                      <div>
                        <strong>{item.room.name}</strong>
                        <small>
                          {item.room.code} · Tầng {item.room.floor} · {item.room.location}
                        </small>
                      </div>
                      <span className={`fit ${fitTone[item.fitLevel]}`}>{item.fitLabel}</span>
                    </div>
                    <p>
                      Sức chứa <b>{item.room.capacity}</b> · dư {item.unusedSeats} chỗ
                    </p>
                    <div className="chips">
                      {item.room.amenities.map((a) => (
                        <span key={a}>{amenityLabel[a] || a}</span>
                      ))}
                    </div>
                    <button type="button" className="btn primary" onClick={() => setBookingRoom(item)}>
                      Đặt phòng này
                    </button>
                  </article>
                ))
              )}
            </div>
          </section>

          {result.held?.length > 0 ? (
            <section>
              <h2>Đang được người khác giữ chỗ</h2>
              <div className="grid dim">
                {result.held.map((item) => (
                  <article key={item.room.id} className="card room-card">
                    <strong>{item.room.name}</strong>
                    <small>{item.fitLabel}</small>
                    <p>Còn {item.holdRemainingSeconds}s giữ chỗ.</p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {result.occupied.length > 0 ? (
            <section>
              <h2>Đủ chỗ nhưng đang bận</h2>
              <div className="grid dim">
                {result.occupied.map((item) => (
                  <article key={item.room.id} className="card room-card">
                    <strong>{item.room.name}</strong>
                    <small>{item.fitLabel}</small>
                    <p>Khung giờ này đã có lịch khác.</p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : null}

      {bookingRoom ? (
        <div className="modal" onClick={() => setBookingRoom(null)}>
          <form className="card modal-card" onClick={(e) => e.stopPropagation()} onSubmit={book}>
            <h3>Đặt {bookingRoom.room.name}</h3>
            <p className="muted">
              {attendeeCount} người · {date} · {start}–{end} · {bookingRoom.fitLabel}
            </p>
            <label>
              Tiêu đề cuộc họp
              <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={160} />
            </label>
            <label>
              Mục đích
              <textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} maxLength={400} />
            </label>
            <div className="row end">
              <button type="button" className="btn ghost" onClick={() => setBookingRoom(null)}>
                Hủy
              </button>
              <button type="submit" className="btn primary">
                Xác nhận đặt
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

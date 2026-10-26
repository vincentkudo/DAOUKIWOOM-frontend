import { useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { amenityLabel, api, fitTone } from "../api/client";

function pad(n) {
  return String(n).padStart(2, "0");
}

function toIso(date, time) {
  return new Date(`${date}T${time}:00`).toISOString();
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function nextSlot() {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 15 - (d.getMinutes() % 15), 0, 0);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function plusHour(time) {
  const [h, m] = time.split(":").map(Number);
  const end = new Date();
  end.setHours(h + 1, m, 0, 0);
  return `${pad(end.getHours())}:${pad(end.getMinutes())}`;
}

export default function FindRoomPage() {
  const { token, user } = useAuth();
  const [attendeeCount, setAttendeeCount] = useState(6);
  const [date, setDate] = useState(todayStr());
  const [start, setStart] = useState(nextSlot());
  const [end, setEnd] = useState(plusHour(nextSlot()));
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [bookingRoom, setBookingRoom] = useState(null);
  const [title, setTitle] = useState("");
  const [purpose, setPurpose] = useState("");
  const [notice, setNotice] = useState("");

  const query = useMemo(() => {
    const params = new URLSearchParams({ attendeeCount: String(attendeeCount) });
    if (date && start && end) {
      params.set("startAt", toIso(date, start));
      params.set("endAt", toIso(date, end));
    }
    return params.toString();
  }, [attendeeCount, date, start, end]);

  async function search(event) {
    event?.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);
    try {
      const data = await api(`/api/v1/rooms/suggestions?${query}`, { token });
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
    setError("");
    try {
      await api("/api/v1/bookings", {
        method: "POST",
        token,
        body: {
          roomId: bookingRoom.room.id,
          title,
          purpose,
          startAt: toIso(date, start),
          endAt: toIso(date, end),
          attendeeCount,
          attendeeIds: [user.id],
        },
      });
      setNotice(`Đã giữ ${bookingRoom.room.name} cho ${attendeeCount} người.`);
      setBookingRoom(null);
      setTitle("");
      setPurpose("");
      await search();
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
          <p className="muted">Nhập sĩ số trước. RoomFlow chỉ đề xuất phòng còn chỗ và xếp phòng vừa nhất lên đầu.</p>
        </div>
      </header>

      <form className="card search-bar" onSubmit={search}>
        <label className="people">
          Số người
          <div className="stepper">
            <button type="button" onClick={() => setAttendeeCount((n) => Math.max(1, n - 1))}>−</button>
            <strong>{attendeeCount}</strong>
            <button type="button" onClick={() => setAttendeeCount((n) => Math.min(30, n + 1))}>+</button>
          </div>
        </label>
        <label>
          Ngày
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <label>
          Bắt đầu
          <input type="time" step="900" value={start} onChange={(e) => setStart(e.target.value)} required />
        </label>
        <label>
          Kết thúc
          <input type="time" step="900" value={end} onChange={(e) => setEnd(e.target.value)} required />
        </label>
        <button className="btn primary" disabled={loading} type="submit">
          {loading ? "Đang tìm…" : "Đề xuất phòng"}
        </button>
      </form>

      {error ? <p className="error">{error}</p> : null}
      {notice ? <p className="success">{notice}</p> : null}

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
                        <small>{item.room.code} · Tầng {item.room.floor} · {item.room.location}</small>
                      </div>
                      <span className={`fit ${fitTone[item.fitLevel]}`}>{item.fitLabel}</span>
                    </div>
                    <p>Sức chứa <b>{item.room.capacity}</b> · dư {item.unusedSeats} chỗ</p>
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
            <p className="muted">{attendeeCount} người · {date} · {start}–{end} · {bookingRoom.fitLabel}</p>
            <label>
              Tiêu đề cuộc họp
              <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={160} />
            </label>
            <label>
              Mục đích
              <textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} maxLength={400} />
            </label>
            <div className="row">
              <button type="button" className="btn ghost" onClick={() => setBookingRoom(null)}>Hủy</button>
              <button type="submit" className="btn primary">Xác nhận đặt</button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

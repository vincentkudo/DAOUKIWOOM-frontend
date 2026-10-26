import { useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { amenityLabel, api, fitLabel, fitTone } from "../api/client";
import DatePicker from "../components/DatePicker";
import TimePicker from "../components/TimePicker";
import { ensureFutureWindow, nextWorkdayWindow, toLocalIso } from "../lib/datetime";
import { overlapsSearch, slotSocketUrl } from "../lib/slotsocket";

const DEFAULT = nextWorkdayWindow();
const POLL_MS = 4000;
const SUGGEST_SIZE = 12;
const AMENITIES = Object.keys(amenityLabel);

function mergeByRoom(current, incoming) {
  const seen = new Set(current.map((item) => item.room.id));
  return [...current, ...incoming.filter((item) => !seen.has(item.room.id))];
}

export default function FindRoomPage() {
  const { token, user } = useAuth();
  const [attendeeCount, setAttendeeCount] = useState(6);
  const [date, setDate] = useState(DEFAULT.date);
  const [start, setStart] = useState(DEFAULT.start);
  const [end, setEnd] = useState(DEFAULT.end);
  const [amenities, setAmenities] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [bookingRoom, setBookingRoom] = useState(null);
  const [title, setTitle] = useState("");
  const [purpose, setPurpose] = useState("");
  const [notice, setNotice] = useState("");
  const [hold, setHold] = useState(null);
  const [holdLeft, setHoldLeft] = useState(0);
  const [live, setLive] = useState(false);
  const holdRef = useRef(null);
  const refreshRef = useRef(async () => {});
  const windowRef = useRef({ start: "", end: "" });
  const searchedRef = useRef(false);

  async function fetchSuggestions({ silent = false, page = 0, append = false, watchTaken = false } = {}) {
    const slot = ensureFutureWindow(date, start, end);
    if (slot.adjusted && !silent) {
      setDate(slot.date);
      setStart(slot.start);
      setEnd(slot.end);
      setNotice(`Khung giờ đã qua — đã nhảy sang ${slot.label}`);
    }
    const loaded = result?.page ?? 0;
    const size = silent ? Math.min(50, (loaded + 1) * SUGGEST_SIZE) : SUGGEST_SIZE;
    const params = new URLSearchParams({ attendeeCount: String(attendeeCount) });
    params.set("startAt", toLocalIso(slot.date, slot.start));
    params.set("endAt", toLocalIso(slot.date, slot.end));
    params.set("page", String(silent ? 0 : page));
    params.set("size", String(size));
    amenities.forEach((item) => params.append("amenities", item));
    if (!silent) {
      setError("");
      setLoading(true);
    }
    try {
      const data = await api(`/api/v1/rooms/suggestions?${params}`, { token });
      setResult((previous) => {
        if (watchTaken && previous) {
          const stillFree = new Set(data.recommended.map((item) => item.room.id));
          const taken = previous.recommended.filter((item) => !stillFree.has(item.room.id));
          if (taken.length) {
            const names = taken.map((item) => item.room.name).join(", ");
            setNotice(`${names} vừa được người khác giữ hoặc đặt.`);
          }
        }
        if (append && previous) {
          return {
            ...data,
            recommended: mergeByRoom(previous.recommended, data.recommended),
            held: mergeByRoom(previous.held || [], data.held || []),
            occupied: mergeByRoom(previous.occupied || [], data.occupied || []),
            recommendedCount: mergeByRoom(previous.recommended, data.recommended).length,
          };
        }
        return data;
      });
      return data;
    } catch (err) {
      if (!silent) {
        setError(err.message);
        setResult(null);
      }
      return null;
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }

  refreshRef.current = () => fetchSuggestions({ silent: true, watchTaken: true });
  windowRef.current = {
    start: date && start ? toLocalIso(date, start) : "",
    end: date && end ? toLocalIso(date, end) : "",
  };

  async function search(event) {
    event?.preventDefault();
    searchedRef.current = true;
    await fetchSuggestions({ silent: false, page: 0, append: false });
  }

  useEffect(() => {
    if (!searchedRef.current) {
      return undefined;
    }
    const timer = window.setTimeout(() => {
      setNotice("");
      fetchSuggestions({ silent: true, page: 0, append: false });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [attendeeCount, date, start, end, amenities]);

  function toggleAmenity(value) {
    setAmenities((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
    );
  }

  async function loadMore() {
    if (!result?.hasMore || loading) {
      return;
    }
    await fetchSuggestions({ silent: false, page: (result.page ?? 0) + 1, append: true });
  }

  async function releaseHold() {
    const current = holdRef.current;
    holdRef.current = null;
    setHold(null);
    setHoldLeft(0);
    if (!current?.id) {
      return;
    }
    try {
      await api(`/api/v1/holds/${current.id}`, { method: "DELETE", token });
    } catch {
      /* hold may already expire */
    }
  }

  function closeBooking() {
    releaseHold();
    setBookingRoom(null);
    setTitle("");
    setPurpose("");
  }

  async function startBooking(item) {
    const slot = ensureFutureWindow(date, start, end);
    if (slot.adjusted) {
      setDate(slot.date);
      setStart(slot.start);
      setEnd(slot.end);
    }
    setError("");
    try {
      const acquired = await api("/api/v1/holds", {
        method: "POST",
        token,
        body: {
          roomId: item.room.id,
          startAt: toLocalIso(slot.date, slot.start),
          endAt: toLocalIso(slot.date, slot.end),
        },
      });
      holdRef.current = acquired;
      setHold(acquired);
      setHoldLeft(acquired.remainingSeconds);
      setBookingRoom(item);
      setNotice(`Đang giữ ${item.room.name} · còn ${acquired.remainingSeconds}s`);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    if (!hold?.id) {
      return undefined;
    }
    const tick = window.setInterval(() => {
      setHoldLeft((seconds) => {
        if (seconds <= 1) {
          window.clearInterval(tick);
          holdRef.current = null;
          setHold(null);
          setBookingRoom(null);
          setError("Hết thời gian giữ chỗ. Hãy chọn lại phòng.");
          setNotice("");
          return 0;
        }
        return seconds - 1;
      });
    }, 1000);
    const beat = window.setInterval(() => {
      const id = holdRef.current?.id;
      if (!id) {
        return;
      }
      api(`/api/v1/holds/${id}/heartbeat`, { method: "POST", token })
        .then((fresh) => {
          holdRef.current = fresh;
          setHold(fresh);
          setHoldLeft(fresh.remainingSeconds);
        })
        .catch(() => {});
    }, Math.max(15, (hold.ttlSeconds || 90) / 3) * 1000);
    return () => {
      window.clearInterval(tick);
      window.clearInterval(beat);
    };
  }, [hold?.id, hold?.ttlSeconds, token]);

  useEffect(() => () => {
    const current = holdRef.current;
    if (current?.id) {
      api(`/api/v1/holds/${current.id}`, { method: "DELETE", token }).catch(() => {});
    }
  }, [token]);

  const watching = result !== null;

  useEffect(() => {
    if (!watching) {
      setLive(false);
      return undefined;
    }
    const socket = new WebSocket(slotSocketUrl());
    let debounce;
    socket.onopen = () => setLive(true);
    socket.onclose = () => setLive(false);
    socket.onerror = () => setLive(false);
    socket.onmessage = (event) => {
      let payload;
      try {
        payload = JSON.parse(event.data);
      } catch {
        return;
      }
      const current = windowRef.current;
      if (!overlapsSearch(payload, current.start, current.end)) {
        return;
      }
      window.clearTimeout(debounce);
      debounce = window.setTimeout(() => {
        refreshRef.current();
      }, 120);
    };
    return () => {
      window.clearTimeout(debounce);
      socket.close();
    };
  }, [watching]);

  useEffect(() => {
    if (!watching || live) {
      return undefined;
    }
    async function refresh() {
      if (document.visibilityState !== "visible") {
        return;
      }
      await refreshRef.current();
    }
    const timer = window.setInterval(refresh, POLL_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [watching, live, attendeeCount, date, start, end, token]);

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
          holdId: hold?.id,
        },
      });
      const bookedName = bookingRoom.room.name;
      holdRef.current = null;
      setHold(null);
      setHoldLeft(0);
      setBookingRoom(null);
      setTitle("");
      setPurpose("");
      setNotice(`Đã đặt ${bookedName} cho ${attendeeCount} người · ${slot.date} ${slot.start}–${slot.end}`);
      await fetchSuggestions({ silent: false, page: 0, append: false });
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
            Nhập sĩ số và tiện ích cần có. Chỉ đề xuất phòng còn chỗ, đủ chỗ, đủ tiện ích.
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
        <DatePicker label="Ngày" value={date} min={DEFAULT.date} onChange={setDate} />
        <TimePicker label="Bắt đầu" value={start} onChange={setStart} />
        <TimePicker label="Kết thúc" value={end} onChange={setEnd} />
        <div className="search-actions">
          <button className="btn primary" disabled={loading} type="submit">
            {loading ? "Đang tìm…" : "Đề xuất phòng"}
          </button>
        </div>
        <div className="search-amenities">
          <span className="field-label">Phòng phải có</span>
          <div className="chips clickable">
            {AMENITIES.map((item) => (
              <button
                type="button"
                key={item}
                className={amenities.includes(item) ? "on" : ""}
                onClick={() => toggleAmenity(item)}
              >
                {amenityLabel[item]}
              </button>
            ))}
          </div>
        </div>
      </form>

      {error ? <p className="banner error">{error}</p> : null}
      {notice ? <p className="banner success">{notice}</p> : null}

      {result ? (
        <>
          <section>
            <h2>Phòng phù hợp còn trống · {result.recommended.length}</h2>
          {result.amenityFallback ? (
            <p className="banner">Không có phòng đủ tiện ích đã chọn — đây là phòng gần điều kiện nhất còn trống.</p>
          ) : null}
            <div className="grid">
              {result.recommended.length === 0 ? (
                <p className="muted">
                  Không còn phòng đủ chỗ
                  {amenities.length ? " và đủ tiện ích đã chọn" : ""} cho {attendeeCount} người trong khung giờ này.
                </p>
              ) : (
                result.recommended.map((item) => (
                  <article key={item.room.id} className="card room-card">
                    <div className="room-card-top">
                      <strong>{item.room.name}</strong>
                      <span className={`fit ${fitTone[item.fitLevel]}`}>{fitLabel[item.fitLevel]}</span>
                    </div>
                    <small>
                      {item.room.code} · Tầng {item.room.floor}
                    </small>
                    <p>
                      Sức chứa <b>{item.room.capacity}</b> · dư {item.unusedSeats} chỗ
                    </p>
                    <div className="chips">
                      {item.room.amenities.map((a) => (
                        <span key={a} className={amenities.includes(a) ? "on" : ""}>
                          {amenityLabel[a] || a}
                        </span>
                      ))}
                    </div>
                    {item.missingAmenities?.length ? (
                      <p className="muted">Thiếu {item.missingAmenities.map((a) => amenityLabel[a] || a).join(", ")}</p>
                    ) : null}
                    <button type="button" className="btn primary" onClick={() => startBooking(item)}>
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
                    <span className={`fit ${fitTone[item.fitLevel]}`}>{fitLabel[item.fitLevel]}</span>
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
                    <span className={`fit ${fitTone[item.fitLevel]}`}>{fitLabel[item.fitLevel]}</span>
                    <p>Khung giờ này đã có lịch khác.</p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {result.hasMore ? (
            <button type="button" className="btn ghost" disabled={loading} onClick={loadMore}>
              {loading ? "Đang tải…" : "Tải thêm phòng"}
            </button>
          ) : null}
        </>
      ) : null}

      {bookingRoom ? (
        <div className="modal" onClick={closeBooking}>
          <form className="card modal-card" onClick={(e) => e.stopPropagation()} onSubmit={book}>
            <h3>Đặt {bookingRoom.room.name}</h3>
            <p className="muted">
              {attendeeCount} người · {date} · {start}–{end} · {fitLabel[bookingRoom.fitLevel]}
            </p>
            {holdLeft > 0 ? <p className="banner success">Đang giữ phòng · còn {holdLeft}s</p> : null}
            <label>
              Tiêu đề cuộc họp
              <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={160} />
            </label>
            <label>
              Mục đích
              <textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} maxLength={400} />
            </label>
            <div className="row end">
              <button type="button" className="btn ghost" onClick={closeBooking}>
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

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { api } from "../api/client";
import DatePicker from "../components/DatePicker";
import Pager from "../components/Pager";
import { addDays, dateKey, endOfDay, formatTime, startOfWeek } from "../lib/datetime";

const WEEKDAYS = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];
const PEEK = 20;

export default function CalendarPage() {
  const { token } = useAuth();
  const bodyRef = useRef(null);
  const [picked, setPicked] = useState(() => dateKey(new Date()));
  const [anchor, setAnchor] = useState(() => startOfWeek(new Date()));
  const [peekRooms, setPeekRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [visibleCount, setVisibleCount] = useState(1);
  const [offsets, setOffsets] = useState([0]);
  const [roomTotal, setRoomTotal] = useState(0);

  const offset = offsets[offsets.length - 1] || 0;
  const days = useMemo(() => [0, 1, 2, 3, 4, 5, 6].map((n) => addDays(anchor, n)), [anchor]);
  const from = days[0];
  const to = endOfDay(days[6]);
  const fromIso = from.toISOString();
  const toIso = to.toISOString();
  const rangeLabel = `${days[0].toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })} – ${days[6].toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}`;

  function goToDate(value) {
    if (!value) {
      return;
    }
    const day = new Date(`${value}T00:00:00`);
    setPicked(value);
    setAnchor(startOfWeek(day));
    setOffsets([0]);
  }

  function shiftWeek(delta) {
    const next = addDays(anchor, delta);
    setAnchor(next);
    setPicked(dateKey(next));
    setOffsets([0]);
  }

  useEffect(() => {
    api(`/api/v1/calendar?from=${fromIso}&to=${toIso}&offset=${offset}&size=${PEEK}`, { token })
      .then((data) => {
        setPeekRooms(data.rooms?.items || []);
        setBookings(data.bookings || []);
        setRoomTotal(data.rooms?.totalItems || 0);
        setVisibleCount(Math.min(8, data.rooms?.items?.length || 1));
      })
      .catch(() => {
        setPeekRooms([]);
        setBookings([]);
      });
  }, [token, fromIso, toIso, offset]);

  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body || peekRooms.length === 0) {
      return;
    }
    const head = body.querySelector(".cal-head");
    const rows = [...body.querySelectorAll(".cal-row")];
    const budget = body.clientHeight - (head?.offsetHeight || 0);
    let used = 0;
    let count = 0;
    for (const row of rows) {
      const height = row.getBoundingClientRect().height + 8;
      if (count > 0 && used + height > budget + 1) {
        break;
      }
      used += height;
      count += 1;
    }
    if (count === rows.length && rows.length < peekRooms.length && used + 80 < budget) {
      setVisibleCount(Math.min(peekRooms.length, rows.length + 2));
      return;
    }
    if (count > 0 && count < visibleCount) {
      setVisibleCount(count);
    }
  }, [peekRooms, bookings, visibleCount]);

  const rooms = peekRooms.slice(0, visibleCount);
  const shown = rooms.length;
  const hasMore = offset + shown < roomTotal;
  const pageIndex = offsets.length - 1;
  const totalPages = hasMore ? pageIndex + 2 : Math.max(pageIndex + 1, 1);

  function changePage(next) {
    if (next > pageIndex && hasMore) {
      setOffsets((current) => [...current, offset + shown]);
      return;
    }
    if (next < pageIndex) {
      setOffsets((current) => current.slice(0, Math.max(1, next + 1)));
    }
  }

  const confirmed = bookings.filter((b) => b.status === "CONFIRMED");
  const todayKey = dateKey(new Date());

  return (
    <div className="page calendar-page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Lịch phòng</p>
          <h1>Ai đang giữ phòng tuần này</h1>
          <p className="muted">Tuần {rangeLabel} · Thứ 2 đến Chủ nhật</p>
        </div>
        <div className="calendar-tools">
          <div className="jump-date">
            <DatePicker label="Nhảy tới ngày" value={picked} align="end" onChange={goToDate} />
          </div>
          <div className="row">
            <button className="btn ghost" type="button" onClick={() => shiftWeek(-7)}>
              Tuần trước
            </button>
            <button className="btn ghost" type="button" onClick={() => goToDate(todayKey)}>
              Tuần này
            </button>
            <button className="btn ghost" type="button" onClick={() => shiftWeek(7)}>
              Tuần sau
            </button>
          </div>
        </div>
      </header>

      <div className="calendar-wrap card">
        <div className="calendar" ref={bodyRef}>
          <div className="cal-head">
            <span className="cal-room">Phòng</span>
            {days.map((d, index) => {
              const key = dateKey(d);
              const weekend = index >= 5;
              return (
                <span
                  key={d.toISOString()}
                  className={`cal-day ${key === todayKey ? "is-today" : ""} ${key === picked ? "is-picked" : ""} ${weekend ? "is-weekend" : ""}`.trim()}
                >
                  <em>{WEEKDAYS[index]}</em>
                  <small>{d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}</small>
                </span>
              );
            })}
          </div>
          {rooms.map((room) => (
            <div className="cal-row" key={room.id}>
              <div className="cal-room">
                <strong>{room.name}</strong>
                <small>{room.capacity} chỗ</small>
              </div>
              {days.map((d, index) => {
                const key = dateKey(d);
                const dayBookings = confirmed.filter((b) => b.room.id === room.id && dateKey(b.startAt) === key);
                return (
                  <div
                    className={`cal-cell ${key === todayKey ? "is-today" : ""} ${index >= 5 ? "is-weekend" : ""}`.trim()}
                    key={d.toISOString()}
                  >
                    {dayBookings.map((b) => (
                      <div className="cal-event" key={b.id} title={`${formatTime(b.startAt)} ${b.title} · ${b.attendeeCount} người`}>
                        <b>{formatTime(b.startAt)}</b>
                        <span>
                          {b.title} · {b.attendeeCount} người
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <Pager page={pageIndex} totalPages={totalPages} totalItems={roomTotal} unit="phòng" onChange={changePage} />
      </div>
    </div>
  );
}

import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const LINKS = [
  { to: "/", label: "Tổng quan", end: true },
  { to: "/find", label: "Tìm phòng" },
  { to: "/calendar", label: "Lịch phòng" },
  { to: "/bookings", label: "Lịch của tôi" },
];

export default function Layout() {
  const { user, isAdmin, logout } = useAuth();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">RF</span>
          <div>
            <strong>RoomFlow</strong>
            <small>DAOU KIWOOM</small>
          </div>
        </div>
        <nav>
          {LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end}>
              {link.label}
            </NavLink>
          ))}
          {isAdmin ? <NavLink to="/rooms">Quản lý phòng</NavLink> : null}
        </nav>
        <div className="sidebar-user">
          <div>
            <strong>{user.fullName}</strong>
            <small>{user.role === "ADMIN" ? "Quản trị" : user.department}</small>
          </div>
          <button type="button" className="linkish" onClick={logout}>
            Đăng xuất
          </button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}

import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

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
          <NavLink to="/" end>Tổng quan</NavLink>
          <NavLink to="/find">Tìm phòng theo số người</NavLink>
          <NavLink to="/calendar">Lịch phòng</NavLink>
          <NavLink to="/bookings">Lịch của tôi</NavLink>
          {isAdmin ? <NavLink to="/rooms">Quản lý phòng</NavLink> : null}
        </nav>
        <div className="sidebar-user">
          <div>
            <strong>{user.fullName}</strong>
            <small>{user.role === "ADMIN" ? "Quản trị" : user.department}</small>
          </div>
          <button type="button" className="linkish" onClick={logout}>Đăng xuất</button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}

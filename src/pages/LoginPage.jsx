import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const DEMOS = [
  { label: "Admin", email: "admin@daoukiwoom.vn", password: "Admin123!" },
  { label: "Nhân viên", email: "linh.tran@daoukiwoom.vn", password: "Emp123!" },
];

function homeFor(user) {
  return user?.role === "ADMIN" ? "/rooms" : "/";
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(homeFor(user));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="card login-card" onSubmit={onSubmit}>
        <div className="login-brand">
          <span className="brand-mark">R</span>
          <strong className="font-brand">RoomFlow</strong>
        </div>
        <h1>Đăng nhập</h1>
        <p className="muted">Đặt phòng họp DAOUKIWOOM</p>
        <label>
          Email
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            name="email"
            required
            autoComplete="username"
            spellCheck={false}
          />
        </label>
        <label>
          Mật khẩu
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            name="password"
            required
            autoComplete="current-password"
          />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button className="btn primary" disabled={loading} type="submit">
          {loading ? "Đang vào…" : "Vào hệ thống"}
        </button>
        <div className="demo-row">
          {DEMOS.map((demo) => (
            <button
              key={demo.email}
              type="button"
              className="btn ghost"
              onClick={() => {
                setEmail(demo.email);
                setPassword(demo.password);
              }}
            >
              Dùng {demo.label}
            </button>
          ))}
        </div>
      </form>
    </div>
  );
}

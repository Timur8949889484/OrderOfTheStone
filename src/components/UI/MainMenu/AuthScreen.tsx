import { useState, useEffect } from "react";
import { supabase } from "../../../utils/supabase";

interface AuthScreenProps {
  isResettingPassword: boolean;
  onResetComplete: () => void;
}

const EyeIcon = () => (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

const EyeOffIcon = () => (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
    <line x1="1" y1="1" x2="23" y2="23"></line>
  </svg>
);

export function AuthScreen({
  isResettingPassword,
  onResetComplete,
}: AuthScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // === НОВОЕ СОСТОЯНИЕ ===
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [countdown, setCountdown] = useState(60); // <-- НОВОЕ: Таймер на 60 секунд

  // === НОВОЕ: Логика таймера ===
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (isEmailSent && countdown > 0) {
      timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [isEmailSent, countdown]);

  const [authError, setAuthError] = useState("");
  const [message, setMessage] = useState("");

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setMessage("");
    sessionStorage.removeItem("awaitingReset");

    const { error } = isLogin
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });

    if (error) {
      setAuthError(error.message);
    } else if (!isLogin) {
      // Если это была регистрация и нет ошибок — показываем экран успешной отправки
      setIsEmailSent(true);
    }
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setMessage("");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) {
      setAuthError(error.message);
    } else {
      // Вместо обычного зеленого текста включаем наш новый экран
      setIsEmailSent(true);
      sessionStorage.setItem("awaitingReset", "true");
    }
  };

  // === НОВОЕ: Функция отправки письма заново ===
  const handleResend = async () => {
    if (countdown > 0) return; // Защита, если как-то нажали кнопку до таймера

    setAuthError("");
    setCountdown(60); // Запускаем таймер по новой

    if (isForgotPassword) {
      // Повторное письмо сброса пароля
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) setAuthError(error.message);
    } else {
      // Повторное письмо подтверждения регистрации
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) setAuthError(error.message);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setMessage("");

    if (password !== confirmPassword) {
      setAuthError("Пароли не совпадают!");
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      setAuthError(error.message);
    } else {
      setMessage("Пароль успешно обновлен!");
      setPassword("");
      setConfirmPassword("");
      sessionStorage.removeItem("awaitingReset");
      onResetComplete();
    }
  };

  const eyeButtonStyle: React.CSSProperties = {
    position: "absolute",
    right: "10px",
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#666",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
  };

  if (isResettingPassword) {
    return (
      <form className="auth-form" onSubmit={handleUpdatePassword}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            textAlign: "left",
          }}
        >
          <label style={{ color: "white", textShadow: "2px 2px 0 #000" }}>
            Новый пароль
          </label>
          <div style={{ position: "relative", width: "100%" }}>
            <input
              className="mc-input"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              style={{ width: "100%", paddingRight: "40px" }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={eyeButtonStyle}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>

          <label style={{ color: "white", textShadow: "2px 2px 0 #000" }}>
            Введите пароль еще раз
          </label>
          <div style={{ position: "relative", width: "100%" }}>
            <input
              className="mc-input"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              style={{ width: "100%", paddingRight: "40px" }}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              style={eyeButtonStyle}
            >
              {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>

        {authError && (
          <p className="error-text" style={{ marginTop: "10px" }}>
            {authError}
          </p>
        )}

        <button
          className="mc-button"
          type="submit"
          style={{ marginTop: "20px" }}
        >
          Сохранить
        </button>
      </form>
    );
  }

  // ===== ЭКРАН УСПЕШНОЙ ОТПРАВКИ ПИСЬМА =====
  // ===== ЭКРАН УСПЕШНОЙ ОТПРАВКИ ПИСЬМА =====
  if (isEmailSent) {
    return (
      <div
        className="auth-form"
        style={{ textAlign: "center", maxWidth: "350px" }}
      >
        <h3
          style={{
            color: "white",
            textShadow: "2px 2px 0 #000",
            marginBottom: "15px",
            fontSize: "1.3rem",
          }}
        >
          ПИСЬМО ОТПРАВЛЕНО!
        </h3>
        <p style={{ color: "#aaa", marginBottom: "10px", lineHeight: "1.5" }}>
          Проверьте ваш почтовый ящик:
          <br />
          <strong style={{ color: "white", fontSize: "1.1rem" }}>
            {email}
          </strong>
        </p>
        <p style={{ color: "#888", marginBottom: "25px", fontSize: "0.9rem" }}>
          (Если письма долго нет, проверьте папку "Спам")
        </p>

        {authError && (
          <p className="error-text" style={{ marginBottom: "15px" }}>
            {authError}
          </p>
        )}

        {/* НОВАЯ КНОПКА ОТПРАВКИ */}
        <button
          type="button"
          className={`mc-button ${countdown > 0 ? "btn-disabled" : ""}`}
          disabled={countdown > 0}
          onClick={handleResend}
          style={{ width: "100%", marginBottom: "10px", fontSize: "1.1rem" }}
        >
          {countdown > 0
            ? `Отправить еще раз (${countdown}с)`
            : "Отправить еще раз"}
        </button>

        <button
          type="button"
          className="mc-button secondary"
          onClick={() => {
            setIsEmailSent(false);
            setAuthError("");
            setCountdown(60); // Сбрасываем таймер при выходе
          }}
          style={{ width: "100%" }}
        >
          ← Вернуться назад
        </button>
      </div>
    );
  }

  if (isForgotPassword) {
    return (
      <form className="auth-form" onSubmit={handleResetRequest}>
        <input
          className="mc-input"
          type="email"
          placeholder="Введите ваш Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        {authError && <p className="error-text">{authError}</p>}
        {message && (
          <p
            className="success-text"
            style={{ color: "#00ff00", textShadow: "1px 1px 0 #000" }}
          >
            {message}
          </p>
        )}
        <button className="mc-button" type="submit">
          Отправить ссылку
        </button>
        <p
          className="auth-switch"
          onClick={() => {
            setIsForgotPassword(false);
            sessionStorage.removeItem("awaitingReset");
          }}
        >
          Вернуться ко входу
        </p>
      </form>
    );
  }

  // В файле src/components/UI/MainMenu/AuthScreen.tsx

  // ... (верхняя часть файла остается без изменений) ...

  // ===== ФОРМА РЕГИСТРАЦИИ =====
  if (!isLogin) {
    return (
      <form className="auth-form" onSubmit={handleAuth}>
        <input
          className="mc-input"
          id="reg-email"
          name="email"
          autoComplete="email"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <div style={{ position: "relative", width: "100%" }}>
          <input
            className="mc-input"
            id="reg-password"
            name="password"
            autoComplete="new-password"
            type={showPassword ? "text" : "password"}
            placeholder="Придумайте пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={{
              width: "100%",
              paddingRight: "40px",
              boxSizing: "border-box",
            }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={eyeButtonStyle}
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>

        {authError && <p className="error-text">{authError}</p>}

        <button className="mc-button" type="submit">
          Зарегистрироваться
        </button>

        <p
          className="auth-switch"
          style={{ marginTop: "15px" }}
          onClick={() => setIsLogin(true)}
        >
          Уже есть аккаунт? Войти
        </p>
      </form>
    );
  }

  // ===== ФОРМА ВХОДА (ЛОГИНА) =====
  return (
    <form className="auth-form" onSubmit={handleAuth}>
      <input
        className="mc-input"
        id="login-email"
        name="email"
        autoComplete="email"
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <div style={{ position: "relative", width: "100%" }}>
        <input
          className="mc-input"
          id="login-password"
          name="password"
          autoComplete="current-password"
          type={showPassword ? "text" : "password"}
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{
            width: "100%",
            paddingRight: "40px",
            boxSizing: "border-box",
          }}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          style={eyeButtonStyle}
        >
          {showPassword ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>

      {authError && <p className="error-text">{authError}</p>}
      {message && (
        <p
          className="success-text"
          style={{ color: "#00ff00", textShadow: "1px 1px 0 #000" }}
        >
          {message}
        </p>
      )}

      <button className="mc-button" type="submit">
        Войти
      </button>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          marginTop: "10px",
        }}
      >
        <p className="auth-switch" onClick={() => setIsLogin(false)}>
          Нет аккаунта? Создать
        </p>
        <p
          className="auth-switch"
          onClick={() => {
            setIsForgotPassword(true);
            setAuthError("");
            setMessage("");
          }}
        >
          Забыли пароль?
        </p>
      </div>
    </form>
  );
}

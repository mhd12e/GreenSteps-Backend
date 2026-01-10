import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TagsInput from "../components/TagsInput";
import { useAuth } from "../state/AuthContext";
import { useApi } from "../hooks/useApi";

const AuthPage = () => {
  const navigate = useNavigate();
  const { setTokens, isAuthenticated } = useAuth();
  const { request } = useApi();
  const [mode, setMode] = useState("login");
  const [status, setStatus] = useState("Ready when you are.");
  const [isBusy, setIsBusy] = useState(false);
  const [registerInterests, setRegisterInterests] = useState([]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/impacts", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setIsBusy(true);
    setStatus("Signing you in...");
    try {
      const data = await request("/auth/login", {
        method: "POST",
        body: {
          email: event.target.email.value,
          password: event.target.password.value
        },
        skipRefresh: true
      });
      setTokens(data.access_token, data.refresh_token);
      setStatus("Login complete. Redirecting...");
      navigate("/impacts", { replace: true });
    } catch (error) {
      setStatus(`Login failed: ${error.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setIsBusy(true);
    setStatus("Creating your account...");
    try {
      const interests = registerInterests.length ? registerInterests : ["sustainability"];
      await request("/auth/register", {
        method: "POST",
        body: {
          email: event.target.email.value,
          password: event.target.password.value,
          full_name: event.target.fullName.value,
          age: parseInt(event.target.age.value || "0", 10),
          interests
        },
        skipRefresh: true
      });
      setStatus("Registered. You can log in now.");
      event.target.reset();
      setRegisterInterests([]);
      setMode("login");
    } catch (error) {
      setStatus(`Registration failed: ${error.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="page-grid">
      <section className="panel" data-aos="fade-up">
        <div className="panel-header">
          <div>
            <h2>Welcome back</h2>
            <p>Sign in to manage your impacts and launch voice sessions.</p>
          </div>
          <div className="toggle-group">
            <button
              className={`btn ${mode === "login" ? "" : "ghost"}`}
              type="button"
              onClick={() => setMode("login")}
            >
              {mode === "login" ? (
                "Login"
              ) : (
                <>
                  <i className="fa-solid fa-arrow-right-to-bracket" /> Login
                </>
              )}
            </button>
            <button
              className={`btn secondary ${mode === "register" ? "" : "ghost"}`}
              type="button"
              onClick={() => setMode("register")}
            >
              {mode === "register" ? (
                "Register"
              ) : (
                <>
                  <i className="fa-solid fa-user-plus" /> Register
                </>
              )}
            </button>
          </div>
        </div>

        {mode === "login" ? (
          <form className="stack" onSubmit={handleLogin}>
            <label htmlFor="loginEmail">Email</label>
            <input id="loginEmail" name="email" type="email" placeholder="you@example.com" required />
            <label htmlFor="loginPassword">Password</label>
            <input
              id="loginPassword"
              name="password"
              type="password"
              placeholder="Your password"
              required
            />
            <button className="btn form-submit" type="submit" disabled={isBusy}>
              <i className="fa-solid fa-arrow-right-to-bracket" /> Login
            </button>
          </form>
        ) : (
          <form className="stack" onSubmit={handleRegister}>
            <label htmlFor="registerEmail">Email</label>
            <input id="registerEmail" name="email" type="email" placeholder="you@example.com" required />
            <label htmlFor="registerPassword">Password</label>
            <input
              id="registerPassword"
              name="password"
              type="password"
              placeholder="Create a password"
              required
            />
            <label htmlFor="registerFullName">Full name</label>
            <input id="registerFullName" name="fullName" type="text" placeholder="Full name" required />
            <div>
              <label htmlFor="registerAge">Age</label>
              <input id="registerAge" name="age" type="number" min="1" max="120" placeholder="18" />
            </div>
            <TagsInput
              label="Interests"
              placeholder="Type and press enter"
              tags={registerInterests}
              onAdd={(tag) => setRegisterInterests((prev) => [...prev, tag])}
              onRemove={(tag) =>
                setRegisterInterests((prev) => prev.filter((item) => item !== tag))
              }
              disabled={isBusy}
            />
            <button className="btn secondary form-submit" type="submit" disabled={isBusy}>
              <i className="fa-solid fa-user-plus" /> Create account
            </button>
          </form>
        )}
        <div className="status" role="status">
          {status}
        </div>
      </section>

      <section className="panel highlight" data-aos="fade-up">
        <div className="stack">
          <div className="pill">
            <i className="fa-solid fa-leaf" /> New in GreenSteps
          </div>
          <h3>Live coaching for sustainable living.</h3>
          <p>
            GreenSteps helps you take practical, eco-friendly actions with guided steps
            and real-time voice support.
          </p>
          <div className="feature-list">
            <div className="feature-item">
              <i className="fa-solid fa-seedling" /> Build sustainability impact plans fast.
            </div>
            <div className="feature-item">
              <i className="fa-solid fa-list-check" /> Follow clear steps that reduce your footprint.
            </div>
            <div className="feature-item">
              <i className="fa-solid fa-microphone" /> Start a voice coach session whenever you need help.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AuthPage;

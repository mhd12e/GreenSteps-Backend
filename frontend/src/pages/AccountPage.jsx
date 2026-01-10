import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TagsInput from "../components/TagsInput";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../state/AuthContext";

const AccountPage = () => {
  const { request } = useApi();
  const navigate = useNavigate();
  const { clearTokens } = useAuth();
  const [profile, setProfile] = useState({
    full_name: "",
    age: "",
    interests: []
  });
  const [status, setStatus] = useState("Loading your profile...");
  const [busy, setBusy] = useState(false);

  const loadProfile = async () => {
    setStatus("Loading your profile...");
    try {
      const data = await request("/users/me/profile", { method: "GET", auth: true });
      setProfile({
        full_name: data.full_name || "",
        age: data.age ?? "",
        interests: data.interests || []
      });
      setStatus("");
    } catch (error) {
      setStatus(`Load failed: ${error.message}`);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [request]);

  const handleSaveProfile = async () => {
    setBusy(true);
    try {
      const data = await request("/users/me/profile", {
        method: "PATCH",
        auth: true,
        body: {
          full_name: profile.full_name,
          age: profile.age === "" ? null : Number(profile.age),
          interests: profile.interests
        }
      });
      setProfile({
        full_name: data.full_name || "",
        age: data.age ?? "",
        interests: data.interests || []
      });
      setStatus("Profile updated.");
    } catch (error) {
      setStatus(`Update failed: ${error.message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "Delete your account and all impacts? This cannot be undone."
    );
    if (!confirmed) return;
    setBusy(true);
    try {
      await request("/auth/account", {
        method: "DELETE",
        auth: true
      });
      clearTokens();
      navigate("/auth", { replace: true });
    } catch (error) {
      setStatus(`Delete failed: ${error.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-grid">
      <section className="panel" data-aos="fade-up">
        <h2>Account preferences</h2>
        <p>Update the interests used to personalize your impact plans.</p>
        <div className="stack">
          <label htmlFor="accountName">Full name</label>
          <input
            id="accountName"
            type="text"
            value={profile.full_name}
            onChange={(event) =>
              setProfile((prev) => ({ ...prev, full_name: event.target.value }))
            }
            placeholder="Full name"
          />
          <label htmlFor="accountAge">Age</label>
          <input
            id="accountAge"
            type="number"
            min="1"
            max="120"
            value={profile.age}
            onChange={(event) =>
              setProfile((prev) => ({ ...prev, age: event.target.value }))
            }
            placeholder="18"
          />
          <TagsInput
            label="Interests"
            placeholder="Type and press enter"
            tags={profile.interests}
            onAdd={(tag) =>
              setProfile((prev) => ({
                ...prev,
                interests: [...prev.interests, tag]
              }))
            }
            onRemove={(tag) =>
              setProfile((prev) => ({
                ...prev,
                interests: prev.interests.filter((item) => item !== tag)
              }))
            }
            disabled={busy}
          />
          <button className="btn" onClick={handleSaveProfile} disabled={busy}>
            <i className="fa-solid fa-floppy-disk" /> Save changes
          </button>
        </div>
        {status ? (
          <div className="status status-spaced" role="status">
            {status}
          </div>
        ) : null}
      </section>
      <section className="panel" data-aos="fade-up">
        <h3>Delete account</h3>
        <p className="muted">
          This permanently removes your profile, impacts, and refresh tokens.
        </p>
        <button className="btn danger" onClick={handleDeleteAccount} disabled={busy}>
          <i className="fa-solid fa-triangle-exclamation" /> Delete account
        </button>
      </section>
    </div>
  );
};

export default AccountPage;

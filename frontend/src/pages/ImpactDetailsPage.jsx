import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { normalizeImpact } from "../utils/impact";

const ImpactDetailsPage = () => {
  const { impactId } = useParams();
  const { request } = useApi();
  const navigate = useNavigate();
  const [impact, setImpact] = useState(null);
  const [status, setStatus] = useState("Loading impact...");
  const [isDeleting, setIsDeleting] = useState(false);
  const palette = [
    { bg: "rgba(15, 118, 110, 0.16)", color: "#0f766e" },
    { bg: "rgba(244, 185, 66, 0.2)", color: "#b45309" },
    { bg: "rgba(239, 124, 142, 0.18)", color: "#be123c" },
    { bg: "rgba(56, 189, 248, 0.18)", color: "#0369a1" },
    { bg: "rgba(167, 139, 250, 0.18)", color: "#6d28d9" },
    { bg: "rgba(34, 197, 94, 0.18)", color: "#15803d" }
  ];

  useEffect(() => {
    const loadImpact = async () => {
      setStatus("Loading impact...");
      try {
        const data = await request(`/impact/${impactId}`, {
          method: "GET",
          auth: true
        });
        const normalized = normalizeImpact(data, impactId);
        setImpact(normalized);
        setStatus("Impact loaded.");
      } catch (error) {
        setStatus(`Load failed: ${error.message}`);
      }
    };
    loadImpact();
  }, [impactId, request]);

  const stepCountLabel = useMemo(() => {
    if (!impact) return "";
    return `${impact.steps.length} steps in this impact`;
  }, [impact]);

  const handleDelete = async () => {
    const confirmed = window.confirm(
      "Delete this impact and all of its steps? This cannot be undone."
    );
    if (!confirmed) return;
    setIsDeleting(true);
    try {
      await request(`/impact/${impactId}`, { method: "DELETE", auth: true });
      navigate("/impacts", { replace: true });
    } catch (error) {
      setStatus(`Delete failed: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!impact) {
    return (
      <section className="panel">
        <h2>Impact details</h2>
        <p className="status">{status}</p>
      </section>
    );
  }

  return (
    <div className="page-grid">
      <section className="panel full" data-aos="fade-up">
        <div className="panel-header">
          <div>
            <div className="pill">
              <i className="fa-solid fa-seedling" /> Impact overview
            </div>
            <h2>{impact.title}</h2>
            <p className="muted">{impact.description}</p>
          </div>
          <div className="panel-actions impact-actions">
            <Link className="btn ghost btn-spaced" to="/impacts">
              Back to impacts
            </Link>
            <button className="btn danger btn-spaced" onClick={handleDelete} disabled={isDeleting}>
              <i className="fa-solid fa-trash" /> Delete impact
            </button>
          </div>
        </div>
        <div className="status">{stepCountLabel}</div>
      </section>

      <section className="panel full" data-aos="fade-up">
        <h3>Steps</h3>
        <div className="list">
          {impact.steps.map((step, index) => {
            const colors = palette[index % palette.length];
            return (
            <div key={step.id || step.order} className="card step-card" data-aos="fade-up">
              <div
                className="step-icon"
                style={{
                  backgroundColor: colors.bg,
                  color: colors.color
                }}
              >
                <i className={step.icon || "fa-solid fa-circle"} />
              </div>
              <div>
                <h4>
                  {step.order}. {step.title}
                </h4>
                <p className="muted">{step.description}</p>
                <button
                  className="btn ghost"
                  onClick={() =>
                    navigate(`/impacts/${impact.id}/steps/${step.id}/step`)
                  }
                  disabled={!step.id}
                >
                  Start session
                </button>
              </div>
            </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default ImpactDetailsPage;

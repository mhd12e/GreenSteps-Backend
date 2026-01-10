import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BlockerOverlay from "../components/BlockerOverlay";
import { useAuth } from "../state/AuthContext";
import { useApi } from "../hooks/useApi";
import { useVoiceSession } from "../hooks/useVoiceSession";
import { api_base } from "../config";
import { normalizeImpact } from "../utils/impact";

const StepPage = () => {
  const { impactId, stepId } = useParams();
  const navigate = useNavigate();
  const { accessToken } = useAuth();
  const { request } = useApi();
  const apiBase = api_base;
  const [impact, setImpact] = useState(null);
  const [showBlocker, setShowBlocker] = useState(false);
  const {
    status,
    isLive,
    isBusy,
    micDenied,
    clearMicDenied,
    startSession,
    stopSession
  } = useVoiceSession({
    apiBase,
    accessToken,
    stepId
  });

  useEffect(() => {
    const loadImpact = async () => {
      try {
        const data = await request(`/impact/${impactId}`, {
          method: "GET",
          auth: true
        });
        setImpact(normalizeImpact(data, impactId));
      } catch (error) {
        setImpact(null);
      }
    };
    loadImpact();
  }, [impactId, request]);

  const orderedSteps = useMemo(() => {
    if (!impact?.steps) return [];
    return [...impact.steps].sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [impact]);

  const currentIndex = orderedSteps.findIndex((step) => step.id === stepId);
  const stepDetails = orderedSteps[currentIndex];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < orderedSteps.length - 1;

  const goToStep = (offset) => {
    const target = orderedSteps[currentIndex + offset];
    if (!target?.id) return;
    if (isLive) {
      setShowBlocker(true);
      return;
    }
    navigate(`/impacts/${impactId}/steps/${target.id}/step`);
  };

  useEffect(() => {
    if (isLive) {
      document.body.classList.add("session-locked");
    } else {
      document.body.classList.remove("session-locked");
    }
    return () => {
      document.body.classList.remove("session-locked");
    };
  }, [isLive]);

  return (
    <div className="page-grid">
      <section className="panel full" data-aos="fade-up">
        <div className="panel-header">
          <div>
            <div className="pill">
              <i className="fa-solid fa-microphone" /> Step coaching
            </div>
            <h2>{stepDetails?.title || "Guided step session"}</h2>
            <p className="muted step-order">Step {stepDetails?.order || ""}</p>
          </div>
          <div className="panel-actions step-actions">
            <button
              className="btn ghost btn-tight"
              type="button"
              onClick={() => {
                if (isLive) {
                  setShowBlocker(true);
                  return;
                }
                navigate(`/impacts/${impactId}`);
              }}
            >
              Back to steps
            </button>
          </div>
        </div>
        <p>{stepDetails?.description || "Start the session to begin coaching."}</p>
        <div className="voice-status">
          <div className={`dot ${isLive ? "active" : ""}`} />
          <div className="status">{status}</div>
        </div>
        <div className="row">
          <button className="btn" onClick={startSession} disabled={isLive || isBusy}>
            <i className="fa-solid fa-circle-play" /> Start session
          </button>
          <button
            className="btn secondary"
            onClick={() => stopSession(false)}
            disabled={!isLive}
          >
            <i className="fa-solid fa-circle-stop" /> End session
          </button>
        </div>
      </section>

      <section className="panel full" data-aos="fade-up">
        <div className="row">
          <button className="btn ghost" onClick={() => goToStep(-1)} disabled={!hasPrev}>
            <i className="fa-solid fa-arrow-left" /> Previous step
          </button>
          <button className="btn ghost" onClick={() => goToStep(1)} disabled={!hasNext}>
            Next step <i className="fa-solid fa-arrow-right" />
          </button>
        </div>
      </section>

      <section className="panel highlight" data-aos="fade-up">
        <h3>Session tips</h3>
        <div className="stack">
          <div className="feature-item">
            <i className="fa-solid fa-headphones" /> Use headphones for cleaner audio.
          </div>
          <div className="feature-item">
            <i className="fa-solid fa-wave-square" /> Speak in short phrases and wait for replies.
          </div>
          <div className="feature-item">
            <i className="fa-solid fa-shield-heart" /> Your access token is sent over secure websockets.
          </div>
        </div>
      </section>

      {showBlocker ? (
        <BlockerOverlay
          title="Session in progress"
          message="End the step session before navigating away."
          actionLabel="Got it"
          onClose={() => setShowBlocker(false)}
        />
      ) : null}

      {micDenied ? (
        <BlockerOverlay
          title="Microphone blocked"
          message="You need to allow microphone access to start or continue a step session."
          actionLabel="I will allow it"
          onClose={clearMicDenied}
        />
      ) : null}
    </div>
  );
};

export default StepPage;

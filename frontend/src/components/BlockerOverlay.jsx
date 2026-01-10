import React from "react";

const BlockerOverlay = ({ title, message, actionLabel = "Got it", onClose }) => {
  return (
    <div className="overlay" role="dialog" aria-modal="true">
      <div className="overlay-card">
        <h3>{title}</h3>
        <p className="muted">{message}</p>
        <button className="btn" type="button" onClick={onClose}>
          {actionLabel}
        </button>
      </div>
    </div>
  );
};

export default BlockerOverlay;

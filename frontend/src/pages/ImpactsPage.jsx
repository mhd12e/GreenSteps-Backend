import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApi } from "../hooks/useApi";

const ImpactsPage = () => {
  const navigate = useNavigate();
  const { request } = useApi();
  const [status, setStatus] = useState("Ready to build your next impact.");
  const [listStatus, setListStatus] = useState("Loading your impacts...");
  const [impactSummaries, setImpactSummaries] = useState([]);
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);

  const loadImpactList = async () => {
    setListStatus("Loading your impacts...");
    try {
      const data = await request("/impact", { method: "GET", auth: true });
      const ids = data.impact_ids || [];
      if (!ids.length) {
        setImpactSummaries([]);
        setListStatus("No impacts yet.");
        return;
      }
      const summaries = await Promise.all(
        ids.map(async (id) => {
          try {
            const impact = await request(`/impact/${id}`, {
              method: "GET",
              auth: true
            });
            return {
              id,
              title: impact.title || "Impact plan",
              description: impact.description || impact.descreption || ""
            };
          } catch (error) {
            return {
              id,
              title: "Impact plan",
              description: "Details unavailable."
            };
          }
        })
      );
      setImpactSummaries(summaries);
      setListStatus("");
    } catch (error) {
      setListStatus(`List failed: ${error.message}`);
    }
  };

  useEffect(() => {
    loadImpactList();
  }, [request]);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setStatus("Add a topic before generating.");
      return;
    }
    setBusy(true);
    setStatus("Building your impact...");
    try {
      const data = await request("/impact/generate", {
        method: "POST",
        auth: true,
        body: { topic }
      });
      setStatus("Impact ready. Review the overview below.");
      navigate(`/impacts/${data.id}`);
      loadImpactList();
    } catch (error) {
      setStatus(`Generate failed: ${error.message}`);
    } finally {
      setBusy(false);
    }
  };


  return (
    <div className="page-grid">
      <section className="panel" data-aos="fade-up">
        <h2>Impact builder</h2>
        <p>Create a new impact or jump into an existing one.</p>
        <div className="stack">
          <label htmlFor="impactTopic">Impact topic</label>
          <input
            id="impactTopic"
            type="text"
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            placeholder="Build a home composting setup"
          />
          <button className="btn" onClick={handleGenerate} disabled={busy}>
            {busy ? (
              <>
                <i className="fa-solid fa-spinner fa-spin" /> Generating...
              </>
            ) : (
              <>
                <i className="fa-solid fa-wand-magic-sparkles" /> Generate impact
              </>
            )}
          </button>
        </div>
        <div className="status status-spaced" role="status">
          {status}
        </div>
        <p className="helper-text">
          Impacts are practical sustainability plans, broken into clear steps you can follow.
        </p>
      </section>

      <section className="panel" data-aos="fade-up">
        <h2>Your impacts</h2>
        <p>Pick an impact to explore its steps.</p>
        {listStatus ? (
          <div className="status" role="status">
            {listStatus}
          </div>
        ) : null}
        <div className="list">
          {impactSummaries.map((impact) => (
            <div key={impact.id} className="card" data-aos="fade-up">
              <div className="card-row">
                <div>
                  <div className="card-title">{impact.title}</div>
                  <div className="card-subtitle">{impact.description}</div>
                </div>
                <button
                  className="btn ghost"
                  onClick={() => navigate(`/impacts/${impact.id}`)}
                >
                  <i className="fa-solid fa-arrow-right" /> View steps
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
};

export default ImpactsPage;

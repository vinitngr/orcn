"use client";

import { useState, useEffect } from "react";

export default function Home() {
  const [markets, setMarkets] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  
  const [marketId, setMarketId] = useState("");
  const [modelQuery, setModelQuery] = useState("qwen");
  const [selectedModel, setSelectedModel] = useState("");
  const [deployName, setDeployName] = useState("my-orcn-node");
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Load Markets on Mount
  useEffect(() => {
    fetch("/api/v1/markets?provider=nosana")
      .then((res) => res.json())
      .then((data) => {
        if (data.markets) {
          setMarkets(data.markets);
          const rtx3060 = data.markets.find((m: any) => m.name.includes("3060"));
          setMarketId(rtx3060 ? rtx3060.address : data.markets[0]?.address || "");
        }
      });
  }, []);

  const searchModels = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/models/search?runtime=vllm&q=${modelQuery}`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setModels(data.results || []);
      if (data.results?.length > 0) setSelectedModel(data.results[0].ID);
    } catch (e: any) {
      console.error(e);
      alert("Failed to search models: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const deploy = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/v1/deployments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: deployName,
          provider_id: "nosana",
          market_id: marketId,
          runtime_id: "vllm",
          model_id: selectedModel,
          timeout_minutes: 60,
        }),
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setResult(data);
    } catch (e: any) {
      console.error(e);
      alert("Failed to draft deployment: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <p style={{ color: "var(--text-muted)", marginBottom: "32px", fontSize: "0.9rem" }}>
        Universal Deployment Gateway MVP
      </p>
      <h1>Workspace</h1>
      
      <div className="card" style={{ marginTop: "32px" }}>
        <h2>1. Compute Provider (Nosana)</h2>
        <div className="form-group">
          <label>Select Market (GPU)</label>
          <select value={marketId} onChange={(e) => setMarketId(e.target.value)}>
            {markets.map((m) => (
              <option key={m.address} value={m.address}>
                {m.name} - ${m.usd_reward_per_hour}/hr
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card">
        <h2>2. AI Runtime (vLLM)</h2>
        <div className="form-group">
          <label>Search HuggingFace Model</label>
          <div style={{ display: "flex", gap: "8px" }}>
            <input 
              value={modelQuery} 
              onChange={(e) => setModelQuery(e.target.value)}
              placeholder="e.g. qwen" 
            />
            <button onClick={searchModels} style={{ width: "auto" }}>Search</button>
          </div>
        </div>

        {models.length > 0 && (
          <div className="form-group" style={{ marginTop: "16px" }}>
            <label>Select Supported Model</label>
            <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}>
              {models.map((m) => (
                <option key={m.ID} value={m.ID}>
                  {m.Name} ({m.Architecture})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="card">
        <h2>3. Launch</h2>
        <div className="form-group">
          <label>Deployment Name</label>
          <input 
            value={deployName} 
            onChange={(e) => setDeployName(e.target.value)} 
          />
        </div>
        
        <button 
          onClick={deploy} 
          disabled={loading || !marketId || !selectedModel}
        >
          {loading ? "Processing..." : "Draft Deployment"}
        </button>

        {result && (
          <div className="alert">
            <strong>Success! Draft Created</strong><br/>
            <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
              ID: {result.deployment_id}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

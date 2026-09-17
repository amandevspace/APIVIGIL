import { AlertTriangle, CheckCircle, Clock } from "lucide-react";

function severityColor(alert) {
  if (alert.severity === "high" || alert.severity === "critical" || alert.anomaly) return "#ef4444";
  if (alert.severity === "medium" || alert.severity === "warning") return "#f59e0b";
  return "#22c55e";
}

export default function AlertsPanel({ alerts = [] }) {
  return (
    <section style={{ background: "#0d0d0f", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <AlertTriangle size={16} color="#f59e0b" />
          <h3 style={{ margin: 0, fontSize: 13, color: "#fff" }}>Anomaly Alerts</h3>
        </div>
        <span style={{ fontSize: 11, color: "#94a3b8" }}>{alerts.length} total</span>
      </div>
      {alerts.length === 0 ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#64748b", fontSize: 12 }}>
          <CheckCircle size={14} color="#22c55e" /> No anomalies detected.
        </div>
      ) : alerts.slice(0, 5).map((alert, index) => {
        const color = severityColor(alert);
        return (
          <div key={alert._id || index} style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "11px 0", display: "flex", gap: 10 }}>
            <span style={{ width: 7, height: 7, borderRadius: 99, background: color, marginTop: 5, flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ color: "#cbd5e1", fontSize: 12, fontWeight: 600 }}>{alert.message || "Latency or error-rate threshold exceeded"}</div>
              <div style={{ color: "#64748b", fontSize: 11, marginTop: 4, display: "flex", gap: 10, flexWrap: "wrap" }}>
                {alert.predictedLatency != null && <span><Clock size={11} /> {Number(alert.predictedLatency).toFixed(0)}ms</span>}
                {alert.errorRate != null && <span>Error rate: {(Number(alert.errorRate) * 100).toFixed(1)}%</span>}
                {alert.timestamp && <span>{new Date(alert.timestamp).toLocaleString()}</span>}
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
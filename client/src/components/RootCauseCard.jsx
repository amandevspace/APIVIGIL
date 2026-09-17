import { Lightbulb, Wrench } from "lucide-react";

export default function RootCauseCard({ insight }) {
  if (!insight) {
    return (
      <section style={{ background: "#0d0d0f", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: 16 }}>
        <h3 style={{ margin: 0, fontSize: 13, color: "#fff" }}>Root Cause Analysis</h3>
        <p style={{ color: "#64748b", fontSize: 12, margin: "12px 0 0" }}>AI explanation will appear after an anomaly is detected.</p>
      </section>
    );
  }

  return (
    <section style={{ background: "#0d0d0f", border: "1px solid rgba(167,139,250,0.2)", borderRadius: 14, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <Lightbulb size={16} color="#a78bfa" />
        <h3 style={{ margin: 0, fontSize: 13, color: "#fff" }}>Root Cause Analysis</h3>
      </div>
      <div style={{ color: "#cbd5e1", fontSize: 12, lineHeight: 1.6 }}>{insight.rootCause || "No root cause provided."}</div>
      <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#a78bfa", fontSize: 11, fontWeight: 700, marginBottom: 6 }}>
          <Wrench size={13} /> Suggested Fix
        </div>
        <div style={{ color: "#94a3b8", fontSize: 12, lineHeight: 1.6 }}>{insight.suggestedFix || "Review the related logs and monitor the service."}</div>
      </div>
    </section>
  );
}
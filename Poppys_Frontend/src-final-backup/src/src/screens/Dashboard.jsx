import React, { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";

const menuCards = [
  { label: "Machine Report", icon: "🧵", color: "#38a169" },
  { label: "Line Report", icon: "🏭", color: "#d69e2e" },
  { label: "Operator Report", icon: "📑", color: "#805ad5" },
  { label: "Consolidated Report", icon: "⚙️", color: "#e53e3e" }
];

// Generate random data for live graph simulation
function getRandomData() {
  const now = new Date();
  return Array.from({ length: 10 }, (_, i) => ({
    name: `${now.getMinutes()}:${(now.getSeconds() + i) % 60}`,
    value: Math.floor(Math.random() * 100) + 20
  }));
}

function LiveCard({ label, icon, color }) {
  const [data, setData] = useState(getRandomData());

  useEffect(() => {
    const interval = setInterval(() => {
      setData(getRandomData());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
        padding: 24,
        minWidth: 260,
        flex: "1 1 320px",
        margin: 12,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start"
      }}
    >
      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 16 }}>{label}</div>
      <div style={{ width: "100%", height: 120 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" hide />
            <YAxis hide domain={[0, 120]} />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: 24
      }}
    >
      {menuCards.map(card => (
        <LiveCard key={card.label} {...card} />
      ))}
      {/* Responsive styles */}
      <style>
        {`
          @media (max-width: 900px) {
            .dashboard-cards {
              flex-direction: column !important;
              align-items: center !important;
            }
          }
        `}
      </style>
    </div>
  );
}
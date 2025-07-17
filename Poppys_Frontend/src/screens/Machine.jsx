import React, { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { FaSearch } from "react-icons/fa";
import { SiMicrosoftexcel } from "react-icons/si";
import { FaCalendarAlt } from "react-icons/fa";
import { FaDownload } from "react-icons/fa";
import '../../assets/css/style.css';
const tableHeaders = [
  "Date",
  "Total Hours",
  "Sewing",
  "Idle",
  "Rework",
  "No Feeding",
  "Meeting",
  "Maintenance",
  "Needle Break",
  "PT %",
  "NPT %",
  "Needle Runtime %",
  "Sewing Speed",
  "Stitch Count",
];

const dummyData = [
  {
    date: "2025-07-16",
    totalHours: 8,
    sewing: 5,
    idle: 1,
    rework: 0.5,
    noFeeding: 0.2,
    meeting: 0.3,
    maintenance: 0.5,
    needleBreak: 0.1,
    pt: 80,
    npt: 20,
    needleRuntime: 75,
    sewingSpeed: 1200,
    stitchCount: 15000,
  },
  // Add more rows as needed
];

const pieColors = [
  "#3182ce",
  "#d69e2e",
  "#e53e3e",
  "#805ad5",
  "#718096",
  "#63b3ed",
];

function getPieData(row) {
  return [
    { name: "Sewing", value: row.sewing },
    { name: "Idle", value: row.idle },
    { name: "Rework", value: row.rework },
    { name: "No Feeding", value: row.noFeeding },
    { name: "Meeting", value: row.meeting },
    { name: "Maintenance", value: row.maintenance },
    { name: "Needle Break", value: row.needleBreak },
  ];
}

export default function Machine() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [data] = useState(dummyData);
  const [page, setPage] = useState(1);
  const [machineId, setMachineId] = useState(""); // New state for dropdown
  const rowsPerPage = 10;

  const filtered = data.filter(
    (row) =>
      (!search || row.date.includes(search)) &&
      (!from || row.date >= from) &&
      (!to || row.date <= to)
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const paginated = filtered.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  const handleReset = () => {
    setFrom("");
    setTo("");
    setSearch("");
    setPage(1);
    setMachineId("");
  };

  const handleCSV = () => {
    const csv = [
      tableHeaders.join(","),
      ...filtered.map((row) =>
        [
          row.date,
          row.totalHours,
          row.sewing,
          row.idle,
          row.rework,
          row.noFeeding,
          row.meeting,
          row.maintenance,
          row.needleBreak,
          row.pt,
          row.npt,
          row.needleRuntime,
          row.sewingSpeed,
          row.stitchCount,
        ].join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "machine_report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleHTML = () => {
    const html = `
      <table border="1">
        <thead>
          <tr>${tableHeaders.map((h) => `<th>${h}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${filtered
            .map(
              (row) => `
            <tr>
              <td>${row.date}</td>
              <td>${row.totalHours}</td>
              <td>${row.sewing}</td>
              <td>${row.idle}</td>
              <td>${row.rework}</td>
              <td>${row.noFeeding}</td>
              <td>${row.meeting}</td>
              <td>${row.maintenance}</td>
              <td>${row.needleBreak}</td>
              <td>${row.pt}</td>
              <td>${row.npt}</td>
              <td>${row.needleRuntime}</td>
              <td>${row.sewingSpeed}</td>
              <td>${row.stitchCount}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    `;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "machine_report.html";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRawData = () => {
    // Implement raw data view logic here
  };

  const handleSummary = () => {
    // Implement summary view logic here
  };

  const Pagination = () => (
    <div className="machine-pagination">
      <button
        onClick={() => setPage((p) => Math.max(1, p - 1))}
        disabled={page === 1}
        className="machine-btn machine-btn-blue"
      >
        Prev
      </button>
      <span style={{ fontWeight: 500, fontSize: 16 }}>
        Page {page} of {pageCount}
      </span>
      <button
        onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
        disabled={page === pageCount}
        className="machine-btn machine-btn-blue"
      >
        Next
      </button>
    </div>
  );

  const pieRow = filtered[0] || dummyData[0];

  // Example tile data, you can adjust as needed
  const tileData = [
    {
      label: "Total Hours",
      value: pieRow.totalHours ?? 0,
      bg: "#e3f2fd",
      color: "#1976d2",
    },
    {
      label: "Sewing",
      value: pieRow.sewing ?? 0,
      bg: "#e8f5e9",
      color: "#388e3c",
    },
    { label: "Idle", value: pieRow.idle ?? 0, bg: "#fff3e0", color: "#f57c00" },
    {
      label: "Rework",
      value: pieRow.rework ?? 0,
      bg: "#fce4ec",
      color: "#c2185b",
    },
  ];

  return (
    <div className="machine-root">
      {/* Header Card */}
      <div
        className="machine-header-actions"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "1.2rem",
          alignItems: "center",
          marginTop: "1.2rem",
        }}
      >
        {/* ...existing header actions... */}
      </div>

      {/* Table Card */}
      <div className="machine-table-card">
        <div
          className="machine-table-title"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1.2rem",
            flexWrap: "wrap",
          }}
        >
          Machine Report Table
          <div
            className="machine-header-actions"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "1.2rem",
              alignItems: "center",
              marginTop: 0,
            }}
          >
            <div className="date-filter">
              <div className="date-input-group">
                <div className="date-field">
                  <FaCalendarAlt className="calendar-icon" />
                  <input
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="date-input"
                  />
                  <span className="date-label">From</span>
                </div>
                <div className="date-field">
                  <FaCalendarAlt className="calendar-icon" />
                  <input
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="date-input"
                  />
                  <span className="date-label">To</span>
                </div>
              </div>
            </div>
            <select
              value={machineId}
              onChange={(e) => setMachineId(e.target.value)}
              style={{
                minWidth: 160,
                padding: "12px 12px",
                border: "1px solid #cbd5e1",
                borderRadius: 6,
                fontSize: 15,
                background: "#fff",
                color: "#374151",
              }}
            >
              <option value="">Select Machine ID</option>
              <option value="M1">M1</option>
              <option value="M2">M2</option>
              <option value="M3">M3</option>
            </select>
            <button
              type="button"
              className="machine-btn machine-btn-blue"
              style={{ minWidth: 90 }}
              onClick={() => setPage(1)}
            >
              Generate
            </button>
            <button
              type="button"
              className="machine-btn machine-btn-red"
              onClick={handleReset}
            >
              Reset
            </button>
          </div>
          {/* Info Buttons Row */}
          <div
            className="machine-info-btns-row"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.7rem",
              alignItems: "center",
              marginLeft: "0",
              marginTop: 0,
            }}
          >
            <button
              type="button"
              className="machine-btn"
              style={{
                background: "#2f855a",
                color: "#fff",
                border: "none",
              }}
              onClick={handleCSV}
            >
              <SiMicrosoftexcel
                style={{ fontSize: 20, verticalAlign: "middle", marginRight: 6 }}
              /> CSV
            </button>
            <button
              type="button"
              className="machine-btn machine-btn-purple"
              onClick={handleHTML}
            >
              <FaDownload style={{ fontSize: 16, verticalAlign: "middle", marginRight: 6 }} />
              HTML
            </button>
            <button
              type="button"
              className="machine-btn machine-btn-orange"
              onClick={handleRawData}
            >
              <FaDownload style={{ fontSize: 16, verticalAlign: "middle", marginRight: 6 }} />
              View Raw Data
            </button>
            <button
              type="button"
              className="machine-btn machine-btn-blue"
              onClick={handleSummary}
            >
              <FaDownload style={{ fontSize: 16, verticalAlign: "middle", marginRight: 6 }} />
              View Summary
            </button>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="machine-table">
            <thead>
              <tr>
                {tableHeaders.map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td
                    colSpan={tableHeaders.length}
                    className="machine-table-nodata"
                  >
                    No data found.
                  </td>
                </tr>
              ) : (
                paginated.map((row, idx) => (
                  <tr key={idx}>
                    <td>{row.date}</td>
                    <td>{row.totalHours}</td>
                    <td>{row.sewing}</td>
                    <td>{row.idle}</td>
                    <td>{row.rework}</td>
                    <td>{row.noFeeding}</td>
                    <td>{row.meeting}</td>
                    <td>{row.maintenance}</td>
                    <td>{row.needleBreak}</td>
                    <td>{row.pt}</td>
                    <td>{row.npt}</td>
                    <td>{row.needleRuntime}</td>
                    <td>{row.sewingSpeed}</td>
                    <td>{row.stitchCount}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination />
      </div>

      {/* Tiles Row - End to End */}
      <div className="machine-tiles-row machine-tiles-row-full">
        {tileData.map((tile, idx) => (
          <div
            className="machine-tile machine-tile-shade"
            key={tile.label}
            style={{
              background: tile.bg,
              color: tile.color,
              flex: 1,
              minWidth: 0,
              margin: "0 8px",
            }}
          >
            <div className="machine-tile-label">{tile.label}</div>
            <div className="machine-tile-value">{tile.value}</div>
          </div>
        ))}
      </div>

      {/* Pie Chart Card - Full width */}
      <div className="machine-pie-card machine-pie-card-full">
        <div className="machine-pie-chart machine-pie-chart-large">
          <ResponsiveContainer width="100%" height={380}>
            <PieChart>
              <Pie
                data={getPieData(pieRow)}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={170}
                innerRadius={100}
                labelLine={false}
                label={({ name }) => name}
              >
                {getPieData(pieRow).map((_, i) => (
                  <Cell key={i} fill={pieColors[i % pieColors.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="machine-pie-info">
          <div className="machine-pie-title">Machine Time Distribution</div>
          {getPieData(pieRow).map((item, idx) => (
            <div className="machine-pie-label" key={item.name}>
              <span
                style={{
                  display: "inline-block",
                  width: 12,
                  height: 12,
                  background: pieColors[idx % pieColors.length],
                  borderRadius: "50%",
                  marginRight: 8,
                  verticalAlign: "middle",
                }}
              ></span>
              <span style={{ minWidth: 90, display: "inline-block" }}>
                {item.name}:
              </span>
              <span style={{ fontWeight: 600, marginLeft: 8 }}>
                {item.value} hrs
              </span>
            </div>
          ))}
        </div>
      </div>

      
    </div>
  );
}
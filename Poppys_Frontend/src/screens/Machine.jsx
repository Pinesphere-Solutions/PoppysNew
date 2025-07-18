import React, { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { FaSearch } from "react-icons/fa";
import { SiMicrosoftexcel } from "react-icons/si";
import { FaCalendarAlt } from "react-icons/fa";
import { FaDownload } from "react-icons/fa";
import '../../assets/css/style.css'; // Import your CSS styles

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
      <span className="machine-pagination-label">
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
      bg: "tile-bg-blue",
      color: "tile-color-blue",
    },
    {
      label: "Sewing",
      value: pieRow.sewing ?? 0,
      bg: "tile-bg-green",
      color: "tile-color-green",
    },
    { label: "Idle", value: pieRow.idle ?? 0, bg: "tile-bg-orange", color: "tile-color-orange" },
    {
      label: "Rework",
      value: pieRow.rework ?? 0,
      bg: "tile-bg-pink",
      color: "tile-color-pink",
    },
  ];

  return (
    <div className="machine-root">
      {/* Title and Buttons Row */}
      <div className="machine-title-row">
        <div className="machine-title">
          Machine Report Table
        </div>
        <div className="machine-title-btns">
          <button
            type="button"
            className="machine-btn machine-btn-csv"
            onClick={handleCSV}
          >
            <SiMicrosoftexcel className="machine-btn-icon" /> CSV
          </button>
          <button
            type="button"
            className="machine-btn machine-btn-html"
            onClick={handleHTML}
          >
            <FaDownload className="machine-btn-icon" />
            HTML
          </button>
          <button
            type="button"
            className="machine-btn machine-btn-raw"
            onClick={handleRawData}
          >
            <FaDownload className="machine-btn-icon" />
            View Raw Data
          </button>
        </div>
      </div>

      {/* Table Card */}
      <div className="machine-table-card">
        {/* Filters and Actions inside table card */}
                <div className="machine-header-actions" style={{ display: "flex", justifyContent: "center", alignItems: "center", marginBottom: 16 }}>
                  <div style={{ display: "flex", gap: 25, alignItems: "center", flexWrap: "wrap" }}>
                    <div className="date-input-group" style={{ display: "flex", gap: 8 }}>
                      <div className="date-field" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span><FaCalendarAlt className="calendar-icon" /></span>
                        <input
                          type="date"
                          value={from}
                          onChange={(e) => setFrom(e.target.value)}
                          className="date-input"
                          style={{ width: 110 }}
                        />
                        <span className="date-label" style={{ fontSize: 12 }}>From</span>
                      </div>
                      <div className="date-field" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span><FaCalendarAlt className="calendar-icon" /></span>
                        <input
                          type="date"
                          value={to}
                          onChange={(e) => setTo(e.target.value)}
                          className="date-input"
                          style={{ width: 110 }}
                        />
                        <span className="date-label" style={{ fontSize: 12 }}>To</span>
                      </div>
                    </div>
                    <select
                      value={machineId}
                      onChange={(e) => setMachineId(e.target.value)}
                      className="machine-select"
                      style={{ minWidth: 120, height: 42, fontSize: 14 }}
                    >
                      <option value="">Select Machine ID</option>
                      <option value="M1">M1</option>
                      <option value="M2">M2</option>
                      <option value="M3">M3</option>
                    </select>
                    <button
                      type="button"
                      className="machine-btn machine-btn-blue machine-btn-generate"
                      onClick={() => setPage(1)}
                      style={{ height: 32, fontSize: 14, padding: "0 16px" }}
                    >
                      Generate
                    </button>
                    <button
                      type="button"
                      className="machine-btn machine-btn-red machine-btn-reset"
                      onClick={handleReset}
                      style={{ height: 32, fontSize: 14, padding: "0 16px" }}
                    >
                      Reset
                    </button>
                  </div>
                </div>
        
        <div className="machine-table-scroll">
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
            className={`machine-tile machine-tile-shade ${tile.bg} ${tile.color}`}
            key={tile.label}
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
          {getPieData(pieRow).map((item, idx) => (
            <div className="machine-pie-label" key={item.name}>
              <span
                className="machine-pie-dot"
                style={{
                  background: pieColors[idx % pieColors.length],
                }}
              ></span>
              <span className="machine-pie-name">
                {item.name}:
              </span>
              <span className="machine-pie-value">
                {item.value} hrs
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
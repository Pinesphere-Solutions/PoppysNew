import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { FaSearch } from "react-icons/fa";
import { SiMicrosoftexcel } from "react-icons/si";
import { FaCalendarAlt } from "react-icons/fa";
import { FaDownload } from "react-icons/fa";
import '../../assets/css/style.css'; // Import your CSS styles
import axios from "axios";
import * as XLSX from "xlsx";

// Modified table headers as per your request
const tableHeaders = [
  "S.No",
  "Date",
  "Line Number",
  "Total Hours",
  "Sewing",
  "Idle",
  "Rework",
  "No Feeding",
  "Meeting",
  "Maintenance",
  "Needle Break",
  "PT(%)",
  "NPT (%)",
  "Needle Runtime (%)",
  "Sewing Speed",
  "Stitch Count",
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
    { name: "Sewing", value: row.sewing ?? 0 },
    { name: "Idle", value: row.idle ?? 0 },
    { name: "Rework", value: row.rework ?? 0 },
    { name: "No Feeding", value: row.noFeeding ?? 0 },
    { name: "Meeting", value: row.meeting ?? 0 },
    { name: "Maintenance", value: row.maintenance ?? 0 },
    { name: "Needle Break", value: row.needleBreak ?? 0 },
  ];
}

export default function Line({ 
  tableOnly = false, 
  from: propFrom = "", 
  to: propTo = "", 
  machineId: propMachineId = "", 
  selectedOperatorId: propSelectedOperatorId = "", 
  lineId: propLineId = "" 
}) {
  const [from, setFrom] = useState(propFrom);
  const [to, setTo] = useState(propTo);
  const [search, setSearch] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [operatorId, setOperatorId] = useState(propLineId);
  const [operatorOptions, setOperatorOptions] = useState([]);
  const rowsPerPage = 10;
  const [filtersActive, setFiltersActive] = useState(false);
  
  // ✅ ADD: State for tile data from Line Report backend
  const [tileData, setTileData] = useState({
    tile1_productive_time: { percentage: 0, total_productive_hours: "00:00", total_hours: "00:00" },
    tile2_needle_time: { percentage: 0 },
    tile3_sewing_speed: { average_spm: 0 },
    tile4_total_hours: { total_hours: "00:00" }
  });

  // Update state when props change
  useEffect(() => {
    setFrom(propFrom);
    setTo(propTo);
    setOperatorId(propLineId);
  }, [propFrom, propTo, propLineId]);

  // Dynamically fetch line IDs for dropdown
  useEffect(() => {
    if (!tableOnly) {
      axios
        .get("http://localhost:8000/api/poppys-line-logs/")
        .then(res => {
          const ids = (res.data.summary || []).map(row => row["Line ID"]);
          setOperatorOptions([...new Set(ids)]);
        })
        .catch(() => setOperatorOptions([]));
    }
  }, [from, to, operatorId, tableOnly]);

  // ✅ FIXED: Fetch data from Line Report backend with proper tile extraction
  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (from && to) {
        params.from = from;
        params.to = to;
      } else if (from) {
        params.date = from;
      }
      if (operatorId || propLineId) {
        params.line_id = operatorId || propLineId;
      }
      if (propMachineId) {
        params.machine_id = propMachineId;
      }
      if (propSelectedOperatorId) {
        params.operator_id = propSelectedOperatorId;
      }

      // ✅ FIXED: Call Line Report endpoint with parameters
      const res = await axios.get("http://localhost:8000/api/line-report/", { params });

      const backendRows = res.data.summary || [];

      const mappedRows = backendRows.map((row, idx) => {
        const normalizedDate = row["Date"] || row["date"] || "";
        return {
          sNo: idx + 1,
          date: normalizedDate,
          // ✅ FIXED: Use correct field names from LineReport backend
          lineNumber: row["Line Number"] ?? "",       // Fixed field name
          totalHours: row["Total Hours"] ?? "00:00",  // Fixed with default
          sewing: row["Sewing Hours"] ?? "00:00",
          idle: row["Idle Hours"] ?? "00:00",
          rework: row["Rework Hours"] ?? "00:00",
          noFeeding: row["No feeding Hours"] ?? "00:00",
          meeting: row["Meeting Hours"] ?? "00:00",
          maintenance: row["Maintenance Hours"] ?? "00:00",
          needleBreak: row["Needle Break"] ?? "00:00",
          pt: row["PT %"] ?? 0,
          npt: row["NPT %"] ?? 0,
          needleRuntime: row["Needle Runtime %"] ?? 0,
          sewingSpeed: row["SPM"] ?? 0,
          stitchCount: row["Stitch Count"] ?? 0,
        };
      });

      setData(mappedRows);

      // ✅ FIXED: Extract tile data from Line Report backend response
      if (!tableOnly) {
        setTileData({
          tile1_productive_time: res.data.tile1_productive_time || { 
            percentage: 0, 
            total_productive_hours: "00:00", 
            total_hours: "00:00" 
          },
          tile2_needle_time: res.data.tile2_needle_time || { percentage: 0 },
          tile3_sewing_speed: res.data.tile3_sewing_speed || { average_spm: 0 },
          tile4_total_hours: res.data.tile4_total_hours || { total_hours: "00:00" }
        });
      }

    } catch (err) {
      console.error("Line Report fetch error:", err);
      setData([]);
      
      // ✅ FIXED: Reset tile data on error
      if (!tableOnly) {
        setTileData({
          tile1_productive_time: { percentage: 0, total_productive_hours: "00:00", total_hours: "00:00" },
          tile2_needle_time: { percentage: 0 },
          tile3_sewing_speed: { average_spm: 0 },
          tile4_total_hours: { total_hours: "00:00" }
        });
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, [from, to, operatorId, propMachineId, propSelectedOperatorId, propLineId]);

  // ✅ UPDATED: Use fetched data directly (no additional filtering needed as backend handles it)
  const filtered = data;
  const pageCount = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const paginated = filtered.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  // ✅ UPDATED: Use first row for pie chart or empty object
  const pieRow = filtered[0] || {
    sewing: "00:00",
    idle: "00:00", 
    rework: "00:00",
    noFeeding: "00:00",
    meeting: "00:00",
    maintenance: "00:00",
    needleBreak: "00:00"
  };

  // ✅ FIXED: Use Line tile data with correct structure
  const tiles = [
    {
      label: "Productive Time %",
      value: `${tileData.tile1_productive_time.percentage}%`,
      bg: "tile-bg-blue",
      color: "tile-color-blue",
    },
    {
      label: "Needle Time %", 
      value: `${tileData.tile2_needle_time.percentage}%`,
      bg: "tile-bg-green",
      color: "tile-color-green",
    },
    {
      label: "Sewing Speed",
      value: `${tileData.tile3_sewing_speed.average_spm} SPM`,
      bg: "tile-bg-orange", 
      color: "tile-color-orange"
    },
    {
      label: "Total Hours",
      value: tileData.tile4_total_hours.total_hours,
      bg: "tile-bg-pink",
      color: "tile-color-pink",
    },
  ];

  const handleReset = () => {
    setFrom("");
    setTo("");
    setSearch("");
    setPage(1);
    setOperatorId("");
    setFiltersActive(false);
    fetchData();
  };

  const handleGenerate = () => {
    setPage(1);
    setFiltersActive(true);
    fetchData();
  };

  const handleCSV = () => {
    const csv = [
      tableHeaders.join(","),
      ...filtered.map((row, idx) =>
        [
          row.sNo,
          row.date,
          row.lineNumber,
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
    a.download = "line_report.csv";
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
              (row, idx) => `
            <tr>
              <td>${row.sNo}</td>
              <td>${row.date}</td>
              <td>${row.lineNumber}</td>
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
    a.download = "line_report.html";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRawData = () => {
    console.log("Raw data view requested");
  };

  const handleSummary = () => {
    console.log("Summary view requested");
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

  // ✅ ADD: If tableOnly mode, return only the table
  if (tableOnly) {
    return (
      <div className="machine-table-card">
        <div className="machine-table-scroll" style={{ overflowX: "auto", minWidth: "100%" }}>
          <table className="machine-table" style={{ tableLayout: "auto", width: "100%" }}>
            <thead>
              <tr>
                {tableHeaders.map((h) => (
                  <th
                    key={h}
                    style={{
                      whiteSpace: "nowrap",
                      padding: "8px 12px",
                      textAlign: "center",
                      border: "1px solid #e2e8f0",
                      background: "#d3edff",
                      fontWeight: 600,
                      fontSize: "15px",
                      minWidth: "110px",
                      color: "#000",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={tableHeaders.length} className="machine-table-nodata">
                    Loading...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={tableHeaders.length} className="machine-table-nodata">
                    No data found.
                  </td>
                </tr>
              ) : (
                paginated.map((row, idx) => (
                  <tr key={idx}>
                    <td>{row.sNo}</td>
                    <td>{row.date}</td>
                    <td>{row.lineNumber}</td>
                    <td>{row.totalHours}</td>
                    <td>{row.sewing}</td>
                    <td>{row.idle}</td>
                    <td>{row.rework}</td>
                    <td>{row.noFeeding}</td>
                    <td>{row.meeting}</td>
                    <td>{row.maintenance}</td>
                    <td>{row.needleBreak}</td>
                    <td>{row.pt}%</td>
                    <td>{row.npt}%</td>
                    <td>{row.needleRuntime}%</td>
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
    );
  }

  // ✅ EXISTING: Full component view when not in tableOnly mode
  return (
    <div className="machine-root">
      {/* Title and Buttons Row */}
      <div className="machine-title-row">
        <div className="machine-title">
          Line Table
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
              value={operatorId}
              onChange={(e) => setOperatorId(e.target.value)}
              className="machine-select"
              style={{ minWidth: 120, height: 42, fontSize: 14 }}
            >
              <option value="">Select Line ID</option>
              {operatorOptions.map((id) => (
                <option key={id} value={id}>{id}</option>
              ))}
            </select>
            <button
              type="button"
              className="machine-btn machine-btn-blue machine-btn-generate"
              onClick={handleGenerate}
              disabled={loading}
            >
              {loading ? "Loading..." : "Generate"}
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

        <div className="machine-table-scroll" style={{ overflowX: "auto", minWidth: "100%" }}>
          <table className="machine-table" style={{ tableLayout: "auto", width: "100%" }}>
            <thead>
              <tr>
                {tableHeaders.map((h) => (
                  <th
                    key={h}
                    style={{
                      whiteSpace: "nowrap",
                      padding: "8px 12px",
                      textAlign: "center",
                      border: "1px solid #e2e8f0",
                      background: "#d3edff",
                      fontWeight: 600,
                      fontSize: "15px",
                      minWidth: "110px",
                      color: "#000",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={tableHeaders.length} className="machine-table-nodata">
                    Loading...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={tableHeaders.length} className="machine-table-nodata">
                    No data found.
                  </td>
                </tr>
              ) : (
                paginated.map((row, idx) => (
                  <tr key={idx}>
                    <td>{row.sNo}</td>
                    <td>{row.date}</td>
                    <td>{row.lineNumber}</td>
                    <td>{row.totalHours}</td>
                    <td>{row.sewing}</td>
                    <td>{row.idle}</td>
                    <td>{row.rework}</td>
                    <td>{row.noFeeding}</td>
                    <td>{row.meeting}</td>
                    <td>{row.maintenance}</td>
                    <td>{row.needleBreak}</td>
                    <td>{row.pt}%</td>
                    <td>{row.npt}%</td>
                    <td>{row.needleRuntime}%</td>
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

      {/* ✅ FIXED: Tiles Row - Use Line tile data */}
      <div className="machine-tiles-row machine-tiles-row-full">
        {tiles.map((tile, idx) => (
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
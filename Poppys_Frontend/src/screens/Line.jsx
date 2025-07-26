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

// ✅ NEW: Raw data table headers
const rawTableHeaders = [
  "S.No",
  "Machine ID",
  "Line Number", 
  "Operator ID",
  "Operator Name",
  "Date",
  "Start Time",
  "End Time",
  "Mode",
  "Mode Description",
  "Stitch Count",
  "Needle Runtime",
  "Needle Stop Time",
  "Duration",
  "SPM",
  "TX Log ID",
  "STR Log ID",
  "Created At"
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
  
  // ✅ NEW: Raw data state
  const [showRawData, setShowRawData] = useState(false);
  const [rawData, setRawData] = useState([]);
  const [rawLoading, setRawLoading] = useState(false);
  
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

  // ✅ NEW: Fetch raw data function
  const fetchRawData = async () => {
    setRawLoading(true);
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

      // ✅ NEW: Call Line Raw Data endpoint
      const res = await axios.get("http://localhost:8000/api/line-report/raw/", { params });
      setRawData(res.data.raw_data || []);
    } catch (err) {
      console.error("Line Raw Data fetch error:", err);
      setRawData([]);
    }
    setRawLoading(false);
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

  // ✅ NEW: Raw data pagination
  const rawPageCount = Math.max(1, Math.ceil(rawData.length / rowsPerPage));
  const rawPaginated = rawData.slice(
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
    setShowRawData(false); // ✅ NEW: Reset raw data view
    fetchData();
  };

  const handleGenerate = () => {
    setPage(1);
    setFiltersActive(true);
    if (showRawData) {
      fetchRawData();
    } else {
      fetchData();
    }
  };

  const handleCSV = () => {
    // ✅ NEW: Handle both summary and raw data CSV export
    const currentData = showRawData ? rawData : filtered;
    const currentHeaders = showRawData ? rawTableHeaders : tableHeaders;
    
    let csvRows;
    if (showRawData) {
      csvRows = currentData.map(row => [
        row["S.No"],
        row["Machine ID"],
        row["Line Number"],
        row["Operator ID"],
        row["Operator Name"],
        row["Date"],
        row["Start Time"],
        row["End Time"],
        row["Mode"],
        row["Mode Description"],
        row["Stitch Count"],
        row["Needle Runtime"],
        row["Needle Stop Time"],
        row["Duration"],
        row["SPM"],
        row["TX Log ID"],
        row["STR Log ID"],
        row["Created At"]
      ]);
    } else {
      csvRows = currentData.map(row => [
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
      ]);
    }

    const csv = [
      currentHeaders.join(","),
      ...csvRows.map(row => row.join(","))
    ].join("\n");
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `line_report_${showRawData ? 'raw' : 'summary'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleHTML = () => {
    // ✅ NEW: Handle both summary and raw data HTML export
    const currentData = showRawData ? rawData : filtered;
    const currentHeaders = showRawData ? rawTableHeaders : tableHeaders;
    
    let htmlRows;
    if (showRawData) {
      htmlRows = currentData.map(row => `
        <tr>
          <td>${row["S.No"]}</td>
          <td>${row["Machine ID"]}</td>
          <td>${row["Line Number"]}</td>
          <td>${row["Operator ID"]}</td>
          <td>${row["Operator Name"]}</td>
          <td>${row["Date"]}</td>
          <td>${row["Start Time"]}</td>
          <td>${row["End Time"]}</td>
          <td>${row["Mode"]}</td>
          <td>${row["Mode Description"]}</td>
          <td>${row["Stitch Count"]}</td>
          <td>${row["Needle Runtime"]}</td>
          <td>${row["Needle Stop Time"]}</td>
          <td>${row["Duration"]}</td>
          <td>${row["SPM"]}</td>
          <td>${row["TX Log ID"]}</td>
          <td>${row["STR Log ID"]}</td>
          <td>${row["Created At"]}</td>
        </tr>
      `);
    } else {
      htmlRows = currentData.map(row => `
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
      `);
    }

    const html = `
      <table border="1">
        <thead>
          <tr>${currentHeaders.map((h) => `<th>${h}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${htmlRows.join("")}
        </tbody>
      </table>
    `;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `line_report_${showRawData ? 'raw' : 'summary'}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ✅ NEW: Handle raw data view toggle
  const handleRawData = () => {
    setShowRawData(!showRawData);
    setPage(1); // Reset to first page
    if (!showRawData) {
      fetchRawData(); // Fetch raw data when switching to raw view
    }
  };

  const handleSummary = () => {
    console.log("Summary view requested");
  };

  const Pagination = () => {
    const currentPageCount = showRawData ? rawPageCount : pageCount;
    
    return (
      <div className="machine-pagination">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="machine-btn machine-btn-blue"
        >
          Prev
        </button>
        <span className="machine-pagination-label">
          Page {page} of {currentPageCount}
        </span>
        <button
          onClick={() => setPage((p) => Math.min(currentPageCount, p + 1))}
          disabled={page === currentPageCount}
          className="machine-btn machine-btn-blue"
        >
          Next
        </button>
      </div>
    );
  };

  // ✅ ADD: If tableOnly mode, return only the table
  if (tableOnly) {
    const currentHeaders = showRawData ? rawTableHeaders : tableHeaders;
    const currentData = showRawData ? rawPaginated : paginated;
    const currentLoading = showRawData ? rawLoading : loading;

    return (
      <div className="machine-table-card">
        <div className="machine-table-scroll" style={{ overflowX: "auto", minWidth: "100%" }}>
          <table className="machine-table" style={{ tableLayout: "auto", width: "100%" }}>
            <thead>
              <tr>
                {currentHeaders.map((h) => (
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
              {currentLoading ? (
                <tr>
                  <td colSpan={currentHeaders.length} className="machine-table-nodata">
                    Loading...
                  </td>
                </tr>
              ) : currentData.length === 0 ? (
                <tr>
                  <td colSpan={currentHeaders.length} className="machine-table-nodata">
                    No data found.
                  </td>
                </tr>
              ) : showRawData ? (
                currentData.map((row, idx) => (
                  <tr key={idx}>
                    <td>{row["S.No"]}</td>
                    <td>{row["Machine ID"]}</td>
                    <td>{row["Line Number"]}</td>
                    <td>{row["Operator ID"]}</td>
                    <td>{row["Operator Name"]}</td>
                    <td>{row["Date"]}</td>
                    <td>{row["Start Time"]}</td>
                    <td>{row["End Time"]}</td>
                    <td>{row["Mode"]}</td>
                    <td>{row["Mode Description"]}</td>
                    <td>{row["Stitch Count"]}</td>
                    <td>{row["Needle Runtime"]}</td>
                    <td>{row["Needle Stop Time"]}</td>
                    <td>{row["Duration"]}</td>
                    <td>{row["SPM"]}</td>
                    <td>{row["TX Log ID"]}</td>
                    <td>{row["STR Log ID"]}</td>
                    <td>{row["Created At"]}</td>
                  </tr>
                ))
              ) : (
                currentData.map((row, idx) => (
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

  const currentHeaders = showRawData ? rawTableHeaders : tableHeaders;
  const currentData = showRawData ? rawPaginated : paginated;
  const currentLoading = showRawData ? rawLoading : loading;

  // ✅ EXISTING: Full component view when not in tableOnly mode
  return (
    <div className="machine-root">
      {/* Title and Buttons Row */}
      <div className="machine-title-row">
        <div className="machine-title">
          Line Table {showRawData ? "- Raw Data" : ""}
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
            className={`machine-btn ${showRawData ? 'machine-btn-blue' : 'machine-btn-raw'}`}
            onClick={handleRawData}
          >
            <FaDownload className="machine-btn-icon" />
            {showRawData ? 'View Summary' : 'View Raw Data'}
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
              disabled={currentLoading}
            >
              {currentLoading ? "Loading..." : "Generate"}
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
                {currentHeaders.map((h) => (
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
              {currentLoading ? (
                <tr>
                  <td colSpan={currentHeaders.length} className="machine-table-nodata">
                    Loading...
                  </td>
                </tr>
              ) : currentData.length === 0 ? (
                <tr>
                  <td colSpan={currentHeaders.length} className="machine-table-nodata">
                    No data found.
                  </td>
                </tr>
              ) : showRawData ? (
                currentData.map((row, idx) => (
                  <tr key={idx}>
                    <td>{row["S.No"]}</td>
                    <td>{row["Machine ID"]}</td>
                    <td>{row["Line Number"]}</td>
                    <td>{row["Operator ID"]}</td>
                    <td>{row["Operator Name"]}</td>
                    <td>{row["Date"]}</td>
                    <td>{row["Start Time"]}</td>
                    <td>{row["End Time"]}</td>
                    <td>{row["Mode"]}</td>
                    <td>{row["Mode Description"]}</td>
                    <td>{row["Stitch Count"]}</td>
                    <td>{row["Needle Runtime"]}</td>
                    <td>{row["Needle Stop Time"]}</td>
                    <td>{row["Duration"]}</td>
                    <td>{row["SPM"]}</td>
                    <td>{row["TX Log ID"]}</td>
                    <td>{row["STR Log ID"]}</td>
                    <td>{row["Created At"]}</td>
                  </tr>
                ))
              ) : (
                currentData.map((row, idx) => (
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

      {/* ✅ HIDE: Tiles and Pie Chart when showing raw data */}
      {!showRawData && (
        <>
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
        </>
      )}
    </div>
  );
}
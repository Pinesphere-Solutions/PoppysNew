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
  "Operator ID",
  "Operator Name",
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
    { name: "Sewing", value: parseFloat(row.sewing) || 0 },
    { name: "Idle", value: parseFloat(row.idle) || 0 },
    { name: "Rework", value: parseFloat(row.rework) || 0 },
    { name: "No Feeding", value: parseFloat(row.noFeeding) || 0 },
    { name: "Meeting", value: parseFloat(row.meeting) || 0 },
    { name: "Maintenance", value: parseFloat(row.maintenance) || 0 },
    { name: "Needle Break", value: parseFloat(row.needleBreak) || 0 },
  ];
}

export default function Operator({ tableOnly = false, from: propFrom = "", to: propTo = "", machineId, selectedOperatorId, lineId }) {

  /* const [from, setFrom] = useState("");
  const [to, setTo] = useState(""); */
  
  // Use props for date values, similar to Machine.jsx
  const [from, setFrom] = useState(propFrom);
  const [to, setTo] = useState(propTo);
  
  const [search, setSearch] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [operatorId, setOperatorId] = useState("");
  const [operatorOptions, setOperatorOptions] = useState([]);
  const rowsPerPage = 10;
  const [filtersActive, setFiltersActive] = useState(false);
  const [showRawData, setShowRawData] = useState(false);
  const [rawData, setRawData] = useState([]);
  const [rawPage, setRawPage] = useState(1);

  // Update state when props change (similar to Machine.jsx)
  useEffect(() => {
    setFrom(propFrom);
    setTo(propTo);
  }, [propFrom, propTo]);

  // Raw data table headers
  const rawDataHeaders = [
    "S.No",
    "Operator ID",
    "Operator Name", 
    "Machine ID",
    "Line Number",
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
    "Calculation Value",
    "TX Log ID",
    "STR Log ID",
    "Created At"
  ];

  // Fetch raw data from backend
  const fetchRawData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (from) params.from = from;
      if (to) params.to = to;
      if (operatorId) params.operator_id = operatorId;

      console.log("Operator raw data request params:", params);

      const res = await axios.get("http://localhost:8000/api/operator-report/raw/", { params });
      console.log("Operator raw data response:", res.data);
      
      const backendRawRows = res.data.raw_data || res.data || [];

      const mappedRawRows = backendRawRows.map((row, idx) => ({
        sNo: idx + 1,
        operatorId: row["Operator ID"] || row["operator_id"] || "",
        operatorName: row["Operator Name"] || row["operator_name"] || "",
        machineId: row["Machine ID"] || row["machine_id"] || "",
        lineNumber: row["Line Number"] || row["line_number"] || "",
        date: row["Date"] || row["date"] || "",
        startTime: row["Start Time"] || row["start_time"] || "",
        endTime: row["End Time"] || row["end_time"] || "",
        mode: row["Mode"] || row["mode"] || "",
        modeDescription: row["Mode Description"] || row["mode_description"] || "",
        stitchCount: row["Stitch Count"] || row["stitch_count"] || "-",
        needleRuntime: row["Needle Runtime"] || row["needle_runtime"] || "-",
        needleStopTime: row["Needle Stop Time"] || row["needle_stop_time"] || "-",
        duration: row["Duration"] || row["duration"] || "",
        spm: row["SPM"] || row["spm"] || "0",
        calculationValue: row["Calculation Value"] || row["calculation_value"] || "0",
        txLogId: row["TX Log ID"] || row["tx_log_id"] || "",
        strLogId: row["STR Log ID"] || row["str_log_id"] || "",
        createdAt: row["Created At"] || row["created_at"] || ""
      }));

      console.log("Mapped operator raw rows:", mappedRawRows);
      setRawData(mappedRawRows);
    } catch (err) {
      console.error("Operator raw data fetch error:", err);
      setRawData([]);
    }
    setLoading(false);
  };
  
  // ✅ NEW: Add tile data state
  const [tileData, setTileData] = useState({
    tile1_productive_time: { percentage: 0, total_productive_hours: "00:00", total_hours: "00:00" },
    tile2_needle_time: { percentage: 0 },
    tile3_sewing_speed: { average_spm: 0 },
    tile4_total_hours: { total_hours: "00:00" }
  });

  // ✅ FIXED: Fetch operator IDs from the correct operator report endpoint
  useEffect(() => {
    const fetchOperatorOptions = async () => {
      try {
        console.log("🔍 Fetching operator options...");
        const response = await axios.get("http://localhost:8000/api/operator-report/");
        
        console.log("📊 Raw API Response:", response);
        console.log("📈 Response Data:", response.data);
        
        const summary = response.data.summary || [];
        console.log("📝 Summary Array:", summary);
        
        if (summary.length > 0) {
          console.log("🔬 First Summary Item:", summary[0]);
          console.log("🔑 Available Keys:", Object.keys(summary[0]));
        }
        
        // ✅ FIX: Extract operator IDs from operator report data
        const uniqueOperatorIds = [...new Set(summary.map(row => {
          return row["Operator ID"] || row["operator_id"] || row["OPERATOR_ID"];
        }).filter(Boolean))];
        
        console.log("👥 Extracted Operator IDs:", uniqueOperatorIds);
        
        setOperatorOptions(uniqueOperatorIds);
      } catch (error) {
        console.error("❌ Error fetching operator options:", error);
        setOperatorOptions([]);
      }
    };
    
    fetchOperatorOptions();
  }, []);

  // ✅ FIXED: Fetch data from operator report endpoint with correct mapping
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
      
      if (operatorId) {
        params.operator_id = operatorId;
      }

      console.log("Fetching operator data with params:", params);
      
      const response = await axios.get("http://localhost:8000/api/operator-report/", { params });
      
      console.log("Backend response:", response.data);
      
      const backendRows = response.data.summary || [];
      
      // ✅ DEBUG: Log the first row to see available keys
      if (backendRows.length > 0) {
        console.log("First row keys:", Object.keys(backendRows[0]));
        console.log("First row data:", backendRows[0]);
      }
      
      // ✅ FIXED: Map operator-specific backend data to frontend structure
      const mappedRows = backendRows.map((row, idx) => {
        // ✅ FIX: Better operator ID extraction with debugging
  const operatorId = row["Operator ID"] || row["operator_id"] || row["OPERATOR_ID"] || row["operator_id"];
  const operatorName = row["Operator Name"] || row["operator_name"] || row["OPERATOR_NAME"] || row["operator_name"];
        
        console.log(`🔍 Row ${idx + 1} mapping:`, {
          rawRow: row,
          extractedOperatorId: operatorId,
          extractedOperatorName: operatorName,
          allKeys: Object.keys(row)
        });
        
        return {
          sNo: row["S.no"] || row["S.No"] || (idx + 1),
          date: row["Date"] || "",
          operatorId: operatorId || "N/A",
          operatorName: operatorName || "Unknown",
          totalHours: row["Total Hours"] || "00:00",
          sewing: row["Sewing Hours"] || "00:00",
          idle: row["Idle Hours"] || "N/A",
          rework: row["Rework Hours"] || "00:00",
          noFeeding: row["No feeding Hours"] || "00:00",
          meeting: row["Meeting Hours"] || "00:00",
          maintenance: row["Maintenance Hours"] || "00:00",
          needleBreak: row["Needle Break"] || "00:00",
          pt: row["PT %"] || 0,
          npt: row["NPT %"] || 0,
          needleRuntime: row["Needle Runtime %"] || 0,
          sewingSpeed: row["SPM"] || 0,
          stitchCount: row["Stitch Count"] || 0,
        };
      });
      
      console.log("✅ Final mapped data:", mappedRows);
      setData(mappedRows);
      
      // ✅ FIXED: Update tile data from operator backend response
      setTileData({
        tile1_productive_time: response.data.tile1_productive_time || { percentage: 0, total_productive_hours: "00:00", total_hours: "00:00" },
        tile2_needle_time: response.data.tile2_needle_time || { percentage: 0 },
        tile3_sewing_speed: response.data.tile3_sewing_speed || { average_spm: 0 },
        tile4_total_hours: response.data.tile4_total_hours || { total_hours: "00:00" }
      });

    } catch (error) {
      console.error("Error fetching operator data:", error);
      setData([]);
      setTileData({
        tile1_productive_time: { percentage: 0, total_productive_hours: "00:00", total_hours: "00:00" },
        tile2_needle_time: { percentage: 0 },
        tile3_sewing_speed: { average_spm: 0 },
        tile4_total_hours: { total_hours: "00:00" }
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, [from, to, propFrom, propTo, selectedOperatorId, lineId]);

  // ✅ UPDATED: Use fetched data directly (no additional filtering needed as backend handles it)
  const filtered = data;
  const pageCount = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const paginated = filtered.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  // Raw data pagination
  const rawPageCount = Math.max(1, Math.ceil(rawData.length / rowsPerPage));
  const rawPaginated = rawData.slice(
    (rawPage - 1) * rowsPerPage,
    rawPage * rowsPerPage
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

  // ✅ FIXED: Use operator tile data with correct structure
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
    setRawPage(1);
    setOperatorId("");
    setFiltersActive(false);
    setShowRawData(false);
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
          row.operatorId,
          row.operatorName,
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
    a.download = "operator_report.csv";
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
              <td>${row.operatorId}</td>
              <td>${row.operatorName}</td>
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
    a.download = "operator_report.html";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRawData = () => {
    if (showRawData) {
      setShowRawData(false);
    } else {
      setShowRawData(true);
      fetchRawData();
    }
  };

  const handleSummary = () => {
    setShowRawData(false);
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

  const RawPagination = () => (
    <div className="machine-pagination">
      <button
        onClick={() => setRawPage((p) => Math.max(1, p - 1))}
        disabled={rawPage === 1}
        className="machine-btn machine-btn-blue"
      >
        Prev
      </button>
      <span className="machine-pagination-label">
        Page {rawPage} of {rawPageCount}
      </span>
      <button
        onClick={() => setRawPage((p) => Math.min(rawPageCount, p + 1))}
        disabled={rawPage === rawPageCount}
        className="machine-btn machine-btn-blue"
      >
        Next
      </button>
    </div>
  );

  // If tableOnly mode, return only the table (similar to Machine.jsx)
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
              {paginated.length === 0 ? (
                <tr>
                  <td
                    colSpan={tableHeaders.length}
                    className="machine-table-nodata"
                  >
                    {loading ? "Loading..." : "No data found."}
                  </td>
                </tr>
              ) : (
                paginated.map((row, idx) => (
                  <tr key={idx}>
                    <td style={{ textAlign: 'center', padding: '8px' }}>{row.sNo}</td>
                    <td style={{ textAlign: 'center', padding: '8px' }}>{row.date}</td>
                    <td style={{ textAlign: 'center', padding: '8px', fontWeight: 'bold' }}>{row.operatorId}</td>
                    <td style={{ textAlign: 'center', padding: '8px' }}>{row.operatorName}</td>
                    <td style={{ textAlign: 'center', padding: '8px' }}>{row.totalHours}</td>
                    <td style={{ textAlign: 'center', padding: '8px' }}>{row.sewing}</td>
                    <td style={{ textAlign: 'center', padding: '8px' }}>{row.idle}</td>
                    <td style={{ textAlign: 'center', padding: '8px' }}>{row.rework}</td>
                    <td style={{ textAlign: 'center', padding: '8px' }}>{row.noFeeding}</td>
                    <td style={{ textAlign: 'center', padding: '8px' }}>{row.meeting}</td>
                    <td style={{ textAlign: 'center', padding: '8px' }}>{row.maintenance}</td>
                    <td style={{ textAlign: 'center', padding: '8px' }}>{row.needleBreak}</td>
                    <td style={{ textAlign: 'center', padding: '8px' }}>{row.pt}%</td>
                    <td style={{ textAlign: 'center', padding: '8px' }}>{row.npt}%</td>
                    <td style={{ textAlign: 'center', padding: '8px' }}>{row.needleRuntime}%</td>
                    <td style={{ textAlign: 'center', padding: '8px' }}>{row.sewingSpeed}</td>
                    <td style={{ textAlign: 'center', padding: '8px' }}>{row.stitchCount}</td>
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

  return (
    <div className="machine-root">
      {/* Title and Buttons Row - Hide when tableOnly is true */}
      {!tableOnly && (
      
      <div className="machine-title-row">
        <div className="machine-title">
          Operator Table
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
            className={`machine-btn ${showRawData ? 'machine-btn-orange' : 'machine-btn-raw'}`}
            onClick={handleRawData}
          >
            <FaDownload className="machine-btn-icon" />
            {showRawData ? 'View Summary' : 'View Raw Data'}
          </button>
        </div>
      </div>
         )}

      {/* Conditional rendering based on showRawData */}
      {showRawData ? (
        /* Raw Data Table - Show when showRawData is true */
        <div className="machine-table-card" style={{ marginTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, color: '#333' }}>Operator Raw Data</h3>
          </div>
          <div className="machine-table-scroll" style={{ overflowX: "auto", minWidth: "100%" }}>
            <table className="machine-table" style={{ tableLayout: "auto", width: "100%" }}>
              <thead>
                <tr>
                  {rawDataHeaders.map((h) => (
                    <th
                      key={h}
                      style={{
                        whiteSpace: "nowrap",
                        padding: "8px 12px",
                        textAlign: "center",
                        border: "1px solid #e2e8f0",
                        background: "#d3edff",
                        fontWeight: 600,
                        fontSize: "14px",
                        minWidth: "100px",
                        color: "#000",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rawPaginated.length === 0 ? (
                  <tr>
                    <td
                      colSpan={rawDataHeaders.length}
                      className="machine-table-nodata"
                      style={{
                        textAlign: "center",
                        padding: "20px",
                        fontStyle: "italic",
                        color: "#666"
                      }}
                    >
                      {loading ? "Loading operator raw data..." : "No operator raw data found."}
                    </td>
                  </tr>
                ) : (
                  rawPaginated.map((row, idx) => (
                    <tr key={idx}>
                      <td style={{ padding: "8px 12px", border: "1px solid #e2e8f0", fontSize: "13px", textAlign: "center" }}>{row.sNo}</td>
                      <td style={{ padding: "8px 12px", border: "1px solid #e2e8f0", fontSize: "13px", textAlign: "center", fontWeight: "bold" }}>{row.operatorId}</td>
                      <td style={{ padding: "8px 12px", border: "1px solid #e2e8f0", fontSize: "13px", textAlign: "center" }}>{row.operatorName}</td>
                      <td style={{ padding: "8px 12px", border: "1px solid #e2e8f0", fontSize: "13px", textAlign: "center" }}>{row.machineId}</td>
                      <td style={{ padding: "8px 12px", border: "1px solid #e2e8f0", fontSize: "13px", textAlign: "center" }}>{row.lineNumber}</td>
                      <td style={{ padding: "8px 12px", border: "1px solid #e2e8f0", fontSize: "13px", textAlign: "center" }}>{row.date}</td>
                      <td style={{ padding: "8px 12px", border: "1px solid #e2e8f0", fontSize: "13px", textAlign: "center" }}>{row.startTime}</td>
                      <td style={{ padding: "8px 12px", border: "1px solid #e2e8f0", fontSize: "13px", textAlign: "center" }}>{row.endTime}</td>
                      <td style={{ padding: "8px 12px", border: "1px solid #e2e8f0", fontSize: "13px", textAlign: "center" }}>{row.mode}</td>
                      <td style={{ padding: "8px 12px", border: "1px solid #e2e8f0", fontSize: "13px", textAlign: "center" }}>{row.modeDescription}</td>
                      <td style={{ padding: "8px 12px", border: "1px solid #e2e8f0", fontSize: "13px", textAlign: "center" }}>{row.stitchCount}</td>
                      <td style={{ padding: "8px 12px", border: "1px solid #e2e8f0", fontSize: "13px", textAlign: "center" }}>{row.needleRuntime}</td>
                      <td style={{ padding: "8px 12px", border: "1px solid #e2e8f0", fontSize: "13px", textAlign: "center" }}>{row.needleStopTime}</td>
                      <td style={{ padding: "8px 12px", border: "1px solid #e2e8f0", fontSize: "13px", textAlign: "center" }}>{row.duration}</td>
                      <td style={{ padding: "8px 12px", border: "1px solid #e2e8f0", fontSize: "13px", textAlign: "center" }}>{row.spm}</td>
                      <td style={{ padding: "8px 12px", border: "1px solid #e2e8f0", fontSize: "13px", textAlign: "center" }}>{row.calculationValue}</td>
                      <td style={{ padding: "8px 12px", border: "1px solid #e2e8f0", fontSize: "13px", textAlign: "center" }}>{row.txLogId}</td>
                      <td style={{ padding: "8px 12px", border: "1px solid #e2e8f0", fontSize: "13px", textAlign: "center" }}>{row.strLogId}</td>
                      <td style={{ padding: "8px 12px", border: "1px solid #e2e8f0", fontSize: "13px", textAlign: "center" }}>{row.createdAt}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <RawPagination />
        </div>
      ) : (
        /* Summary View - Show when showRawData is false */
        <>
          {/* Table Card */}
          <div className="machine-table-card">
            {/* Filters and Actions inside table card */}
             {!tableOnly && (
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
                  <option value="">Select Operator ID</option>
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
     )}
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
                        <td style={{ textAlign: 'center', padding: '8px' }}>{row.sNo}</td>
                        <td style={{ textAlign: 'center', padding: '8px' }}>{row.date}</td>
                        <td style={{ textAlign: 'center', padding: '8px', fontWeight: 'bold' }}>{row.operatorId}</td>
                        <td style={{ textAlign: 'center', padding: '8px' }}>{row.operatorName}</td>
                        <td style={{ textAlign: 'center', padding: '8px' }}>{row.totalHours}</td>
                        <td style={{ textAlign: 'center', padding: '8px' }}>{row.sewing}</td>
                        <td style={{ textAlign: 'center', padding: '8px' }}>{row.idle}</td>
                        <td style={{ textAlign: 'center', padding: '8px' }}>{row.rework}</td>
                        <td style={{ textAlign: 'center', padding: '8px' }}>{row.noFeeding}</td>
                        <td style={{ textAlign: 'center', padding: '8px' }}>{row.meeting}</td>
                        <td style={{ textAlign: 'center', padding: '8px' }}>{row.maintenance}</td>
                        <td style={{ textAlign: 'center', padding: '8px' }}>{row.needleBreak}</td>
                        <td style={{ textAlign: 'center', padding: '8px' }}>{row.pt}%</td>
                        <td style={{ textAlign: 'center', padding: '8px' }}>{row.npt}%</td>
                        <td style={{ textAlign: 'center', padding: '8px' }}>{row.needleRuntime}%</td>
                        <td style={{ textAlign: 'center', padding: '8px' }}>{row.sewingSpeed}</td>
                        <td style={{ textAlign: 'center', padding: '8px' }}>{row.stitchCount}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pagination />
          </div>

          {/* ✅ FIXED: Tiles Row - Use operator tile data */}
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
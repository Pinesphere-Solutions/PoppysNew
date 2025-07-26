import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { FaSearch } from "react-icons/fa";
import { SiMicrosoftexcel } from "react-icons/si";
import { FaCalendarAlt } from "react-icons/fa";
import { FaDownload } from "react-icons/fa";
import '../../assets/css/style.css'; // Import your CSS styles
import axios from "axios";
import * as XLSX from "xlsx";


/* Table Headers */
const tableHeaders = [
  "S.No",
  "Machine ID",
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

/* Pie chart colors */
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

function formatHoursMins(decimalHours) {
  if (!decimalHours) return "0h 0m";
  const totalMins = Math.round(Number(decimalHours) * 60);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${h}h ${m}m`;
}

// Add this helper function to convert HH:MM to decimal hours for pie chart
function convertHHMMToDecimal(timeStr) {
  if (!timeStr || timeStr === "00:00") return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours + (minutes / 60);
}

export default function Machine({ tableOnly = false, from: propFrom = "", to: propTo = "", machineId: propMachineId = "", selectedOperatorId, lineId }) {
  const [from, setFrom] = useState(propFrom);
  const [to, setTo] = useState(propTo);
  const [machineId, setMachineId] = useState(propMachineId);
  const [search, setSearch] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [machineOptions, setMachineOptions] = useState([]);
  const rowsPerPage = 10;
  const [filtersActive, setFiltersActive] = useState(false);
  const [showRawData, setShowRawData] = useState(false);
  const [rawData, setRawData] = useState([]);
  const [rawPage, setRawPage] = useState(1);

  // Update state when props change
  useEffect(() => {
    setFrom(propFrom);
    setTo(propTo);
    setMachineId(propMachineId);
  }, [propFrom, propTo, propMachineId]);

// Raw data table headers
  const rawDataHeaders = [
    "S.No",
    "Machine ID", 
    "Line Number",
    "Operator ID",
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
      // ✅ FIX: Use regular date format for raw data, not the colon format
      if (from) params.from = from; // Use YYYY-MM-DD format directly
      if (to) params.to = to; // Use YYYY-MM-DD format directly
      if (machineId) params.machine_id = machineId;
  
      console.log("Raw data request params:", params); // ✅ Add debug log
  
      const res = await axios.get("http://localhost:8000/api/poppys-machine-logs/raw/", { params });
      console.log("Raw data response:", res.data); // ✅ Add debug log
      
      const backendRawRows = res.data.raw_data || res.data || []; // ✅ Try both structures
  
      const mappedRawRows = backendRawRows.map((row, idx) => ({
        sNo: idx + 1,
        machineId: row["Machine ID"] || row["MACHINE_ID"] || row["machine_id"] || "",
        lineNumber: row["Line Number"] || row["LINE_NUMB"] || row["line_number"] || "",
        operatorId: row["Operator ID"] || row["OPERATOR_ID"] || row["operator_id"] || "",
        date: row["Date"] || row["DATE"] || row["date"] || "",
        startTime: row["Start Time"] || row["START_TIME"] || row["start_time"] || "",
        endTime: row["End Time"] || row["END_TIME"] || row["end_time"] || "",
        mode: row["Mode"] || row["MODE"] || row["mode"] || "",
        modeDescription: row["Mode Description"] || row["mode_description"] || "",
        stitchCount: row["Stitch Count"] || row["STITCH_COUNT"] || row["stitch_count"] || "-",
        needleRuntime: row["Needle Runtime"] || row["NEEDLE_RUNTIME"] || row["needle_runtime"] || "-",
        needleStopTime: row["Needle Stop Time"] || row["needle_stop_time"] || "-",
        duration: row["Duration"] || row["duration"] || "",
        spm: row["SPM"] || row["spm"] || "0",
        calculationValue: row["Calculation Value"] || row["calculation_value"] || "0",
        txLogId: row["TX Log ID"] || row["Tx_LOGID"] || row["tx_log_id"] || "",
        strLogId: row["STR Log ID"] || row["Str_LOGID"] || row["str_log_id"] || "",
        createdAt: row["Created At"] || row["created_at"] || ""
      }));
  
      console.log("Mapped raw rows:", mappedRawRows); // ✅ Add debug log
      setRawData(mappedRawRows);
    } catch (err) {
      console.error("Raw data fetch error:", err); // ✅ Add error log
      setRawData([]);
    }
    setLoading(false);
  };
  
  

  /* Helper function */
  function formatBackendDate(dateStr) {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    return `${year}:${month.padStart(2, "0")}:${day.padStart(2, "0")}`;
  }

  // Dynamically fetch machine IDs for dropdown
  useEffect(() => {
    axios
      .get("http://localhost:8000/api/poppys-machine-logs/")
      .then(res => {
        const ids = (res.data.summary || []).map(row => row["Machine ID"]);
        setMachineOptions([...new Set(ids)]);
      })
      .catch(() => setMachineOptions([]));
  }, [from, to, machineId, tableOnly]);

  // Fetch data from backend
  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {};

      if (from) params.from = formatBackendDate(from); // Always use colons
      if (to) params.to = formatBackendDate(to);       // Always use colons
      if (machineId) params.machine_id = machineId;

      const res = await axios.get("http://localhost:8000/api/poppys-machine-logs/", { params });
      const backendRows = res.data.summary || [];

      // ✅ Store Tile 1 - productivity data for tiles
      const tile1Data = res.data.tile1_productivity || {};
      const tile2Data = res.data.tile2_needle_runtime || {};
      const tile3Data = res.data.tile3_sewing_speed || {};
      const tile4Data = res.data.tile4_total_hours || {};  // ✅ Add Tile 4 data

      const mappedRows = backendRows
  .map((row, idx) => {
    let rawDate = row["Date"] || row["DATE"] || row["date"] || "";
    return {
      sNo: row["S.no"] ?? idx + 1,
      machineId: row["Machine ID"] ?? row["machine_id"] ?? "",
      date: rawDate,
      // Keep original HH:MM format for table display
      totalHours: row["Total Hours"] || "00:00",
      sewing: row["Sewing Hours"] || "00:00",
      idle: row["Idle Hours"] || "00:00",
      rework: row["Rework Hours"] || "00:00",
      noFeeding: row["No feeding Hours"] || "00:00",
      meeting: row["Meeting Hours"] || "00:00",
      maintenance: row["Maintenance Hours"] || "00:00",
      needleBreak: row["Needle Break"] || "00:00",
      // Add decimal versions for pie chart calculations
      totalHoursDecimal: convertHHMMToDecimal(row["Total Hours"]) || 0,
      sewingDecimal: convertHHMMToDecimal(row["Sewing Hours"]) || 0,
      idleDecimal: convertHHMMToDecimal(row["Idle Hours"]) || 0,
      reworkDecimal: convertHHMMToDecimal(row["Rework Hours"]) || 0,
      noFeedingDecimal: convertHHMMToDecimal(row["No feeding Hours"]) || 0,
      meetingDecimal: convertHHMMToDecimal(row["Meeting Hours"]) || 0,
      maintenanceDecimal: convertHHMMToDecimal(row["Maintenance Hours"]) || 0,
      needleBreakDecimal: convertHHMMToDecimal(row["Needle Break"]) || 0,
      pt: row["PT %"] ?? 0,
      npt: row["NPT %"] ?? 0,
      needleRuntime: row["Needle Time %"] ?? 0,
      sewingSpeed: row["SPM"] ?? 0,
      stitchCount: row["Stitch Count"] ?? 0,
      // ✅ Add tile1_productivity data to be accessible in component
      tile1_productivity: tile1Data, //Productive Time %
      tile2_needle_runtime: tile2Data, // Needle Runtime %
      tile3_sewing_speed: tile3Data, // Sewing Speed
      tile4_total_hours: tile4Data, // Total Hours
    };
  })
        .sort((a, b) => {
          // Convert YYYY:MM:DD to YYYY-MM-DD for sorting
          const aDate = a.date.replace(/:/g, ":");
          const bDate = b.date.replace(/:/g, ":");
          return new Date(aDate) - new Date(bDate);
        });

      setData(mappedRows);
    } catch (err) {
      setData([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, [from, to, machineId, propMachineId, selectedOperatorId, lineId]);

  // Filter by search, from, to
  const filtered = data;

  // const filtered = data; // Use the fetched data directly for now
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

  const pieRow = filtered[0] || {};

  // Sum all rows for each hour type
// Sum all rows for each hour type - use decimal versions for calculations
const sumByKey = (key) =>
  filtered.reduce((sum, row) => sum + (parseFloat(row[key]) || 0), 0);

const totalHoursSum = sumByKey("totalHoursDecimal");
const sewingSum = sumByKey("sewingDecimal");
const idleSum = sumByKey("idleDecimal");
const reworkSum = sumByKey("reworkDecimal");
const noFeedingSum = sumByKey("noFeedingDecimal");
const meetingSum = sumByKey("meetingDecimal");
const maintenanceSum = sumByKey("maintenanceDecimal");
const needleBreakSum = sumByKey("needleBreakDecimal");

  // ✅ Get tile1_productivity data from the first row (all rows have same tile data)
  const tile1ProductivityData = pieRow.tile1_productivity || {};
  const tile2NeedleRuntimeData = pieRow.tile2_needle_runtime || {};
  const tile3SewingSpeedData = pieRow.tile3_sewing_speed || {};
  const tile4TotalHoursData = pieRow.tile4_total_hours || {};  // ✅ Add Tile 4 data

  const tileData = [
    {
      label: "Productive Time %",
      value: tile1ProductivityData.productivity_percentage_average + "%" || "0%", // ✅ Use backend percentage
      bg: "tile-bg-blue",
      color: "tile-color-blue",
    },
    {
      label: "Needle Runtime %",
      value: (pieRow.tile2_needle_runtime?.average_needle_runtime_decimal || 0) + "%", // ✅ Use backend percentage
      bg: "tile-bg-green",
      color: "tile-color-green",
    },
    { label: "Sewing Speed", value: tile3SewingSpeedData.average_sewing_speed_decimal || 0,  // ✅ Use Tile 3 data (no % sign),
      bg: "tile-bg-orange", 
      color: "tile-color-orange" 
    },
    {
      label: "Total Hours",
      value: tile4TotalHoursData.total_hours_sum || "00:00",  // ✅ Use Tile 4 data in HH:MM format
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
    setMachineId("");
    setFiltersActive(false);
    fetchData();
  };

  const handleCSV = () => {
    const csv = [
      tableHeaders.join(","),
      ...filtered.map((row, idx) =>
        [
          idx + 1,
          row.machineId,
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

  const handleExcel = () => {
    const wsData = [
      tableHeaders,
      ...filtered.map((row, idx) => [
        idx + 1,
        row.machineId,
        row.date,
        row.totalHours,
        row.sewing,
        row.idle,
        row.rework,
        row.noFeeding,
        row.meeting,
        row.maintenance,
        row.needleBreak,
        row.pt + " %",
        row.npt + " %",
        row.needleRuntime + " %",
        row.sewingSpeed,
        row.stitchCount,
      ])
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, "machine_report.xlsx");
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
              <td>${idx + 1}</td>
              <td>${row.machineId}</td>
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

  // If tableOnly mode, return only the table
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
                    <td>{row.sNo}</td>
                    <td>{row.machineId}</td>
                    <td>{row.date}</td>
                    <td>{row.totalHours}</td>
                    <td>{row.sewing}</td>
                    <td>{row.idle}</td>
                    <td>{row.rework}</td>
                    <td>{row.noFeeding}</td>
                    <td>{row.meeting}</td>
                    <td>{row.maintenance}</td>
                    <td>{row.needleBreak}</td>
                    <td>{row.pt + " %"}</td>
                    <td>{row.npt + " %"}</td>
                    <td>{row.needleRuntime + " %"}</td>
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

  return (
    <div className="machine-root">
      {/* Title and Buttons Row - Hide when tableOnly is true */}
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
            className={`machine-btn ${showRawData ? 'machine-btn-orange' : 'machine-btn-raw'}`}
            onClick={handleRawData}
          >
            <FaDownload className="machine-btn-icon" />
            {showRawData ? 'View Summary' : 'View Raw Data'}
          </button>
        </div>
      </div>

      {/* Conditional rendering based on showRawData */}
      {showRawData ? (
        /* Raw Data Table - Show when showRawData is true */
        <div className="machine-table-card" style={{ marginTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, color: '#333' }}>Raw Data</h3>
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
                      {loading ? "Loading raw data..." : "No raw data found."}
                    </td>
                  </tr>
                ) : (
                  rawPaginated.map((row, idx) => (
                    <tr key={idx}>
                      <td style={{ padding: "8px 12px", border: "1px solid #e2e8f0", fontSize: "13px", textAlign: "center" }}>{row.sNo}</td>
                      <td style={{ padding: "8px 12px", border: "1px solid #e2e8f0", fontSize: "13px", textAlign: "center" }}>{row.machineId}</td>
                      <td style={{ padding: "8px 12px", border: "1px solid #e2e8f0", fontSize: "13px", textAlign: "center" }}>{row.lineNumber}</td>
                      <td style={{ padding: "8px 12px", border: "1px solid #e2e8f0", fontSize: "13px", textAlign: "center" }}>{row.operatorId}</td>
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
                  {machineOptions.map((id) => (
                    <option key={id} value={id}>{id}</option>
                  ))}
                </select>
                
                <button
                  type="button"
                  className="machine-btn machine-btn-blue machine-btn-generate"
                  onClick={() => {
                    setPage(1);
                    setFiltersActive(true);
                    fetchData();
                  }}
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
                        No data found.
                      </td>
                    </tr>
                  ) : (
                    paginated.map((row, idx) => (
                      <tr key={idx}>
                        <td>{row.sNo}</td>
                        <td>{row.machineId}</td>
                        <td>{row.date}</td>
                        <td>{row.totalHours}</td>
                        <td>{row.sewing}</td>
                        <td>{row.idle}</td>
                        <td>{row.rework}</td>
                        <td>{row.noFeeding}</td>
                        <td>{row.meeting}</td>
                        <td>{row.maintenance}</td>
                        <td>{row.needleBreak}</td>
                        <td>{row.pt + " %"}</td>
                        <td>{row.npt + " %"}</td>
                        <td>{row.needleRuntime + " %"}</td>
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
          <div className="machine-pie-card machine-pie-card-full" style={{ display: 'flex', alignItems: 'center', gap: '2rem', minHeight: '400px', padding: '35px', }}>
            <div className="machine-pie-chart machine-pie-chart-large" style={{ minWidth: 420, width: 420, height: 380, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: "Sewing", value: Math.max(sewingSum, 0.01) },
                      { name: "Idle", value: Math.max(idleSum, 0.01) },
                      { name: "Rework", value: Math.max(reworkSum, 0.01) },
                      { name: "No Feeding", value: Math.max(noFeedingSum, 0.01) },
                      { name: "Meeting", value: Math.max(meetingSum, 0.01) },
                      { name: "Maintenance", value: Math.max(maintenanceSum, 0.01) },
                      { name: "Needle Break", value: Math.max(needleBreakSum, 0.01) },
                    ]}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    innerRadius={60}
                    labelLine={false}
                    label={false}
                  >
                    {[
                      sewingSum,
                      idleSum,
                      reworkSum,
                      noFeedingSum,
                      meetingSum,
                      maintenanceSum,
                      needleBreakSum,
                    ].map((_, i) => (
                      <Cell key={i} fill={pieColors[i % pieColors.length]}  
                      style={{ cursor: 'pointer' }} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name) => [
                      `${formatHoursMins(value)} (${((value / totalHoursSum) * 100).toFixed(1)}%)`,
                      name
                    ]}
                    labelStyle={{ color: '#000' }}
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="machine-pie-info" style={{ flex: 1, padding: '1rem' }}>
              <div style={{ fontWeight: 600, marginBottom: 8, fontSize: '16px' }}>
                Hours Breakdown (All Machines Total: {formatHoursMins(totalHoursSum)})
              </div>
              <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>
                <b>Total Hours:</b> {formatHoursMins(totalHoursSum)}
              </div>
              <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                <div>{formatHoursMins(sewingSum)} : Sewing Hours</div>
                <div>{formatHoursMins(idleSum)} : Idle Hours</div>
                <div>{formatHoursMins(reworkSum)} : Rework Hours</div>
                <div>{formatHoursMins(noFeedingSum)} : No Feeding Hours</div>
                <div>{formatHoursMins(meetingSum)} : Meeting Hours</div>
                <div>{formatHoursMins(maintenanceSum)} : Maintenance Hours</div>
                <div>{formatHoursMins(needleBreakSum)} : Needle Break Hours</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
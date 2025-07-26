import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { FaSearch } from "react-icons/fa";
import { SiMicrosoftexcel } from "react-icons/si";
import { FaCalendarAlt } from "react-icons/fa";
import { FaDownload } from "react-icons/fa";
import '../../assets/css/style.css'; // Import your CSS styles
import axios from "axios";
import * as XLSX from "xlsx"; 
// Import child components
import Machine from './Machine';
import Operator from './Operator';
import Line from './Line';

// Table Headers for Consolidated Report
const tableHeaders = [
  "S.No",
  "Machine ID",
  "Line Number",
  "Operator Name",
  "Operator ID",
  "Date",
  "Start Time",
  "End Time",
  "Mode",
  "Mode Description",
  "Stitch Count",
  "Needle Runtime",
  "Needle Stop Time",
  "TX Log ID",
  "STR Log ID",
  "Device ID",
  "Reserve",
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

export default function Consolidated() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedFilter, setSelectedFilter] = useState(""); // Renamed from operatorId
  
  // New state variables for additional filters
  const [machineId, setMachineId] = useState("");
  const [selectedOperatorId, setSelectedOperatorId] = useState("");
  const [lineId, setLineId] = useState("");
  const [machineOptions, setMachineOptions] = useState([]);
  const [operatorIdOptions, setOperatorIdOptions] = useState([]);
  const [lineOptions, setLineOptions] = useState([]);
  const rowsPerPage = 10;
  const [filtersActive, setFiltersActive] = useState(false);

  // State to track which view to show
  const [currentView, setCurrentView] = useState('summary'); // 'summary', 'machine', 'operator', 'line'

  // Filter options for the main dropdown
  const filterOptions = [
    { value: "machine", label: "Machine" },
    { value: "operator", label: "Operator" },
    { value: "line", label: "Line" }
  ];
// Dynamically fetch consolidated IDs for dropdown
useEffect(() => {
  // Fetch for Machine view
  if (currentView === 'machine' || currentView === 'summary') {
    axios.get("http://localhost:8000/api/machine-report/")
      .then(res => {
        // Fix: Use correct field name from Machine Report API
        const machines = (res.data.summary || []).map(row => row["Machine ID"] || row["machine_id"] || row.machine_id).filter(Boolean);
        setMachineOptions([...new Set(machines)]);
      })
      .catch(() => setMachineOptions([]));
  }

  // Fetch for Operator view
  if (currentView === 'operator' || currentView === 'summary') {
    axios.get("http://localhost:8000/api/operator-report/")
      .then(res => {
        // Fix: Use correct field name from Operator Report API
        const operators = (res.data.summary || []).map(row => row["Operator ID"] || row["operator_id"] || row.operator_id).filter(Boolean);
        setOperatorIdOptions([...new Set(operators)]);
      })
      .catch(() => setOperatorIdOptions([]));
  }

  // Fetch for Line view
  if (currentView === 'line' || currentView === 'summary') {
    axios.get("http://localhost:8000/api/line-report/")
      .then(res => {
        // Fix: Use correct field name from Line Report API
        const lines = (res.data.summary || []).map(row => row["Line Number"] || row["line_number"] || row.line_number || row["Line ID"] || row.line_id).filter(Boolean);
        setLineOptions([...new Set(lines)]);
      })
      .catch(() => setLineOptions([]));
  }
}, [currentView]);

  // Fetch data from backend
  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {};
      const res = await axios.get("http://localhost:8000/api/consolidated-report/");

      const backendRows = res.data.summary || [];
      const mappedRows = backendRows.map((row, idx) => {
        const normalizedDate = row["Date"] || row["date"] || "";
        return {
          date: normalizedDate,
          operatorId: row["Consolidated ID"] ?? "",
          operatorName: row["Consolidated Name"] ?? "",
          totalHours: row["Total Hours"] ?? 0,
          sewing: row["Sewing Hours"] ?? 0,
          idle: row["Idle Hours"] ?? 0,
          rework: row["Rework Hours"] ?? 0,
          noFeeding: row["No feeding Hours"] ?? 0,
          meeting: row["Meeting Hours"] ?? 0,
          maintenance: row["Maintenance Hours"] ?? 0,
          needleBreak: row["Needle Break"] ?? 0,
          pt: row["PT %"] ?? 0,
          npt: row["NPT %"] ?? 0,
          needleRuntime: row["Needle Time %"] ?? 0,
          sewingSpeed: row["SPM"] ?? 0,
          stitchCount: row["Stitch Count"] ?? 0,
        };
      });

      setData(mappedRows);
    } catch (err) {
      setData([]);
    }
    setLoading(false);
  };

  const filtered = data;
  const pageCount = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const paginated = filtered.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  const pieRow = filtered[0] || {};

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

  const handleReset = () => {
    setFrom("");
    setTo("");
    setSearch("");
    setPage(1);
    setSelectedFilter("");
    setMachineId("");
    setSelectedOperatorId("");
    setLineId("");
    setFiltersActive(false);
    setCurrentView('summary');
    setData([]); // Clear data to show empty table
  };

  const handleResetFilters = () => {
    setMachineId("");
    setSelectedOperatorId("");
    setLineId("");
    setCurrentView('summary');
  };

  const handleResetAll = () => {
    setFrom("");
    setTo("");
    setSearch("");
    setPage(1);
    setSelectedFilter("");
    setMachineId("");
    setSelectedOperatorId("");
    setLineId("");
    setFiltersActive(false);
    setCurrentView('summary');
    setData([]); // Clear data to show empty table
  };

  const handleGenerate = () => {
    setPage(1);
    setFiltersActive(true);
    
    // Determine which view to show based on selected filters
    if (selectedFilter === 'machine' || machineId) {
      setCurrentView('machine');
    } else if (selectedFilter === 'operator' || selectedOperatorId) {
      setCurrentView('operator');
    } else if (selectedFilter === 'line' || lineId) {
      setCurrentView('line');
    } else {
      setCurrentView('summary');
      fetchData(); // Only fetch summary data if no specific filter is selected
    }
  };

  const handleCSV = () => {
    const csv = [
      tableHeaders.join(","),
      ...filtered.map((row, idx) =>
        [
          idx + 1,
          row.operatorId || "",
          row.operatorName || "",
          row.operatorName || "",
          row.operatorId || "",
          row.date || "",
          "-",
          "-",
          "-",
          "-",
          row.stitchCount || "",
          row.needleRuntime || "",
          "-",
          "-",
          "-",
          "-",
          "-",
          "-"
        ].join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "consolidated_report.csv";
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
          ${filtered.length === 0 ? 
            `<tr><td colspan="${tableHeaders.length}" style="text-align: center;">No data to display</td></tr>` :
            filtered
            .map(
              (row, idx) => `
            <tr>
              <td>${idx + 1}</td>
              <td>${row.operatorId || ""}</td>
              <td>${row.operatorName || ""}</td>
              <td>${row.operatorName || ""}</td>
              <td>${row.operatorId || ""}</td>
              <td>${row.date || ""}</td>
              <td>-</td>
              <td>-</td>
              <td>-</td>
              <td>-</td>
              <td>${row.stitchCount || ""}</td>
              <td>${row.needleRuntime || ""}</td>
              <td>-</td>
              <td>-</td>
              <td>-</td>
              <td>-</td>
              <td>-</td>
              <td>-</td>
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
    a.download = "consolidated_report.html";
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

  return (
    <div className="machine-root">
      {/* Title and Buttons Row - Always Static */}
      <div className="machine-title-row">
        <div className="machine-title">
          Consolidated Table
        </div>
        <div className="machine-title-btns">
          {/* Export Buttons - Only One Set */}
          <button
            type="button"
            className="machine-btn machine-btn-csv"
            onClick={handleCSV}
            style={{ height: 41, display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <SiMicrosoftexcel className="machine-btn-icon" />
            CSV
          </button>
          <button
            type="button"
            className="machine-btn machine-btn-html"
            onClick={handleHTML}
            style={{ height: 41, display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <FaDownload className="machine-btn-icon" />
            HTML
          </button>
          <button
            type="button"
            className="machine-btn machine-btn-raw"
            onClick={handleRawData}
            style={{ height: 41, display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <FaDownload className="machine-btn-icon" />
            View Raw Data
          </button>
        </div>
      </div>

      {/* Filter Dropdowns Row - Always Visible at Top Left */}
      <div className="machine-table-card" style={{ marginBottom: '16px', padding: '16px' }}>
        <div className="machine-header-actions" style={{ display: "flex", justifyContent: "flex-start", alignItems: "center" }}>
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

            {/* Filter Dropdowns - Always Visible and Always Enabled */}

  <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="machine-select"
              style={{ minWidth: 140, height: 42, fontSize: 13, padding: 5 }}
            >
              <option value="">Select Filter</option>
              {filterOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>


            <select
              value={machineId}
              onChange={(e) => setMachineId(e.target.value)}
              className="machine-select"
              style={{ minWidth: 140, height: 42, fontSize: 13, padding: 5}}
            >
              <option value="">Select Machine ID</option>
              {machineOptions.map((id) => (
                <option key={id} value={id}>{id}</option>
              ))}
            </select>
            
            <select
              value={selectedOperatorId}
              onChange={(e) => setSelectedOperatorId(e.target.value)}
              className="machine-select"
              style={{ minWidth: 140, height: 42, fontSize: 13, padding: 5 }}
            >
              <option value="">Select Operator ID</option>
              {operatorIdOptions.map((id) => (
                <option key={id} value={id}>{id}</option>
              ))}
            </select>
            
            <select
              value={lineId}
              onChange={(e) => setLineId(e.target.value)}
              className="machine-select"
              style={{ minWidth: 120, height: 42, fontSize: 13, padding:5 }}
            >
              <option value="">Select Line ID</option>
              {lineOptions.map((id) => (
                <option key={id} value={id}>{id}</option>
              ))}
            </select>

          
            <button
              type="button"
              className="machine-btn machine-btn-blue machine-btn-generate"
              onClick={handleGenerate}
            >
              Generate
            </button>

            <button
              type="button"
              className="machine-btn machine-btn-orange"
              onClick={handleResetFilters}
              style={{ height: 41, fontSize: 14, padding: "0 16px" }}
            >
              Reset Filters
            </button>

            <button
              type="button"
              className="machine-btn machine-btn-red"
              onClick={handleResetAll}
              style={{ height: 41, fontSize: 14, padding: "0 16px" }}
            >
              Reset All
            </button>
          </div>
        </div>
      </div>

      {/* Render different views based on currentView */}
      {currentView === 'machine' && (
        <Machine
          key={`machine-${from}-${to}-${machineId}-${selectedOperatorId}-${lineId}`} 
          tableOnly={true} 
          from={from}
          to={to}
          machineId={machineId}
          selectedOperatorId={selectedOperatorId}
          lineId={lineId}
        />
      )}

      {currentView === 'operator' && (
        <Operator
          key={`operator-${from}-${to}-${machineId}-${selectedOperatorId}-${lineId}`} 
          tableOnly={true} 
          from={from}
          to={to}
          machineId={machineId}
          selectedOperatorId={selectedOperatorId}
          lineId={lineId}
        />
      )}

      {currentView === 'line' && (
        <Line 
          key={`line-${from}-${to}-${machineId}-${selectedOperatorId}-${lineId}`}
          tableOnly={false} 
          from={from}
          to={to}
          machineId={machineId}
          selectedOperatorId={selectedOperatorId}
          lineId={lineId}
        />
      )}

      {currentView === 'summary' && (
        <>
          {/* Table Card */}
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
                  <tr>
                    <td
                      colSpan={tableHeaders.length}
                      className="machine-table-nodata"
                      style={{
                        textAlign: "center",
                        padding: "20px",
                        fontStyle: "italic",
                        color: "#666"
                      }}
                    >
                      {loading ? "Loading..." : "No data to display"}
                    </td>
                  </tr>
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
        </>
      )}
    </div>
  );
}
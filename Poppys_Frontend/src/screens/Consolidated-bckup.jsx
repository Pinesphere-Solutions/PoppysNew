import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { SiMicrosoftexcel } from "react-icons/si";
import { FaCalendarAlt } from "react-icons/fa";
import { FaDownload } from "react-icons/fa";
import '../../assets/css/style.css';
import axios from "axios";
import * as XLSX from "xlsx"; 
// Import child components
import Machine from './Machine';
import Operator from './Operator';
import Line from './Line';

// ✅ UPDATED: Dynamic table headers based on selected filter
const getTableHeaders = (filter) => {
  switch (filter) {
    case 'machine':
      return [
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
        "Stitch Count"
      ];
    case 'operator':
      return [
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
        "Stitch Count"
      ];
    case 'line':
      return [
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
        "Stitch Count"
      ];
    default:
      return [
        "S.No",
        "Date", 
        "Machine ID",
        "Line Number",
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
        "NPT(%)",
        "Needle Runtime(%)",
        "Sewing Speed",
        "Stitch Count"
      ];
  }
};

// ✅ FIXED: Updated table headers to match operator/machine report format
const tableHeaders = [
  "S.No",
  "Date", 
  "Machine ID",
  "Line Number",
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
  "NPT(%)",
  "Needle Runtime(%)",
  "Sewing Speed",
  "Stitch Count"
];

const pieColors = [
  "#3182ce",
  "#d69e2e", 
  "#e53e3e",
  "#805ad5",
  "#718096",
  "#63b3ed",
];

// Helper function to convert HH:MM to decimal hours
function convertTimeToHours(timeStr) {
  if (!timeStr || timeStr === "00:00") return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours + (minutes / 60);
}

// Helper function to format hours to HH:MM
function formatHoursToTime(hours) {
  if (!hours) return "0h 0m";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
}

export default function Consolidated() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedFilter, setSelectedFilter] = useState("");
  
  // Filter state variables
  const [machineId, setMachineId] = useState("");
  const [selectedOperatorId, setSelectedOperatorId] = useState("");
  const [lineId, setLineId] = useState("");
  const [machineOptions, setMachineOptions] = useState([]);
  const [operatorIdOptions, setOperatorIdOptions] = useState([]);
  const [lineOptions, setLineOptions] = useState([]);
  const rowsPerPage = 10;

  // State to track which view to show
  const [currentView, setCurrentView] = useState('summary');
  
  // Raw data state
  const [showRawData, setShowRawData] = useState(false);
  const [rawData, setRawData] = useState([]);

  // ✅ NEW: State to track if data has been generated
  const [dataGenerated, setDataGenerated] = useState(false);

  // Filter options with "All" option
  const filterOptions = [
    { value: "all", label: "All" },
    { value: "machine", label: "Machine" },
    { value: "operator", label: "Operator" },
    { value: "line", label: "Line" }
  ];

  // Fetch options for dropdowns using existing APIs
  useEffect(() => {
    // Fetch Machine options
    axios.get("http://localhost:8000/api/poppys-machine-logs/")
      .then(res => {
        const machines = (res.data.summary || []).map(row => row["Machine ID"]).filter(Boolean);
        setMachineOptions([...new Set(machines)]);
      })
      .catch(err => {
        console.error("Error fetching machine options:", err);
        setMachineOptions([]);
      });

    // Fetch Operator options
    axios.get("http://localhost:8000/api/operator-report/")
      .then(res => {
        const operators = (res.data.summary || []).map(row => row["Operator ID"]).filter(Boolean);
        setOperatorIdOptions([...new Set(operators)]);
      })
      .catch(err => {
        console.error("Error fetching operator options:", err);
        setOperatorIdOptions([]);
      });

    // Fetch Line options
    axios.get("http://localhost:8000/api/line-report/")
      .then(res => {
        const lines = (res.data.summary || []).map(row => row["Line Number"]).filter(Boolean);
        setLineOptions([...new Set(lines)]);
      })
      .catch(err => {
        console.error("Error fetching line options:", err);
        setLineOptions([]);
      });
  }, []);

  // ✅ UPDATED: fetchData function with consolidated data preparation
  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {};
      
      // Add filters to API call
      if (from) params.from = from;
      if (to) params.to = to;
      if (machineId) params.machine_id = machineId;
      if (selectedOperatorId) params.operator_id = selectedOperatorId;
      if (lineId) params.line_id = lineId;

      console.log("Fetching consolidated data with params:", params);

      // ✅ Use all three APIs to get comprehensive data
      const [machineRes, operatorRes, lineRes] = await Promise.all([
        axios.get("http://localhost:8000/api/poppys-machine-logs/", { params }),
        axios.get("http://localhost:8000/api/operator-report/", { params }),
        axios.get("http://localhost:8000/api/line-report/", { params })
      ]);

      // Combine all data sources
      const machineData = machineRes.data.summary || [];
      const operatorData = operatorRes.data.summary || [];
      const lineData = lineRes.data.summary || [];

      console.log("API responses:", { machineData, operatorData, lineData });

      // RFID to Operator Name mapping
      const operatorRfidMapping = {
        "3658143475": "OPERATOR-01",
        "3658143476": "OPERATOR-02", 
        "3658143477": "OPERATOR-03",
        "3658143478": "OPERATOR-04",
        "3658143479": "OPERATOR-05",
      };

      // ✅ Create consolidated summary from all sources
      const consolidatedMap = new Map();

      // Process machine data
      machineData.forEach(row => {
        const key = `${row["Date"]}-${row["Machine ID"]}`;
        if (!consolidatedMap.has(key)) {
          consolidatedMap.set(key, {
            date: row["Date"] || "",
            machineId: row["Machine ID"] || "",
            lineNumber: "",
            operatorId: "",
            operatorName: "",
            totalHours: row["Total Hours"] || "00:00",
            sewing: row["Sewing Hours"] || "00:00",
            idle: row["Idle Hours"] || "00:00",
            rework: row["Rework Hours"] || "00:00",
            noFeeding: row["No feeding Hours"] || "00:00",
            meeting: row["Meeting Hours"] || "00:00",
            maintenance: row["Maintenance Hours"] || "00:00",
            needleBreak: row["Needle Break"] || "00:00",
            pt: row["PT %"] || 0,
            npt: row["NPT %"] || 0,
            needleRuntime: row["Needle Time %"] || 0,
            sewingSpeed: row["SPM"] || 0,
            stitchCount: row["Stitch Count"] || 0,
          });
        }
      });

      // Enhance with operator data
      operatorData.forEach(row => {
        const operatorId = row["Operator ID"] || "";
        const operatorName = operatorRfidMapping[operatorId] || `UNKNOWN-${operatorId}`;
        
        // Try to match by date
        consolidatedMap.forEach((value, key) => {
          if (key.includes(row["Date"])) {
            value.operatorId = operatorId;
            value.operatorName = operatorName;
            // Update with operator-specific metrics if available
            value.totalHours = row["Total Hours"] || value.totalHours;
            value.sewing = row["Sewing"] || value.sewing;
            value.idle = row["Idle"] || value.idle;
            value.pt = row["PT(%)"] || value.pt;
            value.npt = row["NPT (%)"] || value.npt;
          }
        });
      });

      // Enhance with line data
      lineData.forEach(row => {
        const lineNumber = row["Line Number"] || "";
        
        // Try to match by date
        consolidatedMap.forEach((value, key) => {
          if (key.includes(row["Date"])) {
            value.lineNumber = lineNumber;
          }
        });
      });

      // Convert map to array and add serial numbers
      const mappedRows = Array.from(consolidatedMap.values()).map((row, idx) => ({
        sNo: idx + 1,
        ...row,
        // Convert to decimal for calculations
        totalHoursDecimal: convertTimeToHours(row.totalHours),
        sewingDecimal: convertTimeToHours(row.sewing),
        idleDecimal: convertTimeToHours(row.idle),
        reworkDecimal: convertTimeToHours(row.rework),
        noFeedingDecimal: convertTimeToHours(row.noFeeding),
        meetingDecimal: convertTimeToHours(row.meeting),
        maintenanceDecimal: convertTimeToHours(row.maintenance),
        needleBreakDecimal: convertTimeToHours(row.needleBreak),
      }));

      console.log("Consolidated mapped data:", mappedRows);
      setData(mappedRows);
      setDataGenerated(true); // ✅ Mark data as generated

    } catch (err) {
      console.error("Consolidated data fetch error:", err);
      setData([]);
      setDataGenerated(false);
    }
    setLoading(false);
  };

  // ✅ UPDATED: fetchRawData function
  const fetchRawData = async () => {
    setLoading(true);
    try {
      const params = {};
      
      if (from) params.from = from;
      if (to) params.to = to;
      if (machineId) params.machine_id = machineId;
      if (selectedOperatorId) params.operator_id = selectedOperatorId;
      if (lineId) params.line_id = lineId;

      console.log("Fetching raw data with params:", params);

      const res = await axios.get("http://localhost:8000/api/poppys-machine-logs/raw/", { params });
      const backendRawRows = res.data.raw_data || [];

      console.log("Raw data response:", res.data);

      // RFID to Operator Name mapping
      const operatorRfidMapping = {
        "3658143475": "OPERATOR-01",
        "3658143476": "OPERATOR-02",
        "3658143477": "OPERATOR-03", 
        "3658143478": "OPERATOR-04",
        "3658143479": "OPERATOR-05",
      };

      // Mode descriptions mapping
      const modeDescriptions = {
        1: "Sewing",
        2: "Idle",
        3: "No Feeding",
        4: "Meeting",
        5: "Maintenance",
        6: "Rework",
        7: "Needle Break"
      };

      const mappedRawRows = backendRawRows.map((row, idx) => ({
        sNo: idx + 1,
        machineId: row["Machine ID"] || row["machine_id"] || "",
        lineNumber: row["Line Number"] || row["line_number"] || "",
        operatorId: row["Operator ID"] || row["operator_id"] || "",
        operatorName: operatorRfidMapping[row["Operator ID"]] || operatorRfidMapping[row["operator_id"]] || "",
        date: row["Date"] || row["date"] || "",
        startTime: row["Start Time"] || row["start_time"] || "",
        endTime: row["End Time"] || row["end_time"] || "",
        mode: row["Mode"] || row["mode"] || "",
        modeDescription: modeDescriptions[row["Mode"]] || modeDescriptions[row["mode"]] || "",
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

      setRawData(mappedRawRows);
    } catch (err) {
      console.error("Raw data fetch error:", err);
      setRawData([]);
    }
    setLoading(false);
  };

  // Load initial data on component mount
  useEffect(() => {
    // fetchData(); // ✅ COMMENTED OUT - Don't fetch data on mount
  }, []);

  // Apply client-side search filtering
  const applyFilters = (dataToFilter) => {
    let filtered = [...dataToFilter];

    // Apply date filters
    if (from && to) {
      filtered = filtered.filter(row => {
        if (!row.date) return false;
        const rowDate = new Date(row.date);
        const fromDate = new Date(from);
        const toDate = new Date(to);
        return rowDate >= fromDate && rowDate <= toDate;
      });
    }

    // Apply machine ID filter
    if (machineId) {
      filtered = filtered.filter(row => 
        row.machineId && row.machineId.toString() === machineId.toString()
      );
    }

    // Apply operator ID filter
    if (selectedOperatorId) {
      filtered = filtered.filter(row => 
        row.operatorId && row.operatorId.toString() === selectedOperatorId.toString()
      );
    }

    // Apply line ID filter
    if (lineId) {
      filtered = filtered.filter(row => 
        row.lineNumber && row.lineNumber.toString() === lineId.toString()
      );
    }

    return filtered;
  };

  const filtered = applyFilters(data);
  const pageCount = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const paginated = filtered.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  // Calculate totals for tiles and pie chart
  const totalHours = filtered.reduce((sum, row) => sum + (parseFloat(row.totalHoursDecimal) || 0), 0);
  const totalSewing = filtered.reduce((sum, row) => sum + (parseFloat(row.sewingDecimal) || 0), 0);
  const totalIdle = filtered.reduce((sum, row) => sum + (parseFloat(row.idleDecimal) || 0), 0);
  const totalRework = filtered.reduce((sum, row) => sum + (parseFloat(row.reworkDecimal) || 0), 0);
  const totalNoFeeding = filtered.reduce((sum, row) => sum + (parseFloat(row.noFeedingDecimal) || 0), 0);
  const totalMeeting = filtered.reduce((sum, row) => sum + (parseFloat(row.meetingDecimal) || 0), 0);
  const totalMaintenance = filtered.reduce((sum, row) => sum + (parseFloat(row.maintenanceDecimal) || 0), 0);
  const totalNeedleBreak = filtered.reduce((sum, row) => sum + (parseFloat(row.needleBreakDecimal) || 0), 0);

  // Pie chart data
  const pieData = [
    { name: "Sewing", value: Number(totalSewing.toFixed(2)) },
    { name: "Idle", value: Number(totalIdle.toFixed(2)) },
    { name: "Rework", value: Number(totalRework.toFixed(2)) },
    { name: "No Feeding", value: Number(totalNoFeeding.toFixed(2)) },
    { name: "Meeting", value: Number(totalMeeting.toFixed(2)) },
    { name: "Maintenance", value: Number(totalMaintenance.toFixed(2)) },
    { name: "Needle Break", value: Number(totalNeedleBreak.toFixed(2)) },
  ].filter(item => item.value > 0);

  const tileData = [
    {
      label: "Total Hours",
      value: totalHours.toFixed(2),
      bg: "tile-bg-blue",
      color: "tile-color-blue",
    },
    {
      label: "Sewing",
      value: totalSewing.toFixed(2),
      bg: "tile-bg-green",
      color: "tile-color-green",
    },
    { 
      label: "Idle", 
      value: totalIdle.toFixed(2), 
      bg: "tile-bg-orange", 
      color: "tile-color-orange" 
    },
    {
      label: "Rework",
      value: totalRework.toFixed(2),
      bg: "tile-bg-pink",
      color: "tile-color-pink",
    },
  ];

  const handleResetFilters = () => {
    setMachineId("");
    setSelectedOperatorId("");
    setLineId("");
    setSelectedFilter("");
    setPage(1);
  };

  const handleResetAll = () => {
    setFrom("");
    setTo("");
    setPage(1);
    setSelectedFilter("");
    setMachineId("");
    setSelectedOperatorId("");
    setLineId("");
    setCurrentView('summary');
    setShowRawData(false);
    setDataGenerated(false); // ✅ Reset data generated flag
    setData([]); // ✅ Clear data
    // Refresh data
    fetchData();
  };

  // ✅ UPDATED: handleGenerate function - stays in summary view, only changes table content
  const handleGenerate = async () => {
    setPage(1);
    setShowRawData(false);
    
    // ✅ ALWAYS STAY IN SUMMARY VIEW - only fetch data
    await fetchData();
  };

  const handleCSV = () => {
    const dataToExport = showRawData ? rawData : filtered;
    const headers = showRawData ? [
      "S.No", "Machine ID", "Line Number", "Operator ID", "Operator Name", "Date", 
      "Start Time", "End Time", "Mode", "Mode Description", "Stitch Count", 
      "Needle Runtime", "Needle Stop Time", "Duration", "SPM", "Calculation Value",
      "TX Log ID", "STR Log ID", "Created At"
    ] : getTableHeaders(selectedFilter);

    const csv = [
      headers.join(","),
      ...dataToExport.map((row, idx) => {
        if (showRawData) {
          return [
            row.sNo, row.machineId, row.lineNumber, row.operatorId, row.operatorName,
            row.date, row.startTime, row.endTime, row.mode, row.modeDescription,
            row.stitchCount, row.needleRuntime, row.needleStopTime, row.duration,
            row.spm, row.calculationValue, row.txLogId, row.strLogId, row.createdAt
          ].join(",");
        } else {
          // ✅ Return data based on selected filter
          switch (selectedFilter) {
            case 'machine':
              return [
                row.sNo, row.machineId, row.date, row.totalHours, row.sewing, row.idle, 
                row.rework, row.noFeeding, row.meeting, row.maintenance, row.needleBreak, 
                row.pt + "%", row.npt + "%", row.needleRuntime + "%", row.sewingSpeed, row.stitchCount
              ].join(",");
            case 'operator':
              return [
                row.sNo, row.date, row.operatorId, `"${row.operatorName}"`, row.totalHours, 
                row.sewing, row.idle, row.rework, row.noFeeding, row.meeting, row.maintenance, 
                row.needleBreak, row.pt + "%", row.npt + "%", row.needleRuntime + "%", 
                row.sewingSpeed, row.stitchCount
              ].join(",");
            case 'line':
              return [
                row.sNo, row.date, row.lineNumber, row.totalHours, row.sewing, row.idle, 
                row.rework, row.noFeeding, row.meeting, row.maintenance, row.needleBreak, 
                row.pt + "%", row.npt + "%", row.needleRuntime + "%", row.sewingSpeed, row.stitchCount
              ].join(",");
            default:
              return [
                row.sNo, row.date, row.machineId, row.lineNumber, row.operatorId, `"${row.operatorName}"`,
                row.totalHours, row.sewing, row.idle, row.rework, row.noFeeding,
                row.meeting, row.maintenance, row.needleBreak, row.pt + "%", row.npt + "%",
                row.needleRuntime + "%", row.sewingSpeed, row.stitchCount
              ].join(",");
          }
        }
      }),
    ].join("\n");
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = showRawData ? "consolidated_raw_data.csv" : "consolidated_report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleHTML = () => {
    const dataToExport = showRawData ? rawData : filtered;
    const headers = showRawData ? [
      "S.No", "Machine ID", "Line Number", "Operator ID", "Operator Name", "Date", 
      "Start Time", "End Time", "Mode", "Mode Description", "Stitch Count", 
      "Needle Runtime", "Needle Stop Time", "Duration", "SPM", "Calculation Value",
      "TX Log ID", "STR Log ID", "Created At"
    ] : getTableHeaders(selectedFilter);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${showRawData ? 'Consolidated Raw Data' : 'Consolidated Report'}</title>
        <style>
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
        </style>
      </head>
      <body>
        <h2>${showRawData ? 'Consolidated Raw Data' : 'Consolidated Report'}</h2>
        <table>
          <thead>
            <tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${dataToExport.length === 0 ? 
              `<tr><td colspan="${headers.length}" style="text-align: center;">No data to display</td></tr>` :
              dataToExport.map((row, idx) => {
                if (showRawData) {
                  return `
                  <tr>
                    <td>${row.sNo}</td>
                    <td>${row.machineId}</td>
                    <td>${row.lineNumber}</td>
                    <td>${row.operatorId}</td>
                    <td>${row.operatorName}</td>
                    <td>${row.date}</td>
                    <td>${row.startTime}</td>
                    <td>${row.endTime}</td>
                    <td>${row.mode}</td>
                    <td>${row.modeDescription}</td>
                    <td>${row.stitchCount}</td>
                    <td>${row.needleRuntime}</td>
                    <td>${row.needleStopTime}</td>
                    <td>${row.duration}</td>
                    <td>${row.spm}</td>
                    <td>${row.calculationValue}</td>
                    <td>${row.txLogId}</td>
                    <td>${row.strLogId}</td>
                    <td>${row.createdAt}</td>
                  </tr>
                `;
                } else {
                  // ✅ Return HTML based on selected filter
                  switch (selectedFilter) {
                    case 'machine':
                      return `
                      <tr>
                        <td>${row.sNo}</td>
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
                        <td>${row.pt}%</td>
                        <td>${row.npt}%</td>
                        <td>${row.needleRuntime}%</td>
                        <td>${row.sewingSpeed}</td>
                        <td>${row.stitchCount}</td>
                      </tr>
                    `;
                    case 'operator':
                      return `
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
                        <td>${row.pt}%</td>
                        <td>${row.npt}%</td>
                        <td>${row.needleRuntime}%</td>
                        <td>${row.sewingSpeed}</td>
                        <td>${row.stitchCount}</td>
                      </tr>
                    `;
                    case 'line':
                      return `
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
                        <td>${row.pt}%</td>
                        <td>${row.npt}%</td>
                        <td>${row.needleRuntime}%</td>
                        <td>${row.sewingSpeed}</td>
                        <td>${row.stitchCount}</td>
                      </tr>
                    `;
                    default:
                      return `
                      <tr>
                        <td>${row.sNo}</td>
                        <td>${row.date}</td>
                        <td>${row.machineId}</td>
                        <td>${row.lineNumber}</td>
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
                        <td>${row.pt}%</td>
                        <td>${row.npt}%</td>
                        <td>${row.needleRuntime}%</td>
                        <td>${row.sewingSpeed}</td>
                        <td>${row.stitchCount}</td>
                      </tr>
                    `;
                  }
                }
              }).join("")}
          </tbody>
        </table>
      </body>
      </html>
    `;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = showRawData ? "consolidated_raw_data.html" : "consolidated_report.html";
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
      {/* Title and Buttons Row */}
      <div className="machine-title-row">
        <div className="machine-title">
          {showRawData ? 'Consolidated Raw Data' : 'Consolidated Report'}
        </div>
        <div className="machine-title-btns">
          <button
            type="button"
            className="machine-btn machine-btn-csv"
            onClick={handleCSV}
            style={{ height: 41, display: 'flex', alignItems: 'center', gap: '6px' }}
            disabled={showRawData ? rawData.length === 0 : filtered.length === 0}
          >
            <SiMicrosoftexcel className="machine-btn-icon" />
            CSV
          </button>
          <button
            type="button"
            className="machine-btn machine-btn-html"
            onClick={handleHTML}
            style={{ height: 41, display: 'flex', alignItems: 'center', gap: '6px' }}
            disabled={showRawData ? rawData.length === 0 : filtered.length === 0}
          >
            <FaDownload className="machine-btn-icon" />
            HTML
          </button>
          <button
            type="button"
            className={`machine-btn ${showRawData ? 'machine-btn-orange' : 'machine-btn-raw'}`}
            onClick={handleRawData}
            style={{ height: 41, display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <FaDownload className="machine-btn-icon" />
            {showRawData ? 'View Summary' : 'View Raw Data'}
          </button>
        </div>
      </div>

      {/* Filter Controls */}
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

                      <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="machine-select"
              style={{ minWidth: 140, height: 42, fontSize: 13, padding: 5 }}
            >
              <option value="" disabled>Select Filter</option>
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
              disabled={loading}
            >
              {loading ? "Loading..." : "Generate"}
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

      {/* Filter Status */}
      {(from || to || machineId || selectedOperatorId || lineId) && (
        <div style={{ 
          padding: "8px 16px", 
          marginBottom: "16px", 
          backgroundColor: filtered.length > 0 ? "#e3f2fd" : "#ffebee", 
          borderRadius: "4px", 
          fontSize: "14px",
          color: filtered.length > 0 ? "#1976d2" : "#d32f2f"
        }}>
          <strong>Active Filters:</strong>
          {from && <span style={{ marginLeft: "8px" }}>From: {from}</span>}
          {to && <span style={{ marginLeft: "8px" }}>To: {to}</span>}
          {machineId && <span style={{ marginLeft: "8px" }}>Machine: {machineId}</span>}
          {selectedOperatorId && <span style={{ marginLeft: "8px" }}>Operator: {selectedOperatorId}</span>}
          {lineId && <span style={{ marginLeft: "8px" }}>Line: {lineId}</span>}
          <span style={{ marginLeft: "8px" }}>({filtered.length} of {data.length} records)</span>
        </div>
      )}

      {/* ✅ MAIN CONTENT - Show component-specific tables only when data is generated and filter is selected */}
      {selectedFilter === 'machine' && machineId && dataGenerated ? (
        <Machine 
          from={from}
          to={to}
          machineId={machineId}
          selectedOperatorId={selectedOperatorId}
          lineId={lineId}
        />
      ) : selectedFilter === 'operator' && selectedOperatorId && dataGenerated ? (
        <Operator 
          from={from}
          to={to}
          machineId={machineId}
          selectedOperatorId={selectedOperatorId}
          lineId={lineId}
        />
      ) : selectedFilter === 'line' && lineId && dataGenerated ? (
        <Line 
          from={from}
          to={to}
          machineId={machineId}
          selectedOperatorId={selectedOperatorId}
          lineId={lineId}
        />
      ) : (
        /* Default Consolidated View - Show when no specific filter is selected or data not generated */
        <>
          {/* Data Table */}
          <div className="machine-table-card">
            <div className="machine-table-scroll" style={{ overflowX: "auto", minWidth: "100%" }}>
              <table className="machine-table" style={{ tableLayout: "auto", width: "100%" }}>
                <thead>
                  <tr>
                    {(showRawData ? [
                      "S.No", "Machine ID", "Line Number", "Operator ID", "Operator Name", "Date", 
                      "Start Time", "End Time", "Mode", "Mode Description", "Stitch Count", 
                      "Needle Runtime", "Needle Stop Time", "Duration", "SPM", "Calculation Value",
                      "TX Log ID", "STR Log ID", "Created At"
                    ] : getTableHeaders(selectedFilter)).map((h) => (
                      <th
                        key={h}
                        style={{
                          whiteSpace: "nowrap",
                          padding: "8px 12px",
                          textAlign: "center",
                          border: "1px solid #e2e8f0",
                          background: showRawData ? "#ffecb3" : "#d3edff",
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
                  {showRawData ? (
                    // Raw Data Display
                    rawData.length === 0 ? (
                      <tr>
                        <td
                          colSpan={19}
                          style={{
                            textAlign: "center",
                            padding: "20px",
                            fontStyle: "italic",
                            color: "#666"
                          }}
                        >
                          {loading ? "Loading raw data..." : "No raw data to display"}
                        </td>
                      </tr>
                    ) : (
                      rawData.map((row, idx) => (
                        <tr key={idx}>
                          <td>{row.sNo}</td>
                          <td>{row.machineId}</td>
                          <td>{row.lineNumber}</td>
                          <td>{row.operatorId}</td>
                          <td>{row.operatorName}</td>
                          <td>{row.date}</td>
                          <td>{row.startTime}</td>
                          <td>{row.endTime}</td>
                          <td>{row.mode}</td>
                          <td>{row.modeDescription}</td>
                          <td>{row.stitchCount}</td>
                          <td>{row.needleRuntime}</td>
                          <td>{row.needleStopTime}</td>
                          <td>{row.duration}</td>
                          <td>{row.spm}</td>
                          <td>{row.calculationValue}</td>
                          <td>{row.txLogId}</td>
                          <td>{row.strLogId}</td>
                          <td>{row.createdAt}</td>
                        </tr>
                      ))
                    )
                  ) : (
                    // Summary Data Display
                    paginated.length === 0 ? (
                      <tr>
                        <td
                          colSpan={getTableHeaders(selectedFilter).length}
                          style={{
                            textAlign: "center",
                            padding: "20px",
                            fontStyle: "italic",
                            color: "#666"
                          }}
                        >
                          {loading ? "Loading..." : "Click Generate to view data"}
                        </td>
                      </tr>
                    ) : (
                      paginated.map((row, idx) => (
                        <tr key={idx}>
                          {selectedFilter === 'machine' ? (
                            <>
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
                              <td>{row.pt}%</td>
                              <td>{row.npt}%</td>
                              <td>{row.needleRuntime}%</td>
                              <td>{row.sewingSpeed}</td>
                              <td>{row.stitchCount}</td>
                            </>
                          ) : selectedFilter === 'operator' ? (
                            <>
                              <td>{row.sNo}</td>
                              <td>{row.date}</td>
                              <td>{row.operatorId}</td>
                              <td>{row.operatorName}</td>
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
                            </>
                          ) : selectedFilter === 'line' ? (
                            <>
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
                            </>
                          ) : (
                            <>
                              <td>{row.sNo}</td>
                              <td>{row.date}</td>
                              <td>{row.machineId}</td>
                              <td>{row.lineNumber}</td>
                              <td>{row.operatorId}</td>
                              <td>{row.operatorName}</td>
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
                            </>
                          )}
                        </tr>
                      ))
                    )
                  )}
                </tbody>
              </table>
            </div>
            {!showRawData && <Pagination />}
          </div>

          {/* Tiles Row - Only show when data exists and not in raw data view */}
          {!showRawData && data.length > 0 && (
            <div className="machine-tiles-row machine-tiles-row-full">
              {tileData.map((tile, idx) => (
                <div
                  className={`machine-tile machine-tile-shade ${tile.bg} ${tile.color}`}
                  key={tile.label}
                >
                  <div className="machine-tile-label">{tile.label}</div>
                  <div className="machine-tile-value">{tile.value}h</div>
                </div>
              ))}
            </div>
          )}

          {/* Pie Chart - Only show when chart data exists and not in raw data view */}
          {!showRawData && data.length > 0 && pieData.length > 0 && (
            <div className="machine-pie-card machine-pie-card-full">
              <div className="machine-pie-chart machine-pie-chart-large">
                <ResponsiveContainer width="100%" height={380}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={170}
                      innerRadius={100}
                      labelLine={false}
                      label={false}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={pieColors[i % pieColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name) => [
                        `${formatHoursToTime(value)} (${totalHours > 0 ? ((value / totalHours) * 100).toFixed(1) : 0}%)`,
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
              <div className="machine-pie-info">
                <div style={{ fontWeight: 600, marginBottom: 8, fontSize: '16px' }}>
                  Hours Breakdown ({filtered.length} records: {formatHoursToTime(totalHours)})
                </div>
                <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>
                  <b>Total Hours:</b> {formatHoursToTime(totalHours)}
                </div>
                <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                  <div>{formatHoursToTime(totalSewing)} : Sewing Hours</div>
                  <div>{formatHoursToTime(totalIdle)} : Idle Hours</div>
                  <div>{formatHoursToTime(totalRework)} : Rework Hours</div>
                  <div>{formatHoursToTime(totalNoFeeding)} : No Feeding Hours</div>
                  <div>{formatHoursToTime(totalMeeting)} : Meeting Hours</div>
                  <div>{formatHoursToTime(totalMaintenance)} : Maintenance Hours</div>
                  <div>{formatHoursToTime(totalNeedleBreak)} : Needle Break Hours</div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
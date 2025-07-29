import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { FaSearch } from "react-icons/fa";
import { SiMicrosoftexcel } from "react-icons/si";
import { FaCalendarAlt } from "react-icons/fa";
import { FaDownload } from "react-icons/fa";
import '../../assets/css/style.css'; // Import your CSS styles
import axios from "axios";
import * as XLSX from "xlsx";
import { useLoading } from "../../main.jsx";


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
  const { showLoading, hideLoading } = useLoading();


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

  // Updated fetchRawData function with frontend filtering
  const fetchRawData = async () => {
    setLoading(true);
    showLoading();
    try {
      const params = {};
      // Don't send date filters to API, we'll filter on frontend
      if (machineId) params.machine_id = machineId;

      console.log("Raw data request params:", params);

      const res = await axios.get("http://localhost:8000/api/poppys-machine-logs/raw/", { params });
      console.log("Raw data response:", res.data);
      
      const backendRawRows = res.data.raw_data || res.data || [];

      const mappedRawRows = backendRawRows.map((row, idx) => ({
        sNo: idx + 1,
        machineId: row["Machine ID"] || row["MACHINE_ID"] || row["machine_id"] || "",
        lineNumber: row["Line Number"] || row["LINE_NUMB"] || row["line_number"] || "",
        operatorId: row["Operator ID"] || row["OPERATOR_ID"] || row["operator_id"] || "",
        date: row["Date"] || row["DATE"] || row["date"] || "",
        startTime: row["Start Time"] || row["START_TIME"] || row["start_time"] || "",
        endTime: row["End Time"] || row["END_TIME"] || row["end_time"] || "",
        mode: row["Mode"] || row["MODE"] || row["mode"] || "",
        modeDescription: row["Mode Description"] || row["mode_description"] || getModelDescription(row["Mode"] || row["MODE"] || row["mode"]),
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

      console.log("Mapped raw rows:", mappedRawRows);
      setRawData(mappedRawRows);
    } catch (err) {
      console.error("Raw data fetch error:", err);
      setRawData([]);
    }
    setLoading(false);
    hideLoading();
  };

  

  /* Helper function */
  function formatBackendDate(dateStr) {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    return `${year}:${month.padStart(2, "0")}:${day.padStart(2, "0")}`;
  }
  // Fetch data from backend
  const fetchData = async () => {
    setLoading(true);
    showLoading();
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
    hideLoading();
  };

// ✅ FIX 6: Remove the useEffect that was causing performance issues
// Remove this useEffect completely:
// useEffect(() => {
//   fetchData();
// }, [from, to, machineId, propMachineId, selectedOperatorId, lineId]);

// ✅ FIX 1: Only fetch machine options once on component mount, not on every filter change
useEffect(() => {
  showLoading();
  axios
    .get("http://localhost:8000/api/poppys-machine-logs/")
    .then(res => {
      const ids = (res.data.summary || []).map(row => row["Machine ID"]);
      setMachineOptions([...new Set(ids)]);
    })
    .catch(() => setMachineOptions([]))
    .finally(() => hideLoading());
}, []); // ✅ Remove dependencies to fetch only once

// ✅ FIX 2: Updated filtering logic to handle machine ID correctly
const applyFilters = (dataToFilter) => {
  let filtered = [...dataToFilter];

  // ✅ Apply date filters first
  if (from && to) {
    filtered = filtered.filter(row => {
      if (!row.date) return false;
      
      const rowDateStr = row.date.replace(/:/g, '-');
      const rowDate = new Date(rowDateStr);
      const fromDate = new Date(from);
      const toDate = new Date(to);
      
      return rowDate >= fromDate && rowDate <= toDate;
    });
  } else if (from) {
    filtered = filtered.filter(row => {
      if (!row.date) return false;
      
      const rowDateStr = row.date.replace(/:/g, '-');
      const rowDate = new Date(rowDateStr);
      const fromDate = new Date(from);
      
      return rowDate >= fromDate;
    });
  } else if (to) {
    filtered = filtered.filter(row => {
      if (!row.date) return false;
      
      const rowDateStr = row.date.replace(/:/g, '-');
      const rowDate = new Date(rowDateStr);
      const toDate = new Date(to);
      
      return rowDate <= toDate;
    });
  }

  // ✅ Apply machine ID filter after date filters
  if (machineId && machineId !== "") {
    filtered = filtered.filter(row => 
      row.machineId && row.machineId.toString() === machineId.toString()
    );
  }

  return filtered;
};

// ✅ Apply filters to data
const filtered = applyFilters(data);

// ✅ FIX 3: Updated machine options logic - show all available machines, highlight which ones have data in date range
const getFilteredMachineOptions = () => {
  // Always show all machine options for better UX
  return machineOptions;
};

// ✅ FIX 4: Get available machine IDs from current date-filtered data (for validation/highlighting)
const getAvailableMachineIds = () => {
  if (!from && !to) return machineOptions;
  
  // Get machines that have data in the current date range
  let dateFiltered = [...data];
  
  if (from && to) {
    dateFiltered = dateFiltered.filter(row => {
      if (!row.date) return false;
      const rowDateStr = row.date.replace(/:/g, '-');
      const rowDate = new Date(rowDateStr);
      const fromDate = new Date(from);
      const toDate = new Date(to);
      return rowDate >= fromDate && rowDate <= toDate;
    });
  } else if (from) {
    dateFiltered = dateFiltered.filter(row => {
      if (!row.date) return false;
      const rowDateStr = row.date.replace(/:/g, '-');
      const rowDate = new Date(rowDateStr);
      const fromDate = new Date(from);
      return rowDate >= fromDate;
    });
  } else if (to) {
    dateFiltered = dateFiltered.filter(row => {
      if (!row.date) return false;
      const rowDateStr = row.date.replace(/:/g, '-');
      const rowDate = new Date(rowDateStr);
      const toDate = new Date(to);
      return rowDate <= toDate;
    });
  }
  
  return [...new Set(dateFiltered.map(row => row.machineId).filter(Boolean))];
};

const availableMachineOptions = getFilteredMachineOptions();
const availableMachineIds = getAvailableMachineIds();

  // ✅ Recalculate pie chart data based on filtered results
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

  // Replace the existing tile data calculation with this updated version
  
  // ✅ Calculate tile data based on filtered results, not from backend
  const getTileDataFromFiltered = () => {
    if (filtered.length === 0) {
      return [
        {
          label: "Productive Time %",
          value: "0%",
          bg: "tile-bg-blue",
          color: "tile-color-blue",
        },
        {
          label: "Needle Runtime %", 
          value: "0%",
          bg: "tile-bg-green",
          color: "tile-color-green",
        },
        { 
          label: "Sewing Speed", 
          value: "0",
          bg: "tile-bg-orange", 
          color: "tile-color-orange" 
        },
        {
          label: "Total Hours",
          value: "00:00",
          bg: "tile-bg-pink",
          color: "tile-color-pink",
        },
      ];
    }
  
    // ✅ Calculate averages and totals from filtered data
    const avgPT = filtered.reduce((sum, row) => sum + (parseFloat(row.pt) || 0), 0) / filtered.length;
    const avgNeedleRuntime = filtered.reduce((sum, row) => sum + (parseFloat(row.needleRuntime) || 0), 0) / filtered.length;
    const avgSewingSpeed = filtered.reduce((sum, row) => sum + (parseFloat(row.sewingSpeed) || 0), 0) / filtered.length;
    
    // ✅ Calculate total hours from filtered results
    const totalHoursDisplay = formatHoursMins(totalHoursSum);
  
    return [
      {
        label: "Productive Time %",
        value: `${avgPT.toFixed(2)}%`,
        bg: "tile-bg-blue",
        color: "tile-color-blue",
      },
      {
        label: "Needle Runtime %",
        value: `${avgNeedleRuntime.toFixed(2)}%`,
        bg: "tile-bg-green",
        color: "tile-color-green",
      },
      { 
        label: "Sewing Speed", 
        value: Math.round(avgSewingSpeed).toString(),
        bg: "tile-bg-orange", 
        color: "tile-color-orange" 
      },
      {
        label: "Total Hours",
        value: totalHoursDisplay,
        bg: "tile-bg-pink",
        color: "tile-color-pink",
      },
    ];
  };
  
  // ✅ Replace the old tileData calculation
  // Remove these old lines:
  // const pieRow = filtered[0] || {};
  // const tile1ProductivityData = pieRow.tile1_productivity || {};
  // const tile2NeedleRuntimeData = pieRow.tile2_needle_runtime || {};
  // const tile3SewingSpeedData = pieRow.tile3_sewing_speed || {};
  // const tile4TotalHoursData = pieRow.tile4_total_hours || {};
  
  // const tileData = [
  //   {
  //     label: "Productive Time %",
  //     value: tile1ProductivityData.productivity_percentage_average + "%" || "0%",
  //     bg: "tile-bg-blue",
  //     color: "tile-color-blue",
  //   },
  //   ... rest of old tile data
  // ];
  
  // ✅ Use the new tile data calculation
  const tileData = getTileDataFromFiltered();

  const pageCount = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const paginated = filtered.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  // ✅ Updated handleReset to clear frontend filters
// ✅ FIX 5: Updated Reset function to also fetch data
const handleReset = () => {
  setFrom("");
  setTo("");
  setSearch("");
  setPage(1);
  setRawPage(1);
  setMachineId("");
  setFiltersActive(false);
  // ✅ Refresh data after reset
  fetchData();
};

// ✅ FIX 6: Remove the useEffect that was causing performance issues
// Remove this useEffect completely:
// useEffect(() => {
//   fetchData();
// }, [from, to, machineId, propMachineId, selectedOperatorId, lineId]);

// ✅ FIX 7: Add a new useEffect that only fetches data when necessary
useEffect(() => {
  fetchData();
  // eslint-disable-next-line
}, [propMachineId, selectedOperatorId, lineId]); // Only fetch when props change, not filters


  // ✅ Updated Generate button to apply frontend filters
  const handleGenerate = () => {
    setPage(1); // Reset to first page when applying filters
    setFiltersActive(true);
    showLoading();
    // Simulate processing time for filters
    setTimeout(() => {
      hideLoading();
    }, 800);
    // The filtering happens automatically through the filtered variable
  };


  const handleCSV = () => {
    showLoading();
    setTimeout(() => {
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
      hideLoading();
    }, 500);
  };

  const handleExcel = () => {
    showLoading();
    setTimeout(() => {
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
      hideLoading();
    }, 500);
  };

  const handleHTML = () => {
    showLoading();
    setTimeout(() => {
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
      hideLoading();
    }, 500);
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

  // Add these helper functions after the existing helper functions
const getModelDescription = (mode) => {
  const modeDescriptions = {
    1: "Sewing",
    2: "Idle", 
    3: "No Feeding",
    4: "Meeting",
    5: "Maintenance", 
    6: "Rework",
    7: "Needle Break"
  };
  return modeDescriptions[mode] || "Unknown";
};

// Apply filters to raw data
const applyRawDataFilters = (dataToFilter) => {
  let filtered = [...dataToFilter];

  // Apply date filters
  if (from && to) {
    filtered = filtered.filter(row => {
      if (!row.date) return false;
      
      const rowDateStr = row.date.replace(/:/g, '-');
      const rowDate = new Date(rowDateStr);
      const fromDate = new Date(from);
      const toDate = new Date(to);
      
      return rowDate >= fromDate && rowDate <= toDate;
    });
  } else if (from) {
    filtered = filtered.filter(row => {
      if (!row.date) return false;
      
      const rowDateStr = row.date.replace(/:/g, '-');
      const rowDate = new Date(rowDateStr);
      const fromDate = new Date(from);
      
      return rowDate >= fromDate;
    });
  } else if (to) {
    filtered = filtered.filter(row => {
      if (!row.date) return false;
      
      const rowDateStr = row.date.replace(/:/g, '-');
      const rowDate = new Date(rowDateStr);
      const toDate = new Date(to);
      
      return rowDate <= toDate;
    });
  }

  // Apply machine ID filter
  if (machineId && machineId !== "") {
    filtered = filtered.filter(row => 
      row.machineId && row.machineId.toString() === machineId.toString()
    );
  }

  return filtered;
};

// Add these variables after the existing filtered data calculations
// Get filtered raw data
const filteredRawData = applyRawDataFilters(rawData);

// Raw data pagination
const rawRowsPerPage = 10;
const filteredRawPageCount = Math.max(1, Math.ceil(filteredRawData.length / rawRowsPerPage));
const filteredRawPaginated = filteredRawData.slice(
  (rawPage - 1) * rawRowsPerPage,
  rawPage * rawRowsPerPage
);

// Export functions for raw data
const handleRawCSV = () => {
  showLoading();
  setTimeout(() => {
    const csv = [
      rawDataHeaders.join(","),
      ...filteredRawData.map((row, idx) =>
        [
          idx + 1, // Use filtered data index, not pagination index
          row.machineId,
          row.lineNumber,
          row.operatorId,
          row.date,
          row.startTime,
          row.endTime,
          row.mode,
          row.modeDescription,
          row.stitchCount,
          row.needleRuntime,
          row.needleStopTime,
          row.duration,
          row.spm,
          row.calculationValue,
          row.txLogId,
          row.strLogId,
          row.createdAt,
        ].join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "machine_raw_data.csv";
    a.click();
    URL.revokeObjectURL(url);
    hideLoading();
  }, 500);
};

const handleRawHTML = () => {
  showLoading();
  setTimeout(() => {
    const html = `
      <table border="1">
        <thead>
          <tr>${rawDataHeaders.map((h) => `<th>${h}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${filteredRawData
            .map(
              (row, idx) => `
            <tr>
              <td>${idx + 1}</td>
              <td>${row.machineId}</td>
              <td>${row.lineNumber}</td>
              <td>${row.operatorId}</td>
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
    a.download = "machine_raw_data.html";
    a.click();
    URL.revokeObjectURL(url);
    hideLoading();
  }, 500);
};

// Update the RawPagination component
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
      Page {rawPage} of {filteredRawPageCount}
    </span>
    <button
      onClick={() => setRawPage((p) => Math.min(filteredRawPageCount, p + 1))}
      disabled={rawPage === filteredRawPageCount}
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
    <style>
      {`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}
    </style>
      {/* Title and Buttons Row - Fix the export buttons to use correct functions */}
      <div className="machine-title-row">
        <div className="machine-title">
          {showRawData ? 'Machine Raw Data' : 'Machine Report Table'}
        </div>
        <div className="machine-title-btns">
          <button
            type="button"
            className="machine-btn machine-btn-csv"
            onClick={showRawData ? handleRawCSV : handleCSV}
          >
            <SiMicrosoftexcel className="machine-btn-icon" /> CSV
          </button>
          <button
            type="button"
            className="machine-btn machine-btn-html"
            onClick={showRawData ? handleRawHTML : handleHTML}
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
          {/* Raw Data Filters */}
          <div className="machine-header-actions" style={{ display: "flex", justifyContent: "center", alignItems: "center", marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 25, alignItems: "center", flexWrap: "wrap" }}>
              <div className="date-input-group" style={{ display: "flex", gap: 8 }}>
                <div className="date-field" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span><FaCalendarAlt className="calendar-icon" /></span>
                  <input
                    type="date"
                    value={from}
                    onChange={(e) => {
                      setFrom(e.target.value);
                      setRawPage(1); // Reset to first page when filtering
                    }}
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
                    onChange={(e) => {
                      setTo(e.target.value);
                      setRawPage(1); // Reset to first page when filtering
                    }}
                    className="date-input"
                    style={{ width: 110 }}
                  />
                  <span className="date-label" style={{ fontSize: 12 }}>To</span>
                </div>
              </div>

              <select
                value={machineId}
                onChange={(e) => {
                  setMachineId(e.target.value);
                  setRawPage(1); // Reset to first page when filtering
                }}
                className="machine-select"
                style={{ minWidth: 120, height: 42, fontSize: 14 }}
              >
                <option value="">Select Machine ID</option>
                {availableMachineOptions.map((id) => (
                  <option key={id} value={id}>{id}</option>
                ))}
              </select>

              <button
                type="button"
                className="machine-btn machine-btn-red machine-btn-reset"
                onClick={() => {
                  setFrom("");
                  setTo("");
                  setMachineId("");
                  setRawPage(1);
                }}
                style={{ height: 32, fontSize: 14, padding: "0 16px" }}
              >
                Reset Filters
              </button>
            </div>
          </div>

          {/* Raw Data Filter Status */}
          {(from || to || machineId) && (
            <div style={{ 
              padding: "8px 16px", 
              marginBottom: "16px", 
              backgroundColor: filteredRawData.length > 0 ? "#e3f2fd" : "#ffebee", 
              borderRadius: "4px", 
              fontSize: "14px",
              color: filteredRawData.length > 0 ? "#1976d2" : "#d32f2f"
            }}>
              <strong>Active Filters:</strong>
              {from && <span style={{ marginLeft: "8px" }}>From: {from}</span>}
              {to && <span style={{ marginLeft: "8px" }}>To: {to}</span>}
              {machineId && <span style={{ marginLeft: "8px" }}>Machine: {machineId}</span>}
              <span style={{ marginLeft: "8px" }}>({filteredRawData.length} of {rawData.length} records)</span>
              {filteredRawData.length === 0 && (
                <div style={{ marginTop: "4px", fontWeight: "bold" }}>
                  ⚠️ No raw data found for the selected combination. Try adjusting your filters.
                </div>
              )}
            </div>
          )}

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
                        background: "#ffecb3",
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
                {loading ? (
                  // Show loading rows for raw data when data is being fetched
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={`raw-loading-${idx}`}>
                      {rawDataHeaders.map((_, colIdx) => (
                        <td key={colIdx} style={{ textAlign: "center", padding: "20px" }}>
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            color: '#666'
                          }}>
                            <div style={{
                              width: '16px',
                              height: '16px',
                              border: '2px solid #f3f3f3',
                              borderTop: '2px solid #3498db',
                              borderRadius: '50%',
                              animation: 'spin 1s linear infinite'
                            }}></div>
                            Loading...
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filteredRawPaginated.length === 0 ? (
                  <tr>
                    <td
                      colSpan={rawDataHeaders.length}
                      className="machine-table-nodata"
                    >
                      {(from || to || machineId) ? "No raw data found for the selected filters." : "No raw data found."}
                    </td>
                  </tr>
                ) : (
                  filteredRawPaginated.map((row, idx) => (
                    <tr key={idx}>
                      <td>{(rawPage - 1) * rawRowsPerPage + idx + 1}</td>
                      <td>{row.machineId}</td>
                      <td>{row.lineNumber}</td>
                      <td>{row.operatorId}</td>
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
            {/* ✅ Updated Filters and Actions */}
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
                 {/*  ✅ FIX 8: Updated machine select dropdown with better styling for unavailable options */}

                <select
                  value={machineId}
                  onChange={(e) => setMachineId(e.target.value)}
                  className="machine-select"
                  style={{ minWidth: 120, height: 42, fontSize: 14 }}
                >
                  <option value="">Select Machine ID</option>
                  {availableMachineOptions.map((id) => {
                    const isAvailable = availableMachineIds.includes(id);
                    return (
                      <option 
                        key={id} 
                        value={id}
                        style={{
                          color: (from || to) && !isAvailable ? '#999' : '#000',
                          fontStyle: (from || to) && !isAvailable ? 'italic' : 'normal'
                        }}
                      >
                        {id} {(from || to) && !isAvailable ? '(No data in date range)' : ''}
                      </option>
                    );
                  })}
                </select>
                
                {/* ✅ Updated Generate button */}
                <button
                  type="button"
                  className="machine-btn machine-btn-blue machine-btn-generate"
                  onClick={handleGenerate}
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
                              {/*  ✅ FIX 9: Add validation message when no data found for selected filters */}
                {(from || to || machineId) && (
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
                    <span style={{ marginLeft: "8px" }}>({filtered.length} of {data.length} records)</span>
                    {filtered.length === 0 && (
                      <div style={{ marginTop: "4px", fontWeight: "bold" }}>
                        ⚠️ No data found for the selected combination. Try adjusting your filters.
                      </div>
                    )}
                  </div>
                )}

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
                        {(from || to || machineId) ? "No data found for the selected filters." : "No data found."}
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

          {/* ✅ Tiles Row - Updated with filtered data */}
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

          {/* ✅ Pie Chart Card - Updated with filtered data */}
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
                Hours Breakdown (Filtered Results: {formatHoursMins(totalHoursSum)})
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
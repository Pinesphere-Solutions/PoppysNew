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
        "S.No", "Machine ID", "Date", "Total Hours", "Sewing", "Idle", "Rework", 
        "No Feeding", "Meeting", "Maintenance", "Needle Break", "PT %", "NPT %", 
        "Needle Runtime %", "Sewing Speed", "Stitch Count"
      ];
    case 'operator':
      return [
        "S.No", "Date", "Operator ID", "Operator Name", "Total Hours", "Sewing", 
        "Idle", "Rework", "No Feeding", "Meeting", "Maintenance", "Needle Break", 
        "PT(%)", "NPT (%)", "Needle Runtime (%)", "Sewing Speed", "Stitch Count"
      ];
    case 'line':
      return [
        "S.No", "Date", "Line Number", "Total Hours", "Sewing", "Idle", "Rework", 
        "No Feeding", "Meeting", "Maintenance", "Needle Break", "PT(%)", "NPT (%)", 
        "Needle Runtime (%)", "Sewing Speed", "Stitch Count"
      ];
    default:
      return [
        "S.No", "Date", "Machine ID", "Line Number", "Operator ID", "Operator Name", 
        "Total Hours", "Sewing", "Idle", "Rework", "No Feeding", "Meeting", 
        "Maintenance", "Needle Break", "PT(%)", "NPT(%)", "Needle Runtime(%)", 
        "Sewing Speed", "Stitch Count"
      ];
  }
};

const pieColors = ["#3182ce", "#d69e2e", "#e53e3e", "#805ad5", "#718096", "#63b3ed"];

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

// ✅ Multi-Select Styles
const multiSelectStyles = `
  .multi-select-dropdown {
    position: relative;
    display: inline-block;
    min-width: 140px;
  }

  .multi-select-button {
    width: 100%;
    height: 42px;
    padding: 5px 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
    background-color: white;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13px;
  }

  .multi-select-dropdown-content {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background-color: white;
    border: 1px solid #ccc;
    border-top: none;
    border-radius: 0 0 4px 4px;
    max-height: 200px;
    overflow-y: auto;
    z-index: 1000;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  .multi-select-option {
    padding: 8px 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-size: 13px;
  }

  .multi-select-option:hover {
    background-color: #f5f5f5;
  }

  .multi-select-checkbox {
    margin: 0;
  }

  .multi-select-count {
    background-color: #007bff;
    color: white;
    border-radius: 10px;
    padding: 2px 6px;
    font-size: 11px;
    min-width: 16px;
    text-align: center;
  }
`;

export default function Consolidated() {
  // ✅ State variables
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedFilter, setSelectedFilter] = useState("");
  const [pendingFrom, setPendingFrom] = useState(""); 
  const [pendingTo, setPendingTo] = useState("");            // for staged date (to)
  const [pendingFilter, setPendingFilter] = useState("");    // for staged filter (e.g., machine, operator, line)
  const [operatorMapping, setOperatorMapping] = useState({});



  // ✅ Multi-select state variables
  const [machineIds, setMachineIds] = useState([]);
  const [selectedOperatorIds, setSelectedOperatorIds] = useState([]);
  const [lineIds, setLineIds] = useState([]);
  const [machineOptions, setMachineOptions] = useState([]);
  const [operatorIdOptions, setOperatorIdOptions] = useState([]);
  const [lineOptions, setLineOptions] = useState([]);
  
  // ✅ Dropdown visibility states
  const [showMachineDropdown, setShowMachineDropdown] = useState(false);
  const [showOperatorDropdown, setShowOperatorDropdown] = useState(false);
  const [showLineDropdown, setShowLineDropdown] = useState(false);
  
  const rowsPerPage = 10;
  const [currentView, setCurrentView] = useState('summary');
  const [showRawData, setShowRawData] = useState(false);
  const [rawData, setRawData] = useState([]);
  const [dataGenerated, setDataGenerated] = useState(false); // ✅ Track if Generate was clicked



  // Filter options
  const filterOptions = [
    { value: "all", label: "All" },
    { value: "machine", label: "Machine" },
    { value: "operator", label: "Operator" },
    { value: "line", label: "Line" }
  ];

  // ✅ Multi-Select Component
  const MultiSelectDropdown = ({ 
    options, 
    selectedValues, 
    onChange, 
    placeholder, 
    isOpen, 
    setIsOpen 
  }) => {
    const handleToggle = (value) => {
      if (selectedValues.includes(value)) {
        onChange(selectedValues.filter(item => item !== value));
      } else {
        onChange([...selectedValues, value]);
      }
    };

    const handleSelectAll = () => {
      if (selectedValues.length === options.length) {
        onChange([]);
      } else {
        onChange([...options]);
      }
    };

    const getDisplayText = () => {
      if (selectedValues.length === 0) return placeholder;
      if (selectedValues.length === 1) return selectedValues[0];
      return `${selectedValues.length} selected`;
    };

    return (
      <div className="multi-select-dropdown">
        <button
          type="button"
          className="multi-select-button"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span>{getDisplayText()}</span>
          <span>
            {selectedValues.length > 0 && (
              <span className="multi-select-count">{selectedValues.length}</span>
            )}
            <span style={{ marginLeft: '4px' }}>▼</span>
          </span>
        </button>
        
        {isOpen && (
          <div className="multi-select-dropdown-content">
            <div className="multi-select-option" onClick={handleSelectAll}>
              <input
                type="checkbox"
                className="multi-select-checkbox"
                checked={selectedValues.length === options.length}
                onChange={() => {}}
              />
              <span style={{ fontWeight: 'bold' }}>
                {selectedValues.length === options.length ? 'Deselect All' : 'Select All'}
              </span>
            </div>
            
            {options.map((option) => (
              <div
                key={option}
                className="multi-select-option"
                onClick={() => handleToggle(option)}
              >
                <input
                  type="checkbox"
                  className="multi-select-checkbox"
                  checked={selectedValues.includes(option)}
                  onChange={() => {}}
                />
                <span>{option}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ✅ Fetch options for dropdowns
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        // Fetch Machine options
        const machineRes = await axios.get("http://localhost:8000/api/poppys-machine-logs/");
        const machines = (machineRes.data.summary || [])
          .map(row => row["Machine ID"])
          .filter(Boolean);
        setMachineOptions([...new Set(machines)]);

        // Fetch Operator options  
        const operatorRes = await axios.get("http://localhost:8000/api/operator-report/");
        const operators = (operatorRes.data.summary || [])
          .map(row => row["Operator ID"])
          .filter(Boolean);
        setOperatorIdOptions([...new Set(operators)]);

        // Fetch Line options
        const lineRes = await axios.get("http://localhost:8000/api/line-report/");
        const lines = (lineRes.data.summary || [])
          .map(row => row["Line Number"])
          .filter(Boolean);
        setLineOptions([...new Set(lines)]);

      } catch (err) {
        console.error("Error fetching options:", err);
        setMachineOptions([]);
        setOperatorIdOptions([]);
        setLineOptions([]);
      }
    };

    fetchOptions();
  }, []);

  // ✅ fetchData function
// ✅ UPDATE: fetchData function to use the same simple logic as Operator.jsx

const fetchData = async () => {
  setLoading(true);
  try {
    const params = {};
    
    if (from) params.from = from;
    if (to) params.to = to;
    if (machineIds.length > 0) params.machine_ids = machineIds.join(',');
    if (selectedOperatorIds.length > 0) params.operator_ids = selectedOperatorIds.join(',');
    if (lineIds.length > 0) params.line_ids = lineIds.join(',');

    console.log("Fetching consolidated data with params:", params);
    
    let response;
    
    // ✅ Use appropriate endpoint based on selected filter
    if (selectedFilter === 'operator' || pendingFilter === 'operator') {
      response = await axios.get("http://localhost:8000/api/operator-report/", { params });
      const backendRows = response.data.summary || [];
      
      // ✅ FIXED: Proper operator data mapping with correct needle runtime field
      const mappedRows = backendRows.map((row, idx) => {
        const operatorId = row["Operator ID"] || row["operator_id"] || row["OPERATOR_ID"];
        const operatorName = row["Operator Name"] || row["operator_name"] || row["OPERATOR_NAME"];
        
        return {
          sNo: row["S.no"] || row["S.No"] || (idx + 1),
          date: row["Date"] || "",
          operatorId: operatorId || "N/A",
          operatorName: operatorName || "Unknown",
          totalHours: row["Total Hours"] || "00:00",
          sewing: row["Sewing Hours"] || "00:00",
          idle: row["Idle Hours"] || "00:00",
          rework: row["Rework Hours"] || "00:00",
          noFeeding: row["No feeding Hours"] || "00:00",
          meeting: row["Meeting Hours"] || "00:00",
          maintenance: row["Maintenance Hours"] || "00:00",
          needleBreak: row["Needle Break"] || "00:00",
          // Add decimal versions for pie chart calculations
          totalHoursDecimal: convertTimeToHours(row["Total Hours"]) || 0,
          sewingDecimal: convertTimeToHours(row["Sewing Hours"]) || 0,
          idleDecimal: convertTimeToHours(row["Idle Hours"]) || 0,
          reworkDecimal: convertTimeToHours(row["Rework Hours"]) || 0,
          noFeedingDecimal: convertTimeToHours(row["No feeding Hours"]) || 0,
          meetingDecimal: convertTimeToHours(row["Meeting Hours"]) || 0,
          maintenanceDecimal: convertTimeToHours(row["Maintenance Hours"]) || 0,
          needleBreakDecimal: convertTimeToHours(row["Needle Break"]) || 0,
          pt: row["PT %"] || 0,
          npt: row["NPT %"] || 0,
          // ✅ FIXED: Use the correct field name for needle runtime
          needleRuntime: row["Needle Time %"] || row["Needle Runtime %"] || row["needle_time_%"] || row["needle_runtime_%"] || 0,
          sewingSpeed: row["SPM"] || 0,
          stitchCount: row["Stitch Count"] || 0,
        };
      });
      
      setData(mappedRows);
      
    } else if (selectedFilter === 'line' || pendingFilter === 'line') {
      response = await axios.get("http://localhost:8000/api/line-report/", { params });
      const backendRows = response.data.summary || [];
      
      // ✅ Use Line.jsx mapping logic
      const mappedRows = backendRows.map((row, idx) => {
        const lineNumber = row["Line Number"] || row["line_number"] || row["LINE_NUMBER"];
        
        return {
          sNo: row["S.no"] || row["S.No"] || (idx + 1),
          date: row["Date"] || "",
          lineNumber: lineNumber || "N/A",
          totalHours: row["Total Hours"] || "00:00",
          sewing: row["Sewing Hours"] || "00:00",
          idle: row["Idle Hours"] || "00:00",
          rework: row["Rework Hours"] || "00:00",
          noFeeding: row["No feeding Hours"] || "00:00",
          meeting: row["Meeting Hours"] || "00:00",
          maintenance: row["Maintenance Hours"] || "00:00",
          needleBreak: row["Needle Break"] || "00:00",
          totalHoursDecimal: convertTimeToHours(row["Total Hours"]) || 0,
          sewingDecimal: convertTimeToHours(row["Sewing Hours"]) || 0,
          idleDecimal: convertTimeToHours(row["Idle Hours"]) || 0,
          reworkDecimal: convertTimeToHours(row["Rework Hours"]) || 0,
          noFeedingDecimal: convertTimeToHours(row["No feeding Hours"]) || 0,
          meetingDecimal: convertTimeToHours(row["Meeting Hours"]) || 0,
          maintenanceDecimal: convertTimeToHours(row["Maintenance Hours"]) || 0,
          needleBreakDecimal: convertTimeToHours(row["Needle Break"]) || 0,
          pt: row["PT %"] || 0,
          npt: row["NPT %"] || 0,
          // ✅ FIXED: Use the correct field name for needle runtime
          needleRuntime: row["Needle Time %"] || row["Needle Runtime %"] || row["needle_time_%"] || row["needle_runtime_%"] || 0,
          sewingSpeed: row["SPM"] || 0,
          stitchCount: row["Stitch Count"] || 0,
        };
      });
      
      setData(mappedRows);
      
    } else {
      // ✅ Default machine logic
      response = await axios.get("http://localhost:8000/api/poppys-machine-logs/", { params });
      const backendRows = response.data.summary || [];
      
      const mappedRows = backendRows.map((row, idx) => ({
        sNo: idx + 1,
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
        totalHoursDecimal: convertTimeToHours(row["Total Hours"]) || 0,
        sewingDecimal: convertTimeToHours(row["Sewing Hours"]) || 0,
        idleDecimal: convertTimeToHours(row["Idle Hours"]) || 0,
        reworkDecimal: convertTimeToHours(row["Rework Hours"]) || 0,
        noFeedingDecimal: convertTimeToHours(row["No feeding Hours"]) || 0,
        meetingDecimal: convertTimeToHours(row["Meeting Hours"]) || 0,
        maintenanceDecimal: convertTimeToHours(row["Maintenance Hours"]) || 0,
        needleBreakDecimal: convertTimeToHours(row["Needle Break"]) || 0,
        pt: row["PT %"] || 0,
        npt: row["NPT %"] || 0,
        // ✅ FIXED: Use the correct field name for needle runtime
        needleRuntime: row["Needle Time %"] || row["Needle Runtime %"] || row["needle_time_%"] || row["needle_runtime_%"] || 0,
        sewingSpeed: row["SPM"] || 0,
        stitchCount: row["Stitch Count"] || 0,
      }));
      
      setData(mappedRows);
    }
    
    setDataGenerated(true);

  } catch (err) {
    console.error("Consolidated data fetch error:", err);
    setData([]);
  }
  setLoading(false);
};

  // ✅ Apply client-side filtering
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

    // ✅ Apply machine ID filters (multiple) - Fixed logic
    if (machineIds.length > 0) {
      filtered = filtered.filter(row => {
        const rowMachineId = row.machineId ? row.machineId.toString() : '';
        return machineIds.some(selectedId => selectedId.toString() === rowMachineId);
      });
    }

    // ✅ Apply operator ID filters (multiple) - Fixed logic
    if (selectedOperatorIds.length > 0) {
      filtered = filtered.filter(row => {
        const rowOperatorId = row.operatorId ? row.operatorId.toString() : '';
        return selectedOperatorIds.some(selectedId => selectedId.toString() === rowOperatorId);
      });
    }

    // ✅ Apply line ID filters (multiple) - Fixed logic
    if (lineIds.length > 0) {
      filtered = filtered.filter(row => {
        const rowLineId = row.lineNumber ? row.lineNumber.toString() : '';
        return lineIds.some(selectedId => selectedId.toString() === rowLineId);
      });
    }

    return filtered;
  };

  // ✅ Add separate filtering for raw data
  const applyFiltersToRawData = (rawDataToFilter) => {
    let filtered = [...rawDataToFilter];

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

    // ✅ Apply machine ID filters (multiple) - Fixed for raw data
    if (machineIds.length > 0) {
      filtered = filtered.filter(row => {
        const rowMachineId = row.machineId ? row.machineId.toString() : '';
        return machineIds.some(selectedId => selectedId.toString() === rowMachineId);
      });
    }

    // ✅ Apply operator ID filters (multiple) - Fixed for raw data
    if (selectedOperatorIds.length > 0) {
      filtered = filtered.filter(row => {
        const rowOperatorId = row.operatorId ? row.operatorId.toString() : '';
        return selectedOperatorIds.some(selectedId => selectedId.toString() === rowOperatorId);
      });
    }

    // ✅ Apply line ID filters (multiple) - Fixed for raw data
    if (lineIds.length > 0) {
      filtered = filtered.filter(row => {
        const rowLineId = row.lineNumber ? row.lineNumber.toString() : '';
        return lineIds.some(selectedId => selectedId.toString() === rowLineId);
      });
    }

    return filtered;
  };

  // ✅ Data processing
  const filtered = applyFilters(data);
  const filteredRawData = applyFiltersToRawData(rawData); // ✅ Apply filters to raw data
  const pageCount = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const paginated = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  // Calculate totals
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

  const calculateProductiveTimePercentage = () => {
  if (totalHours === 0) return 0;
  return ((totalSewing + totalRework) / totalHours * 100);
};

// ✅ ALSO FIX: Update the tile calculation to use the same field mapping
const calculateNeedleTimePercentage = () => {
  if (filtered.length === 0) return 0;
  
  // ✅ Debug: Log the needle runtime values
  console.log("Needle runtime values:", filtered.map(row => ({
    operatorId: row.operatorId,
    needleRuntime: row.needleRuntime,
    rawData: row
  })));
  
  const avgNeedleTime = filtered.reduce((sum, row) => sum + (parseFloat(row.needleRuntime) || 0), 0) / filtered.length;
  return avgNeedleTime;
};

const calculateAverageSewingSpeed = () => {
  if (filtered.length === 0) return 0;
  const avgSpeed = filtered.reduce((sum, row) => sum + (parseFloat(row.sewingSpeed) || 0), 0) / filtered.length;
  return avgSpeed;
}




// ✅ Add helper function for mode descriptions if not already present
const getModeDescription = (mode) => {
  const modeDescriptions = {
    1: "Sewing",
    2: "Idle", 
    3: "No Feeding",
    4: "Meeting",
    5: "Maintenance", 
    6: "Rework",
    7: "Needle Break"
  };
  return modeDescriptions[mode] || `Unknown Mode ${mode}`;
};

// ✅ FIXED: Updated fetchRawData function to ensure operator mapping is available
const fetchRawData = async () => {
  setLoading(true);
  try {
    const params = {};
    
    // ✅ Use Operator.jsx logic - fetch ALL data first, filter on frontend
    // Don't send any filters to backend, we'll apply them on frontend
    console.log("Fetching consolidated raw data (no backend filters)...");

    let rawDataResponse;
    
    // ✅ FIXED: Use appropriate endpoint based on selected filter
    if (selectedFilter === 'operator' || pendingFilter === 'operator') {
      // ✅ Use operator raw data endpoint (exactly like Operator.jsx)
      rawDataResponse = await axios.get("http://localhost:8000/api/operator-report/raw/", { params: {} });
    } else if (selectedFilter === 'line' || pendingFilter === 'line') {
      // ✅ Use line raw data endpoint
      rawDataResponse = await axios.get("http://localhost:8000/api/line-report/raw/", { params: {} });
    } else {
      // ✅ Default to machine raw data endpoint
      rawDataResponse = await axios.get("http://localhost:8000/api/poppys-machine-logs/raw/", { params: {} });
    }

    console.log("Raw data response:", rawDataResponse.data);
    
    const backendRawRows = rawDataResponse.data.raw_data || rawDataResponse.data || [];

    // ✅ EXACT MAPPING from Operator.jsx
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
      modeDescription: row["Mode Description"] || row["mode_description"] || getModeDescription(row["Mode"] || row["mode"]),
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

    console.log("✅ Mapped raw data (Operator.jsx style):", mappedRawRows);
    setRawData(mappedRawRows);

  } catch (err) {
    console.error("Consolidated raw data fetch error:", err);
    setRawData([]);
  }
  setLoading(false);
};
// ✅ EXACT FILTERING LOGIC from Operator.jsx
const applyRawDataFilters = (dataToFilter) => {
  let filtered = [...dataToFilter];

  // ✅ Apply date filters (exact same logic as Operator.jsx)
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

  // ✅ Apply operator filter (if operator filter is selected)
  if ((selectedFilter === 'operator' || pendingFilter === 'operator') && selectedOperatorIds.length > 0) {
    filtered = filtered.filter(row => 
      row.operatorId && selectedOperatorIds.some(selectedId => selectedId.toString() === row.operatorId.toString())
    );
  }

  // ✅ Apply machine filter (if machine filter is selected)
  if ((selectedFilter === 'machine' || pendingFilter === 'machine') && machineIds.length > 0) {
    filtered = filtered.filter(row => 
      row.machineId && machineIds.some(selectedId => selectedId.toString() === row.machineId.toString())
    );
  }

  // ✅ Apply line filter (if line filter is selected)
  if ((selectedFilter === 'line' || pendingFilter === 'line') && lineIds.length > 0) {
    filtered = filtered.filter(row => 
      row.lineNumber && lineIds.some(selectedId => selectedId.toString() === row.lineNumber.toString())
    );
  }

  return filtered;
};

// ✅ ALSO FIX: Update fetchOperatorMapping to return the mapping
const fetchOperatorMapping = async () => {
  try {
    // Fetch all operators from backend
    const response = await axios.get("http://localhost:8000/api/operators/");
    const operators = response.data || [];
    
    // Create dynamic mapping from RFID to operator name
    const mapping = {};
    operators.forEach(operator => {
      if (operator.rfid_card_no && operator.operator_name) {
        mapping[operator.rfid_card_no] = operator.operator_name;
      }
    });
    
    setOperatorMapping(mapping);
    console.log("Dynamic operator mapping loaded:", mapping);
    return mapping; // ✅ Return the mapping for immediate use
  } catch (err) {
    console.error("Error fetching operator mapping:", err);
    setOperatorMapping({});
    return {}; // ✅ Return empty object on error
  }
};



// ✅ ALSO UPDATE: The tile data to match Operator.jsx format
const tileData = [
  { 
    label: "Productive Time %", 
    value: calculateProductiveTimePercentage().toFixed(2) + "%", // ✅ Changed from .1 to .2 to match Operator
    bg: "tile-bg-blue", 
    color: "tile-color-blue" 
  },
  { 
    label: "Needle Time %", // ✅ Changed from "Needle Time" to "Needle Time %" to match Operator
    value: calculateNeedleTimePercentage().toFixed(2) + "%", // ✅ Changed from .1 to .2 to match Operator
    bg: "tile-bg-green", 
    color: "tile-color-green" 
  },
  { 
    label: "Sewing Speed", 
    value: calculateAverageSewingSpeed().toFixed(0), 
    bg: "tile-bg-orange", 
    color: "tile-color-orange" 
  },
  {
    label: "Total Hours",
    value: formatHoursToTime(totalHours), // ✅ Use formatHoursToTime to match "50h 0m" format
    bg: "tile-bg-pink",
    color: "tile-color-pink",
  },
];


  // ✅ Event handlers
  const handleResetFilters = () => {
    setMachineIds([]);
    setSelectedOperatorIds([]);
    setLineIds([]);
    setSelectedFilter("");
    setPendingFilter("");
    setPage(1);
    setShowMachineDropdown(false);
    setShowOperatorDropdown(false);
    setShowLineDropdown(false);
    
  };

  const handleResetAll = () => {
    setFrom("");
    setTo("");
    setPage(1);
    setSelectedFilter("");
    setPendingFilter("");
    setMachineIds([]);
    setSelectedOperatorIds([]);
    setLineIds([]);
    setCurrentView('summary');
    setShowRawData(false);
    setData([]);
    setRawData([]);
    setDataGenerated(false);
    setLoading(false);
    setShowMachineDropdown(false);
    setShowOperatorDropdown(false);
    setShowLineDropdown(false);
  };

  const handleGenerate = async () => {
    
    // Check if both from and to dates are selected
    if (!from || !to) {
      alert("Please select both 'From' and 'To' dates before generating the report.");
      return;
    }
    
    setSelectedFilter(pendingFilter);
    setPage(1);
    setShowRawData(false);
    
    if (from || to || machineIds.length > 0 || selectedOperatorIds.length > 0 || lineIds.length > 0) {
      await fetchData();
    } else {
      setData([]);
      setRawData([]);
      setDataGenerated(false);
    }
  };

  // ✅ Update pagination for raw data
  const rawPageCount = Math.max(1, Math.ceil(filteredRawData.length / rowsPerPage));
  const rawPage = 1; // You might want to add a separate rawPage state
  const rawPaginated = filteredRawData.slice((rawPage - 1) * rowsPerPage, rawPage * rowsPerPage);

  // ✅ Updated handleCSV function - Complete implementation
  const handleCSV = () => {
    const dataToExport = showRawData ? filteredRawData : filtered; // ✅ Use filtered raw data
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
            idx + 1, // Use index for S.No in CSV
            row.machineId, row.lineNumber, row.operatorId, 
            `"${row.operatorName || `UNKNOWN-${row.operatorId}`}"`,
            row.date, row.startTime, row.endTime, row.mode, row.modeDescription,
            row.stitchCount, row.needleRuntime, row.needleStopTime, row.duration,
            row.spm, row.calculationValue, row.txLogId, row.strLogId, row.createdAt
          ].join(",");
        } else {
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
    a.download = showRawData ? "consolidated_raw_data_filtered.csv" : "consolidated_report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // ✅ Updated handleHTML function - Complete implementation
  const handleHTML = () => {
    const dataToExport = showRawData ? filteredRawData : filtered; // ✅ Use filtered raw data
    const headers = showRawData ? [
      "S.No", "Machine ID", "Line Number", "Operator ID", "Operator Name", "Date", 
      "Start Time", "End Time", "Mode", "Mode Description", "Stitch Count", 
      "Needle Runtime", "Needle Stop Time", "Duration", "SPM", "Calculation Value",
      "TX Log ID", "STR Log ID", "Created At"
    ] : getTableHeaders(selectedFilter);

    // Create HTML table structure
    let htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${showRawData ? 'Consolidated Raw Data' : 'Consolidated Report'}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            background-color: #f5f5f5;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding: 20px;
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .header h1 {
            color: #333;
            margin: 0 0 10px 0;
          }
          .header p {
            color: #666;
            margin: 5px 0;
          }
          .stats {
            display: flex;
            justify-content: center;
            gap: 20px;
            margin-bottom: 20px;
            flex-wrap: wrap;
          }
          .stat-card {
            background: white;
            padding: 15px 25px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            text-align: center;
            min-width: 120px;
          }
          .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: #007bff;
          }
          .stat-label {
            font-size: 14px;
            color: #666;
            margin-top: 5px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            background-color: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          th {
            background-color: ${showRawData ? '#ffecb3' : '#d3edff'};
            padding: 12px 8px;
            text-align: center;
            border: 1px solid #ddd;
            font-weight: 600;
            color: #333;
          }
          td {
            padding: 10px 8px;
            text-align: center;
            border: 1px solid #ddd;
            color: #555;
          }
          tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          tr:hover {
            background-color: #f0f8ff;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            padding: 20px;
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            color: #666;
          }
          @media print {
            body { margin: 0; background-color: white; }
            .header, .footer, .stat-card, table { box-shadow: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${showRawData ? 'Consolidated Raw Data Report' : 'Consolidated Report'}</h1>
          <p><strong>Generated on:</strong> ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          <p><strong>Total Records:</strong> ${dataToExport.length}</p>
          ${from || to ? `<p><strong>Date Range:</strong> ${from || 'Start'} to ${to || 'End'}</p>` : ''}
          ${machineIds.length > 0 ? `<p><strong>Machine IDs:</strong> ${machineIds.join(', ')}</p>` : ''}
          ${selectedOperatorIds.length > 0 ? `<p><strong>Operator IDs:</strong> ${selectedOperatorIds.join(', ')}</p>` : ''}
          ${lineIds.length > 0 ? `<p><strong>Line IDs:</strong> ${lineIds.join(', ')}</p>` : ''}
        </div>

        ${!showRawData && filtered.length > 0 ? `
          <div class="stats">
            <div class="stat-card">
              <div class="stat-value">${totalHours.toFixed(2)}h</div>
              <div class="stat-label">Total Hours</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${totalSewing.toFixed(2)}h</div>
              <div class="stat-label">Sewing Hours</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${totalIdle.toFixed(2)}h</div>
              <div class="stat-label">Idle Hours</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${totalRework.toFixed(2)}h</div>
              <div class="stat-label">Rework Hours</div>
            </div>
          </div>
        ` : ''}

        <table>
          <thead>
            <tr>
              ${headers.map(header => `<th>${header}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
    `;

    // Add data rows
    dataToExport.forEach((row) => {
      htmlContent += '<tr>';
      
      if (showRawData) {
        htmlContent += `
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
        `;
      } else {
        switch (selectedFilter) {
          case 'machine':
            htmlContent += `
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
            `;
            break;
          case 'operator':
            htmlContent += `
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
            `;
            break;
          case 'line':
            htmlContent += `
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
            `;
            break;
          default:
            htmlContent += `
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
            `;
        }
      }
      
      htmlContent += '</tr>';
    });

    // Close HTML structure
    htmlContent += `
          </tbody>
        </table>

        <div class="footer">
          <p>Report generated from Poppys Manufacturing System</p>
          <p>Data includes ${!showRawData ? 'summarized' : 'detailed raw'} information for the selected period</p>
        </div>
      </body>
      </html>
    `;

    // Create and download the file
    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${showRawData ? 'consolidated_raw_data' : 'consolidated_report'}_${new Date().toISOString().split('T')[0]}.html`;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    URL.revokeObjectURL(url);
  };

// ✅ UPDATED: handleRawData function (remove operator mapping logic)
const handleRawData = async () => {
  if (showRawData) {
    setShowRawData(false);
  } else {
    if (!dataGenerated) {
      await handleGenerate();
    }
    setShowRawData(true);
    await fetchRawData(); // ✅ Simplified - no operator mapping needed
  }
};
// ✅ UPDATE: Raw data table headers (use Operator.jsx style when operator filter is selected)
const getRawDataHeaders = (filter) => {
  if (filter === 'operator') {
    return [
      "S.No", "Operator ID", "Operator Name", "Machine ID", "Line Number", "Date", 
      "Start Time", "End Time", "Mode", "Mode Description", "Stitch Count", 
      "Needle Runtime", "Needle Stop Time", "Duration", "SPM", "Calculation Value",
      "TX Log ID", "STR Log ID", "Created At"
    ];
  } else {
    return [
      "S.No", "Machine ID", "Line Number", "Operator ID", "Operator Name", "Date", 
      "Start Time", "End Time", "Mode", "Mode Description", "Stitch Count", 
      "Needle Runtime", "Needle Stop Time", "Duration", "SPM", "Calculation Value",
      "TX Log ID", "STR Log ID", "Created At"
    ];
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

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.multi-select-dropdown')) {
        setShowMachineDropdown(false);
        setShowOperatorDropdown(false);
        setShowLineDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ✅ Show initial state when Generate hasn't been clicked
  const showInitialState = !dataGenerated;

  return (
    <div className="machine-root">
 {loading && (
      <div className="loading-overlay">
        <div className="spinner" />
        <span>Loading ... </span>
      </div>
    )}

      <style>{multiSelectStyles}</style>
      
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
            disabled={!dataGenerated || (showRawData ? filteredRawData.length === 0 : filtered.length === 0)}
          >
            <SiMicrosoftexcel className="machine-btn-icon" />
            CSV
          </button>
          <button
            type="button"
            className="machine-btn machine-btn-html"
            onClick={handleHTML}
            style={{ height: 41, display: 'flex', alignItems: 'center', gap: '6px' }}
            disabled={!dataGenerated || (showRawData ? filteredRawData.length === 0 : filtered.length === 0)}
          >
            <FaDownload className="machine-btn-icon" />
            HTML
          </button>
          <button
            type="button"
            className={`machine-btn ${showRawData ? 'machine-btn-orange' : 'machine-btn-raw'}`}
            onClick={handleRawData}
            style={{ height: 41, display: 'flex', alignItems: 'center', gap: '6px' }}
            disabled={!dataGenerated && !loading}
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
              value={pendingFilter}
              onChange={(e) => {
                const newFilter = e.target.value;
                setPendingFilter(newFilter);
                setSelectedFilter(newFilter);
                setPage(1);
                setShowRawData(false);
                setData([]);
                setRawData([]);
                setDataGenerated(false);
                // Do NOT fetch data here!
                // Only update state, wait for Generate button
              }}
              className="machine-select"
              style={{ minWidth: 140, height: 42, fontSize: 13, padding: 5 }}
            >
              <option value="" disabled>Select Filter</option>
              {filterOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>

            <MultiSelectDropdown
              options={machineOptions}
              selectedValues={machineIds}
              onChange={setMachineIds}
              placeholder="Select Machine IDs"
              isOpen={showMachineDropdown}
              setIsOpen={setShowMachineDropdown}
            />
            
            <MultiSelectDropdown
              options={operatorIdOptions}
              selectedValues={selectedOperatorIds}
              onChange={setSelectedOperatorIds}
              placeholder="Select Operator IDs"
              isOpen={showOperatorDropdown}
              setIsOpen={setShowOperatorDropdown}
            />
            
            <MultiSelectDropdown
              options={lineOptions}
              selectedValues={lineIds}
              onChange={setLineIds}
              placeholder="Select Line IDs"
              isOpen={showLineDropdown}
              setIsOpen={setShowLineDropdown}
            />

            <button
              type="button"
              className="machine-btn machine-btn-blue machine-btn-generate"
              onClick={handleGenerate}
              disabled={loading || !from || !to}
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
      {dataGenerated && (from || to || machineIds.length > 0 || selectedOperatorIds.length > 0 || lineIds.length > 0) && (
        <div style={{ 
          padding: "8px 16px", 
          marginBottom: "16px", 
          backgroundColor: (showRawData ? filteredRawData.length : filtered.length) > 0 ? "#e3f2fd" : "#ffebee", 
          borderRadius: "4px", 
          fontSize: "14px",
          color: (showRawData ? filteredRawData.length : filtered.length) > 0 ? "#1976d2" : "#d32f2f"
        }}>
          <strong>Active Filters:</strong>
          {from && <span style={{ marginLeft: "8px" }}>From: {from}</span>}
          {to && <span style={{ marginLeft: "8px" }}>To: {to}</span>}
          {machineIds.length > 0 && (
            <span style={{ marginLeft: "8px" }}>
              Machines: {machineIds.length === 1 ? machineIds[0] : `${machineIds.length} selected`}
            </span>
          )}
          {selectedOperatorIds.length > 0 && (
            <span style={{ marginLeft: "8px" }}>
              Operators: {selectedOperatorIds.length === 1 ? selectedOperatorIds[0] : `${selectedOperatorIds.length} selected`}
            </span>
          )}
          {lineIds.length > 0 && (
            <span style={{ marginLeft: "8px" }}>
              Lines: {lineIds.length === 1 ? lineIds[0] : `${lineIds.length} selected`}
            </span>
          )}
          <span style={{ marginLeft: "8px" }}>
            ({showRawData ? filteredRawData.length : filtered.length} of {showRawData ? rawData.length : data.length} records)
          </span>
          {(showRawData ? filteredRawData.length : filtered.length) === 0 && (
            <div style={{ marginTop: "4px", fontWeight: "bold" }}>
              ⚠️ No data found for the selected combination. Try adjusting your filters.
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      {showInitialState ? (
        /* Initial State - Before Generate is clicked */
        <div className="machine-table-card">
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px 20px',
            textAlign: 'center',
            minHeight: '300px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: '2px dashed #dee2e6'
          }}>
            <div style={{ fontSize: '48px', color: '#6c757d', marginBottom: '20px' }}>📊</div>
            <h3 style={{ color: '#495057', marginBottom: '10px', fontSize: '24px' }}>
              Consolidated Report Dashboard
            </h3>
            <p style={{ color: '#6c757d', fontSize: '16px', marginBottom: '30px', maxWidth: '400px' }}>
              Select your filters and click <strong>Generate</strong> to view consolidated data and analytics
            </p>
            <div style={{
              padding: '15px 25px',
              backgroundColor: '#e3f2fd',
              borderRadius: '6px',
              color: '#1976d2',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              💡 Tip: Use filters to analyze specific machines, operators, or time periods
            </div>
          </div>
        </div>
      ) : (
        /* ✅ SIMPLIFIED: Always show consolidated table, don't delegate to child components */
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
                  rawData.length === 0 ? (
                    <tr>
                      <td colSpan={19} style={{ textAlign: "center", padding: "20px", fontStyle: "italic", color: "#666" }}>
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
                  /* ✅ FIXED: Show filtered data based on the applied filters */
                  filtered.length === 0 ? (
                    <tr>
                      <td colSpan={getTableHeaders(selectedFilter).length} style={{ textAlign: "center", padding: "20px", fontStyle: "italic", color: "#666" }}>
                        {loading ? "Loading..." : "No data found for the selected filters"}
                      </td>
                    </tr>
                  ) : (
                    paginated.map((row, idx) => (
                      <tr key={idx}>
                        {selectedFilter === 'machine' ? (
                          <>
                            <td>{row.sNo}</td><td>{row.machineId}</td><td>{row.date}</td><td>{row.totalHours}</td>
                            <td>{row.sewing}</td><td>{row.idle}</td><td>{row.rework}</td><td>{row.noFeeding}</td>
                            <td>{row.meeting}</td><td>{row.maintenance}</td><td>{row.needleBreak}</td>
                            <td>{row.pt}%</td><td>{row.npt}%</td><td>{row.needleRuntime}%</td>
                            <td>{row.sewingSpeed}</td><td>{row.stitchCount}</td>
                          </>
                        ) : selectedFilter === 'operator' ? (
                          <>
                            <td>{row.sNo}</td><td>{row.date}</td><td>{row.operatorId}</td><td>{row.operatorName}</td>
                            <td>{row.totalHours}</td><td>{row.sewing}</td><td>{row.idle}</td><td>{row.rework}</td>
                            <td>{row.noFeeding}</td><td>{row.meeting}</td><td>{row.maintenance}</td><td>{row.needleBreak}</td>
                            <td>{row.pt}%</td><td>{row.npt}%</td><td>{row.needleRuntime}%</td>
                            <td>{row.sewingSpeed}</td><td>{row.stitchCount}</td>
                          </>
                        ) : selectedFilter === 'line' ? (
                          <>
                            <td>{row.sNo}</td><td>{row.date}</td><td>{row.lineNumber}</td><td>{row.totalHours}</td>
                            <td>{row.sewing}</td><td>{row.idle}</td><td>{row.rework}</td><td>{row.noFeeding}</td>
                            <td>{row.meeting}</td><td>{row.maintenance}</td><td>{row.needleBreak}</td>
                            <td>{row.pt}%</td><td>{row.npt}%</td><td>{row.needleRuntime}%</td>
                            <td>{row.sewingSpeed}</td><td>{row.stitchCount}</td>
                          </>
                        ) : (
                          <>
                            <td>{row.sNo}</td><td>{row.date}</td><td>{row.machineId}</td><td>{row.lineNumber}</td>
                            <td>{row.operatorId}</td><td>{row.operatorName}</td><td>{row.totalHours}</td>
                            <td>{row.sewing}</td><td>{row.idle}</td><td>{row.rework}</td><td>{row.noFeeding}</td>
                            <td>{row.meeting}</td><td>{row.maintenance}</td><td>{row.needleBreak}</td>
                            <td>{row.pt}%</td><td>{row.npt}%</td><td>{row.needleRuntime}%</td>
                            <td>{row.sewingSpeed}</td><td>{row.stitchCount}</td>
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

          {/* ✅ Show charts and tiles only when we have filtered data */}
          {!showRawData && filtered.length > 0 && (
            <>
              {/* Tiles Row */}
              <div className="machine-tiles-row machine-tiles-row-full" style={{ marginTop: '20px' }}>
                {tileData.map((tile) => (
                  <div key={tile.label} className={`machine-tile machine-tile-shade ${tile.bg} ${tile.color}`}>
                    <div className="machine-tile-label">{tile.label}</div>
                    <div className="machine-tile-value">{tile.value}</div>
                  </div>
                ))}
              </div>

              {/* Pie Chart */}
              {pieData.length > 0 && (
                <div className="machine-pie-card machine-pie-card-full" style={{ marginTop: '20px' }}>
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
      )}
    </div>
  );
}
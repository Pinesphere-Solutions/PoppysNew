from rest_framework import generics
from .models import MachineLog
from .serializers import MachineLogSerializer
from .permissions import IsPoppysUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from datetime import datetime, time
from .models import MachineLog
from .serializers import MachineLogSerializer
import logging
logger = logging.getLogger('poppys')
from collections import defaultdict

""" Modes """
MODES = {
    1: "Sewing",
    2: "Idle",
    3: "No feeding",
    4: "Meeting",
    5: "Maintenance",
    6: "Rework",
    7: "Needle break",
}

# --- Helper function for list-based logs start/end time ---
def get_machine_times(logs, machine_id):
    machine_logs = [log for log in logs if log.MACHINE_ID == machine_id]
    if not machine_logs:
        return "", ""
    start_time = min(machine_logs, key=lambda l: l.START_TIME).START_TIME.strftime("%H:%M")
    end_time = max(machine_logs, key=lambda l: l.END_TIME).END_TIME.strftime("%H:%M")
    return start_time, end_time




""" Fetch all the existing machine logs for Poppys users & it will print in console"""
""" Condition 1 - Allow all the data posting via POSTMAN without any restrictions irrespective of user permissions """
""" Condition 2 - If Str_LOGID > 1000, the system checks if a log with Str_LOGID - 1000 exists for the same machine and date; if yes, it skips saving, otherwise saves with the subtracted value.
                  If Str_LOGID ≤ 1000, the system saves the log data as received.
                  Tx Log ID should store the data in the database without any conditions.
                  The system should return a 200 OK response for all POST requests, regardless of whether the log was saved or skipped.
                  The system should print the details of the log being saved or skipped to the console for debugging purposes.
                  The system should handle date formats in 'YYYY:M:D' or 'YYYY:MM:DD' format and convert them to 'YYYY-MM-DD' before saving"""


class PoppysMachineLogListView(generics.ListAPIView):
    queryset = MachineLog.objects.all()
    serializer_class = MachineLogSerializer

    def get(self, request, *args, **kwargs):
        
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)

        # ✅ Return response to HTTP client
        return Response(serializer.data)
    
    def post(self, request, *args, **kwargs):
        data = request.data.copy()
        tx_logid = int(data.get("Tx_LOGID", 0))
        str_logid = int(data.get("Str_LOGID", 0))
        machine_id = data.get("MACHINE_ID")
        date = data.get("Date")  # Use the raw date string as-is, no conversion
    
        # Logic for Str_LOGID > 1000
        if str_logid > 1000:
            base_str_logid = str_logid - 1000
            # Check if a log with base_str_logid, machine_id, and date exists
            exists = MachineLog.objects.filter(
                MACHINE_ID=machine_id,
                Str_LOGID=base_str_logid,
                DATE=date
            ).exists()
            if exists:
                # Do not store, just return 200
                print(f"Duplicate log for MACHINE_ID={machine_id}, DATE={date}, Str_LOGID={str_logid} (base {base_str_logid}) - Skipped")
                logger.info(f"Duplicate log for MACHINE_ID={machine_id}, DATE={date}, Str_LOGID={str_logid} (base {base_str_logid}) - Skipped")
                return Response({"detail": "Duplicate STR log skipped"}, status=200)
            # Overwrite Str_LOGID in data to save only the subtracted value
            data["Str_LOGID"] = base_str_logid
    
        serializer = self.get_serializer(data=data)
        if serializer.is_valid():
            serializer.save()
            print("New MachineLog created(JSON Posted):", serializer.data)
            logger.info(f"New MachineLog created (JSON Posted): {serializer.data}")
            return Response(serializer.data, status=201)
        print("Invalid data:", serializer.errors)
        logger.error(f"Invalid data: {serializer.errors}")
    
        return Response(serializer.errors, status=400)


""" Condition 3 - Allow only Poppys users to access the machine logs """
""" Condition 4 - Break Exclusion - allow to post data without any restrictions via POSTMAN and restrict the GET method to Poppys users only """
""" Condition 5 - Modes of 7 """

class MachineReport(APIView):    

    def get(self, request, *args, **kwargs):
        machine_id_filter = request.query_params.get('machine_id')
        date_str = request.query_params.get('date')
        from_str = request.query_params.get('from')
        to_str = request.query_params.get('to')

        # --- Add this block at the top of get() ---
        if request.query_params.get('raw') == 'true':
            logs = MachineLog.objects.all()
            raw_data = [
                {
                    "MACHINE_ID": log.MACHINE_ID,
                    "OPERATOR_ID": getattr(log, "OPERATOR_ID", ""),
                    "DATE": log.DATE,
                    "START_TIME": log.START_TIME,
                    "END_TIME": log.END_TIME,
                    "MODE": log.MODE,
                    "Created at": getattr(log, "created_at", ""),
                }
                for log in logs
            ]
            return Response({"raw": raw_data})

        # Determine which dates to process
        if from_str and to_str:
            report_dates = MachineLog.objects.filter(DATE__gte=from_str, DATE__lte=to_str).values_list('DATE', flat=True).distinct()
        elif date_str:
            report_dates = [date_str]
        else:
            report_dates = MachineLog.objects.values_list('DATE', flat=True).distinct()

        start_window = time(8, 30)
        end_window = time(19, 30)
        breaks = [
            (time(10, 30), time(10, 40)),
            (time(13, 20), time(14, 0)),
            (time(16, 20), time(16, 30)),
        ]

        summary = []
        excluded_logs = []
        report = {}
        calculation_logs = {}

        # Loop over all dates and aggregate
        for report_date in report_dates:
            logs = MachineLog.objects.filter(DATE=report_date)
            logger.info(f"Initial logs count for date {report_date}: {logs.count()}")
            
            if machine_id_filter:
                logs = logs.filter(MACHINE_ID=machine_id_filter)
                logger.info(f"Filtered logs by MACHINE_ID={machine_id_filter}: {logs.count()}")

            logs = list(logs)  # convert to list if needed

            # Log all incoming data from DB with status
            for log in logs:
                logger.info(
                    f"DB DATA: MACHINE_ID={log.MACHINE_ID}, DATE={log.DATE}, START_TIME={log.START_TIME}, END_TIME={log.END_TIME}, MODE={log.MODE}, "
                    f"NEEDLE_RUNTIME={getattr(log, 'NEEDLE_RUNTIME', '')}, RESERVE={getattr(log, 'RESERVE', '')}, STATUS=Fetched"
                )

            for log in logs:
                try:
                    st = log.START_TIME if isinstance(log.START_TIME, time) else datetime.strptime(str(log.START_TIME), "%H:%M:%S").time()
                    et = log.END_TIME if isinstance(log.END_TIME, time) else datetime.strptime(str(log.END_TIME), "%H:%M:%S").time()
                except Exception as e:
                    logger.error(f"Error parsing times for log {log.id if hasattr(log, 'id') else ''}: {e}")
                    continue

                # --- Outside main window exclusion with duration calculation ---
                original_st, original_et = st, et
                
                # Check if start time is before main window (before 08:30)
                if st < start_window:
                    outside_end = min(et, start_window)
                    duration_seconds = (datetime.combine(report_date, outside_end) - datetime.combine(report_date, st)).total_seconds()
                    hh, mm = divmod(int(duration_seconds // 60), 60)
                    # Calculate work time remaining after exclusion
                    total_work_seconds = (datetime.combine(report_date, original_et) - datetime.combine(report_date, original_st)).total_seconds()
                    work_seconds = total_work_seconds - duration_seconds
                    wh, wm = divmod(int(work_seconds // 60), 60)
                    
                    excluded_logs.append({
                        "MACHINE_ID": log.MACHINE_ID,
                        "START_TIME": st.strftime("%H:%M"),
                        "END_TIME": outside_end.strftime("%H:%M"),
                        "REASON": f"Outside main window (before {start_window.strftime('%H:%M')})",
                        "Outside Main Window Time Excluded": f"{hh:02d}:{mm:02d}",
                        "Work Time Remaining": f"{wh:02d}:{wm:02d}"
                    })
                    logger.info(f"Excluded (Outside main window - before): MACHINE_ID={log.MACHINE_ID}, TIME={st.strftime('%H:%M')}–{outside_end.strftime('%H:%M')}")
                    st = max(st, start_window)
                
                # Check if end time is after main window (after 19:30)
                if et > end_window:
                    outside_start = max(st, end_window)
                    duration_seconds = (datetime.combine(report_date, et) - datetime.combine(report_date, outside_start)).total_seconds()
                    hh, mm = divmod(int(duration_seconds // 60), 60)
                    # Calculate work time remaining after exclusion
                    total_work_seconds = (datetime.combine(report_date, original_et) - datetime.combine(report_date, original_st)).total_seconds()
                    work_seconds = total_work_seconds - duration_seconds
                    wh, wm = divmod(int(work_seconds // 60), 60)
                    
                    excluded_logs.append({
                        "MACHINE_ID": log.MACHINE_ID,
                        "START_TIME": outside_start.strftime("%H:%M"),
                        "END_TIME": et.strftime("%H:%M"),
                        "REASON": f"Outside main window (after {end_window.strftime('%H:%M')})",
                        "Outside Main Window Time Excluded": f"{hh:02d}:{mm:02d}",
                        "Work Time Remaining": f"{wh:02d}:{wm:02d}"
                    })
                    logger.info(f"Excluded (Outside main window - after): MACHINE_ID={log.MACHINE_ID}, TIME={outside_start.strftime('%H:%M')}–{et.strftime('%H:%M')}")
                    et = min(et, end_window)
                
                # If after adjustment, nothing remains, skip this log
                if st >= et:
                    logger.info(f"Log MACHINE_ID={log.MACHINE_ID} skipped due to being fully outside main window after adjustment.")
                    continue

                total_break_overlap = 0
                excluded_parts = []
                for b_start, b_end in breaks:
                    latest_start = max(st, b_start)
                    earliest_end = min(et, b_end)
                    if latest_start < earliest_end:
                        overlap_seconds = (datetime.combine(report_date, earliest_end) - datetime.combine(report_date, latest_start)).total_seconds()
                        total_break_overlap += overlap_seconds

                        hh, mm = divmod(int(overlap_seconds // 60), 60)
                        work_seconds = (datetime.combine(report_date, et) - datetime.combine(report_date, st)).total_seconds() - overlap_seconds
                        wh, wm = divmod(int(work_seconds // 60), 60)

                        excluded_parts.append({
                            "MACHINE_ID": log.MACHINE_ID,
                            "START_TIME": latest_start.strftime("%H:%M"),
                            "END_TIME": earliest_end.strftime("%H:%M"),
                            "REASON": f"Break overlap with {b_start.strftime('%H:%M')} - {b_end.strftime('%H:%M')}",
                            "Break Time Excluded": f"{hh:02d}:{mm:02d}",
                            "Work Time Remaining": f"{wh:02d}:{wm:02d}"
                        })
                        logger.info(f"Excluded (Partial Break): MACHINE_ID={log.MACHINE_ID}, TIME={latest_start.strftime('%H:%M')}–{earliest_end.strftime('%H:%M')}")

                excluded_logs.extend(excluded_parts)

                duration_seconds = (datetime.combine(report_date, et) - datetime.combine(report_date, st)).total_seconds()
                duration = duration_seconds / 3600.0
                duration -= total_break_overlap / 3600.0

                # Detailed conversion logs for each time and seconds conversion
                logger.info(f"--- Detailed Time Conversion for MACHINE_ID={log.MACHINE_ID} ---")
                logger.info(f"Start Time: {st.strftime('%H:%M:%S')}, End Time: {et.strftime('%H:%M:%S')}")
                logger.info(f"Raw Duration (seconds): {duration_seconds} seconds")
                logger.info(f"Raw Duration (hours): {duration_seconds} / 3600 = {duration_seconds / 3600.0} hours")
                logger.info(f"Total Break Overlap (seconds): {total_break_overlap} seconds")
                logger.info(f"Total Break Overlap (hours): {total_break_overlap} / 3600 = {total_break_overlap / 3600.0} hours")
                logger.info(f"Final Duration (hours): {duration_seconds / 3600.0} - {total_break_overlap / 3600.0} = {duration} hours")
                logger.info("Explanation: Duration is calculated as (End Time - Start Time) in seconds, then converted to hours by dividing by 3600. Any overlap with break times is subtracted (in seconds, then converted to hours).")
                logger.info("For example, 10 minutes = 10/60 = 0.166666... hours.")

                if duration <= 0:
                    logger.info(f"Log MACHINE_ID={log.MACHINE_ID} skipped due to non-positive duration after break exclusion.")
                    continue

                machine_id = log.MACHINE_ID
                
                report_key = f"{log.DATE}_{machine_id}"  # Group by date AND machine
                if report_key not in report:
                    report[report_key] = {
                        "Sewing Hours": 0,
                        "No feeding Hours": 0,
                        "Meeting Hours": 0,
                        "Maintenance Hours": 0,
                        "Idle Hours": 0,
                        "Rework Hours": 0,
                        "Needle Break": 0,
                        "Needle Run Time": 0,
                        "Total SPM": 0,
                        "SPM Instances": 0,
                        "Stitch Count": 0,
                    }
                    calculation_logs[report_key] = []

                # Calculation log for each metric
                mode = log.MODE
                reserve = float(getattr(log, "RESERVE", 0) or 0)
                needle_runtime = float(getattr(log, "NEEDLE_RUNTIME", 0) or 0)
                stitch_count = int(getattr(log, "STITCH_COUNT", 0) or 0)
                duration_hhmm = lambda h: f"{int(h):02d}:{int(round((h - int(h)) * 60)):02d}"

                # Total Hours
                total_hours = duration
                calculation_logs[report_key].append({
                    "Metric": "Total Hours",
                    "Value": duration_hhmm(duration),
                    "Calculation / Notes": f"End - Start ({et.strftime('%H:%M')} - {st.strftime('%H:%M')})"
                })

                # Mode based calculations
                if mode == 1:
                    report[report_key]["Sewing Hours"] += duration
                    report[report_key]["Needle Run Time"] += needle_runtime
                    if duration > 0:
                        spm_value = reserve
                        report[report_key]["Total SPM"] += spm_value
                        report[report_key]["SPM Instances"] += 1
                    report[report_key]["Stitch Count"] += stitch_count
                    calculation_logs[report_key].append({
                        "Metric": "Sewing (Mode 1)",
                        "Value": duration_hhmm(duration),
                        "Calculation / Notes": "Since MODE = 1"
                    })
                    calculation_logs[report_key].append({
                        "Metric": "Needle Runtime",
                        "Value": f"{needle_runtime}",
                        "Calculation / Notes": "From NEEDLE_RUNTIME field"
                    })
                    calculation_logs[report_key].append({
                        "Metric": "Sewing Speed (SPM)",
                        "Value": f"{spm_value:.2f}",
                        "Calculation / Notes": "RESERVE value"
                    })
                    calculation_logs[report_key].append({
                        "Metric": "Stitch Count",
                        "Value": f"{stitch_count}",
                        "Calculation / Notes": "From STITCH_COUNT field"
                    })
                elif mode == 2:
                    report[report_key]["Idle Hours"] += duration
                    calculation_logs[report_key].append({
                        "Metric": "Idle (Mode 2)",
                        "Value": duration_hhmm(duration),
                        "Calculation / Notes": "Since MODE = 2"
                    })
                elif mode == 3:
                    report[report_key]["No feeding Hours"] += duration
                    calculation_logs[report_key].append({
                        "Metric": "No Feeding (Mode 3)",
                        "Value": duration_hhmm(duration),
                        "Calculation / Notes": "Since MODE = 3"
                    })
                elif mode == 4:
                    report[report_key]["Meeting Hours"] += duration
                    calculation_logs[report_key].append({
                        "Metric": "Meeting (Mode 4)",
                        "Value": duration_hhmm(duration),
                        "Calculation / Notes": "Since MODE = 4"
                    })
                elif mode == 5:
                    report[report_key]["Maintenance Hours"] += duration
                    calculation_logs[report_key].append({
                        "Metric": "Maintenance (Mode 5)",
                        "Value": duration_hhmm(duration),
                        "Calculation / Notes": "Since MODE = 5"
                    })
                elif mode == 6:
                    report[report_key]["Rework Hours"] += duration
                    calculation_logs[report_key].append({
                        "Metric": "Rework (Mode 6)",
                        "Value": duration_hhmm(duration),
                        "Calculation / Notes": "Since MODE = 6"
                    })
                elif mode == 7:
                    report[report_key]["Needle Break"] += duration
                    calculation_logs[report_key].append({
                        "Metric": "Needle Break (Mode 7)",
                        "Value": duration_hhmm(duration),
                        "Calculation / Notes": "Since MODE = 7"
                    })
                # --- SPM calculation for all modes (no restriction) ---
                spm_value_all = reserve
                report[report_key]["Total SPM"] += spm_value_all
                report[report_key]["SPM Instances"] += 1
                calculation_logs[report_key].append({
                    "Metric": "SPM (All Modes)",
                    "Value": f"{spm_value_all:.2f}",
                    "Calculation / Notes": "RESERVE for all modes"
                })

        # Generate summary from all collected data
        for idx, (report_key, data) in enumerate(report.items(), 1):
            # Extract date and machine_id from the key
            date_part, machine_id = report_key.split('_', 1)
            machine_id = int(machine_id)
            
            PT = data["Sewing Hours"]
            NPT = data["No feeding Hours"] + data["Meeting Hours"] + data["Maintenance Hours"] + data["Idle Hours"] + data.get("Rework Hours", 0) + data.get("Needle Break", 0)
            total_hours = PT + NPT
            needle_runtime_secs = data["Needle Run Time"]  # already in seconds
            PT_secs = PT * 3600  # convert hours to seconds
            needle_time_pct = (needle_runtime_secs / PT_secs * 100) if PT_secs else 0
            spm = (data["Total SPM"] / data["SPM Instances"]) if data["SPM Instances"] else 0
            stitch_count = data.get("Stitch Count", 0)

            def hours_to_hhmm(hours):
                h = int(hours)
                m = int(round((hours - h) * 60))
                return f"{h:02d}:{m:02d}"

            pt_pct = (PT / total_hours * 100) if total_hours else 0
            npt_pct = (NPT / total_hours * 100) if total_hours else 0

            # Get machine logs for this specific date and machine
            machine_logs = [log for log in MachineLog.objects.filter(DATE=date_part, MACHINE_ID=machine_id)]
            start_time, end_time = get_machine_times(machine_logs, machine_id)
            
            summary.append({
                "S.no": idx,
                "Machine ID": machine_id,
                "Date": date_part,
                "Sewing Hours": hours_to_hhmm(data["Sewing Hours"]),
                "Idle Hours": hours_to_hhmm(data["Idle Hours"]),
                "Rework Hours": hours_to_hhmm(data.get("Rework Hours", 0)),
                "No feeding Hours": hours_to_hhmm(data["No feeding Hours"]),
                "Meeting Hours": hours_to_hhmm(data["Meeting Hours"]),
                "Maintenance Hours": hours_to_hhmm(data["Maintenance Hours"]),
                "Needle Break": hours_to_hhmm(data.get("Needle Break", 0)),
                "Productive Time (PT)": hours_to_hhmm(PT),
                "Non-Productive Time (NPT)": hours_to_hhmm(NPT),
                "Total Hours": hours_to_hhmm(total_hours),
                "PT %": round(pt_pct, 2),
                "NPT %": round(npt_pct, 2),
                "Needle Time %": round(needle_time_pct, 2),
                "SPM": round(spm, 2),
                "Stitch Count": stitch_count,
                "Start Time": start_time,
                "End Time": end_time,
            })

                # ✅ TILE 1 CALCULATION - PRODUCTIVITY HOURS
        logger.info("=== TILE 1 CALCULATION - PRODUCTIVITY HOURS ===")
        
        # Calculate total productivity hours across all machines
        total_productivity_hours = 0
        machine_productivity_data = {}
         # ✅ FIX: Track unique machine IDs instead of total rows
        unique_machine_ids = set()
        
        # ✅ DETAILED BREAKDOWN LOGGING WITH FORMULAS
        logger.info("=== DETAILED TILE 1 BREAKDOWN WITH FORMULAS ===")
        logger.info("STEP 1: Individual Machine Productivity Collection")
        logger.info("Formula: Productive Hours = Sum of Mode 1 (Sewing) hours per machine")
        logger.info("-" * 70)
        
        for report_key, data in report.items():
            date_part, machine_id = report_key.split('_', 1)
            machine_id = int(machine_id)
            
            # Mode 1 (Sewing) is considered productive time
            sewing_hours = data["Sewing Hours"]
            total_productivity_hours += sewing_hours
            
             # ✅ FIX: Accumulate hours for same machine across different dates
            if machine_id not in machine_productivity_data:
                machine_productivity_data[machine_id] = 0
            machine_productivity_data[machine_id] += sewing_hours
            
            # ✅ FIX: Track unique machine IDs
            unique_machine_ids.add(machine_id)
            
            # ✅ DETAILED LOGGING FOR EACH MACHINE
            logger.info(f"Machine {machine_id} on {date_part}:")
            logger.info(f"  ├─ Sewing Hours (Mode 1): {sewing_hours:.4f} hours")
            logger.info(f"  ├─ Formula: Mode 1 Duration = {sewing_hours:.4f} hours")
            logger.info(f"  └─ Running Total: {total_productivity_hours:.4f} hours")
        
        # ✅ FIX: Use unique machine count instead of total rows
        total_unique_machines = len(unique_machine_ids)
        
        logger.info("-" * 70)
        logger.info("STEP 2: Total Productivity Hours Calculation")
        logger.info(f"Formula: Total Productivity Hours = Σ(Machine Sewing Hours)")
        logger.info(f"Calculation: {' + '.join([f'{h:.4f}' for h in machine_productivity_data.values()])} = {total_productivity_hours:.4f} hours")
        logger.info(f"✅ UNIQUE MACHINES IDENTIFIED: {sorted(list(unique_machine_ids))}")
        logger.info(f"✅ TOTAL UNIQUE MACHINES: {total_unique_machines} (not {len(report)} rows)")
            
        # ✅ FIX: Log consolidated machine productivity (not last iteration)
        logger.info("-" * 70)
        logger.info("STEP 2B: Consolidated Machine Productivity")
        for machine_id, total_hours in machine_productivity_data.items():
            logger.info(f"Machine {machine_id}: {total_hours:.4f} productive hours (Mode 1 - Sewing) - CONSOLIDATED")
        
        # ✅ FIX: Calculate average using unique machine count
        avg_productivity_hours = total_productivity_hours / total_unique_machines if total_unique_machines > 0 else 0
        
        logger.info("-" * 70)
        logger.info("STEP 3: Average Productivity Calculation")
        logger.info(f"Formula: Average Productivity = Total Productivity Hours ÷ Number of UNIQUE Machines")
        logger.info(f"Calculation: {total_productivity_hours:.4f} ÷ {total_unique_machines} = {avg_productivity_hours:.4f} hours")
        
        # Convert to percentage (assuming 8 hours as 100% productivity per machine per day)
        # You can adjust this base value as per your business requirements
        base_hours_per_machine = 10.0  # 8 hours = 100% productivity
        # ✅ FIX: Use unique machine count for maximum possible hours
        max_possible_hours = base_hours_per_machine * total_unique_machines
        productivity_percentage = (total_productivity_hours / max_possible_hours * 100) if max_possible_hours > 0 else 0
        
        # Alternative percentage calculation based on average
        avg_productivity_percentage = (avg_productivity_hours / base_hours_per_machine * 100) if base_hours_per_machine > 0 else 0
        
        
        logger.info("-" * 70)
        logger.info("STEP 4: Percentage Calculations")
        logger.info(f"Base Hours per Machine (100% productivity): {base_hours_per_machine} hours")
        logger.info(f"Maximum Possible Hours: {base_hours_per_machine} × {total_unique_machines} = {max_possible_hours} hours")
        logger.info("")
        logger.info("4A. TOTAL PRODUCTIVITY PERCENTAGE:")
        logger.info(f"Formula: (Total Productive Hours ÷ Maximum Possible Hours) × 100")
        logger.info(f"Calculation: ({total_productivity_hours:.4f} ÷ {max_possible_hours:.4f}) × 100")
        logger.info(f"Result: {productivity_percentage:.4f}%")
        logger.info("")
        logger.info("4B. AVERAGE PRODUCTIVITY PERCENTAGE:")
        logger.info(f"Formula: (Average Productive Hours ÷ Base Hours per Machine) × 100")
        logger.info(f"Calculation: ({avg_productivity_hours:.4f} ÷ {base_hours_per_machine:.4f}) × 100")
        logger.info(f"Result: {avg_productivity_percentage:.4f}%")
        
        # Format hours to HH:MM
        def hours_to_hhmm_tile(hours):
            h = int(hours)
            m = int(round((hours - h) * 60))
            return f"{h:02d}:{m:02d}"
        
        
        logger.info("-" * 70)
        logger.info("STEP 5: Individual Machine Breakdown")
        logger.info("Formula per Machine: (Machine Hours ÷ Base Hours) × 100")
        
        # Create detailed machine breakdown with formulas
        machine_breakdown_detailed = {}
        for machine_id, hours in machine_productivity_data.items():
            machine_percentage = (hours / base_hours_per_machine * 100) if base_hours_per_machine > 0 else 0
            machine_breakdown_detailed[f"Machine_{machine_id}"] = {
                "hours": hours_to_hhmm_tile(hours),
                "hours_decimal": round(hours, 4),
                "percentage": round(machine_percentage, 4),
                "formula": f"({hours:.4f} ÷ {base_hours_per_machine}) × 100 = {machine_percentage:.4f}%"
            }
            
            logger.info(f"Machine {machine_id}:")
            logger.info(f"  ├─ Hours: {hours:.4f} ({hours_to_hhmm_tile(hours)})")
            logger.info(f"  ├─ Formula: ({hours:.4f} ÷ {base_hours_per_machine}) × 100")
            logger.info(f"  └─ Percentage: {machine_percentage:.4f}%")
        
        # ✅ FIX: Create Tile 1 data structure with unique machine count
        tile1_productivity = {
            "tile_name": "Productivity Hours",
            "total_productivity_hours": hours_to_hhmm_tile(total_productivity_hours),
            "total_productivity_hours_decimal": round(total_productivity_hours, 2),
            "average_productivity_hours": hours_to_hhmm_tile(avg_productivity_hours),
            "average_productivity_hours_decimal": round(avg_productivity_hours, 2),
            "total_machines": total_unique_machines,  # ✅ FIX: Use unique count
            "productivity_percentage_total": round(productivity_percentage, 2),
            "productivity_percentage_average": round(avg_productivity_percentage, 2),
            "base_hours_per_machine": base_hours_per_machine,
            "machine_breakdown": machine_breakdown_detailed,
            # ✅ ADD FORMULA DETAILS FOR FRONTEND
            "formulas": {
                "total_hours_formula": f"Σ(Machine Sewing Hours) = {total_productivity_hours:.4f}",
                "average_hours_formula": f"{total_productivity_hours:.4f} ÷ {total_unique_machines} = {avg_productivity_hours:.4f}",
                "total_percentage_formula": f"({total_productivity_hours:.4f} ÷ {max_possible_hours:.4f}) × 100 = {productivity_percentage:.4f}%",
                "average_percentage_formula": f"({avg_productivity_hours:.4f} ÷ {base_hours_per_machine}) × 100 = {avg_productivity_percentage:.4f}%"
            }
        }
        
        logger.info("-" * 70)
        logger.info("STEP 6: FINAL TILE 1 SUMMARY")
        logger.info(f"📊 TILE 1 - PRODUCTIVE TIME % BREAKDOWN:")
        logger.info(f"  ├─ Total Unique Machines: {total_unique_machines}")  # ✅ FIX: Updated label
        logger.info(f"  ├─ Total Productive Hours: {total_productivity_hours:.4f} ({hours_to_hhmm_tile(total_productivity_hours)})")
        logger.info(f"  ├─ Average Productive Hours: {avg_productivity_hours:.4f} ({hours_to_hhmm_tile(avg_productivity_hours)})")
        logger.info(f"  ├─ Total Productivity %: {productivity_percentage:.4f}%")
        logger.info(f"  └─ Average Productivity %: {avg_productivity_percentage:.4f}%")
        logger.info("")
        logger.info("🔍 KEY INSIGHTS:")
        logger.info(f"  • Each machine target: {base_hours_per_machine} hours = 100%")
        logger.info(f"  • Fleet target: {max_possible_hours} hours = 100%")  # ✅ FIX: Updated calculation
        logger.info(f"  • Actual achievement: {total_productivity_hours:.4f} hours ({productivity_percentage:.2f}%)")
        logger.info(f"  • Per machine average: {avg_productivity_hours:.4f} hours ({avg_productivity_percentage:.2f}%)")
        
        logger.info("-" * 70)
        logger.info("STEP 7: MACHINE PERFORMANCE RANKING")
        sorted_machines = sorted(machine_productivity_data.items(), key=lambda x: x[1], reverse=True)
        for rank, (machine_id, hours) in enumerate(sorted_machines, 1):
            percentage = (hours / base_hours_per_machine * 100) if base_hours_per_machine > 0 else 0
            logger.info(f"  #{rank}. Machine {machine_id}: {hours:.4f}h ({percentage:.2f}%)")
            
        logger.info("=== END TILE 1 DETAILED BREAKDOWN ===")
        
        # Add individual machine breakdown
        for machine_id, hours in machine_productivity_data.items():
            machine_percentage = (hours / base_hours_per_machine * 100) if base_hours_per_machine > 0 else 0
            tile1_productivity["machine_breakdown"][f"Machine_{machine_id}"] = {
                "hours": hours_to_hhmm_tile(hours),
                "hours_decimal": round(hours, 2),
                "percentage": round(machine_percentage, 2)
            }
        
        # ✅ FIX: Detailed logging for Tile 1 calculations with unique machine count
        logger.info("=== TILE 1 CALCULATION DETAILS ===")
        logger.info(f"Total Unique Machines Processed: {total_unique_machines}")
        logger.info(f"Base Hours per Machine (100% productivity): {base_hours_per_machine} hours")
        logger.info(f"Maximum Possible Productive Hours: {max_possible_hours} hours")
        logger.info(f"Actual Total Productive Hours: {total_productivity_hours:.2f} hours")
        logger.info(f"Average Productive Hours per Machine: {avg_productivity_hours:.2f} hours")
        logger.info(f"Total Productivity Percentage: {productivity_percentage:.2f}%")
        logger.info(f"Average Productivity Percentage: {avg_productivity_percentage:.2f}%")
        
        # Log individual machine breakdown
        for machine_id, hours in machine_productivity_data.items():
            machine_percentage = (hours / base_hours_per_machine * 100) if base_hours_per_machine > 0 else 0
            logger.info(f"Machine {machine_id}: {hours:.2f}h ({hours_to_hhmm_tile(hours)}) = {machine_percentage:.2f}%")
        
        # ✅ FIX: Calculation explanation log with correct machine count
        logger.info("=== CALCULATION EXPLANATION ===")
        logger.info("1. Total Productivity Hours = Sum of all Mode 1 (Sewing) hours across all machines")
        logger.info("2. Average Productivity Hours = Total Productivity Hours ÷ Number of UNIQUE Machines")
        logger.info(f"   Example: {total_productivity_hours:.2f}h ÷ {total_unique_machines} machines = {avg_productivity_hours:.2f}h")
        logger.info("3. Total Percentage = (Total Productive Hours ÷ Maximum Possible Hours) × 100")
        logger.info(f"   Example: ({total_productivity_hours:.2f}h ÷ {max_possible_hours}h) × 100 = {productivity_percentage:.2f}%")
        logger.info("4. Average Percentage = (Average Productive Hours ÷ Base Hours per Machine) × 100")
        logger.info(f"   Example: ({avg_productivity_hours:.2f}h ÷ {base_hours_per_machine}h) × 100 = {avg_productivity_percentage:.2f}%")

        logger.info("=== END TILE 1 DETAILED BREAKDOWN ===")
        
        # ✅ TILE 2 CALCULATION - NEEDLE RUNTIME AVERAGE
        logger.info("=== TILE 2 CALCULATION - NEEDLE RUNTIME AVERAGE ===")
        
        # Calculate needle runtime average excluding values < 2%
        total_needle_runtime = 0
        needle_runtime_data = {}
        needle_runtime_instances = 0
        excluded_needle_instances = 0
        
        # ✅ DETAILED BREAKDOWN LOGGING WITH FORMULAS
        logger.info("=== DETAILED TILE 2 BREAKDOWN WITH FORMULAS ===")
        logger.info("STEP 1: Individual Machine Needle Runtime Collection")
        logger.info("Formula: Needle Runtime % = (Needle Runtime Seconds ÷ Productive Time Seconds) × 100")
        logger.info("Exclusion Rule: Values < 2% are excluded from average calculation")
        logger.info("-" * 70)
        
        for report_key, data in report.items():
            date_part, machine_id = report_key.split('_', 1)
            machine_id = int(machine_id)
            
            # Calculate needle runtime percentage for this machine/date
            needle_runtime_secs = data["Needle Run Time"]  # already in seconds
            sewing_hours = data["Sewing Hours"]
            PT_secs = sewing_hours * 3600  # convert hours to seconds
            needle_time_pct = (needle_runtime_secs / PT_secs * 100) if PT_secs else 0
            
            # ✅ DETAILED LOGGING FOR EACH MACHINE
            logger.info(f"Machine {machine_id} on {date_part}:")
            logger.info(f"  ├─ Needle Runtime (seconds): {needle_runtime_secs:.4f} seconds")
            logger.info(f"  ├─ Productive Time (seconds): {PT_secs:.4f} seconds")
            logger.info(f"  ├─ Formula: ({needle_runtime_secs:.4f} ÷ {PT_secs:.4f}) × 100")
            logger.info(f"  ├─ Needle Runtime %: {needle_time_pct:.4f}%")
            
            # Check exclusion rule
            if needle_time_pct >= 2.0:
                total_needle_runtime += needle_time_pct
                needle_runtime_instances += 1
                
                # ✅ Accumulate for unique machines
                if machine_id not in needle_runtime_data:
                    needle_runtime_data[machine_id] = {"total": 0, "count": 0}
                needle_runtime_data[machine_id]["total"] += needle_time_pct
                needle_runtime_data[machine_id]["count"] += 1
                
                logger.info(f"  ├─ Status: INCLUDED (≥ 2%)")
                logger.info(f"  └─ Running Total: {total_needle_runtime:.4f}%, Instances: {needle_runtime_instances}")
            else:
                excluded_needle_instances += 1
                logger.info(f"  ├─ Status: EXCLUDED (< 2%)")
                logger.info(f"  └─ Excluded Instances Count: {excluded_needle_instances}")
        
        # Calculate average needle runtime
        avg_needle_runtime = total_needle_runtime / needle_runtime_instances if needle_runtime_instances > 0 else 0
        
        logger.info("-" * 70)
        logger.info("STEP 2: Needle Runtime Average Calculation")
        logger.info(f"Formula: Average Needle Runtime = Total Valid Runtime % ÷ Valid Instances")
        logger.info(f"Calculation: {total_needle_runtime:.4f}% ÷ {needle_runtime_instances} = {avg_needle_runtime:.4f}%")
        logger.info(f"✅ VALID INSTANCES (≥ 2%): {needle_runtime_instances}")
        logger.info(f"✅ EXCLUDED INSTANCES (< 2%): {excluded_needle_instances}")
        logger.info(f"✅ TOTAL INSTANCES PROCESSED: {needle_runtime_instances + excluded_needle_instances}")
        
        # Calculate individual machine averages
        machine_needle_averages = {}
        logger.info("-" * 70)
        logger.info("STEP 2B: Individual Machine Needle Runtime Averages")
        for machine_id, data in needle_runtime_data.items():
            machine_avg = data["total"] / data["count"] if data["count"] > 0 else 0
            machine_needle_averages[machine_id] = machine_avg
            logger.info(f"Machine {machine_id}: {data['total']:.4f}% ÷ {data['count']} instances = {machine_avg:.4f}% average")
        
        # Format percentage to display format
        def format_percentage(percentage):
            return f"{percentage:.2f}%"
        
        logger.info("-" * 70)
        logger.info("STEP 3: Needle Runtime Breakdown by Threshold")
        logger.info("Formula: Percentage Breakdown = (Count ÷ Total) × 100")
        
        total_processed = needle_runtime_instances + excluded_needle_instances
        included_percentage = (needle_runtime_instances / total_processed * 100) if total_processed > 0 else 0
        excluded_percentage = (excluded_needle_instances / total_processed * 100) if total_processed > 0 else 0
        
        logger.info(f"Included (≥ 2%): {needle_runtime_instances} instances ({included_percentage:.2f}%)")
        logger.info(f"Excluded (< 2%): {excluded_needle_instances} instances ({excluded_percentage:.2f}%)")
        
        # Create detailed machine breakdown
        needle_machine_breakdown = {}
        for machine_id, avg in machine_needle_averages.items():
            needle_machine_breakdown[f"Machine_{machine_id}"] = {
                "average_percentage": round(avg, 4),
                "instances_count": needle_runtime_data[machine_id]["count"],
                "total_percentage": round(needle_runtime_data[machine_id]["total"], 4),
                "formula": f"({needle_runtime_data[machine_id]['total']:.4f}% ÷ {needle_runtime_data[machine_id]['count']}) = {avg:.4f}%"
            }
        
        # ✅ Create Tile 2 data structure
        tile2_needle_runtime = {
            "tile_name": "Needle Runtime Average %",
            "average_needle_runtime": format_percentage(avg_needle_runtime),
            "average_needle_runtime_decimal": round(avg_needle_runtime, 2),
            "total_valid_instances": needle_runtime_instances,
            "total_excluded_instances": excluded_needle_instances,
            "total_processed_instances": total_processed,
            "exclusion_threshold": 2.0,
            "inclusion_rate_percentage": round(included_percentage, 2),
            "exclusion_rate_percentage": round(excluded_percentage, 2),
            "machine_breakdown": needle_machine_breakdown,
            # ✅ ADD FORMULA DETAILS FOR FRONTEND
            "formulas": {
                "average_formula": f"{total_needle_runtime:.4f}% ÷ {needle_runtime_instances} = {avg_needle_runtime:.4f}%",
                "exclusion_rule": "Values < 2% are excluded from calculation",
                "inclusion_formula": f"({needle_runtime_instances} ÷ {total_processed}) × 100 = {included_percentage:.2f}%",
                "exclusion_formula": f"({excluded_needle_instances} ÷ {total_processed}) × 100 = {excluded_percentage:.2f}%"
            }
        }
        
        logger.info("-" * 70)
        logger.info("STEP 4: Individual Machine Needle Runtime Details")
        logger.info("Formula per Machine: Total Runtime % ÷ Instance Count = Average %")
        
        for machine_id, avg in machine_needle_averages.items():
            data = needle_runtime_data[machine_id]
            logger.info(f"Machine {machine_id}:")
            logger.info(f"  ├─ Total Runtime %: {data['total']:.4f}%")
            logger.info(f"  ├─ Valid Instances: {data['count']}")
            logger.info(f"  ├─ Formula: {data['total']:.4f}% ÷ {data['count']} instances")
            logger.info(f"  └─ Average: {avg:.4f}%")
        
        logger.info("-" * 70)
        logger.info("STEP 5: FINAL TILE 2 SUMMARY")
        logger.info(f"📊 TILE 2 - NEEDLE RUNTIME AVERAGE % BREAKDOWN:")
        logger.info(f"  ├─ Total Processed Instances: {total_processed}")
        logger.info(f"  ├─ Valid Instances (≥ 2%): {needle_runtime_instances} ({included_percentage:.2f}%)")
        logger.info(f"  ├─ Excluded Instances (< 2%): {excluded_needle_instances} ({excluded_percentage:.2f}%)")
        logger.info(f"  ├─ Total Valid Runtime %: {total_needle_runtime:.4f}%")
        logger.info(f"  └─ Average Needle Runtime %: {avg_needle_runtime:.4f}%")
        logger.info("")
        logger.info("🔍 KEY INSIGHTS:")
        logger.info(f"  • Exclusion Threshold: {tile2_needle_runtime['exclusion_threshold']}%")
        logger.info(f"  • Data Quality: {included_percentage:.1f}% of instances are valid (≥ 2%)")
        logger.info(f"  • Average Performance: {avg_needle_runtime:.2f}% needle runtime efficiency")
        
        logger.info("-" * 70)
        logger.info("STEP 6: MACHINE NEEDLE RUNTIME RANKING")
        sorted_needle_machines = sorted(machine_needle_averages.items(), key=lambda x: x[1], reverse=True)
        for rank, (machine_id, avg_pct) in enumerate(sorted_needle_machines, 1):
            instances = needle_runtime_data[machine_id]["count"]
            logger.info(f"  #{rank}. Machine {machine_id}: {avg_pct:.4f}% ({instances} valid instances)")
            
        logger.info("=== END TILE 2 DETAILED BREAKDOWN ===")
        
        # Add individual machine breakdown
        for machine_id, hours in machine_productivity_data.items():
            machine_percentage = (hours / base_hours_per_machine * 100) if base_hours_per_machine > 0 else 0
            tile1_productivity["machine_breakdown"][f"Machine_{machine_id}"] = {
                "hours": hours_to_hhmm_tile(hours),
                "hours_decimal": round(hours, 2),
                "percentage": round(machine_percentage, 2)
            }
        
        # ✅ DETAILED LOGGING FOR TILE 2 CALCULATIONS
        logger.info("=== TILE 2 CALCULATION DETAILS ===")
        logger.info(f"Total Instances Processed: {total_processed}")
        logger.info(f"Valid Instances for Calculation: {needle_runtime_instances}")
        logger.info(f"Excluded Instances (< 2%): {excluded_needle_instances}")
        logger.info(f"Exclusion Threshold: {tile2_needle_runtime['exclusion_threshold']}%")
        logger.info(f"Total Valid Runtime Percentage: {total_needle_runtime:.2f}%")
        logger.info(f"Average Needle Runtime Percentage: {avg_needle_runtime:.2f}%")
        logger.info(f"Data Inclusion Rate: {included_percentage:.2f}%")
        
        # Log individual machine breakdown
        for machine_id, avg in machine_needle_averages.items():
            data = needle_runtime_data[machine_id]
            logger.info(f"Machine {machine_id}: {data['total']:.2f}% total, {data['count']} instances = {avg:.2f}% average")
        
        # ✅ CALCULATION EXPLANATION LOG FOR TILE 2
        logger.info("=== TILE 2 CALCULATION EXPLANATION ===")
        logger.info("1. Needle Runtime % = (Needle Runtime Seconds ÷ Productive Time Seconds) × 100")
        logger.info("2. Exclusion Rule: Values < 2% are excluded from average calculation")
        logger.info("3. Average Needle Runtime = Sum of Valid Runtime % ÷ Number of Valid Instances")
        logger.info(f"   Example: {total_needle_runtime:.2f}% ÷ {needle_runtime_instances} instances = {avg_needle_runtime:.2f}%")
        logger.info("4. Data Quality = (Valid Instances ÷ Total Instances) × 100")
        logger.info(f"   Example: ({needle_runtime_instances} ÷ {total_processed}) × 100 = {included_percentage:.2f}%")

        logger.info("=== END TILE 2 DETAILED BREAKDOWN ===")
        
                # ✅ TILE 3 CALCULATION - SEWING SPEED AVERAGE
        logger.info("=== TILE 3 CALCULATION - SEWING SPEED AVERAGE ===")
        
        # Calculate sewing speed average from all SPM values
        total_sewing_speed = 0
        sewing_speed_data = {}
        sewing_speed_instances = 0
        
        # ✅ DETAILED BREAKDOWN LOGGING WITH FORMULAS
        logger.info("=== DETAILED TILE 3 BREAKDOWN WITH FORMULAS ===")
        logger.info("STEP 1: Individual Machine Sewing Speed Collection")
        logger.info("Formula: Sewing Speed (SPM) = RESERVE value from database")
        logger.info("Note: All instances are included, no exclusion rule applied")
        logger.info("-" * 70)
        
        # ✅ FIX: Collect machine-level averages first, then calculate fleet average
        machine_sewing_totals = {}  # Track total SPM per machine
        machine_instance_counts = {}  # Track instance count per machine
        
        for report_key, data in report.items():
            date_part, machine_id = report_key.split('_', 1)
            machine_id = int(machine_id)
            
            # Calculate SPM for this machine/date
            spm_value = (data["Total SPM"] / data["SPM Instances"]) if data["SPM Instances"] else 0
            
            # ✅ DETAILED LOGGING FOR EACH MACHINE
            logger.info(f"Machine {machine_id} on {date_part}:")
            logger.info(f"  ├─ Total SPM: {data['Total SPM']:.4f}")
            logger.info(f"  ├─ SPM Instances: {data['SPM Instances']}")
            logger.info(f"  ├─ Formula: {data['Total SPM']:.4f} ÷ {data['SPM Instances']} = {spm_value:.4f} SPM")
            logger.info(f"  ├─ Sewing Speed (SPM): {spm_value:.4f}")
            
            # ✅ FIX: Accumulate per machine instead of per date-machine combination
            if machine_id not in machine_sewing_totals:
                machine_sewing_totals[machine_id] = 0
                machine_instance_counts[machine_id] = 0
            
            machine_sewing_totals[machine_id] += spm_value
            machine_instance_counts[machine_id] += 1
            
            logger.info(f"  ├─ Status: INCLUDED (All instances included)")
            logger.info(f"  └─ Machine {machine_id} Running Total: {machine_sewing_totals[machine_id]:.4f} SPM, Instances: {machine_instance_counts[machine_id]}")
        
        # ✅ FIX: Calculate machine averages and then fleet average
        machine_sewing_averages = {}
        for machine_id, total_spm in machine_sewing_totals.items():
            machine_avg = total_spm / machine_instance_counts[machine_id] if machine_instance_counts[machine_id] > 0 else 0
            machine_sewing_averages[machine_id] = machine_avg
            total_sewing_speed += machine_avg  # ✅ FIX: Add machine average, not individual SPM values
        
        # ✅ FIX: Use unique machine count for instances
        sewing_speed_instances = len(machine_sewing_averages)  # ✅ FIX: Count unique machines, not date-machine combinations
        
        # Calculate average sewing speed
        avg_sewing_speed = total_sewing_speed / sewing_speed_instances if sewing_speed_instances > 0 else 0
        
        logger.info("-" * 70)
        logger.info("STEP 2: Sewing Speed Average Calculation")
        logger.info(f"Formula: Average Sewing Speed = Sum of Machine Averages ÷ Number of Unique Machines")  # ✅ UPDATED
        logger.info(f"Calculation: {total_sewing_speed:.4f} ÷ {sewing_speed_instances} = {avg_sewing_speed:.4f} SPM")
        logger.info(f"✅ TOTAL UNIQUE MACHINES: {sewing_speed_instances}")  # ✅ UPDATED
        logger.info(f"✅ NO EXCLUSIONS APPLIED: All instances are valid")
        
        # ✅ FIX: Update sewing_speed_data to match the corrected structure
        sewing_speed_data = {}
        for machine_id, avg_spm in machine_sewing_averages.items():
            sewing_speed_data[machine_id] = {
                "total": machine_sewing_totals[machine_id],
                "count": machine_instance_counts[machine_id]
            }
        
        logger.info("-" * 70)
        logger.info("STEP 2B: Individual Machine Sewing Speed Averages")
        for machine_id, avg_spm in machine_sewing_averages.items():
            instances = machine_instance_counts[machine_id]
            total_spm = machine_sewing_totals[machine_id]
            logger.info(f"Machine {machine_id}: {total_spm:.4f} SPM ÷ {instances} instances = {avg_spm:.4f} SPM average")
        
        # Format sewing speed to display format (numeric, not percentage)
        def format_sewing_speed(speed):
            return f"{speed:.2f}"
        
        logger.info("-" * 70)
        logger.info("STEP 3: Sewing Speed Distribution Analysis")
        logger.info("Formula: Performance Analysis = Individual vs Average comparison")
        
        # Analyze machine performance vs average
        above_avg_count = 0
        below_avg_count = 0
        equal_avg_count = 0
        
        for machine_id, avg in machine_sewing_averages.items():
            if avg > avg_sewing_speed:
                above_avg_count += 1
                status = "ABOVE AVERAGE"
            elif avg < avg_sewing_speed:
                below_avg_count += 1
                status = "BELOW AVERAGE"
            else:
                equal_avg_count += 1
                status = "EQUAL TO AVERAGE"
            
            logger.info(f"Machine {machine_id}: {avg:.4f} SPM - {status}")
        
        logger.info(f"Performance Distribution:")
        logger.info(f"  ├─ Above Average: {above_avg_count} machines")
        logger.info(f"  ├─ Below Average: {below_avg_count} machines")
        logger.info(f"  └─ Equal to Average: {equal_avg_count} machines")
        
        # Create detailed machine breakdown
        sewing_machine_breakdown = {}
        for machine_id, avg in machine_sewing_averages.items():
            performance_vs_avg = ((avg - avg_sewing_speed) / avg_sewing_speed * 100) if avg_sewing_speed > 0 else 0
            sewing_machine_breakdown[f"Machine_{machine_id}"] = {
                "average_spm": round(avg, 4),
                "instances_count": machine_instance_counts[machine_id],  # ✅ FIX: Use corrected count
                "total_spm": round(machine_sewing_totals[machine_id], 4),  # ✅ FIX: Use corrected total
                "performance_vs_average": round(performance_vs_avg, 2),
                "formula": f"({machine_sewing_totals[machine_id]:.4f} ÷ {machine_instance_counts[machine_id]}) = {avg:.4f} SPM"
            }
        
        # ✅ Create Tile 3 data structure
        tile3_sewing_speed = {
            "tile_name": "Sewing Speed Average",
            "average_sewing_speed": format_sewing_speed(avg_sewing_speed),
            "average_sewing_speed_decimal": round(avg_sewing_speed, 2),
            "total_instances": sewing_speed_instances,  # ✅ FIX: Now shows unique machine count
            "total_sewing_speed": round(total_sewing_speed, 2),
            "above_average_count": above_avg_count,
            "below_average_count": below_avg_count,
            "equal_average_count": equal_avg_count,
            "unit": "SPM",
            "machine_breakdown": sewing_machine_breakdown,
            # ✅ ADD FORMULA DETAILS FOR FRONTEND
            "formulas": {
                "average_formula": f"{total_sewing_speed:.4f} ÷ {sewing_speed_instances} = {avg_sewing_speed:.4f} SPM",
                "no_exclusion_rule": "All instances are included in calculation",
                "performance_formula": "((Machine SPM - Average SPM) ÷ Average SPM) × 100 = Performance %",
                "collection_formula": "Machine Average = Total SPM ÷ SPM Instances per machine, Fleet Average = Sum of Machine Averages ÷ Number of Machines"  # ✅ UPDATED
            }
        }
        
        logger.info("-" * 70)
        logger.info("STEP 4: Individual Machine Sewing Speed Details")
        logger.info("Formula per Machine: Total SPM ÷ Instance Count = Average SPM")
        
        for machine_id, avg in machine_sewing_averages.items():
            instances = machine_instance_counts[machine_id]
            total_spm = machine_sewing_totals[machine_id]
            performance = ((avg - avg_sewing_speed) / avg_sewing_speed * 100) if avg_sewing_speed > 0 else 0
            logger.info(f"Machine {machine_id}:")
            logger.info(f"  ├─ Total SPM: {total_spm:.4f}")
            logger.info(f"  ├─ Valid Instances: {instances}")
            logger.info(f"  ├─ Formula: {total_spm:.4f} ÷ {instances} instances")
            logger.info(f"  ├─ Average SPM: {avg:.4f}")
            logger.info(f"  └─ Performance vs Fleet Avg: {performance:+.2f}%")
        
        logger.info("-" * 70)
        logger.info("STEP 5: FINAL TILE 3 SUMMARY")
        logger.info(f"📊 TILE 3 - SEWING SPEED AVERAGE BREAKDOWN:")
        logger.info(f"  ├─ Total Unique Machines Processed: {sewing_speed_instances}")  # ✅ UPDATED
        logger.info(f"  ├─ Sum of Machine Averages: {total_sewing_speed:.4f}")  # ✅ UPDATED
        logger.info(f"  ├─ Fleet Average Sewing Speed: {avg_sewing_speed:.4f} SPM")  # ✅ UPDATED
        logger.info(f"  ├─ Above Average Machines: {above_avg_count}")
        logger.info(f"  ├─ Below Average Machines: {below_avg_count}")
        logger.info(f"  └─ Equal to Average Machines: {equal_avg_count}")
        logger.info("")
        logger.info("🔍 KEY INSIGHTS:")
        logger.info(f"  • Unit: SPM (Stitches Per Minute)")
        logger.info(f"  • No Exclusions: All data points included")
        logger.info(f"  • Fleet Performance: {avg_sewing_speed:.2f} SPM average")
        logger.info(f"  • Performance Spread: {len(machine_sewing_averages)} machines analyzed")
        
        logger.info("-" * 70)
        logger.info("STEP 6: MACHINE SEWING SPEED RANKING")
        sorted_sewing_machines = sorted(machine_sewing_averages.items(), key=lambda x: x[1], reverse=True)
        for rank, (machine_id, avg_spm) in enumerate(sorted_sewing_machines, 1):
            instances = machine_instance_counts[machine_id]  # ✅ FIX: Use corrected count
            performance = ((avg_spm - avg_sewing_speed) / avg_sewing_speed * 100) if avg_sewing_speed > 0 else 0
            logger.info(f"  #{rank}. Machine {machine_id}: {avg_spm:.4f} SPM ({instances} instances, {performance:+.1f}% vs avg)")
            
        logger.info("=== END TILE 3 DETAILED BREAKDOWN ===")
        
        # Add individual machine breakdown
        for machine_id, hours in machine_productivity_data.items():
            machine_percentage = (hours / base_hours_per_machine * 100) if base_hours_per_machine > 0 else 0
            tile1_productivity["machine_breakdown"][f"Machine_{machine_id}"] = {
                "hours": hours_to_hhmm_tile(hours),
                "hours_decimal": round(hours, 2),
                "percentage": round(machine_percentage, 2)
            }
        
        # ✅ FIX: Updated logging for Tile 3 calculations
        logger.info("=== TILE 3 CALCULATION DETAILS ===")
        logger.info(f"Total Unique Machines Processed: {sewing_speed_instances}")  # ✅ UPDATED from 5 to 3
        logger.info(f"Sum of Machine Averages: {total_sewing_speed:.2f}")  # ✅ UPDATED description
        logger.info(f"Fleet Average Sewing Speed: {avg_sewing_speed:.2f} SPM")  # ✅ UPDATED
        logger.info(f"Above Average Performers: {above_avg_count} machines")
        logger.info(f"Below Average Performers: {below_avg_count} machines")
        logger.info(f"Unit: SPM (No percentage conversion)")
        
        # ✅ FIX: Log individual machine breakdown with corrected data
        for machine_id, avg in machine_sewing_averages.items():
            instances = machine_instance_counts[machine_id]
            total_spm = machine_sewing_totals[machine_id]
            performance = ((avg - avg_sewing_speed) / avg_sewing_speed * 100) if avg_sewing_speed > 0 else 0
            logger.info(f"Machine {machine_id}: {total_spm:.2f} total SPM, {instances} instances = {avg:.2f} SPM avg ({performance:+.1f}%)")
        
        # ✅ FIX: Updated calculation explanation log
        logger.info("=== TILE 3 CALCULATION EXPLANATION ===")
        logger.info("1. SPM Collection = RESERVE value from database for each log entry")
        logger.info("2. Machine SPM = Total SPM ÷ Number of SPM Instances per machine per date")
        logger.info("3. Fleet Average Sewing Speed = Sum of Machine Averages ÷ Number of Unique Machines")  # ✅ UPDATED
        logger.info(f"   Example: {total_sewing_speed:.2f} ÷ {sewing_speed_instances} machines = {avg_sewing_speed:.2f} SPM")  # ✅ UPDATED
        logger.info("4. Performance Analysis = ((Machine SPM - Fleet Average) ÷ Fleet Average) × 100")
        logger.info("5. No Exclusions = All SPM values are included regardless of value")
        logger.info("6. Unit = SPM (Stitches Per Minute) - No percentage conversion applied")

        logger.info("=== END TILE 3 DETAILED BREAKDOWN ===")
        
        # ✅ TILE 4 CALCULATION - TOTAL HOURS SUMMARY
        logger.info("=== TILE 4 CALCULATION - TOTAL HOURS SUMMARY ===")
        
        # Calculate total hours sum from all machines
        total_hours_sum = 0
        machine_total_hours_data = {}
        total_hours_instances = 0
        
        # ✅ DETAILED BREAKDOWN LOGGING WITH FORMULAS
        logger.info("=== DETAILED TILE 4 BREAKDOWN WITH FORMULAS ===")
        logger.info("STEP 1: Individual Machine Total Hours Collection")
        logger.info("Formula: Total Hours = Sum of all mode hours per machine per date")
        logger.info("Note: All instances are included, no exclusion rule applied")
        logger.info("-" * 70)
        
        for report_key, data in report.items():
            date_part, machine_id = report_key.split('_', 1)
            machine_id = int(machine_id)
            
            # Calculate total hours for this machine/date
            machine_total_hours = (
                data["Sewing Hours"] + 
                data["Idle Hours"] + 
                data["Rework Hours"] + 
                data["No feeding Hours"] + 
                data["Meeting Hours"] + 
                data["Maintenance Hours"] + 
                data["Needle Break"]
            )
            
            # ✅ DETAILED LOGGING FOR EACH MACHINE
            logger.info(f"Machine {machine_id} on {date_part}:")
            logger.info(f"  ├─ Sewing Hours: {data['Sewing Hours']:.4f}")
            logger.info(f"  ├─ Idle Hours: {data['Idle Hours']:.4f}")
            logger.info(f"  ├─ Rework Hours: {data['Rework Hours']:.4f}")
            logger.info(f"  ├─ No Feeding Hours: {data['No feeding Hours']:.4f}")
            logger.info(f"  ├─ Meeting Hours: {data['Meeting Hours']:.4f}")
            logger.info(f"  ├─ Maintenance Hours: {data['Maintenance Hours']:.4f}")
            logger.info(f"  ├─ Needle Break Hours: {data['Needle Break']:.4f}")
            logger.info(f"  ├─ Formula: {data['Sewing Hours']:.4f} + {data['Idle Hours']:.4f} + {data['Rework Hours']:.4f} + {data['No feeding Hours']:.4f} + {data['Meeting Hours']:.4f} + {data['Maintenance Hours']:.4f} + {data['Needle Break']:.4f}")
            logger.info(f"  ├─ Total Hours: {machine_total_hours:.4f} hours")
            
            # Add to total calculation
            total_hours_sum += machine_total_hours
            total_hours_instances += 1
            
            # ✅ Accumulate for unique machines
            if machine_id not in machine_total_hours_data:
                machine_total_hours_data[machine_id] = {"total": 0, "count": 0}
            machine_total_hours_data[machine_id]["total"] += machine_total_hours
            machine_total_hours_data[machine_id]["count"] += 1
            
            logger.info(f"  ├─ Status: INCLUDED (All instances included)")
            logger.info(f"  └─ Running Total: {total_hours_sum:.4f} hours, Instances: {total_hours_instances}")
        
        logger.info("-" * 70)
        logger.info("STEP 2: Total Hours Sum Calculation")
        logger.info(f"Formula: Total Hours Sum = Σ(All Machine Total Hours)")
        logger.info(f"Calculation: Sum of all individual machine total hours = {total_hours_sum:.4f} hours")
        logger.info(f"✅ TOTAL INSTANCES PROCESSED: {total_hours_instances}")
        logger.info(f"✅ NO EXCLUSIONS APPLIED: All instances are valid")
        
        # Calculate individual machine totals
        machine_total_hours_summary = {}
        logger.info("-" * 70)
        logger.info("STEP 2B: Individual Machine Total Hours Summary")
        for machine_id, data in machine_total_hours_data.items():
            machine_total_hours_summary[machine_id] = data["total"]
            logger.info(f"Machine {machine_id}: {data['total']:.4f} hours total across {data['count']} instances")
        
        # Format hours to HH:MM display format
        def format_hours_to_hhmm(hours):
            h = int(hours)
            m = int(round((hours - h) * 60))
            return f"{h:02d}:{m:02d}"
        
        logger.info("-" * 70)
        logger.info("STEP 3: Hours Format Conversion")
        logger.info("Formula: Hours to HH:MM = Integer hours : (Decimal part × 60) minutes")
        
        total_hours_hhmm = format_hours_to_hhmm(total_hours_sum)
        logger.info(f"Total Hours in decimal: {total_hours_sum:.4f} hours")
        logger.info(f"Conversion process:")
        logger.info(f"  ├─ Integer part: {int(total_hours_sum)} hours")
        logger.info(f"  ├─ Decimal part: {total_hours_sum - int(total_hours_sum):.4f}")
        logger.info(f"  ├─ Minutes: {int(round((total_hours_sum - int(total_hours_sum)) * 60))} minutes")
        logger.info(f"  └─ Final format: {total_hours_hhmm}")
        
        # Create detailed machine breakdown
        total_hours_machine_breakdown = {}
        for machine_id, total_hours in machine_total_hours_summary.items():
            total_hours_machine_breakdown[f"Machine_{machine_id}"] = {
                "total_hours_decimal": round(total_hours, 4),
                "total_hours_hhmm": format_hours_to_hhmm(total_hours),
                "instances_count": machine_total_hours_data[machine_id]["count"],
                "formula": f"Sum of all mode hours for Machine {machine_id} = {total_hours:.4f} hours"
            }
        
        # ✅ Create Tile 4 data structure
        tile4_total_hours = {
            "tile_name": "Total Hours",
            "total_hours_sum": total_hours_hhmm,
            "total_hours_sum_decimal": round(total_hours_sum, 2),
            "total_instances": total_hours_instances,
            "unique_machines": len(machine_total_hours_summary),
            "unit": "HH:MM",
            "machine_breakdown": total_hours_machine_breakdown,
            # ✅ ADD FORMULA DETAILS FOR FRONTEND
            "formulas": {
                "sum_formula": f"Σ(All Machine Hours) = {total_hours_sum:.4f} hours",
                "no_exclusion_rule": "All instances are included in calculation",
                "format_formula": f"Decimal to HH:MM: {total_hours_sum:.4f} → {total_hours_hhmm}",
                "collection_formula": "Machine Total = Sewing + Idle + Rework + No Feeding + Meeting + Maintenance + Needle Break"
            }
        }
        
        logger.info("-" * 70)
        logger.info("STEP 4: Individual Machine Total Hours Details")
        logger.info("Formula per Machine: Sum of all mode hours = Total hours")
        
        for machine_id, total_hours in machine_total_hours_summary.items():
            instances = machine_total_hours_data[machine_id]["count"]
            logger.info(f"Machine {machine_id}:")
            logger.info(f"  ├─ Total Hours: {total_hours:.4f} hours")
            logger.info(f"  ├─ Formatted: {format_hours_to_hhmm(total_hours)}")
            logger.info(f"  ├─ Instances: {instances}")
            logger.info(f"  └─ Contribution to Fleet: {(total_hours/total_hours_sum*100):.2f}% of total")
        
        logger.info("-" * 70)
        logger.info("STEP 5: FINAL TILE 4 SUMMARY")
        logger.info(f"📊 TILE 4 - TOTAL HOURS BREAKDOWN:")
        logger.info(f"  ├─ Total Instances Processed: {total_hours_instances}")
        logger.info(f"  ├─ Unique Machines: {len(machine_total_hours_summary)}")
        logger.info(f"  ├─ Total Hours Sum (Decimal): {total_hours_sum:.4f} hours")
        logger.info(f"  └─ Total Hours Sum (HH:MM): {total_hours_hhmm}")
        logger.info("")
        logger.info("🔍 KEY INSIGHTS:")
        logger.info(f"  • Unit: HH:MM format")
        logger.info(f"  • No Exclusions: All data points included")
        logger.info(f"  • Direct Summation: Simple addition of all machine hours")
        logger.info(f"  • Fleet Total: {total_hours_hhmm} across {len(machine_total_hours_summary)} machines")
        
        logger.info("-" * 70)
        logger.info("STEP 6: MACHINE TOTAL HOURS RANKING")
        sorted_total_hours_machines = sorted(machine_total_hours_summary.items(), key=lambda x: x[1], reverse=True)
        for rank, (machine_id, total_hours) in enumerate(sorted_total_hours_machines, 1):
            instances = machine_total_hours_data[machine_id]["count"]
            percentage_of_fleet = (total_hours / total_hours_sum * 100) if total_hours_sum > 0 else 0
            logger.info(f"  #{rank}. Machine {machine_id}: {total_hours:.4f}h ({format_hours_to_hhmm(total_hours)}) - {percentage_of_fleet:.1f}% of fleet ({instances} instances)")
            
        logger.info("=== END TILE 4 DETAILED BREAKDOWN ===")
        
        # Add individual machine breakdown
        for machine_id, hours in machine_productivity_data.items():
            machine_percentage = (hours / base_hours_per_machine * 100) if base_hours_per_machine > 0 else 0
            tile1_productivity["machine_breakdown"][f"Machine_{machine_id}"] = {
                "hours": hours_to_hhmm_tile(hours),
                "hours_decimal": round(hours, 2),
                "percentage": round(machine_percentage, 2)
            }
        
        # ✅ DETAILED LOGGING FOR TILE 4 CALCULATIONS
        logger.info("=== TILE 4 CALCULATION DETAILS ===")
        logger.info(f"Total Instances Processed: {total_hours_instances}")
        logger.info(f"Total Hours Sum (Decimal): {total_hours_sum:.2f} hours")
        logger.info(f"Total Hours Sum (HH:MM): {total_hours_hhmm}")
        logger.info(f"Unique Machines Contributing: {len(machine_total_hours_summary)}")
        logger.info(f"Unit: HH:MM (Hours:Minutes format)")
        logger.info(f"Calculation Method: Direct summation of all machine total hours")
        
        # Log individual machine breakdown
        for machine_id, total_hours in machine_total_hours_summary.items():
            instances = machine_total_hours_data[machine_id]["count"]
            percentage = (total_hours / total_hours_sum * 100) if total_hours_sum > 0 else 0
            logger.info(f"Machine {machine_id}: {total_hours:.2f}h ({format_hours_to_hhmm(total_hours)}) = {percentage:.1f}% of fleet ({instances} instances)")
        
        # ✅ CALCULATION EXPLANATION LOG FOR TILE 4
        logger.info("=== TILE 4 CALCULATION EXPLANATION ===")
        logger.info("1. Machine Total Hours = Sewing + Idle + Rework + No Feeding + Meeting + Maintenance + Needle Break")
        logger.info("2. Fleet Total Hours = Sum of all Machine Total Hours across all dates")
        logger.info(f"   Example: Σ(Machine Hours) = {total_hours_sum:.2f} hours")
        logger.info("3. Format Conversion = Decimal hours → HH:MM format")
        logger.info(f"   Example: {total_hours_sum:.2f} hours → {total_hours_hhmm}")
        logger.info("4. No Exclusions = All machine hours are included regardless of value")
        logger.info("5. Unit = HH:MM (Hours:Minutes) - Direct time format")

        return Response({
            "summary": summary,
            "excluded_logs": excluded_logs,
            "tile1_productivity": tile1_productivity,  # ✅ Tile 1 data
            "tile2_needle_runtime": tile2_needle_runtime,  # ✅ Tile 2 data
            "tile3_sewing_speed": tile3_sewing_speed,  # ✅ Tile 3 data
            "tile4_total_hours": tile4_total_hours  # ✅ Add Tile 4 data to response
        })
        
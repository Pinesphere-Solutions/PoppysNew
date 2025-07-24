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
from .permissions import IsPoppysUser
import logging
logger = logging.getLogger('poppys')

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
        date = data.get("DATE")

        # Convert date from 'YYYY:M:D' or 'YYYY:MM:DD' to 'YYYY-MM-DD'
        if date and ':' in date:
            parts = date.split(':')
            if len(parts) == 3:
                date = f"{int(parts[0]):04d}-{int(parts[1]):02d}-{int(parts[2]):02d}"

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
        logger.info(f"MachineReport GET called with params: {request.query_params}")
        date_str = request.query_params.get('date')
        machine_id_filter = request.query_params.get('machine_id')
        if date_str:
            try:
                report_date = datetime.strptime(date_str, "%Y-%m-%d").date()
                logger.info(f"Parsed report_date: {report_date}")
            except ValueError:
                logger.error("Invalid date format received.")
                return Response({"error": "Invalid date format. Use YYYY-MM-DD."}, status=400)
        else:
            report_date = datetime.now().date()
            logger.info(f"No date param, using today's date: {report_date}")

        start_window = time(8, 30)
        end_window = time(19, 30)
        
        
                # Trim times to main window
        if st < start_window:
            excluded_outside = True
            outside_end = min(et, start_window)
            duration_seconds = (datetime.combine(report_date, outside_end) - datetime.combine(report_date, st)).total_seconds()
            hh, mm = divmod(int(duration_seconds // 60), 60)
            excluded_logs.append({
                "MACHINE_ID": log.MACHINE_ID,
                "START_TIME": st.strftime("%H:%M"),
                "END_TIME": outside_end.strftime("%H:%M"),
                "REASON": "Outside main window (before 08:30)",
                "Outside Main Window Time Excluded": f"{hh:02d}:{mm:02d}"
            })
            st = max(st, start_window)
        if et > end_window:
            excluded_outside = True
            outside_start = max(st, end_window)
            duration_seconds = (datetime.combine(report_date, et) - datetime.combine(report_date, outside_start)).total_seconds()
            hh, mm = divmod(int(duration_seconds // 60), 60)
            excluded_logs.append({
                "MACHINE_ID": log.MACHINE_ID,
                "START_TIME": outside_start.strftime("%H:%M"),
                "END_TIME": et.strftime("%H:%M"),
                "REASON": "Outside main window (after 19:30)",
                "Outside Main Window Time Excluded": f"{hh:02d}:{mm:02d}"
            })
            et = min(et, end_window)
        # If after adjustment, nothing remains, skip
        if st >= et:
            logger.info(f"Log MACHINE_ID={log.MACHINE_ID} skipped due to being fully outside main window after adjustment.")
        breaks = [
            (time(10, 30), time(10, 40)),
            (time(13, 20), time(14, 0)),
            (time(16, 20), time(16, 30)),
        ]

        logs = MachineLog.objects.filter(DATE=report_date)
        logger.info(f"Initial logs count for date {report_date}: {logs.count()}")
        if machine_id_filter:
            logs = logs.filter(MACHINE_ID=machine_id_filter)
            logger.info(f"Filtered logs by MACHINE_ID={machine_id_filter}: {logs.count()}")

        # --- Exclude logs that are entirely within break times ---
        filtered_logs = []
        for log in logs:
            try:
                st = log.START_TIME if isinstance(log.START_TIME, time) else datetime.strptime(str(log.START_TIME), "%H:%M:%S").time()
                et = log.END_TIME if isinstance(log.END_TIME, time) else datetime.strptime(str(log.END_TIME), "%H:%M:%S").time()
            except Exception as e:
                logger.error(f"Error parsing times for log {log.id if hasattr(log, 'id') else ''}: {e}")
                continue
            # Exclude if log is fully within any break
            omit = False
            for b_start, b_end in breaks:
                if st >= b_start and et <= b_end:
                    logger.info(f"Omitting log MACHINE_ID={log.MACHINE_ID} fully within break {b_start.strftime('%H:%M')}–{b_end.strftime('%H:%M')}")
                    omit = True
                    break
            if not omit:
                filtered_logs.append(log)
        logs = filtered_logs

        report = {}
        excluded_logs = []
        calculation_logs = {}

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
            excluded_outside = False

            # Trim times to main window and log excluded parts
            if st < start_window:
                excluded_outside = True
                outside_end = min(et, start_window)
                duration_seconds = (datetime.combine(report_date, outside_end) - datetime.combine(report_date, st)).total_seconds()
                hh, mm = divmod(int(duration_seconds // 60), 60)
                excluded_logs.append({
                    "MACHINE_ID": log.MACHINE_ID,
                    "START_TIME": st.strftime("%H:%M"),
                    "END_TIME": outside_end.strftime("%H:%M"),
                    "REASON": "Outside main window (before 08:30)",
                    "Outside Main Window Time Excluded": f"{hh:02d}:{mm:02d}"
                })
                st = max(st, start_window)
            if et > end_window:
                excluded_outside = True
                outside_start = max(st, end_window)
                duration_seconds = (datetime.combine(report_date, et) - datetime.combine(report_date, outside_start)).total_seconds()
                hh, mm = divmod(int(duration_seconds // 60), 60)
                excluded_logs.append({
                    "MACHINE_ID": log.MACHINE_ID,
                    "START_TIME": outside_start.strftime("%H:%M"),
                    "END_TIME": et.strftime("%H:%M"),
                    "REASON": "Outside main window (after 19:30)",
                    "Outside Main Window Time Excluded": f"{hh:02d}:{mm:02d}"
                })
                et = min(et, end_window)
            # If after adjustment, nothing remains, skip
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
    """ def get_permissions(self):
        if self.request.method == 'GET':
            return [IsPoppysUser()]
        return [AllowAny()]
     
 """
    
    
    def get(self, request, *args, **kwargs):
        logger.info(f"MachineReport GET called with params: {request.query_params}")
        date_str = request.query_params.get('date')
        machine_id_filter = request.query_params.get('machine_id')
        if date_str:
            try:
                report_date = datetime.strptime(date_str, "%Y-%m-%d").date()
                logger.info(f"Parsed report_date: {report_date}")
            except ValueError:
                logger.error("Invalid date format received.")
                return Response({"error": "Invalid date format. Use YYYY-MM-DD."}, status=400)
        else:
            report_date = datetime.now().date()
            logger.info(f"No date param, using today's date: {report_date}")

        start_window = time(8, 30)
        end_window = time(19, 30)
        breaks = [
            (time(10, 30), time(10, 40)),
            (time(13, 20), time(14, 0)),
            (time(16, 20), time(16, 30)),
        ]

        logs = MachineLog.objects.filter(DATE=report_date)
        logger.info(f"Initial logs count for date {report_date}: {logs.count()}")
        if machine_id_filter:
            logs = logs.filter(MACHINE_ID=machine_id_filter)
            logger.info(f"Filtered logs by MACHINE_ID={machine_id_filter}: {logs.count()}")

        # --- Exclude logs that are entirely within break times ---
        filtered_logs = []
        for log in logs:
            try:
                st = log.START_TIME if isinstance(log.START_TIME, time) else datetime.strptime(str(log.START_TIME), "%H:%M:%S").time()
                et = log.END_TIME if isinstance(log.END_TIME, time) else datetime.strptime(str(log.END_TIME), "%H:%M:%S").time()
            except Exception as e:
                logger.error(f"Error parsing times for log {log.id if hasattr(log, 'id') else ''}: {e}")
                continue
            # Exclude if log is fully within any break
            omit = False
            for b_start, b_end in breaks:
                if st >= b_start and et <= b_end:
                    logger.info(f"Omitting log MACHINE_ID={log.MACHINE_ID} fully within break {b_start.strftime('%H:%M')}–{b_end.strftime('%H:%M')}")
                    omit = True
                    break
            if not omit:
                filtered_logs.append(log)
        logs = filtered_logs

        report = {}
        excluded_logs = []
        calculation_logs = {}

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
            if machine_id not in report:
                report[machine_id] = {
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
                calculation_logs[machine_id] = []

            # Calculation log for each metric
            mode = log.MODE
            reserve = float(getattr(log, "RESERVE", 0) or 0)
            needle_runtime = float(getattr(log, "NEEDLE_RUNTIME", 0) or 0)
            stitch_count = int(getattr(log, "STITCH_COUNT", 0) or 0)
            duration_hhmm = lambda h: f"{int(h):02d}:{int(round((h - int(h)) * 60)):02d}"

            # Total Hours
            total_hours = duration
            calculation_logs[machine_id].append({
                "Metric": "Total Hours",
                "Value": duration_hhmm(duration),
                "Calculation / Notes": f"End - Start ({et.strftime('%H:%M')} - {st.strftime('%H:%M')})"
            })

            # Mode based calculations
            if mode == 1:
                report[machine_id]["Sewing Hours"] += duration
                report[machine_id]["Needle Run Time"] += needle_runtime
                if duration > 0:
                    spm_value = reserve
                    report[machine_id]["Total SPM"] += spm_value
                    report[machine_id]["SPM Instances"] += 1
                report[machine_id]["Stitch Count"] += stitch_count
                calculation_logs[machine_id].append({
                    "Metric": "Sewing (Mode 1)",
                    "Value": duration_hhmm(duration),
                    "Calculation / Notes": "Since MODE = 1"
                })
                calculation_logs[machine_id].append({
                    "Metric": "Needle Runtime",
                    "Value": f"{needle_runtime}",
                    "Calculation / Notes": "From NEEDLE_RUNTIME field"
                })
                calculation_logs[machine_id].append({
                    "Metric": "Sewing Speed (SPM)",
                    "Value": f"{spm_value:.2f}",
                    "Calculation / Notes": "RESERVE / (duration * 60)"
                })
                calculation_logs[machine_id].append({
                    "Metric": "Stitch Count",
                    "Value": f"{stitch_count}",
                    "Calculation / Notes": "From STITCH_COUNT field"
                })
            elif mode == 2:
                report[machine_id]["Idle Hours"] += duration
                calculation_logs[machine_id].append({
                    "Metric": "Idle (Mode 2)",
                    "Value": duration_hhmm(duration),
                    "Calculation / Notes": "Since MODE = 2"
                })
            elif mode == 3:
                report[machine_id]["No feeding Hours"] += duration
                calculation_logs[machine_id].append({
                    "Metric": "No Feeding (Mode 3)",
                    "Value": duration_hhmm(duration),
                    "Calculation / Notes": "Since MODE = 3"
                })
            elif mode == 4:
                report[machine_id]["Meeting Hours"] += duration
                calculation_logs[machine_id].append({
                    "Metric": "Meeting (Mode 4)",
                    "Value": duration_hhmm(duration),
                    "Calculation / Notes": "Since MODE = 4"
                })
            elif mode == 5:
                report[machine_id]["Maintenance Hours"] += duration
                calculation_logs[machine_id].append({
                    "Metric": "Maintenance (Mode 5)",
                    "Value": duration_hhmm(duration),
                    "Calculation / Notes": "Since MODE = 5"
                })
            elif mode == 6:
                report[machine_id]["Rework Hours"] += duration
                calculation_logs[machine_id].append({
                    "Metric": "Rework (Mode 6)",
                    "Value": duration_hhmm(duration),
                    "Calculation / Notes": "Since MODE = 6"
                })
            elif mode == 7:
                report[machine_id]["Needle Break"] += duration
                calculation_logs[machine_id].append({
                    "Metric": "Needle Break (Mode 7)",
                    "Value": duration_hhmm(duration),
                    "Calculation / Notes": "Since MODE = 7"
                })
            # --- SPM calculation for all modes (no restriction) ---
            spm_value_all = reserve
            report[machine_id]["Total SPM"] += spm_value_all
            report[machine_id]["SPM Instances"] += 1
            calculation_logs[machine_id].append({
                "Metric": "SPM (All Modes)",
                "Value": f"{spm_value_all:.2f}",
                "Calculation / Notes": "RESERVE for all modes"
            })

        summary = []
        for idx, (machine_id, data) in enumerate(report.items(), 1):
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

            # Detailed conversion logs for summary
            logger.info(f"--- Summary Conversions for MACHINE_ID={machine_id} ---")
            logger.info(f"Total Hours = PT (Sewing) + NPT (sum of Modes 2 to 7)")
            logger.info(f"PT (Sewing) = {PT} hours")
            logger.info(f"NPT (sum of Modes 2 to 7) = {NPT} hours")
            logger.info(f"Total Hours = {PT} + {NPT} = {total_hours} hours")
            logger.info(f"PT % = (Sewing / Total Hours) × 100 = ({PT} / {total_hours}) × 100 = {pt_pct:.2f}%")
            logger.info(f"NPT % = (NPT / Total Hours) × 100 = ({NPT} / {total_hours}) × 100 = {npt_pct:.2f}%")
            logger.info(f"Needle Runtime % = (Total Needle Runtime / Sewing duration) × 100 = ({needle_runtime_secs} / ({PT} × 3600)) × 100 = {needle_time_pct:.2f}%")
            logger.info(f"Sewing Speed = Average of SPM (RESERVE field) for all Modes = {spm:.2f}")
            logger.info(f"Stitch Count = Sum of STITCH_COUNT across all entries = {stitch_count}")
            logger.info("Test Explanation: All durations are in hours. For example, 10 minutes = 10/60 = 0.166666... hours. Percentages are calculated as per the formula above.")

            start_time, end_time = get_machine_times(logs, machine_id)
            summary.append({
                "S.no": idx,
                "Machine ID": machine_id,
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

            # Calculation log for summary
            logger.info("Calculation for table:")
            logger.info("Metric\tValue\tCalculation / Notes")
            logger.info(f"Total Hours\t{hours_to_hhmm(total_hours)}\tEnd - Start")
            logger.info(f"Sewing (Mode 1)\t{hours_to_hhmm(data['Sewing Hours'])}\tSince MODE = 1")
            logger.info(f"Idle (Mode 2)\t{hours_to_hhmm(data['Idle Hours'])}\t{'Since MODE = 2' if data['Idle Hours'] != '00:00' else 'Not present'}")
            logger.info(f"Rework (Mode 6)\t{hours_to_hhmm(data.get('Rework Hours', 0))}\t{'Since MODE = 6' if data.get('Rework Hours', 0) != 0 else 'Not present'}")
            logger.info(f"No Feeding (Mode 3)\t{hours_to_hhmm(data['No feeding Hours'])}\t{'Since MODE = 3' if data['No feeding Hours'] != '00:00' else 'Not present'}")
            logger.info(f"Meeting (Mode 4)\t{hours_to_hhmm(data['Meeting Hours'])}\t{'Since MODE = 4' if data['Meeting Hours'] != '00:00' else 'Not present'}")
            logger.info(f"Maintenance (Mode 5)\t{hours_to_hhmm(data['Maintenance Hours'])}\t{'Since MODE = 5' if data['Maintenance Hours'] != '00:00' else 'Not present'}")
            logger.info(f"Needle Break (Mode 7)\t{hours_to_hhmm(data.get('Needle Break', 0))}\t{'Since MODE = 7' if data.get('Needle Break', 0) != 0 else 'Not present'}")
            logger.info(f"PT %\t{pt_pct:.2f} %\t({int(PT*60)} / {int(total_hours*60)}) × 100 = {pt_pct:.2f}%")
            logger.info(f"NPT %\t{npt_pct:.2f} %\t({int(NPT*60)} / {int(total_hours*60)}) × 100 = {npt_pct:.2f}%")
            logger.info(f"Needle Runtime %\t{needle_time_pct:.2f} %\t({data['Needle Run Time']} / ({PT} × 3600)) × 100 = {needle_time_pct:.2f}%")
            logger.info(f"Sewing Speed (SPM)\t{spm:.2f}\tFrom RESERVE (SPM) directly")
            logger.info(f"Stitch Count\t{stitch_count}\tFrom STITCH_COUNT field")
            logger.info("----")
            # Also log all calculation logs for this machine
            for calc in calculation_logs[machine_id]:
                logger.info(f"{calc['Metric']}\t{calc['Value']}\t{calc['Calculation / Notes']}")

        # Print summary in the requested format for each machine
        logger.info("Date\tMachine ID\tTotal Hours\tSewing\tIdle\tRework Hours\tNo Feeding\tMeeting\tMaintenance\tNeedle Break\tPT %\tNPT %\tNeedle Runtime %\tSewing Speed\tStitch Count")
        for row in summary:
            total_hours = row['Total Hours']
            sewing = row['Sewing Hours']
            idle = row['Idle Hours']
            rework = row.get('Rework Hours', '0')
            no_feeding = row['No feeding Hours']
            meeting = row['Meeting Hours']
            maintenance = row['Maintenance Hours']
            needle_break = row.get('Needle Break', '0')
            pt = row['Productive Time (PT)']
            npt = row['Non-Productive Time (NPT)']
            needle_runtime_pct = f"{row['Needle Time %']:.2f}%"
            sewing_speed = f"{row['SPM']:.2f}"
            stitch_count = row.get('Stitch Count', '0')
            logger.info(
                f"{date_str or report_date}\t"
                f"{row['Machine ID']}\t"
                f"{total_hours}\t"
                f"{sewing}\t"
                f"{idle}\t"
                f"{rework}\t"
                f"{no_feeding}\t"
                f"{meeting}\t"
                f"{maintenance}\t"
                f"{needle_break}\t"
                f"{pt}\t"
                f"{npt}\t"
                f"{needle_runtime_pct}\t"
                f"{sewing_speed}\t"
                f"{stitch_count}"
            )
        logger.info("Excluded logs:")
        for excl in excluded_logs:
            logger.info(str(excl))

        # Log the full summary table as well
        logger.info("Full Summary Table:")
        logger.info("Date\tMachine ID\tTotal Hours\tSewing\tIdle\tRework Hours\tNo Feeding\tMeeting\tMaintenance\tNeedle Break\tPT %\tNPT %\tNeedle Runtime %\tSewing Speed\tStitch Count")
        for row in summary:
            total_hours = row['Total Hours']
            sewing = row['Sewing Hours']
            idle = row['Idle Hours']
            rework = row.get('Rework Hours', '0')
            no_feeding = row['No feeding Hours']
            meeting = row['Meeting Hours']
            maintenance = row['Maintenance Hours']
            needle_break = row.get('Needle Break', '0')
            pt = row['Productive Time (PT)']
            npt = row['Non-Productive Time (NPT)']
            needle_runtime_pct = f"{row['Needle Time %']:.2f}%"
            sewing_speed = f"{row['SPM']:.2f}"
            stitch_count = row.get('Stitch Count', '0')
            logger.info(
                f"{date_str or report_date}\t"
                f"{row['Machine ID']}\t"
                f"{total_hours}\t"
                f"{sewing}\t"
                f"{idle}\t"
                f"{rework}\t"
                f"{no_feeding}\t"
                f"{meeting}\t"
                f"{maintenance}\t"
                f"{needle_break}\t"
                f"{pt}\t"
                f"{npt}\t"
                f"{needle_runtime_pct}\t"
               f"{sewing_speed}\t"
                f"{stitch_count}"
            )

        return Response({
            "summary": summary,
            "excluded_logs": excluded_logs
        })
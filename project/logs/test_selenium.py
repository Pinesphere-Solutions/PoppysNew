import requests
import json
import time

API_URL = "https://ccgqk4mf-8000.inc1.devtunnels.ms/api/log/"

test_cases = [
    {
        "id": "TC01",
        "scenario": "API should allow all data to be posted without any blockers or restrictions.",
        "payload": {
            "MACHINE_ID": 1,
            "MODE": 2,
            "START_TIME": "07:00:00",
            "END_TIME": "20:00:00",
            "DATE": "2025:7:20",
            "LINE_NUMB": 1,
            "OPERATOR_ID": 1,
            "STITCH_COUNT": 0,
            "NEEDLE_RUNTIME": 0,
            "NEEDLE_STOPTIME": 0,
            "Tx_LOGID": 101,
            "Str_LOGID": 101,
            "DEVICE_ID": 1,
            "RESERVE": 0
        },
        "formula": "No restriction, all data should be accepted. (views.py: Condition 1)",
        "expected_status": [200, 201]
    },
    {
        "id": "TC02",
        "scenario": "Only logs within the official work window (08:30 AM to 07:30 PM) are considered.",
        "payload": {
            "MACHINE_ID": 2,
            "MODE": 1,
            "START_TIME": "08:00:00",
            "END_TIME": "09:00:00",
            "DATE": "2025:7:20",
            "LINE_NUMB": 1,
            "OPERATOR_ID": 2,
            "STITCH_COUNT": 100,
            "NEEDLE_RUNTIME": 10,
            "NEEDLE_STOPTIME": 1,
            "Tx_LOGID": 102,
            "Str_LOGID": 102,
            "DEVICE_ID": 2,
            "RESERVE": 25
        },
        "formula": "Trim to main window: Only 08:30–09:00 is counted (30 min). (views.py: start_window/end_window logic)",
        "expected_status": [200, 201]
    },
    {
        "id": "TC03",
        "scenario": "Logs entirely within break times are omitted from calculations.",
        "payload": {
            "MACHINE_ID": 3,
            "MODE": 1,
            "START_TIME": "10:32:00",
            "END_TIME": "10:38:00",
            "DATE": "2025:7:20",
            "LINE_NUMB": 1,
            "OPERATOR_ID": 3,
            "STITCH_COUNT": 50,
            "NEEDLE_RUNTIME": 5,
            "NEEDLE_STOPTIME": 1,
            "Tx_LOGID": 103,
            "Str_LOGID": 103,
            "DEVICE_ID": 3,
            "RESERVE": 20
        },
        "formula": "Omitted: Log is fully within morning break (10:30–10:40). (views.py: break exclusion logic)",
        "expected_status": [200, 201]
    },
    {
        "id": "TC04",
        "scenario": "Any log time outside the main work window (before 08:30 or after 19:30) is excluded.",
        "payload": {
            "MACHINE_ID": 4,
            "MODE": 2,
            "START_TIME": "19:15:00",
            "END_TIME": "19:45:00",
            "DATE": "2025:7:20",
            "LINE_NUMB": 1,
            "OPERATOR_ID": 4,
            "STITCH_COUNT": 0,
            "NEEDLE_RUNTIME": 0,
            "NEEDLE_STOPTIME": 0,
            "Tx_LOGID": 104,
            "Str_LOGID": 104,
            "DEVICE_ID": 4,
            "RESERVE": 0
        },
        "formula": "Only 19:15–19:30 is counted; 19:30–19:45 is excluded. (views.py: outside main window exclusion)",
        "expected_status": [200, 201]
    },
    {
        "id": "TC05",
        "scenario": "Needle Runtime % is calculated only for logs with the same MACHINE_ID and only if all logs are in Sewing mode.",
        "payload": {
            "MACHINE_ID": 5,
            "MODE": 1,
            "START_TIME": "09:00:00",
            "END_TIME": "10:00:00",
            "DATE": "2025:7:20",
            "LINE_NUMB": 1,
            "OPERATOR_ID": 5,
            "STITCH_COUNT": 200,
            "NEEDLE_RUNTIME": 30,
            "NEEDLE_STOPTIME": 2,
            "Tx_LOGID": 105,
            "Str_LOGID": 105,
            "DEVICE_ID": 5,
            "RESERVE": 30
        },
        "formula": "Needle Runtime % = (Total Needle Runtime / Sewing duration) × 100. Only Sewing mode logs for MACHINE_ID=5 are considered. (views.py: summary logic)",
        "expected_status": [200, 201]
    },
    {
        "id": "TC06",
        "scenario": "SPM (Stitches Per Minute) is calculated for all modes, average based on SPM instances.",
        "payload": {
            "MACHINE_ID": 6,
            "MODE": 3,
            "START_TIME": "14:10:00",
            "END_TIME": "14:30:00",
            "DATE": "2025:7:20",
            "LINE_NUMB": 1,
            "OPERATOR_ID": 6,
            "STITCH_COUNT": 120,
            "NEEDLE_RUNTIME": 10,
            "NEEDLE_STOPTIME": 1,
            "Tx_LOGID": 106,
            "Str_LOGID": 106,
            "DEVICE_ID": 6,
            "RESERVE": 40
        },
        "formula": "SPM = sum(RESERVE for all logs) / number of logs. (views.py: SPM calculation for all modes)",
        "expected_status": [200, 201]
    },
 {
        "id": "TC07",
        "scenario": "Needle Runtime % calculation with multiple logs for same MACHINE_ID, only Sewing mode.",
        "payloads": [
            {
                "MACHINE_ID": 7,
                "MODE": 1,
                "START_TIME": "09:00:00",
                "END_TIME": "09:30:00",
                "DATE": "2025:7:21",
                "LINE_NUMB": 1,
                "OPERATOR_ID": 7,
                "STITCH_COUNT": 100,
                "NEEDLE_RUNTIME": 15,
                "NEEDLE_STOPTIME": 2,
                "Tx_LOGID": 107,
                "Str_LOGID": 107,
                "DEVICE_ID": 7,
                "RESERVE": 30
            },
            {
                "MACHINE_ID": 7,
                "MODE": 1,
                "START_TIME": "10:00:00",
                "END_TIME": "10:45:00",
                "DATE": "2025:7:21",
                "LINE_NUMB": 1,
                "OPERATOR_ID": 7,
                "STITCH_COUNT": 150,
                "NEEDLE_RUNTIME": 25,
                "NEEDLE_STOPTIME": 3,
                "Tx_LOGID": 108,
                "Str_LOGID": 108,
                "DEVICE_ID": 7,
                "RESERVE": 35
            }
        ],
        "formula": "Needle Runtime % = (Total Needle Runtime / Total Sewing duration) × 100. Only Sewing mode logs for MACHINE_ID=7 are considered. (views.py: summary logic)",
        "expected_status": [200, 201]
    },
    {
        "id": "TC08",
        "scenario": "SPM calculation with multiple logs for same MACHINE_ID, all modes.",
        "payloads": [
            {
                "MACHINE_ID": 8,
                "MODE": 1,
                "START_TIME": "08:45:00",
                "END_TIME": "09:15:00",
                "DATE": "2025:7:21",
                "LINE_NUMB": 1,
                "OPERATOR_ID": 8,
                "STITCH_COUNT": 120,
                "NEEDLE_RUNTIME": 10,
                "NEEDLE_STOPTIME": 1,
                "Tx_LOGID": 109,
                "Str_LOGID": 109,
                "DEVICE_ID": 8,
                "RESERVE": 40
            },
            {
                "MACHINE_ID": 8,
                "MODE": 2,
                "START_TIME": "09:20:00",
                "END_TIME": "09:40:00",
                "DATE": "2025:7:21",
                "LINE_NUMB": 1,
                "OPERATOR_ID": 8,
                "STITCH_COUNT": 0,
                "NEEDLE_RUNTIME": 0,
                "NEEDLE_STOPTIME": 0,
                "Tx_LOGID": 110,
                "Str_LOGID": 110,
                "DEVICE_ID": 8,
                "RESERVE": 20
            }
        ],
        "formula": "SPM = sum(RESERVE for all logs) / number of logs for MACHINE_ID=8. (views.py: SPM calculation for all modes)",
        "expected_status": [200, 201]
    },
    {
        "id": "TC09",
        "scenario": "PT% (Productive Time %) calculation.",
        "payload": {
            "MACHINE_ID": 9,
            "MODE": 1,
            "START_TIME": "08:40:00",
            "END_TIME": "09:40:00",
            "DATE": "2025:7:21",
            "LINE_NUMB": 1,
            "OPERATOR_ID": 9,
            "STITCH_COUNT": 200,
            "NEEDLE_RUNTIME": 30,
            "NEEDLE_STOPTIME": 2,
            "Tx_LOGID": 111,
            "Str_LOGID": 111,
            "DEVICE_ID": 9,
            "RESERVE": 50
        },
        "formula": "PT% = (Sewing Hours / Total Hours) × 100. (views.py: summary logic)",
        "expected_status": [200, 201]
    },
    {
        "id": "TC10",
        "scenario": "NPT% (Non-Productive Time %) calculation.",
        "payload": {
            "MACHINE_ID": 10,
            "MODE": 2,
            "START_TIME": "10:00:00",
            "END_TIME": "11:00:00",
            "DATE": "2025:7:21",
            "LINE_NUMB": 1,
            "OPERATOR_ID": 10,
            "STITCH_COUNT": 0,
            "NEEDLE_RUNTIME": 0,
            "NEEDLE_STOPTIME": 0,
            "Tx_LOGID": 112,
            "Str_LOGID": 112,
            "DEVICE_ID": 10,
            "RESERVE": 0
        },
        "formula": "NPT% = (Non-Productive Hours / Total Hours) × 100. (views.py: summary logic)",
        "expected_status": [200, 201]
    }
]

def run_api_test_cases():
    with open("machine_log_test_results.txt", "a", encoding="utf-8") as f:
        total_hours = 0
        for case in test_cases:
            print("="*100, file=f)
            print(f"Test Case ID: {case['id']}", file=f)
            print(f"Scenario: {case['scenario']}", file=f)
            if "payloads" in case:
                for idx, payload in enumerate(case["payloads"], 1):
                    print(f"Payload {idx}: {json.dumps(payload)}", file=f)
                    try:
                        response = requests.post(API_URL, json=payload)
                        print(f"Status Code: {response.status_code}", file=f)
                        print(f"Response: {response.text}", file=f)
                        # Calculate and print duration for total hours
                        st = payload["START_TIME"]
                        et = payload["END_TIME"]
                        FMT = "%H:%M:%S"
                        tdelta = (
                            time.strptime(et, "%H:%M:%S") if len(et.split(":")) == 3 else time.strptime(et, "%H:%M")
                        )
                        tstart = (
                            time.strptime(st, "%H:%M:%S") if len(st.split(":")) == 3 else time.strptime(st, "%H:%M")
                        )
                        duration = (tdelta.tm_hour*60 + tdelta.tm_min) - (tstart.tm_hour*60 + tstart.tm_min)
                        total_hours += duration
                        if response.status_code in case['expected_status']:
                            print("Result: SUCCESS - Data accepted as expected.", file=f)
                        else:
                            print("Result: FAILURE - Data was not accepted.", file=f)
                    except Exception as e:
                        print(f"Exception occurred: {e}", file=f)
            else:
                print(f"Payload: {json.dumps(case['payload'])}", file=f)
                try:
                    response = requests.post(API_URL, json=case['payload'])
                    print(f"Status Code: {response.status_code}", file=f)
                    print(f"Response: {response.text}", file=f)
                    # Calculate and print duration for total hours
                    st = case["payload"]["START_TIME"]
                    et = case["payload"]["END_TIME"]
                    FMT = "%H:%M:%S"
                    tdelta = (
                        time.strptime(et, "%H:%M:%S") if len(et.split(":")) == 3 else time.strptime(et, "%H:%M")
                    )
                    tstart = (
                        time.strptime(st, "%H:%M:%S") if len(st.split(":")) == 3 else time.strptime(st, "%H:%M")
                    )
                    duration = (tdelta.tm_hour*60 + tdelta.tm_min) - (tstart.tm_hour*60 + tstart.tm_min)
                    total_hours += duration
                    if response.status_code in case['expected_status']:
                        print("Result: SUCCESS - Data accepted as expected.", file=f)
                    else:
                        print("Result: FAILURE - Data was not accepted.", file=f)
                except Exception as e:
                    print(f"Exception occurred: {e}", file=f)
            print(f"Formula: {case['formula']}", file=f)
            print("="*100 + "\n", file=f)
            time.sleep(1)
        print(f"Total Hours (all test scenarios): {total_hours//60:02d}:{total_hours%60:02d}", file=f)

if __name__ == "__main__":
    run_api_test_cases()
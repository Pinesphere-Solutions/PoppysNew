import requests
import json
import time

API_URL = "https://ccgqk4mf-8000.inc1.devtunnels.ms/api/log/"

test_cases = [
    {
        "id": "TC01",
        "scenario": "Normal log upload",
        "desc": "Valid payload, MODE=1, normal working hours, unique Tx_LOGID/Str_LOGID.",
        "payload": {
            "MACHINE_ID": 1,
            "LINE_NUMB": 1,
            "OPERATOR_ID": 1,
            "DATE": "2025:7:16",
            "START_TIME": "8:50:00",
            "END_TIME": "9:00:00",
            "MODE": 1,
            "STITCH_COUNT": 100,
            "NEEDLE_RUNTIME": 6,
            "NEEDLE_STOPTIME": 5,
            "Tx_LOGID": 10,
            "Str_LOGID": 10,
            "DEVICE_ID": 1,
            "RESERVE": 20
        },
        "expected": "201",  # HTTP 201 Created
        "explanation": "Log is within main window (08:30-19:30), MODE=1 (Sewing), unique IDs. Should be accepted and saved. Calculation: End-Start = 10 min, no exclusion."
    },
    {
        "id": "TC02",
        "scenario": "Str_LOGID > 1000 (duplicate check)",
        "desc": "Str_LOGID > 1000, should skip if base log exists.",
        "payload": {
            "MACHINE_ID": 1,
            "LINE_NUMB": 1,
            "OPERATOR_ID": 1,
            "DATE": "2025:7:16",
            "START_TIME": "9:10:00",
            "END_TIME": "9:20:00",
            "MODE": 2,
            "STITCH_COUNT": 50,
            "NEEDLE_RUNTIME": 3,
            "NEEDLE_STOPTIME": 2,
            "Tx_LOGID": 11,
            "Str_LOGID": 1010,
            "DEVICE_ID": 1,
            "RESERVE": 18
        },
        "expected": "200",  # HTTP 200 OK (skipped)
        "explanation": "If a log with Str_LOGID-1000 exists for same machine/date, this is skipped (not saved). Calculation: Check for duplicate, else save with Str_LOGID-1000."
    },
    {
        "id": "TC03",
        "scenario": "DATE with single digit month/day",
        "desc": "DATE in 'YYYY:M:D' format, should be converted.",
        "payload": {
            "MACHINE_ID": 2,
            "LINE_NUMB": 1,
            "OPERATOR_ID": 2,
            "DATE": "2025:7:7",
            "START_TIME": "10:00:00",
            "END_TIME": "10:15:00",
            "MODE": 3,
            "STITCH_COUNT": 80,
            "NEEDLE_RUNTIME": 4,
            "NEEDLE_STOPTIME": 1,
            "Tx_LOGID": 12,
            "Str_LOGID": 12,
            "DEVICE_ID": 2,
            "RESERVE": 22
        },
        "expected": "201",
        "explanation": "DATE is converted to '2025-07-07'. Log is within main window, should be accepted. Calculation: End-Start = 15 min."
    },
    {
        "id": "TC04",
        "scenario": "Outside main window (before 08:30)",
        "desc": "START_TIME before 08:30, should be excluded in calculation.",
        "payload": {
            "MACHINE_ID": 3,
            "LINE_NUMB": 1,
            "OPERATOR_ID": 3,
            "DATE": "2025:7:18",
            "START_TIME": "8:15:00",
            "END_TIME": "8:45:00",
            "MODE": 2,
            "STITCH_COUNT": 0,
            "NEEDLE_RUNTIME": 200,
            "NEEDLE_STOPTIME": 5,
            "Tx_LOGID": 13,
            "Str_LOGID": 13,
            "DEVICE_ID": 3,
            "RESERVE": 25
        },
        "expected": "201",
        "explanation": "Only time from 08:30 to 08:45 is counted (15 min). Time before 08:30 is excluded. Calculation: Excluded 08:15-08:30."
    },
    {
        "id": "TC05",
        "scenario": "Partial overlap with break",
        "desc": "Log overlaps with break (16:20-16:30), should be partially excluded.",
        "payload": {
            "MACHINE_ID": 3,
            "LINE_NUMB": 1,
            "OPERATOR_ID": 1,
            "DATE": "2025:7:18",
            "START_TIME": "16:15:00",
            "END_TIME": "16:40:00",
            "MODE": 3,
            "STITCH_COUNT": 100,
            "NEEDLE_RUNTIME": 200,
            "NEEDLE_STOPTIME": 5,
            "Tx_LOGID": 14,
            "Str_LOGID": 14,
            "DEVICE_ID": 3,
            "RESERVE": 25
        },
        "expected": "201",
        "explanation": "Break from 16:20-16:30 is excluded. Only 16:15-16:20 and 16:30-16:40 are counted. Calculation: Excluded 10 min break."
    },
    {
        "id": "TC06",
        "scenario": "Invalid date format",
        "desc": "DATE in wrong format, should return error.",
        "payload": {
            "MACHINE_ID": 4,
            "LINE_NUMB": 1,
            "OPERATOR_ID": 4,
            "DATE": "18-07-2025",
            "START_TIME": "9:00:00",
            "END_TIME": "9:30:00",
            "MODE": 1,
            "STITCH_COUNT": 120,
            "NEEDLE_RUNTIME": 10,
            "NEEDLE_STOPTIME": 2,
            "Tx_LOGID": 15,
            "Str_LOGID": 15,
            "DEVICE_ID": 4,
            "RESERVE": 30
        },
        "expected": "400",
        "explanation": "DATE format is invalid. Should return 400 error. Calculation: No log saved."
    }
]

def run_detailed_tests():
    for case in test_cases:
        print("="*80)
        print(f"Test Case ID: {case['id']}")
        print(f"Scenario: {case['scenario']}")
        print(f"Description: {case['desc']}")
        print(f"Payload: {json.dumps(case['payload'])}")
        print(f"Expected HTTP Status: {case['expected']}")
        print(f"Calculation/Exclusion Logic: {case['explanation']}")
        try:
            response = requests.post(API_URL, json=case['payload'])
            status = str(response.status_code)
            print(f"Actual HTTP Status: {status}")
            print(f"API Response: {response.text}")
            if status == case['expected']:
                print("Result: ✅ SUCCESS")
            else:
                print("Result: ❌ FAILURE")
            # Print detailed explanation for failure
            if status != case['expected']:
                print(f"Explanation: Expected {case['expected']} based on views.py logic, but got {status}. Check backend logic for this scenario.")
        except Exception as e:
            print(f"Exception occurred: {e}")
        print("="*80)
        time.sleep(1)  # To avoid flooding the API

if __name__ == "__main__":
    run_detailed_tests()
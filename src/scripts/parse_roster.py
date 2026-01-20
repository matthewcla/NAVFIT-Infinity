import sys
import uuid
import json
import random
from datetime import datetime, timedelta

def parse_line(line):
    parts = line.strip().split()
    if not parts:
        return None

    # Last is Arrived
    arrived_str = parts[-1]
    # Second last is prd
    prd_str = parts[-2]

    # We need to find Pay_Grade to anchor ourselves.
    # Pay_Grade format: E-*, O-*, W-*
    pay_grade_idx = -1
    for i in range(len(parts)-1, -1, -1):
        token = parts[i]
        if len(token) >= 3 and token[1] == '-' and token[0] in ['E', 'O', 'W']:
            pay_grade_idx = i
            break

    if pay_grade_idx == -1:
        # Fallback or error?
        # Try to guess based on column position if pattern match fails
        # But looking at data, Pay_Grade is always present.
        # Maybe handle typo?
        sys.stderr.write(f"Warning: No Pay_Grade found in line: {line[:30]}...\n")
        return None

    pay_grade = parts[pay_grade_idx]

    # Check for Designator
    # Designator is usually after Pay_Grade and before PRD.
    # parts[pay_grade_idx] is Pay_Grade.
    # parts[-2] is PRD.
    # If there is a token between them, it's Designator.
    # But wait, PRD is second to last token.
    # Let's see index of PRD.
    # If parts is length N. Arrived is N-1. PRD is N-2.
    # pay_grade_idx could be N-3 or N-4.

    designator = ""
    # Check tokens between pay_grade_idx and the end (excluding PRD/Arrived)
    # The columns are: Pay_Grade, Desig, prd, Arrived
    # So Desig should be at pay_grade_idx + 1 if it exists and isn't PRD.

    # PRD index relative to end is -2. In absolute terms: len(parts) - 2.
    prd_idx = len(parts) - 2

    if pay_grade_idx < prd_idx - 1:
        # There is something between Pay_Grade and PRD
        designator = parts[pay_grade_idx + 1]

    # rate_rank is before Pay_Grade
    rate_rank = parts[pay_grade_idx - 1]

    # Name is everything before rate_rank
    name_parts = parts[:pay_grade_idx - 1]

    if len(name_parts) >= 2:
        lname = name_parts[0]
        fname = name_parts[1]
        name = f"{lname}, {fname}"
    elif len(name_parts) == 1:
        name = f"{name_parts[0]}, Unknown" # Should not happen based on data
    else:
        name = "Unknown, Unknown"

    # Logic for designator
    # If designator is missing for enlisted (E-something), map to '0000'
    if pay_grade.startswith('E'):
        designator = '0000'
    elif not designator:
         # Officer without designator?
         designator = "0000" # fallback

    return {
        "id": str(uuid.uuid4()),
        "rank": rate_rank,
        "name": name,
        "designator": designator
    }

def generate_transferred():
    # 6-8 members.
    count = 7
    members = []
    ranks = ['IT2', 'BM3', 'SN', 'LTJG', 'ENS', 'OSSN', 'FC2']
    names = [
        ("SMITH", "JOHN"), ("DOE", "JANE"), ("JOHNSON", "MICHAEL"),
        ("WILLIAMS", "SARAH"), ("BROWN", "DAVID"), ("DAVIS", "EMILY"), ("MILLER", "JAMES")
    ]

    for i in range(count):
        r_idx = i % len(ranks)
        n_idx = i % len(names)

        rank = ranks[r_idx]
        lname, fname = names[n_idx]

        # Designator: Randomize or '0000' if enlisted
        is_officer = rank.upper() in ['LTJG', 'ENS', 'LT', 'LCDR', 'CDR']
        desig = "0000"
        if is_officer:
            desig = random.choice(["1110", "1160", "3100"])

        # Detach date: Jan 2025 - Dec 2025
        start_date = datetime(2025, 1, 1)
        end_date = datetime(2025, 12, 31)
        days = (end_date - start_date).days
        detach_date = start_date + timedelta(days=random.randint(0, days))

        # Arrived: < Sept 9 2024.
        arr_date = datetime(2022, 1, 1) + timedelta(days=random.randint(0, 600))

        members.append({
            "id": str(uuid.uuid4()),
            "rank": rank.upper(),
            "name": f"{lname}, {fname}",
            "designator": desig,
            "detachmentDate": detach_date.strftime("%m/%d/%y"),
            "dateReported": arr_date.strftime("%m/%d/%y")
        })
    return members

def generate_prospective():
    # 6-8 members.
    count = 7
    members = []
    ranks = ['ET3', 'QMSN', 'LT', 'CPO', 'BM1', 'OS2', 'GM3']
    names = [
        ("WILSON", "ROBERT"), ("MOORE", "JENNIFER"), ("TAYLOR", "WILLIAM"),
        ("ANDERSON", "LISA"), ("THOMAS", "RICHARD"), ("JACKSON", "MARY"), ("WHITE", "CHARLES")
    ]

    for i in range(count):
        r_idx = i % len(ranks)
        n_idx = i % len(names)

        rank = ranks[r_idx]
        lname, fname = names[n_idx]

        is_officer = rank.upper() in ['LT', 'ENS', 'CPO'] # CPO is E-7 but treated as officer in some contexts? No, E-7.
        # Ranks list has CPO. CPO is E-7.
        is_officer = rank.upper() in ['LT', 'ENS']

        desig = "0000"
        if is_officer:
            desig = "1110"

        # Date Reported: Feb 2026 - Jan 2027
        start_date = datetime(2026, 2, 1)
        end_date = datetime(2027, 1, 31)
        days = (end_date - start_date).days
        report_date = start_date + timedelta(days=random.randint(0, days))

        members.append({
            "id": str(uuid.uuid4()),
            "rank": rank.upper(),
            "name": f"{lname}, {fname}",
            "designator": desig,
            "dateReported": report_date.strftime("%m/%d/%y")
        })
    return members

def main():
    core_roster = []
    try:
        with open("roster_raw.txt", "r") as f:
            lines = f.readlines()

            # Check if first line is header
            if len(lines) > 0 and "lname" in lines[0]:
                lines = lines[1:]

            for line in lines:
                if not line.strip():
                    continue
                try:
                    member = parse_line(line)
                    if member:
                        core_roster.append(member)
                except Exception as e:
                    sys.stderr.write(f"Error parsing line: {line.strip()} -> {e}\n")
    except FileNotFoundError:
        sys.stderr.write("roster_raw.txt not found\n")
        sys.exit(1)

    transferred = generate_transferred()
    prospective = generate_prospective()

    output = {
        "coreRoster": core_roster,
        "transferredMembers": transferred,
        "prospectiveGains": prospective
    }

    with open("roster_data.json", "w") as f:
        json.dump(output, f, indent=2)

    print("Data generated in roster_data.json")

if __name__ == "__main__":
    main()

import openpyxl

def inspect_rows():
    s_path = r"C:\Users\jackn\spyder\amphenolrf\docs\Stest.xlsx"
    wb = openpyxl.load_workbook(s_path, data_only=True)
    sheet = wb.worksheets[0]
    
    # Inspect rows 3 to 10
    for r_idx in range(3, 11):
        row = [sheet.cell(row=r_idx, column=c_idx).value for c_idx in range(1, 70)]
        print(f"Row {r_idx}:")
        print(f"  Col A (0): {row[0]}")
        print(f"  Col B (1): {row[1]}")
        print(f"  Col C (2): {row[2]}")
        print(f"  Col G (6): {row[6]}")
        print(f"  Col H (7): {row[7]}")
        print(f"  Col I (8): {row[8]}")
        print(f"  Col J (9): {row[9]}")
        print(f"  Col T (19): {row[19]}")
        print(f"  Col BE (56): {row[56]}")
        print(f"  Col BG (58): {row[58]}")
        print(f"  Col BH (59): {row[59]}")
        print(f"  Col BI (60): {row[60]}")
        print(f"  Col BJ (61): {row[61]}")
        print(f"  Col BK (62): {row[62]}")

if __name__ == "__main__":
    inspect_rows()

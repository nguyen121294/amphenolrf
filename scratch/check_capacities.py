import openpyxl
import os

def check():
    r_path = r"C:\Users\jackn\spyder\amphenolrf\docs\Rtest.xlsx"
    wb = openpyxl.load_workbook(r_path, data_only=True)
    sheet = wb.worksheets[0]
    print(f"Sheet name: {sheet.title}")
    for row in sheet.iter_rows(values_only=True):
        if not row or len(row) == 0:
            continue
        cell_0 = str(row[0] or "").strip().upper()
        if cell_0.startswith("L"):
            print(f"{cell_0}: {row[1:8]}")

if __name__ == "__main__":
    check()

import openpyxl

def print_caps_and_data():
    r_path = r"C:\Users\jackn\spyder\amphenolrf\docs\Rtest.xlsx"
    wb = openpyxl.load_workbook(r_path, data_only=True)
    sheet = wb.worksheets[0]
    for row in sheet.iter_rows(values_only=True):
        if not row or len(row) == 0:
            continue
        cell_0 = str(row[0] or "").strip().upper()
        if cell_0.startswith("L") and cell_0[1:].isdigit():
            capacities = []
            for c in range(1, 8):
                val = 0.0
                if c < len(row) and row[c] is not None:
                    try:
                        val = float(row[c])
                    except:
                        pass
                capacities.append(val)
            print(f"{cell_0}: {capacities} (sum={sum(capacities)})")

if __name__ == "__main__":
    print_caps_and_data()

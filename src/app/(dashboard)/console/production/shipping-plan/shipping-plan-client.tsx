"use client";

import { useState, useMemo, useRef } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import {
  FileSpreadsheet,
  Upload,
  Settings,
  AlertTriangle,
  CheckCircle2,
  Download,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  Info,
  Loader2,
  Calendar,
  Check,
  AlertCircle,
  HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface ShippingPlanClientProps {
  username: string;
}

interface ItemData {
  rowIndex: number;
  rowNumber: number;
  mo: string;
  item: string;
  desc: string;
  setupGroupKey: string;
  quantity: number;
  uph: number;
  xaStd: number;
  status: string;
  pmc: string;
  solderPN: string;
  inkPrinting: string;
  letterRolling: string;
  tapeReel: string;
  promiseDate: number;
  shipDate: number;
  originalOrder: number;
  pmcScore: number;
  sapScore: number;
  kapScore: number;
  latheScore: number;
  reelScore: number;
  solderScore: number;
  largeQtyScore: number;
  materialRank: number;
  priorityScore: number;
  dailyCapacity: number;
  outputs: number[];
  times: number[];
  missing: number;
  warnings: string[];
}

interface DayTotal {
  qty: number[];
  time: number[];
}

const dayDefs = [
  { name: "Thứ 5", qtyCol: "BW", timeCol: "BX" },
  { name: "Thứ 6", qtyCol: "BY", timeCol: "BZ" },
  { name: "Thứ 7", qtyCol: "CA", timeCol: "CB" },
  { name: "Thứ 2", qtyCol: "CC", timeCol: "CD" },
  { name: "Thứ 3", qtyCol: "CE", timeCol: "CF" },
  { name: "Thứ 4", qtyCol: "CG", timeCol: "CH" }
];

const outputHeaders: Record<string, string> = {
  BW: "Số lượng SX Thứ 5",
  BX: "Thời gian XA Thứ 5",
  BY: "Số lượng SX Thứ 6",
  BZ: "Thời gian XA Thứ 6",
  CA: "Số lượng SX Thứ 7",
  CB: "Thời gian XA Thứ 7",
  CC: "Số lượng SX Thứ 2",
  CD: "Thời gian XA Thứ 2",
  CE: "Số lượng SX Thứ 3",
  CF: "Thời gian XA Thứ 3",
  CG: "Số lượng SX Thứ 4",
  CH: "Thời gian XA Thứ 4",
  CI: "Check tổng đơn"
};

export function ShippingPlanClient({ username }: ShippingPlanClientProps) {
  // UI & File states
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Configuration states
  const [headerRow, setHeaderRow] = useState<number>(2);
  const [dataRow, setDataRow] = useState<number>(3);
  const [dayHourTarget, setDayHourTarget] = useState<number>(525);
  const [lotStep, setLotStep] = useState<number>(500);
  const [qtyEfficiency, setQtyEfficiency] = useState<number>(0.76);
  const [timeEfficiency, setTimeEfficiency] = useState<number>(0.8);
  const [fixLatheScore, setFixLatheScore] = useState<boolean>(true);
  const [writeSummaryToRow1, setWriteSummaryToRow1] = useState<boolean>(false);

  // Data states
  const [originalWorkbook, setOriginalWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [results, setResults] = useState<ItemData[]>([]);
  const [dayTotals, setDayTotals] = useState<DayTotal | null>(null);
  
  // Navigation / Filter states
  const [activeTab, setActiveTab] = useState<"preview" | "summary" | "rules">("preview");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Helper values
  const textVal = (value: any): string => {
    if (value === null || value === undefined) return "";
    return String(value).trim();
  };

  const normalize = (value: any): string => {
    return textVal(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d");
  };

  const numValue = (value: any, fallback: number): number => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (value instanceof Date) return fallback;
    const parsed = Number(String(value ?? "").replace(/,/g, "").trim());
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const intValue = (value: any, fallback: number): number => {
    const parsed = parseInt(String(value), 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const dateSortValue = (value: any): number => {
    if (value instanceof Date) return value.getTime();
    if (typeof value === "number") {
      try {
        const parsed = XLSX.SSF.parse_date_code(value);
        if (parsed) return new Date(parsed.y, parsed.m - 1, parsed.d).getTime();
      } catch (e) {
        // Fallback if SSF parse fails
      }
    }
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.getTime() : Number.MAX_SAFE_INTEGER;
  };

  const round = (value: number, digits: number): number => {
    const factor = Math.pow(10, digits);
    return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
  };

  const formatNumber = (value: number): string => {
    if (!Number.isFinite(value)) return "";
    return value.toLocaleString("en-US", { maximumFractionDigits: 4 });
  };

  const colIndex = (col: string): number => {
    return XLSX.utils.decode_col(col);
  };

  const getCellVal = (row: any[], col: string): any => {
    return row[colIndex(col)];
  };

  const setCell = (sheet: XLSX.WorkSheet, rowIndex: number, colIdx: number, value: any) => {
    const address = XLSX.utils.encode_cell({ r: rowIndex, c: colIdx });
    if (value === null || value === undefined || value === "") {
      delete sheet[address];
      return;
    }
    sheet[address] = typeof value === "number"
      ? { t: "n", v: value }
      : { t: "s", v: String(value) };
  };

  const extendRange = (sheet: XLSX.WorkSheet, lastCol: string, lastRowNumber: number) => {
    const current = sheet["!ref"] ? XLSX.utils.decode_range(sheet["!ref"]) : { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } };
    current.e.c = Math.max(current.e.c, colIndex(lastCol));
    current.e.r = Math.max(current.e.r, lastRowNumber - 1);
    sheet["!ref"] = XLSX.utils.encode_range(current);
  };

  const isNotNo = (value: string): boolean => {
    return value !== "no";
  };

  // Drag & drop logic
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    setLoading(true);
    setResults([]);
    setDayTotals(null);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array", cellDates: true });
      setOriginalWorkbook(wb);
      setFileName(file.name);
      setSheetNames(wb.SheetNames);
      
      // Auto-select "shipping list" if available, else first sheet
      const foundSheet = wb.SheetNames.find(
        (name) => name.toLowerCase() === "shipping list"
      );
      setSelectedSheet(foundSheet || wb.SheetNames[0] || "");
      toast.success(`Đã tải file "${file.name}" thành công!`);
    } catch (err) {
      console.error(err);
      toast.error("Không thể đọc file Excel. Vui lòng kiểm tra lại định dạng.");
    } finally {
      setLoading(false);
    }
  };

  const removeFile = () => {
    setOriginalWorkbook(null);
    setFileName(null);
    setSheetNames([]);
    setSelectedSheet("");
    setResults([]);
    setDayTotals(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Main processing logic
  const calculatePlan = () => {
    if (!originalWorkbook || !selectedSheet) {
      toast.error("Vui lòng tải file Excel lên trước.");
      return;
    }

    setLoading(true);
    try {
      const sheet = originalWorkbook.Sheets[selectedSheet];
      const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, raw: true, defval: null });
      
      const parsedItems: ItemData[] = [];
      const dataRowStartIndex = dataRow - 1;

      for (let r = dataRowStartIndex; r < rows.length; r++) {
        const row = rows[r] || [];
        const quantity = numValue(getCellVal(row, "J"), 0);
        const mo = textVal(getCellVal(row, "I"));
        const item = textVal(getCellVal(row, "B"));
        const desc = textVal(getCellVal(row, "C"));

        if (!quantity && !mo && !item && !desc) continue;

        const uph = numValue(getCellVal(row, "T"), 0);
        const xaStd = numValue(getCellVal(row, "R"), 0);
        const status = textVal(getCellVal(row, "H"));
        const pmc = textVal(getCellVal(row, "G"));
        const solderPN = textVal(getCellVal(row, "BE"));
        const inkPrinting = textVal(getCellVal(row, "BG"));
        const letterRolling = textVal(getCellVal(row, "BH"));
        const tapeReel = textVal(getCellVal(row, "BI"));

        // Build features & priorities
        const normalizedDesc = normalize(desc);
        const normalizedStatus = normalize(status);
        const normalizedPmc = normalize(pmc);
        const normSolderPN = normalize(solderPN);
        const normInkPrinting = normalize(inkPrinting);
        const normLetterRolling = normalize(letterRolling);
        const normTapeReel = normalize(tapeReel);

        const pmcScore = normalizedPmc.includes("uu tien 1") ? 6 : 1;
        const sapScore = normalizedDesc.includes("sap") || isNotNo(normLetterRolling) ? 5 : 1;
        const kapScore = normalizedDesc.includes("kap") || isNotNo(normInkPrinting) ? 5 : 1;
        
        // Lathe score bug fix toggle
        const isLathe = fixLatheScore
          ? item.trim().toUpperCase().startsWith("34-")
          : desc.trim().toUpperCase().startsWith("34-");
        const latheScore = isLathe ? 5 : 1;

        const reelScore = normalizedDesc.includes("smp") || normalizedDesc.includes("stpk") || isNotNo(normTapeReel) ? 4 : 1;
        const solderScore = normSolderPN === "yes" ? 3 : 1;
        const largeQtyScore = quantity > 5000 ? 2 : 1;

        let materialRank = 1;
        const hValNum = parseInt(status.trim(), 10);
        if (!isNaN(hValNum)) {
          if (hValNum === 3) materialRank = 4; // đã phát liệu
          else if (hValNum === 2) materialRank = 3; // đang soạn liệu
          else if (hValNum === 1) materialRank = 2; // chờ nhập / QC
          else if (hValNum === 0) materialRank = 1; // chưa mua
        } else {
          // Hỗ trợ ngược cho dữ liệu cũ dạng chuỗi
          if (normalizedStatus.includes("ready material")) materialRank = 4;
          else if (normalizedStatus.includes("co lieu")) materialRank = 3;
        }

        const priorityScore = pmcScore * sapScore * kapScore * latheScore * reelScore * solderScore * largeQtyScore;

        const setupGroupKey = normalizedDesc || `row-${r}`;
        const dailyCapacity = uph > 0 ? uph * 8 * qtyEfficiency : 0;

        parsedItems.push({
          rowIndex: r,
          rowNumber: r + 1,
          mo,
          item,
          desc,
          setupGroupKey,
          quantity,
          uph,
          xaStd,
          status,
          pmc,
          solderPN,
          inkPrinting,
          letterRolling,
          tapeReel,
          promiseDate: dateSortValue(getCellVal(row, "AD")),
          shipDate: dateSortValue(getCellVal(row, "Z")),
          originalOrder: parsedItems.length,
          pmcScore,
          sapScore,
          kapScore,
          latheScore,
          reelScore,
          solderScore,
          largeQtyScore,
          materialRank,
          priorityScore,
          dailyCapacity,
          outputs: [0, 0, 0, 0, 0, 0],
          times: [0, 0, 0, 0, 0, 0],
          missing: quantity,
          warnings: []
        });
      }

      // Initialize totals
      const totals: DayTotal = {
        qty: [0, 0, 0, 0, 0, 0],
        time: [0, 0, 0, 0, 0, 0]
      };

      // Filter schedulable vs blocked
      const schedulable = parsedItems.filter((item) => item.quantity > 0 && item.uph > 0 && item.xaStd > 0);
      const blocked = parsedItems.filter((item) => item.quantity > 0 && (item.uph <= 0 || item.xaStd <= 0));

      blocked.forEach((item) => {
        if (item.uph <= 0) item.warnings.push("Thiếu UPH");
        if (item.xaStd <= 0) item.warnings.push("Thiếu XA std hour");
      });

      // Group items
      const groupsMap = new Map<string, { key: string; items: ItemData[]; bestItem: ItemData; firstOrder: number }>();
      schedulable.forEach((item) => {
        let group = groupsMap.get(item.setupGroupKey);
        if (!group) {
          group = {
            key: item.setupGroupKey,
            items: [],
            bestItem: item,
            firstOrder: item.originalOrder
          };
          groupsMap.set(item.setupGroupKey, group);
        }
        group.items.push(item);
        group.firstOrder = Math.min(group.firstOrder, item.originalOrder);
        
        // Find bestItem in group
        const compareItems = (a: ItemData, b: ItemData) => {
          return b.priorityScore - a.priorityScore
            || b.materialRank - a.materialRank
            || b.pmcScore - a.pmcScore
            || a.promiseDate - b.promiseDate
            || a.shipDate - b.shipDate
            || a.originalOrder - b.originalOrder;
        };
        if (compareItems(item, group.bestItem) < 0) {
          group.bestItem = item;
        }
      });

      const planGroups = Array.from(groupsMap.values());
      
      // Sort groups
      planGroups.sort((a, b) => {
        const compareItems = (x: ItemData, y: ItemData) => {
          return y.priorityScore - x.priorityScore
            || y.materialRank - x.materialRank
            || y.pmcScore - x.pmcScore
            || x.promiseDate - y.promiseDate
            || x.shipDate - y.shipDate
            || x.originalOrder - y.originalOrder;
        };
        return compareItems(a.bestItem, b.bestItem) || a.firstOrder - b.firstOrder;
      });

      // Allocate groups
      planGroups.forEach((group) => {
        // chooseGroupPreferredDay
        const requiredHours = group.items.reduce((sum, item) => {
          return sum + (item.quantity * item.xaStd) / timeEfficiency;
        }, 0);
        
        const days = totals.time.map((hours, index) => ({
          index,
          hours,
          available: dayHourTarget - hours
        }));

        let preferredDay = 0;
        if (dayHourTarget > 0) {
          const fittingDays = days.filter((day) => day.available >= requiredHours);
          if (fittingDays.length) {
            fittingDays.sort((a, b) => b.available - a.available || a.index - b.index);
            preferredDay = fittingDays[0].index;
          } else {
            const usableDays = days.filter((day) => day.available > 0);
            if (usableDays.length) {
              usableDays.sort((a, b) => b.available - a.available || a.index - b.index);
              preferredDay = usableDays[0].index;
            } else {
              preferredDay = days.sort((a, b) => a.hours - b.hours || a.index - b.index)[0].index;
            }
          }
        } else {
          preferredDay = days.sort((a, b) => a.hours - b.hours || a.index - b.index)[0].index;
        }

        // Sort items inside group
        group.items.sort((a, b) => {
          return b.priorityScore - a.priorityScore
            || b.materialRank - a.materialRank
            || b.pmcScore - a.pmcScore
            || a.promiseDate - b.promiseDate
            || a.shipDate - b.shipDate
            || a.originalOrder - b.originalOrder;
        });

        // Allocate each item in group
        group.items.forEach((item) => {
          let remaining = item.quantity;
          let guard = 0;

          while (remaining > 0.0001 && guard < 100) {
            guard++;
            
            // Choose day
            let dayIndex = preferredDay;
            const preferredHours = totals.time[preferredDay];
            const preferredAvailable = dayHourTarget <= 0 || dayHourTarget - preferredHours > 0;
            
            if (!preferredAvailable) {
              const usableDays = totals.time
                .map((hours, idx) => ({ index: idx, hours, available: dayHourTarget - hours }))
                .filter((day) => dayHourTarget <= 0 || day.available > 0);

              if (usableDays.length) {
                usableDays.sort((a, b) => b.available - a.available || a.index - b.index);
                dayIndex = usableDays[0].index;
              } else {
                dayIndex = totals.time
                  .map((hours, idx) => ({ index: idx, hours }))
                  .sort((a, b) => a.hours - b.hours || a.index - b.index)[0].index;
              }
            }

            const dayAvailableHours = Math.max(dayHourTarget - totals.time[dayIndex], 0);
            const capacityByHours = dayAvailableHours > 0
              ? (dayAvailableHours * timeEfficiency) / item.xaStd
              : item.dailyCapacity;

            const rawChunk = Math.min(remaining, item.dailyCapacity || remaining, capacityByHours || remaining);
            
            // quantizeQty
            let chunk = rawChunk;
            if (Number.isFinite(rawChunk) && rawChunk > 0 && lotStep > 1 && remaining > lotStep && rawChunk >= lotStep) {
              const rounded = Math.max(lotStep, Math.round(rawChunk / lotStep) * lotStep);
              chunk = round(Math.min(rounded, remaining), 4);
            } else {
              chunk = round(Math.min(rawChunk, remaining), 4);
            }

            if (chunk <= 0) {
              chunk = Math.min(remaining, item.dailyCapacity || remaining);
            }
            if (chunk > remaining) {
              chunk = remaining;
            }

            const time = (chunk * item.xaStd) / timeEfficiency;
            item.outputs[dayIndex] = round(item.outputs[dayIndex] + chunk, 4);
            totals.qty[dayIndex] = round(totals.qty[dayIndex] + chunk, 4);
            totals.time[dayIndex] = round(totals.time[dayIndex] + time, 4);
            remaining = round(remaining - chunk, 4);

            if (dayHourTarget > 0 && totals.time[dayIndex] > dayHourTarget + 0.01) {
              const warningMsg = `${dayDefs[dayIndex].name} vượt target giờ`;
              if (!item.warnings.includes(warningMsg)) {
                item.warnings.push(warningMsg);
              }
            }
          }

          if (guard >= 100) {
            item.warnings.push("Dừng chia vì vượt vòng lặp an toàn");
          }
        });
      });

      // Calculate final times & missing
      parsedItems.forEach((item) => {
        item.times = item.outputs.map((qty) => round((qty * item.xaStd) / timeEfficiency, 4));
        item.missing = round(item.quantity - item.outputs.reduce((sum, value) => sum + value, 0), 4);
        if (item.missing > 0) {
          item.warnings.push(`Còn thiếu ${formatNumber(item.missing)}`);
        }
      });

      const sortedResults = parsedItems.sort((a, b) => a.rowNumber - b.rowNumber);
      setResults(sortedResults);
      setDayTotals(totals);
      setCurrentPage(1);
      toast.success("Tính toán kế hoạch phân bổ thành công!");
    } catch (err) {
      console.error(err);
      toast.error("Lỗi khi xử lý tính toán. Vui lòng kiểm tra lại cấu trúc Excel.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!originalWorkbook || !selectedSheet || results.length === 0 || !dayTotals) {
      toast.error("Chưa có dữ liệu tính toán để xuất.");
      return;
    }

    try {
      // Clone workbook sheet
      const sheet = originalWorkbook.Sheets[selectedSheet];
      
      // Write outputs headers
      Object.entries(outputHeaders).forEach(([col, header]) => {
        setCell(sheet, headerRow - 1, colIndex(col), header);
      });

      // Write daily totals to Row 1 if enabled
      if (writeSummaryToRow1) {
        dayDefs.forEach((day, index) => {
          setCell(sheet, 0, colIndex(day.qtyCol), round(dayTotals.qty[index], 4));
          setCell(sheet, 0, colIndex(day.timeCol), round(dayTotals.time[index], 4));
        });
        setCell(sheet, 0, colIndex("CI"), round(results.reduce((sum, item) => sum + Math.max(item.missing, 0), 0), 4));
      }

      // Write results rows
      results.forEach((item) => {
        dayDefs.forEach((day, index) => {
          setCell(sheet, item.rowIndex, colIndex(day.qtyCol), item.outputs[index] || null);
          setCell(sheet, item.rowIndex, colIndex(day.timeCol), item.times[index] || null);
        });
        setCell(sheet, item.rowIndex, colIndex("CI"), item.missing || null);
      });

      // Extend range of active sheet
      extendRange(sheet, "CI", Math.max(...results.map((item) => item.rowNumber), headerRow));

      // Build Report JS sheet
      const reportRows = [
        ["Chỉ số đo lường", "Giá trị"],
        ["Tổng dòng input", results.length],
        ["Tổng quantity", round(results.reduce((sum, item) => sum + item.quantity, 0), 4)],
        ["Tổng quantity đã xếp", round(dayTotals.qty.reduce((sum, value) => sum + value, 0), 4)],
        ["Tổng quantity còn thiếu", round(results.reduce((sum, item) => sum + Math.max(item.missing, 0), 0), 4)],
        [],
        ["Ngày", "Số lượng sản xuất", "Thời gian XA (giờ)"]
      ];

      dayDefs.forEach((day, index) => {
        reportRows.push([day.name, round(dayTotals.qty[index], 4), round(dayTotals.time[index], 4)]);
      });

      reportRows.push([]);
      reportRows.push(["Dòng", "MO#", "Item", "Quantity", "Thiếu", "Cảnh báo"]);
      results
        .filter((item) => item.warnings.length || item.missing > 0)
        .forEach((item) => {
          reportRows.push([
            item.rowNumber,
            item.mo,
            item.item,
            item.quantity,
            item.missing,
            item.warnings.join("; ")
          ]);
        });

      const reportSheet = XLSX.utils.aoa_to_sheet(reportRows);
      originalWorkbook.Sheets["Report JS"] = reportSheet;
      if (!originalWorkbook.SheetNames.includes("Report JS")) {
        originalWorkbook.SheetNames.push("Report JS");
      }

      // Download file
      const outName = fileName ? fileName.replace(/\.(xlsx|xls|xlsm)$/i, "") + " - output.xlsx" : "shipping-plan-output.xlsx";
      XLSX.writeFile(originalWorkbook, outName);
      toast.success("Tải xuống file Excel kết quả thành công!");
    } catch (err) {
      console.error(err);
      toast.error("Lỗi khi ghi đè dữ liệu xuất file.");
    }
  };

  // Search and Paginated results
  const filteredResults = useMemo(() => {
    if (!searchTerm.trim()) return results;
    const term = searchTerm.toLowerCase();
    return results.filter(
      (item) =>
        item.mo.toLowerCase().includes(term) ||
        item.item.toLowerCase().includes(term) ||
        item.desc.toLowerCase().includes(term)
    );
  }, [results, searchTerm]);

  const paginatedResults = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredResults.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredResults, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredResults.length / itemsPerPage);

  // Key stats
  const stats = useMemo(() => {
    if (results.length === 0 || !dayTotals) return null;
    const totalQty = results.reduce((sum, item) => sum + item.quantity, 0);
    const plannedQty = dayTotals.qty.reduce((sum, val) => sum + val, 0);
    const missingQty = results.reduce((sum, item) => sum + Math.max(item.missing, 0), 0);
    const totalHours = dayTotals.time.reduce((sum, val) => sum + val, 0);
    const warningCount = results.filter((item) => item.warnings.length).length;
    const overDays = dayTotals.time.filter((val) => dayHourTarget > 0 && val > dayHourTarget).length;

    return {
      totalRows: results.length,
      totalQty,
      plannedQty,
      missingQty,
      totalHours,
      warningCount,
      overDays
    };
  }, [results, dayTotals, dayHourTarget]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Shipping Plan Output Tool</h1>
          <p className="text-muted-foreground">
            Tính toán và phân bổ sản lượng giao hàng 6 ngày làm việc từ cột Excel A:BI vào cột BW:CH.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <BadgeVariant label={`Người dùng: ${username}`} level="info" />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Settings & Controls Sidebar (1/4 columns) */}
        <div className="xl:col-span-1 space-y-6">
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
            <div className="p-5 border-b flex items-center gap-2 font-semibold">
              <Upload className="size-4 text-primary" />
              Tải tệp & Cấu hình
            </div>
            <div className="p-5 space-y-5">
              {/* File Upload Zone */}
              {!fileName ? (
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors duration-200 ${
                    isDragging
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/50"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.xlsm"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <FileSpreadsheet className="mx-auto size-10 text-muted-foreground mb-3" />
                  <p className="text-sm font-medium">Kéo thả file Excel hoặc click</p>
                  <p className="text-xs text-muted-foreground mt-1">Hỗ trợ .xlsx, .xls, .xlsm</p>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <FileSpreadsheet className="size-8 text-emerald-600 shrink-0" />
                    <div className="truncate text-left">
                      <p className="text-sm font-medium truncate">{fileName}</p>
                      <p className="text-xs text-muted-foreground">Sẵn sàng phân tích</p>
                    </div>
                  </div>
                  <button
                    onClick={removeFile}
                    className="p-1.5 hover:bg-destructive/10 hover:text-destructive rounded-md transition-colors"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              )}

              {/* Sheet Selector */}
              {sheetNames.length > 0 && (
                <div className="space-y-1.5 text-left">
                  <Label htmlFor="sheetSelect" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Chọn Sheet Excel</Label>
                  <select
                    id="sheetSelect"
                    value={selectedSheet}
                    onChange={(e) => {
                      setSelectedSheet(e.target.value);
                      setResults([]);
                      setDayTotals(null);
                    }}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {sheetNames.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Advanced Parameters Accordion */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted/40 px-3 py-2 text-xs font-semibold flex items-center justify-between text-left">
                  <span className="flex items-center gap-1.5">
                    <Settings className="size-3.5" />
                    Tham số cấu hình
                  </span>
                </div>
                <div className="p-3 space-y-3.5 text-left">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="headerRow" className="text-xs">Dòng header</Label>
                      <Input
                        id="headerRow"
                        type="number"
                        min={1}
                        value={headerRow}
                        onChange={(e) => setHeaderRow(parseInt(e.target.value) || 2)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="dataRow" className="text-xs">Dòng data đầu</Label>
                      <Input
                        id="dataRow"
                        type="number"
                        min={2}
                        value={dataRow}
                        onChange={(e) => setDataRow(parseInt(e.target.value) || 3)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="dayHourTarget" className="text-xs">Target giờ/ngày</Label>
                      <Input
                        id="dayHourTarget"
                        type="number"
                        min={0}
                        value={dayHourTarget}
                        onChange={(e) => setDayHourTarget(parseInt(e.target.value) || 0)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="lotStep" className="text-xs">Block làm tròn</Label>
                      <Input
                        id="lotStep"
                        type="number"
                        min={1}
                        value={lotStep}
                        onChange={(e) => setLotStep(parseInt(e.target.value) || 1)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="qtyEff" className="text-xs">H.suất sản lượng</Label>
                      <Input
                        id="qtyEff"
                        type="number"
                        step="0.01"
                        min={0.01}
                        max={1}
                        value={qtyEfficiency}
                        onChange={(e) => setQtyEfficiency(parseFloat(e.target.value) || 0.76)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="timeEff" className="text-xs">H.suất giờ XA</Label>
                      <Input
                        id="timeEff"
                        type="number"
                        step="0.01"
                        min={0.01}
                        max={1}
                        value={timeEfficiency}
                        onChange={(e) => setTimeEfficiency(parseFloat(e.target.value) || 0.8)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  {/* Switch Fix Bug */}
                  <div className="flex items-center justify-between border-t pt-3.5">
                    <div className="flex flex-col text-left pr-2">
                      <Label htmlFor="fixLathe" className="text-xs font-semibold">Fix mã hàng 34-</Label>
                      <span className="text-[10px] text-muted-foreground">Quét cột Item thay vì Description</span>
                    </div>
                    <Switch
                      id="fixLathe"
                      checked={fixLatheScore}
                      onCheckedChange={setFixLatheScore}
                    />
                  </div>

                  {/* Switch Row 1 Overwrite */}
                  <div className="flex items-center justify-between border-t pt-2">
                    <div className="flex flex-col text-left pr-2">
                      <Label htmlFor="writeRow1" className="text-xs font-semibold">Ghi dòng 1 Excel</Label>
                      <span className="text-[10px] text-muted-foreground">Ghi tổng hợp sản lượng & giờ lên đầu</span>
                    </div>
                    <Switch
                      id="writeRow1"
                      checked={writeSummaryToRow1}
                      onCheckedChange={setWriteSummaryToRow1}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <Button
                  onClick={calculatePlan}
                  disabled={loading || !fileName}
                  className="w-full font-semibold h-10 shadow-sm transition-all"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    "Tính Output BW:CH"
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownload}
                  disabled={loading || results.length === 0}
                  className="w-full font-semibold border-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:text-emerald-700 text-emerald-600 dark:text-emerald-500 h-10"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Tải Excel kết quả
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Tabs & Data Panels (3/4 columns) */}
        <div className="xl:col-span-3 space-y-6">
          {/* Quick Metrics */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
              <MetricCard title="Tổng dòng" value={stats.totalRows} level="neutral" />
              <MetricCard title="Tổng sản lượng" value={formatNumber(stats.totalQty)} level="neutral" />
              <MetricCard title="Đã phân bổ" value={formatNumber(stats.plannedQty)} level="success" />
              <MetricCard
                title="Còn thiếu"
                value={formatNumber(stats.missingQty)}
                level={stats.missingQty > 0 ? "error" : "success"}
              />
              <MetricCard title="Tổng giờ XA" value={formatNumber(stats.totalHours)} level="neutral" />
              <MetricCard
                title="Cảnh báo"
                value={`${stats.warningCount} hàng / ${stats.overDays} ngày`}
                level={stats.warningCount || stats.overDays ? "warning" : "success"}
              />
            </div>
          )}

          {/* Main Visual Display */}
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
            {/* Tab selector */}
            <div className="border-b px-5 flex items-center justify-between flex-wrap gap-2">
              <div className="flex space-x-1 py-3">
                <TabButton
                  active={activeTab === "preview"}
                  onClick={() => setActiveTab("preview")}
                  label="Bảng Preview Kế Hoạch"
                />
                <TabButton
                  active={activeTab === "summary"}
                  onClick={() => setActiveTab("summary")}
                  label="Phân bổ Ngày"
                />
                <TabButton
                  active={activeTab === "rules"}
                  onClick={() => setActiveTab("rules")}
                  label="Quy tắc Tính Toán"
                />
              </div>

              {/* Table search filter */}
              {activeTab === "preview" && results.length > 0 && (
                <div className="relative w-full sm:w-60 md:w-80 h-9 mb-2 sm:mb-0">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Tìm theo MO#, Item, Desc..."
                    className="pl-9 h-9"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </div>
              )}
            </div>

            <div className="p-6">
              {/* Tab 1: Preview Grid */}
              {activeTab === "preview" && (
                <div className="space-y-4">
                  {results.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground space-y-2">
                      <FileSpreadsheet className="mx-auto size-12 text-muted-foreground/30" />
                      <p className="font-medium text-sm">Chưa có dữ liệu kế hoạch</p>
                      <p className="text-xs">Hãy upload file Excel và nhấn nút Tính toán để xem kết quả preview tại đây.</p>
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full border-collapse text-sm text-left">
                          <thead className="bg-muted/70 text-muted-foreground uppercase text-[10px] tracking-wider font-semibold border-b">
                            <tr>
                              <th className="p-3 text-center w-12">Dòng</th>
                              <th className="p-3">MO#</th>
                              <th className="p-3">Mã hàng / Mô tả</th>
                              <th className="p-3 text-right">Qty</th>
                              <th className="p-3 text-right">UPH</th>
                              <th className="p-3 text-right">XA Std</th>
                              <th className="p-3 text-right">Priority</th>
                              {dayDefs.map((day) => (
                                <th key={day.name} className="p-3 text-center border-l bg-muted/40 font-bold col-span-2">
                                  {day.name} (Qty / Giờ)
                                </th>
                              ))}
                              <th className="p-3 text-right border-l">Thiếu</th>
                              <th className="p-3">Cảnh báo</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {paginatedResults.length === 0 ? (
                              <tr>
                                <td colSpan={16} className="text-center py-8 text-muted-foreground text-xs">
                                  Không tìm thấy dòng phù hợp với từ khóa tìm kiếm.
                                </td>
                              </tr>
                            ) : (
                              paginatedResults.map((item) => {
                                const hasWarns = item.warnings.length > 0;
                                const isMissing = item.missing > 0;
                                return (
                                  <tr key={item.rowIndex} className="hover:bg-muted/20 transition-colors">
                                    <td className="p-3 text-center text-xs text-muted-foreground font-mono">{item.rowNumber}</td>
                                    <td className="p-3 font-semibold font-mono text-xs">{item.mo}</td>
                                    <td className="p-3 max-w-[200px] truncate text-left">
                                      <p className="font-semibold text-xs font-mono">{item.item}</p>
                                      <p className="text-[10px] text-muted-foreground truncate" title={item.desc}>{item.desc}</p>
                                    </td>
                                    <td className="p-3 text-right font-mono font-medium">{formatNumber(item.quantity)}</td>
                                    <td className="p-3 text-right font-mono text-xs">{formatNumber(item.uph)}</td>
                                    <td className="p-3 text-right font-mono text-xs text-muted-foreground">{formatNumber(item.xaStd)}</td>
                                    <td className="p-3 text-right font-mono text-xs font-semibold text-primary">{item.priorityScore}</td>
                                    
                                    {dayDefs.map((day, idx) => (
                                      <td key={day.name} className="p-3 text-center border-l bg-muted/5 text-xs font-mono">
                                        <div className="flex flex-col items-center">
                                          <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                            {item.outputs[idx] ? formatNumber(item.outputs[idx]) : "-"}
                                          </span>
                                          <span className="text-[10px] text-muted-foreground">
                                            {item.times[idx] ? `${formatNumber(item.times[idx])}h` : ""}
                                          </span>
                                        </div>
                                      </td>
                                    ))}

                                    <td className={`p-3 text-right font-mono border-l font-semibold ${isMissing ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>
                                      {item.missing ? formatNumber(item.missing) : "0"}
                                    </td>
                                    <td className="p-3 text-left">
                                      {hasWarns ? (
                                        <div className="flex flex-wrap gap-1">
                                          {item.warnings.map((w, wIdx) => {
                                            const isCrit = w.includes("thiếu") || w.includes("Dừng");
                                            return (
                                              <span
                                                key={wIdx}
                                                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                                  isCrit
                                                    ? "bg-destructive/10 text-destructive"
                                                    : "bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400"
                                                }`}
                                              >
                                                {w}
                                              </span>
                                            );
                                          })}
                                        </div>
                                      ) : (
                                        <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
                                          <Check className="size-3" /> OK
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination Controls */}
                      {filteredResults.length > itemsPerPage && (
                        <div className="flex items-center justify-between border-t pt-4">
                          <span className="text-xs text-muted-foreground">
                            Hiển thị {Math.min(filteredResults.length, (currentPage - 1) * itemsPerPage + 1)} -{" "}
                            {Math.min(filteredResults.length, currentPage * itemsPerPage)} trong số {filteredResults.length} dòng
                          </span>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2"
                              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                              disabled={currentPage === 1}
                            >
                              <ChevronLeft className="size-4" />
                            </Button>
                            <span className="text-xs font-medium">Trang {currentPage} / {totalPages}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2"
                              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                              disabled={currentPage === totalPages}
                            >
                              <ChevronRight className="size-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Tab 2: Day Breakdown Summary */}
              {activeTab === "summary" && (
                <div className="space-y-6">
                  {dayTotals ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
                        {dayDefs.map((day, index) => {
                          const loadHours = dayTotals.time[index];
                          const loadQty = dayTotals.qty[index];
                          const pct = dayHourTarget > 0 ? (loadHours / dayHourTarget) * 100 : 0;
                          const isOver = dayHourTarget > 0 && loadHours > dayHourTarget;
                          
                          return (
                            <div key={day.name} className="border rounded-xl p-5 bg-card shadow-xs space-y-4">
                              <div className="flex items-center justify-between border-b pb-2">
                                <h3 className="font-bold text-lg text-primary">{day.name}</h3>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  isOver
                                    ? "bg-destructive/10 text-destructive animate-pulse"
                                    : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400"
                                }`}>
                                  {isOver ? "Quá Tải Giờ" : "Hoạt Động Tốt"}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-0.5">
                                  <span className="text-xs text-muted-foreground font-medium block">Số lượng SX</span>
                                  <strong className="text-xl tracking-tight">{formatNumber(loadQty)}</strong>
                                </div>
                                <div className="space-y-0.5">
                                  <span className="text-xs text-muted-foreground font-medium block">Tổng thời gian</span>
                                  <strong className={`text-xl tracking-tight ${isOver ? "text-destructive" : ""}`}>{formatNumber(loadHours)}h</strong>
                                </div>
                              </div>
                              {dayHourTarget > 0 && (
                                <div className="space-y-1">
                                  <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Công suất nạp:</span>
                                    <span className="font-semibold">{round(pct, 1)}% ({formatNumber(loadHours)}/{dayHourTarget}h)</span>
                                  </div>
                                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                    <div
                                      className={`h-full transition-all duration-300 rounded-full ${
                                        isOver
                                          ? "bg-destructive"
                                          : pct > 85
                                          ? "bg-amber-500"
                                          : "bg-emerald-500"
                                      }`}
                                      style={{ width: `${Math.min(pct, 100)}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div className="p-4 border rounded-xl bg-blue-50/50 dark:bg-blue-950/10 text-blue-950 dark:text-blue-200 text-xs flex gap-3 text-left">
                        <Info className="size-5 shrink-0 text-blue-600 dark:text-blue-400" />
                        <div className="space-y-1">
                          <p className="font-semibold">Lưu ý về kế hoạch phân bổ ngày:</p>
                          <p>
                            Kế hoạch phân bổ cố gắng sắp xếp các đơn hàng có độ ưu tiên cao trước theo đúng quy tắc. Nếu số giờ làm việc tích lũy trong ngày vượt quá mức Target ngày cho phép ({dayHourTarget} giờ), hệ thống vẫn sẽ phân bổ số lượng và đưa ra cảnh báo quá tải thay vì để hàng hóa bị trễ.
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-16 text-muted-foreground space-y-2">
                      <Calendar className="mx-auto size-12 text-muted-foreground/30" />
                      <p className="font-medium text-sm">Chưa có biểu đồ phân bổ</p>
                      <p className="text-xs">Dữ liệu phân bổ theo ngày sẽ xuất hiện sau khi bạn chạy kế hoạch tính toán.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Rules & Accords */}
              {activeTab === "rules" && (
                <div className="text-left space-y-6">
                  <div>
                    <h3 className="font-bold text-base text-foreground mb-1">Các Quy Tắc Tính Toán Điểm & Thứ Tự Sản Xuất</h3>
                    <p className="text-sm text-muted-foreground">
                      Các quy tắc này được mã hóa trực tiếp và tự động xử lý khi người dùng nhấn nút tính toán.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <RuleItemCard
                      num="1"
                      title="Quy tắc tính Điểm Ưu Tiên"
                      desc={
                        <div>
                          <p className="mb-2">Điểm ưu tiên của một hàng được tính bằng tích số nhân của 7 tiêu chí quan trọng:</p>
                          <ul className="list-disc pl-5 space-y-1 text-xs">
                            <li><strong>PMC ưu tiên 1:</strong> PMC chứa "uu tien 1" = 6.</li>
                            <li><strong>Quy trình SAP:</strong> Description chứa "sap" hoặc Letter rolling (cột BH) ≠ No = 5.</li>
                            <li><strong>Quy trình KAP:</strong> Description chứa "kap" hoặc Ink Printing (cột BG) ≠ No = 5.</li>
                            <li><strong>Mã hàng 34- (Tiện):</strong> Mã item bắt đầu bằng "34-" = 5. (Có thể cấu hình).</li>
                            <li><strong>Sắp xếp cuộn:</strong> Description chứa "smp", "stpk" hoặc Tape and reel (cột BI) ≠ No = 4.</li>
                            <li><strong>Hàn chì:</strong> Solder PN (cột BE) là "yes" = 3.</li>
                            <li><strong>Đơn hàng lớn:</strong> Quantity &gt; 5000 = 2.</li>
                          </ul>
                        </div>
                      }
                    />

                    <RuleItemCard
                      num="2"
                      title="Thứ Tự Sắp Xếp Sản Xuất"
                      desc={
                        <div>
                          <p className="mb-2">Khi phân bổ, hệ thống sắp xếp thứ tự ưu tiên các MO theo các cấp tiêu chí:</p>
                          <ol className="list-decimal pl-5 space-y-1 text-xs">
                            <li>Xếp dòng có điểm <strong>Priority Score</strong> cao hơn trước.</li>
                            <li>Nếu bằng điểm, ưu tiên theo trạng thái vật liệu cột H (số lớn ưu tiên trước):
                              <ul className="list-disc pl-5 mt-1 text-[11px]">
                                <li><strong>3:</strong> Đã phát liệu (Cao nhất)</li>
                                <li><strong>2:</strong> Đang soạn liệu</li>
                                <li><strong>1:</strong> Chờ nhập hoặc QC passed</li>
                                <li><strong>0:</strong> Chưa mua (Thấp nhất)</li>
                              </ul>
                            </li>
                            <li>Cuối cùng ưu tiên MO có ngày <strong>Promise date</strong> và ngày <strong>Ship date</strong> sớm hơn.</li>
                          </ol>
                          <p className="mt-2 text-amber-600 dark:text-amber-400 font-semibold text-[11px]">
                            * Gom nhóm thông minh: Các đơn hàng có cùng tên Description được gom nhóm để sản xuất liên tục trên cùng thiết lập máy.
                          </p>
                        </div>
                      }
                    />

                    <RuleItemCard
                      num="3"
                      title="Năng Lực Công Suất Một Ngày"
                      desc={
                        <div>
                          <p className="mb-2">Công suất sản lượng tối đa sản xuất trong 1 ngày cho 1 mã hàng được tính theo công thức:</p>
                          <div className="bg-muted p-2 rounded-md font-mono text-center text-xs border">
                            Số lượng/ngày = UPH * 8 * Hiệu suất sản lượng
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground">
                            Hiệu suất sản lượng mặc định là 0.76 (được cấu hình ở panel cấu hình bên trái). Số lượng xếp cho 1 mặt hàng vào 1 ngày sẽ được làm tròn theo Block làm tròn (ví dụ: làm tròn đến 500 gần nhất).
                          </p>
                        </div>
                      }
                    />

                    <RuleItemCard
                      num="4"
                      title="Thời Gian Hoạt Động XA"
                      desc={
                        <div>
                          <p className="mb-2">Thời gian hoạt động XA chuẩn cần thiết cho mỗi ngày sản xuất của đơn hàng được tính theo công thức:</p>
                          <div className="bg-muted p-2 rounded-md font-mono text-center text-xs border">
                            Thời gian XA = (Số lượng SX * XA std hour) / Hiệu suất giờ
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground">
                            Hiệu suất giờ mặc định là 0.8 (được cấu hình ở panel). Tổng thời gian XA trong 1 ngày của tất cả các dòng hàng không nên vượt quá Target giờ của ngày đó (ví dụ: 525 giờ).
                          </p>
                        </div>
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Subcomponents for styling and micro-interactions
function MetricCard({ title, value, level }: { title: string; value: string | number; level: "neutral" | "success" | "warning" | "error" }) {
  const styles = {
    neutral: "border-muted bg-card text-card-foreground",
    success: "border-emerald-100 dark:border-emerald-950 bg-emerald-50/20 text-emerald-950 dark:text-emerald-400",
    warning: "border-amber-100 dark:border-amber-950 bg-amber-50/20 text-amber-950 dark:text-amber-400",
    error: "border-destructive/20 bg-destructive/5 text-destructive dark:text-destructive-foreground"
  };

  return (
    <div className={`border rounded-xl p-4 shadow-xs text-left ${styles[level]}`}>
      <span className="text-[11px] font-semibold text-muted-foreground block mb-1 uppercase tracking-wider">{title}</span>
      <strong className="text-xl font-bold tracking-tight">{value}</strong>
    </div>
  );
}

function BadgeVariant({ label, level }: { label: string; level: "info" | "warning" | "error" }) {
  const styles = {
    info: "bg-blue-50 text-blue-800 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-950",
    warning: "bg-amber-50 text-amber-800 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-950",
    error: "bg-destructive/10 text-destructive border-destructive/20"
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border ${styles[level]}`}>
      {level === "info" && <span className="size-1.5 rounded-full bg-blue-500" />}
      {level === "warning" && <AlertTriangle className="size-3.5" />}
      {level === "error" && <AlertCircle className="size-3.5" />}
      {label}
    </span>
  );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
        active
          ? "bg-primary text-primary-foreground shadow-xs"
          : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function RuleItemCard({ num, title, desc }: { num: string; title: string; desc: React.ReactNode }) {
  return (
    <div className="border rounded-xl p-5 bg-muted/20 space-y-3">
      <div className="flex items-center gap-2.5">
        <span className="inline-flex items-center justify-center size-6 rounded-full bg-primary/10 text-primary font-bold text-xs">
          {num}
        </span>
        <h4 className="font-bold text-sm text-card-foreground">{title}</h4>
      </div>
      <div className="text-xs text-muted-foreground leading-relaxed">{desc}</div>
    </div>
  );
}

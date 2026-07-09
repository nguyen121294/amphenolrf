"use client";

import { useState, useMemo, useRef, useEffect } from "react";
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
  HelpCircle,
  Clock,
  Briefcase
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface SchedulingClientProps {
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
  assignedLine?: string; // Tên Line được gán
  outputs: number[];     // Kết quả 7 ngày
  times: number[];       // Kết quả 7 ngày
  missing: number;
  warnings: string[];
}

const dayDefs = [
  { name: "Day 1", qtyCol: "BW", timeCol: "BX" },
  { name: "Day 2", qtyCol: "BY", timeCol: "BZ" },
  { name: "Day 3", qtyCol: "CA", timeCol: "CB" },
  { name: "Day 4", qtyCol: "CC", timeCol: "CD" },
  { name: "Day 5", qtyCol: "CE", timeCol: "CF" },
  { name: "Day 6", qtyCol: "CG", timeCol: "CH" },
  { name: "Day 7", qtyCol: "CI", timeCol: "CJ" }
];

const outputHeaders: Record<string, string> = {
  BW: "Số lượng SX Day 1",
  BX: "Thời gian Day 1",
  BY: "Số lượng SX Day 2",
  BZ: "Thời gian Day 2",
  CA: "Số lượng SX Day 3",
  CB: "Thời gian Day 3",
  CC: "Số lượng SX Day 4",
  CD: "Thời gian Day 4",
  CE: "Số lượng SX Day 5",
  CF: "Thời gian Day 5",
  CG: "Số lượng SX Day 6",
  CH: "Thời gian Day 6",
  CI: "Số lượng SX Day 7",
  CJ: "Thời gian Day 7",
  CK: "Check tổng đơn"
};

const defaultLineCapacities: Record<string, number[]> = {
  L1: [10.5, 10.5, 10.5, 10.5, 10.5, 10.5, 10.5],
  L2: [10.5, 10.5, 10.5, 10.5, 10.5, 10.5, 10.5],
  L3: [10.5, 10.5, 10.5, 10.5, 10.5, 10.5, 10.5],
  L4: [10.5, 10.5, 8.0, 10.5, 10.5, 10.5, 10.5],
  L5: [10.5, 10.5, 10.5, 10.5, 0.0, 10.5, 10.5],
  L6: [10.5, 10.5, 10.5, 10.5, 10.5, 10.5, 10.5],
  L7: [10.5, 10.5, 10.5, 10.5, 10.5, 10.5, 10.5],
  L8: [10.5, 10.5, 10.5, 10.5, 10.5, 10.5, 10.5],
  L9: [10.5, 10.5, 10.5, 10.5, 10.5, 10.5, 10.5],
  L10: [10.5, 10.5, 10.5, 10.5, 10.5, 10.5, 10.5],
  L11: [10.5, 10.5, 10.5, 10.5, 10.5, 10.5, 10.5],
  L12: [10.5, 10.5, 10.5, 10.5, 10.5, 10.5, 10.5],
  L13: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  L14: [10.5, 10.5, 10.5, 10.5, 10.5, 10.5, 10.5],
  L15: [10.5, 10.5, 10.5, 10.5, 10.5, 10.5, 10.5],
  L16: [10.5, 10.5, 10.5, 10.5, 10.5, 10.5, 10.5],
};

const activeLines = ["L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8", "L9", "L10", "L11", "L12", "L14", "L15", "L16"];

export function SchedulingClient({ username }: SchedulingClientProps) {
  // UI & File states
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [resourceFileName, setResourceFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResourceDragging, setIsResourceDragging] = useState(false);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resourceFileInputRef = useRef<HTMLInputElement>(null);

  // Configuration states
  const [headerRow, setHeaderRow] = useState<number>(2);
  const [dataRow, setDataRow] = useState<number>(3);
  const [lotStep, setLotStep] = useState<number>(0);
  const [qtyEfficiency, setQtyEfficiency] = useState<number>(0.76);
  const [fixLatheScore, setFixLatheScore] = useState<boolean>(true);
  const [writeSummaryToRow1, setWriteSummaryToRow1] = useState<boolean>(false);

  // Data states
  const [originalWorkbook, setOriginalWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [lineCapacities, setLineCapacities] = useState<Record<string, number[]>>(defaultLineCapacities);
  const [results, setResults] = useState<ItemData[]>([]);
  const [defaultUph, setDefaultUph] = useState<number>(300);
  
  // Navigation / Filter states
  const [activeTab, setActiveTab] = useState<"preview" | "summary" | "calendar" | "rules">("preview");
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



  // Drag & drop logic for MO file
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
      await processMoFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processMoFile(e.target.files[0]);
    }
  };

  // Drag & drop logic for Resource file
  const handleResourceDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsResourceDragging(true);
    } else if (e.type === "dragleave") {
      setIsResourceDragging(false);
    }
  };

  const handleResourceDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResourceDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processResourceFile(e.dataTransfer.files[0]);
    }
  };

  const handleResourceFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processResourceFile(e.target.files[0]);
    }
  };

  const processMoFile = async (file: File) => {
    setLoading(true);
    setResults([]);

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array", cellDates: true });
      setOriginalWorkbook(wb);
      setFileName(file.name);
      setSheetNames(wb.SheetNames);
      
      const foundSheet = wb.SheetNames.find(
        (name) => name.toLowerCase() === "shipping list"
      );
      const activeSheet = foundSheet || wb.SheetNames[0] || "";
      setSelectedSheet(activeSheet);
      

      
      toast.success(`Đã tải file MO "${file.name}" thành công!`);
    } catch (err) {
      console.error(err);
      toast.error("Không thể đọc file Excel MO. Vui lòng kiểm tra lại định dạng.");
    } finally {
      setLoading(false);
    }
  };

  const processResourceFile = async (file: File) => {
    setLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const sheetName = wb.SheetNames[0];
      if (!sheetName) throw new Error("File Excel trống");
      const sheet = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, raw: true, defval: null });
      
      const parsedCapacities: Record<string, number[]> = {};
      
      for (let r = 0; r < rows.length; r++) {
        const row = rows[r];
        if (!row || row.length === 0) continue;
        const firstCell = String(row[0] || "").trim().toUpperCase();
        if (/^L\d+$/.test(firstCell)) {
          const capacities: number[] = [];
          for (let c = 1; c <= 7; c++) {
            capacities.push(numValue(row[c], 0));
          }
          parsedCapacities[firstCell] = capacities;
        }
      }
      
      if (Object.keys(parsedCapacities).length > 0) {
        const merged = { ...defaultLineCapacities, ...parsedCapacities };
        setLineCapacities(merged);
        setResourceFileName(file.name);
        toast.success(`Đã tải file công suất Line "${file.name}" thành công!`);
      } else {
        toast.error("Không tìm thấy dữ liệu công suất của các Line (L1-L16) trong file.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Không thể đọc file công suất Line. Vui lòng kiểm tra lại định dạng.");
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
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeResourceFile = () => {
    setResourceFileName(null);
    setLineCapacities(defaultLineCapacities);
    if (resourceFileInputRef.current) {
      resourceFileInputRef.current.value = "";
    }
    toast.info("Đã khôi phục bảng công suất Line mặc định.");
  };

  // Main processing logic (Round-Robin & Line Capacity based)
  const calculatePlan = () => {
    if (!originalWorkbook || !selectedSheet) {
      toast.error("Vui lòng tải file Excel MO lên trước.");
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
        const item = textVal(getCellVal(row, "B")); // Column B is Item
        const desc = textVal(getCellVal(row, "C")); // Column C is Description

        if (!quantity && !mo && !item && !desc) continue;

        let uph = numValue(getCellVal(row, "T"), 0);
        let uphWasZero = false;
        if (uph <= 0) {
          uph = defaultUph;
          uphWasZero = true;
        }

        const xaStd = numValue(getCellVal(row, "R"), 0);
        const status = textVal(getCellVal(row, "H"));
        const pmc = textVal(getCellVal(row, "G"));
        const solderPN = textVal(getCellVal(row, "BG")); // BG is Solder PN
        const inkPrinting = textVal(getCellVal(row, "BI")); // BI is Ink Printing
        const letterRolling = textVal(getCellVal(row, "BJ")); // BJ is Letter rolling
        const tapeReel = textVal(getCellVal(row, "BK")); // BK is Tape and reel

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
          if (hValNum === 3) materialRank = 4;
          else if (hValNum === 2) materialRank = 3;
          else if (hValNum === 1) materialRank = 2;
          else if (hValNum === 0) materialRank = 1;
        } else {
          if (normalizedStatus.includes("ready material")) materialRank = 4;
          else if (normalizedStatus.includes("co lieu")) materialRank = 3;
        }

        const priorityScore = pmcScore * sapScore * kapScore * latheScore * reelScore * solderScore * largeQtyScore;

        // Group by Item code (Column C)
        const setupGroupKey = item || `row-${r}`;

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
          dailyCapacity: 0,
          outputs: [0, 0, 0, 0, 0, 0, 0],
          times: [0, 0, 0, 0, 0, 0, 0],
          missing: quantity,
          warnings: uphWasZero ? [`UPH item = 0, hệ thống tự động mặc định là ${defaultUph}`] : []
        });
      }

      // Filter schedulable items
      const schedulable = parsedItems.filter((item) => item.quantity > 0 && item.uph > 0);

      // Group items by setupGroupKey (Item Code)
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
      
      // Sort groups by priority of bestItem
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

      // Track allocated hours per Line per day (L1-L16, Day 1-7)
      const allocatedTimes: Record<string, number[]> = {};
      activeLines.forEach((line) => {
        allocatedTimes[line] = [0, 0, 0, 0, 0, 0, 0];
      });

      // Dynamic load-balancing allocation: gán nhóm sản phẩm vào Line có tổng thời gian trống lớn nhất trong tuần
      planGroups.forEach((group) => {
        let assignedLine = activeLines[0];
        let maxAvailableHours = -999999;

        activeLines.forEach((line) => {
          const capacities = lineCapacities[line] || [10.5, 10.5, 10.5, 10.5, 10.5, 10.5, 10.5];
          let availableHoursSum = 0;
          for (let d = 0; d < 7; d++) {
            availableHoursSum += Math.max(capacities[d] - allocatedTimes[line][d], 0);
          }

          if (availableHoursSum > maxAvailableHours) {
            maxAvailableHours = availableHoursSum;
            assignedLine = line;
          }
        });

        // Mark line on items
        group.items.forEach((item) => {
          item.assignedLine = assignedLine;
        });

        const capacities = lineCapacities[assignedLine] || [10.5, 10.5, 10.5, 10.5, 10.5, 10.5, 10.5];

        // Find the earliest day with capacity on this Line (earliest is Day 1)
        let preferredDay = 0;
        for (let d = 0; d < 7; d++) {
          if (capacities[d] - allocatedTimes[assignedLine][d] > 0.01) {
            preferredDay = d;
            break;
          }
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

        // Allocate each item
        group.items.forEach((item) => {
          let remaining = item.quantity;
          const uphEff = item.uph * qtyEfficiency;

          if (uphEff <= 0) {
            item.warnings.push("UPH hiệu suất lỗi");
            return;
          }

          // Allocate from preferredDay to the end of the 7-day period (index 6)
          const daysToAllocate = Array.from({ length: 7 - preferredDay }, (_, i) => preferredDay + i);

          for (const dayIndex of daysToAllocate) {
            if (remaining <= 0) break;

            const capacityHours = capacities[dayIndex];
            const allocatedHours = allocatedTimes[assignedLine][dayIndex];
            const availableHours = Math.max(capacityHours - allocatedHours, 0);

            if (availableHours <= 0.001) continue;

            const maxQtyByHours = availableHours * uphEff;
            let chunk = Math.min(remaining, maxQtyByHours);

            if (lotStep > 1 && remaining > lotStep && chunk >= lotStep) {
              const rounded = Math.max(lotStep, Math.round(chunk / lotStep) * lotStep);
              chunk = round(Math.min(rounded, remaining, maxQtyByHours), 4);
            } else {
              chunk = round(Math.min(chunk, remaining), 4);
            }

            if (chunk > 0) {
              const timeUsed = chunk / uphEff;
              item.outputs[dayIndex] = round(item.outputs[dayIndex] + chunk, 4);
              allocatedTimes[assignedLine][dayIndex] = round(allocatedTimes[assignedLine][dayIndex] + timeUsed, 4);
              remaining = round(remaining - chunk, 4);
            }
          }

          if (remaining > 0.001) {
            item.warnings.push("Vượt công suất Line trong tuần (không thể xếp hết trong 7 ngày)");
          }
        });
      });

      // Calculate final times, missing & check warnings
      parsedItems.forEach((item) => {
        const uphEff = item.uph * qtyEfficiency;
        item.times = item.outputs.map((qty) => (uphEff > 0 ? round(qty / uphEff, 4) : 0));
        item.missing = round(item.quantity - item.outputs.reduce((sum, value) => sum + value, 0), 4);
        item.dailyCapacity = uphEff * 8; // standard 8 hours capacity
        
        if (item.missing > 0 && !item.warnings.some(w => w.includes("Vượt công suất"))) {
          item.warnings.push(`Còn thiếu ${formatNumber(item.missing)}`);
        }
      });

      const sortedResults = parsedItems.sort((a, b) => a.rowNumber - b.rowNumber);
      setResults(sortedResults);
      setCurrentPage(1);
      toast.success("Tính toán kế hoạch phân bổ theo Line thành công!");
    } catch (err) {
      console.error(err);
      toast.error("Lỗi khi xử lý tính toán. Vui lòng kiểm tra lại cấu trúc Excel.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!originalWorkbook || !selectedSheet || results.length === 0) {
      toast.error("Chưa có dữ liệu tính toán để xuất.");
      return;
    }

    try {
      const sheet = originalWorkbook.Sheets[selectedSheet];
      
      // Write outputs headers
      Object.entries(outputHeaders).forEach(([col, header]) => {
        setCell(sheet, headerRow - 1, colIndex(col), header);
      });

      // Calculate daily totals across all lines for row 1 if enabled
      if (writeSummaryToRow1) {
        dayDefs.forEach((day, index) => {
          const totalQty = results.reduce((sum, item) => sum + item.outputs[index], 0);
          const totalHours = results.reduce((sum, item) => sum + item.times[index], 0);
          setCell(sheet, 0, colIndex(day.qtyCol), round(totalQty, 4));
          setCell(sheet, 0, colIndex(day.timeCol), round(totalHours, 4));
        });
        setCell(sheet, 0, colIndex("CK"), round(results.reduce((sum, item) => sum + Math.max(item.missing, 0), 0), 4));
      }

      // Write results rows
      results.forEach((item) => {
        dayDefs.forEach((day, index) => {
          setCell(sheet, item.rowIndex, colIndex(day.qtyCol), item.outputs[index] || null);
          setCell(sheet, item.rowIndex, colIndex(day.timeCol), item.times[index] || null);
        });
        setCell(sheet, item.rowIndex, colIndex("CK"), item.missing || null);
      });

      // Extend range of active sheet
      extendRange(sheet, "CK", Math.max(...results.map((item) => item.rowNumber), headerRow));

      // Build Report JS sheet
      const reportRows = [
        ["Chỉ số đo lường", "Giá trị"],
        ["Tổng dòng input", results.length],
        ["Tổng quantity", round(results.reduce((sum, item) => sum + item.quantity, 0), 4)],
        ["Tổng quantity đã xếp", round(results.reduce((sum, item) => sum + item.outputs.reduce((s, v) => s + v, 0), 0), 4)],
        ["Tổng quantity còn thiếu", round(results.reduce((sum, item) => sum + Math.max(item.missing, 0), 0), 4)],
        [],
        ["Ngày", "Số lượng sản xuất", "Thời gian (giờ)"]
      ];

      dayDefs.forEach((day, index) => {
        const totalQty = results.reduce((sum, item) => sum + item.outputs[index], 0);
        const totalHours = results.reduce((sum, item) => sum + item.times[index], 0);
        reportRows.push([day.name, round(totalQty, 4), round(totalHours, 4)]);
      });

      reportRows.push([]);
      reportRows.push(["Dòng", "MO#", "Item", "Quantity", "Thiếu", "Line gán", "Cảnh báo"]);
      results
        .filter((item) => item.warnings.length || item.missing > 0)
        .forEach((item) => {
          reportRows.push([
            item.rowNumber,
            item.mo,
            item.item,
            item.quantity,
            item.missing,
            item.assignedLine || "Chưa gán",
            item.warnings.join("; ")
          ]);
        });

      const reportSheet = XLSX.utils.aoa_to_sheet(reportRows);
      originalWorkbook.Sheets["Report JS"] = reportSheet;
      if (!originalWorkbook.SheetNames.includes("Report JS")) {
        originalWorkbook.SheetNames.push("Report JS");
      }

      // Download file
      const outName = fileName ? fileName.replace(/\.(xlsx|xls|xlsm)$/i, "") + " - output.xlsx" : "production-scheduling-output.xlsx";
      XLSX.writeFile(originalWorkbook, outName);
      toast.success("Tải xuống file Excel kết quả thành công!");
    } catch (err) {
      console.error(err);
      toast.error("Lỗi khi ghi đè dữ liệu xuất file.");
    }
  };

  const handleExportCalendarOnly = () => {
    if (results.length === 0) {
      toast.error("Chưa có dữ liệu lập lịch để xuất.");
      return;
    }

    try {
      const wb = XLSX.utils.book_new();

      // --- SHEET 1: MA TRẬN PHÂN BỔ (MATRIX GRID) ---
      const matrixRows: any[][] = [];
      const matrixHeader = ["Line", "Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7", "Tổng giờ tuần"];
      matrixRows.push(matrixHeader);

      activeLines.forEach((line) => {
        const lineRow: any[] = [line];
        let totalHours = 0;

        for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
          const dayCapacity = lineCapacities[line]?.[dayIdx] ?? 10.5;
          if (dayCapacity === 0) {
            lineRow.push("OFF (Không hoạt động)");
            continue;
          }

          const cellItems = results.filter(
            (item) => item.assignedLine === line && item.outputs[dayIdx] > 0
          );

          if (cellItems.length === 0) {
            lineRow.push("Trống");
          } else {
            const itemTexts = cellItems.map((item) => {
              const warns = item.warnings.length > 0 ? " ⚠️" : "";
              return `${item.item} (MO:${item.mo})\nQty: ${formatNumber(item.outputs[dayIdx])} | ${formatNumber(item.times[dayIdx])}h${warns}`;
            });
            lineRow.push(itemTexts.join("\n---\n"));
          }

          const dayHoursSum = cellItems.reduce((sum, item) => sum + item.times[dayIdx], 0);
          totalHours += dayHoursSum;
        }

        lineRow.push(`${round(totalHours, 2)}h`);
        matrixRows.push(lineRow);
      });

      const matrixSheet = XLSX.utils.aoa_to_sheet(matrixRows);
      
      matrixSheet["!cols"] = [
        { wch: 10 },
        { wch: 35 },
        { wch: 35 },
        { wch: 35 },
        { wch: 35 },
        { wch: 35 },
        { wch: 35 },
        { wch: 35 },
        { wch: 15 }
      ];

      XLSX.utils.book_append_sheet(wb, matrixSheet, "Ma Trận Phân Bổ Line");

      // --- SHEET 2: DANH SÁCH CHI TIẾT (FLAT LIST) ---
      const flatRows: any[][] = [];
      const flatHeader = [
        "Dòng Excel Gốc",
        "Line Sản Xuất",
        "Ngày Sản Xuất",
        "Mã Hàng (Item)",
        "Mô Tả Sản Phẩm",
        "Số Lượng Phân Bổ (Qty)",
        "Mã MO#",
        "Số Giờ Hoạt Động (Hours)",
        "Độ Ưu Tiên (Priority Score)",
        "Cảnh Báo"
      ];
      flatRows.push(flatHeader);

      for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
        activeLines.forEach((line) => {
          const cellItems = results.filter(
            (item) => item.assignedLine === line && item.outputs[dayIdx] > 0
          );

          cellItems.sort((a, b) => {
            return b.priorityScore - a.priorityScore
              || b.materialRank - a.materialRank
              || b.pmcScore - a.pmcScore
              || a.promiseDate - b.promiseDate
              || a.shipDate - b.shipDate
              || a.originalOrder - b.originalOrder;
          });

          cellItems.forEach((item) => {
            flatRows.push([
              item.rowNumber,
              line,
              `Day ${dayIdx + 1}`,
              item.item,
              item.desc,
              item.outputs[dayIdx],
              item.mo,
              item.times[dayIdx],
              item.priorityScore,
              item.warnings.join("; ") || "OK"
            ]);
          });
        });
      }

      const flatSheet = XLSX.utils.aoa_to_sheet(flatRows);
      
      flatSheet["!cols"] = [
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 25 },
        { wch: 30 },
        { wch: 22 },
        { wch: 15 },
        { wch: 22 },
        { wch: 25 },
        { wch: 35 }
      ];

      XLSX.utils.book_append_sheet(wb, flatSheet, "Danh Sách Chi Tiết");

      const outName = fileName 
        ? fileName.replace(/\.(xlsx|xls|xlsm)$/i, "") + " - lich-phan-bo-line.xlsx" 
        : "lich-phan-bo-line.xlsx";
        
      XLSX.writeFile(wb, outName);
      toast.success("Tải xuống file lịch phân bổ Line thành công!");
    } catch (err) {
      console.error(err);
      toast.error("Lỗi khi kết xuất file lịch phân bổ.");
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
    if (results.length === 0) return null;
    const totalQty = results.reduce((sum, item) => sum + item.quantity, 0);
    const plannedQty = results.reduce((sum, item) => sum + item.outputs.reduce((s, v) => s + v, 0), 0);
    const missingQty = results.reduce((sum, item) => sum + Math.max(item.missing, 0), 0);
    const totalHours = results.reduce((sum, item) => sum + item.times.reduce((s, v) => s + v, 0), 0);
    const warningCount = results.filter((item) => item.warnings.length).length;

    return {
      totalRows: results.length,
      totalQty,
      plannedQty,
      missingQty,
      totalHours,
      warningCount
    };
  }, [results]);

  // Line summaries for Summary tab (Matrix of L1-L16 vs Day 1-7)
  const lineSummaries = useMemo(() => {
    if (results.length === 0) return null;
    
    const summary: Record<string, { qty: number[]; time: number[] }> = {};
    activeLines.forEach((line) => {
      summary[line] = {
        qty: [0, 0, 0, 0, 0, 0, 0],
        time: [0, 0, 0, 0, 0, 0, 0]
      };
    });

    results.forEach((item) => {
      if (item.assignedLine && summary[item.assignedLine]) {
        dayDefs.forEach((_, idx) => {
          summary[item.assignedLine!].qty[idx] = round(summary[item.assignedLine!].qty[idx] + item.outputs[idx], 4);
          summary[item.assignedLine!].time[idx] = round(summary[item.assignedLine!].time[idx] + item.times[idx], 4);
        });
      }
    });

    return summary;
  }, [results]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Production Scheduling (Line Capacity)</h1>
          <p className="text-muted-foreground">
            Phân bổ sản lượng tự động theo Line (L1-L16) cho 7 ngày làm việc bằng thuật toán Round-Robin cân bằng tải.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <BadgeVariant label={`Người dùng: ${username}`} level="info" />
        </div>
      </div>

      {/* Configuration Panel - Horizontal Layout */}
      <div className="rounded-xl border bg-card text-card-foreground shadow-xs p-5 space-y-4">
        <div className="flex items-center gap-2 font-semibold border-b pb-2 text-sm">
          <Upload className="size-4 text-primary" />
          Tải tệp & Cấu hình nhanh
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 items-start">
          
          {/* Column 1: File MO Upload */}
          <div className="space-y-1.5 text-left">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">1. File MO (Xuất hàng)</Label>
            {!fileName ? (
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors duration-200 ${
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
                <FileSpreadsheet className="mx-auto size-6 text-muted-foreground mb-1" />
                <p className="text-[10px] font-medium">Kéo thả file MO hoặc click</p>
              </div>
            ) : (
              <div className="flex items-center justify-between p-2 border rounded-lg bg-muted/30 h-[72px]">
                <div className="flex items-center gap-2 overflow-hidden">
                  <FileSpreadsheet className="size-6 text-emerald-600 shrink-0" />
                  <div className="truncate text-left">
                    <p className="text-xs font-medium truncate">{fileName}</p>
                    <p className="text-[9px] text-muted-foreground">Sẵn sàng lập lịch</p>
                  </div>
                </div>
                <button
                  onClick={removeFile}
                  className="p-1 hover:bg-destructive/10 hover:text-destructive rounded transition-colors"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Column 2: File Resource Upload */}
          <div className="space-y-1.5 text-left">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">2. File Công Suất Line</Label>
            {!resourceFileName ? (
              <div
                onDragEnter={handleResourceDrag}
                onDragOver={handleResourceDrag}
                onDragLeave={handleResourceDrag}
                onDrop={handleResourceDrop}
                onClick={() => resourceFileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors duration-200 ${
                  isResourceDragging
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/50"
                }`}
              >
                <input
                  ref={resourceFileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.xlsm"
                  className="hidden"
                  onChange={handleResourceFileChange}
                />
                <Clock className="mx-auto size-6 text-muted-foreground mb-1" />
                <p className="text-[10px] font-medium text-muted-foreground">Kéo thả Resource hoặc click</p>
              </div>
            ) : (
              <div className="flex items-center justify-between p-2 border rounded-lg bg-muted/30 h-[72px]">
                <div className="flex items-center gap-2 overflow-hidden">
                  <Clock className="size-6 text-blue-600 shrink-0" />
                  <div className="truncate text-left">
                    <p className="text-xs font-medium truncate">{resourceFileName}</p>
                    <p className="text-[9px] text-emerald-600 font-semibold">Công suất riêng</p>
                  </div>
                </div>
                <button
                  onClick={removeResourceFile}
                  className="p-1 hover:bg-destructive/10 hover:text-destructive rounded transition-colors"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Column 3: Sheet Selector & Actions */}
          <div className="space-y-2 text-left">
            {sheetNames.length > 0 ? (
              <div className="space-y-1">
                <Label htmlFor="sheetSelect" className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Sheet Excel MO</Label>
                <select
                  id="sheetSelect"
                  value={selectedSheet}
                  onChange={(e) => {
                    setSelectedSheet(e.target.value);
                    setResults([]);
                  }}
                  className="w-full h-8 rounded-md border border-input bg-background px-2 py-1 text-xs shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {sheetNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="h-8" />
            )}
            <div className="flex gap-2">
              <Button
                onClick={calculatePlan}
                disabled={loading || !fileName}
                className="flex-1 font-semibold h-8 text-xs shadow-sm transition-all"
              >
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Tính Output"}
              </Button>
              <Button
                variant="outline"
                onClick={handleDownload}
                disabled={loading || results.length === 0}
                className="flex-1 font-semibold border-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:text-emerald-700 text-emerald-600 dark:text-emerald-500 h-8 text-xs"
              >
                <Download className="h-3 w-3 mr-1" />
                Xuất Excel
              </Button>
            </div>
          </div>

          {/* Column 4: Advanced Parameters */}
          <div className="space-y-2 text-left">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-0.5">
                <Label htmlFor="qtyEff" className="text-[10px] text-destructive dark:text-red-400 font-bold">H.suất UPH</Label>
                <Input
                  id="qtyEff"
                  type="number"
                  step="0.01"
                  min={0.01}
                  max={1}
                  value={qtyEfficiency}
                  onChange={(e) => setQtyEfficiency(parseFloat(e.target.value) || 0.76)}
                  className="h-7 text-xs font-mono font-bold text-destructive border-destructive/30 px-1 text-center"
                />
              </div>
              <div className="space-y-0.5">
                <Label htmlFor="lotStep" className="text-[10px]">Block tròn</Label>
                <Input
                  id="lotStep"
                  type="number"
                  min={0}
                  value={lotStep}
                  onChange={(e) => setLotStep(Math.max(0, parseInt(e.target.value) || 0))}
                  className="h-7 text-xs font-mono px-1 text-center"
                />
              </div>
              <div className="space-y-0.5">
                <Label htmlFor="dataRow" className="text-[10px]">Dòng data</Label>
                <Input
                  id="dataRow"
                  type="number"
                  min={2}
                  value={dataRow}
                  onChange={(e) => setDataRow(parseInt(e.target.value) || 3)}
                  className="h-7 text-xs font-mono px-1 text-center"
                />
              </div>
              <div className="space-y-0.5">
                <Label htmlFor="defaultUph" className="text-[10px]">UPH mặc định</Label>
                <Input
                  id="defaultUph"
                  type="number"
                  min={1}
                  value={defaultUph}
                  onChange={(e) => setDefaultUph(Math.max(1, parseInt(e.target.value) || 300))}
                  className="h-7 text-xs font-mono px-1 text-center"
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5">
                <Switch
                  id="fixLathe"
                  checked={fixLatheScore}
                  onCheckedChange={setFixLatheScore}
                  className="scale-75"
                />
                <Label htmlFor="fixLathe" className="text-[10px] cursor-pointer">Fix mã 34-</Label>
              </div>
              <div className="flex items-center gap-1.5">
                <Switch
                  id="writeRow1"
                  checked={writeSummaryToRow1}
                  onCheckedChange={setWriteSummaryToRow1}
                  className="scale-75"
                />
                <Label htmlFor="writeRow1" className="text-[10px] cursor-pointer">Ghi dòng 1</Label>
              </div>
            </div>
          </div>


        </div>
      </div>

      {/* Main Results Display & Metrics - Full Width */}
      <div className="space-y-6">
          {/* Quick Metrics */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <MetricCard title="Tổng dòng" value={stats.totalRows} level="neutral" />
              <MetricCard title="Tổng sản lượng" value={formatNumber(stats.totalQty)} level="neutral" />
              <MetricCard title="Đã xếp" value={formatNumber(stats.plannedQty)} level="success" />
              <MetricCard
                title="Còn thiếu"
                value={formatNumber(stats.missingQty)}
                level={stats.missingQty > 0 ? "error" : "success"}
              />
              <MetricCard
                title="Cảnh báo"
                value={`${stats.warningCount} hàng`}
                level={stats.warningCount ? "warning" : "success"}
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
                  label="Bảng Preview"
                />
                <TabButton
                  active={activeTab === "summary"}
                  onClick={() => setActiveTab("summary")}
                  label="Tải của các Line"
                />
                <TabButton
                  active={activeTab === "calendar"}
                  onClick={() => setActiveTab("calendar")}
                  label="Lịch Phân Bổ Line (Overview)"
                />
                <TabButton
                  active={activeTab === "rules"}
                  onClick={() => setActiveTab("rules")}
                  label="Quy tắc Mới"
                />
              </div>

              {/* Table search filter */}
              {activeTab === "preview" && results.length > 0 && (
                <div className="relative w-full sm:w-60 md:w-80 h-9 mb-2 sm:mb-0">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Tìm theo MO#, Item..."
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
                      <p className="text-xs">Hãy upload file Excel MO và nhấn nút Tính toán để xem kết quả preview tại đây.</p>
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full border-collapse text-sm text-left">
                          <thead className="bg-muted/70 text-muted-foreground uppercase text-[10px] tracking-wider font-semibold border-b">
                            <tr>
                              <th className="p-3 text-center w-12">Dòng</th>
                              <th className="p-3">MO#</th>
                              <th className="p-3">Mã hàng (Item)</th>
                              <th className="p-3">Mô tả</th>
                              <th className="p-3 text-center">Line gán</th>
                              <th className="p-3 text-right">Qty</th>
                              <th className="p-3 text-right">UPH</th>
                              <th className="p-3 text-right">Priority</th>
                              {dayDefs.map((day) => (
                                <th key={day.name} className="p-3 text-center border-l bg-muted/40 font-bold">
                                  {day.name} (Qty/Giờ)
                                </th>
                              ))}
                              <th className="p-3 text-right border-l">Thiếu</th>
                              <th className="p-3">Cảnh báo</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {paginatedResults.length === 0 ? (
                              <tr>
                                <td colSpan={17} className="text-center py-8 text-muted-foreground text-xs">
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
                                    <td className="p-3 font-semibold font-mono text-xs text-primary">{item.item}</td>
                                    <td className="p-3 text-xs text-muted-foreground max-w-[150px] truncate" title={item.desc}>{item.desc}</td>
                                    <td className="p-3 text-center">
                                      {item.assignedLine ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary">
                                          {item.assignedLine}
                                        </span>
                                      ) : (
                                        <span className="text-xs text-muted-foreground/50">-</span>
                                      )}
                                    </td>
                                    <td className="p-3 text-right font-mono font-medium">{formatNumber(item.quantity)}</td>
                                    <td className="p-3 text-right font-mono text-xs">{formatNumber(item.uph)}</td>
                                    <td className="p-3 text-right font-mono text-xs font-semibold text-primary">{item.priorityScore}</td>
                                    
                                    {dayDefs.map((day, idx) => (
                                      <td key={day.name} className="p-3 text-center border-l bg-muted/5 text-xs font-mono">
                                        <div className="flex flex-col items-center">
                                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
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
                                            const isCrit = w.includes("thiếu") || w.includes("Vượt");
                                            return (
                                              <span
                                                key={wIdx}
                                                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                                  isCrit
                                                    ? "bg-destructive/10 text-destructive font-semibold"
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

              {/* Tab 2: Line Capacity Breakdown (Summary) */}
              {activeTab === "summary" && (
                <div className="space-y-6">
                  {lineSummaries ? (
                    <div className="space-y-4">
                      <div className="overflow-x-auto rounded-lg border text-left">
                        <table className="w-full border-collapse text-sm text-left">
                          <thead className="bg-muted/70 text-muted-foreground uppercase text-[10px] tracking-wider font-semibold border-b">
                            <tr>
                              <th className="p-3 w-20">Line</th>
                              <th className="p-3 text-center">Tổng thời gian tuần</th>
                              {dayDefs.map((day) => (
                                <th key={day.name} className="p-3 text-center border-l bg-muted/40 font-bold">
                                  {day.name} (Đã dùng / Max)
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {activeLines.map((line) => {
                              const summary = lineSummaries[line] || { qty: [0,0,0,0,0,0,0], time: [0,0,0,0,0,0,0] };
                              const capacities = lineCapacities[line] || [10.5, 10.5, 10.5, 10.5, 10.5, 10.5, 10.5];
                              const totalUsedHours = summary.time.reduce((sum, v) => sum + v, 0);
                              const totalMaxHours = capacities.reduce((sum, v) => sum + v, 0);
                              const totalPct = totalMaxHours > 0 ? (totalUsedHours / totalMaxHours) * 100 : 0;

                              return (
                                <tr key={line} className="hover:bg-muted/10 transition-colors">
                                  <td className="p-3 font-bold text-primary text-sm">{line}</td>
                                  <td className="p-3">
                                    <div className="flex flex-col items-center">
                                      <span className="font-semibold">{formatNumber(totalUsedHours)}h / {formatNumber(totalMaxHours)}h</span>
                                      <span className="text-[10px] text-muted-foreground">({round(totalPct, 1)}%)</span>
                                      <div className="h-1.5 w-24 bg-muted rounded-full mt-1 overflow-hidden">
                                        <div
                                          className={`h-full rounded-full ${
                                            totalPct > 90
                                              ? "bg-destructive"
                                              : totalPct > 70
                                              ? "bg-amber-500"
                                              : "bg-emerald-500"
                                          }`}
                                          style={{ width: `${Math.min(totalPct, 100)}%` }}
                                        />
                                      </div>
                                    </div>
                                  </td>
                                  {dayDefs.map((day, idx) => {
                                    const used = summary.time[idx];
                                    const max = capacities[idx];
                                    const pct = max > 0 ? (used / max) * 100 : 0;
                                    const isFull = max > 0 && used >= max - 0.01;
                                    const isZero = max === 0;

                                    return (
                                      <td key={day.name} className={`p-3 text-center border-l font-mono text-xs ${isZero ? "bg-muted/20 text-muted-foreground/30" : ""}`}>
                                        <div className="flex flex-col items-center">
                                          <span className={`font-semibold ${isFull ? "text-destructive" : used > 0 ? "text-primary" : "text-muted-foreground"}`}>
                                            {formatNumber(used)}h / {formatNumber(max)}h
                                          </span>
                                          {max > 0 && (
                                            <span className="text-[9px] text-muted-foreground">({round(pct, 0)}%)</span>
                                          )}
                                          {isZero && <span className="text-[9px] text-muted-foreground font-sans">Off Line</span>}
                                        </div>
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div className="p-4 border rounded-xl bg-blue-50/50 dark:bg-blue-950/10 text-blue-950 dark:text-blue-200 text-xs flex gap-3 text-left">
                        <Info className="size-5 shrink-0 text-blue-600 dark:text-blue-400" />
                        <div className="space-y-1">
                          <p className="font-semibold">Lưu ý về công suất Line:</p>
                          <p>
                            Bảng trên thống kê số giờ hoạt động thực tế đã lập lịch trên mỗi Line so với Công suất khả dụng cấu hình của Line đó. Các Line bị đầy tải đỏ sẽ dừng nhận đơn hàng, và đơn hàng tiếp theo của nhóm sẽ được ưu tiên chạy nối tiếp sang các ngày tiếp theo của chính Line đó.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-16 text-muted-foreground space-y-2">
                      <Calendar className="mx-auto size-12 text-muted-foreground/30" />
                      <p className="font-medium text-sm">Chưa có biểu đồ tải</p>
                      <p className="text-xs">Dữ liệu phân tích công suất sẽ hiển thị sau khi bạn chạy kế hoạch tính toán.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Calendar overview grid (NEW) */}
              {activeTab === "calendar" && (
                <div className="space-y-6">
                  {results.length > 0 ? (
                    <div className="space-y-4 text-left">
                      <div className="flex justify-between items-center flex-wrap gap-2 pb-2">
                        <div className="text-xs text-muted-foreground">
                          Biểu đồ trực quan danh sách đơn hàng đã gán cho từng Line sản xuất trong 7 ngày làm việc.
                        </div>
                        <Button
                          onClick={handleExportCalendarOnly}
                          className="font-semibold border-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:text-emerald-700 text-emerald-600 dark:text-emerald-500 h-8 text-xs shrink-0"
                          variant="outline"
                        >
                          <Download className="h-3.5 w-3.5 mr-1" />
                          Xuất Lịch Phân Bổ (Lưới & Danh Sách)
                        </Button>
                      </div>
                      <div className="overflow-x-auto rounded-lg border border-muted">
                        <div className="min-w-[1200px] grid grid-cols-8 divide-x border-b bg-muted/40 font-semibold text-xs tracking-wider text-muted-foreground">
                          <div className="p-3 text-center font-bold">Line</div>
                          {dayDefs.map((day, idx) => (
                            <div key={day.name} className="p-3 text-center">
                              {day.name}
                              <div className="text-[10px] text-muted-foreground font-normal normal-case mt-0.5">
                                Qty: {formatNumber(results.reduce((sum, item) => sum + item.outputs[idx], 0))} / {formatNumber(results.reduce((sum, item) => sum + item.times[idx], 0))}h
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="min-w-[1200px] divide-y">
                          {activeLines.map((line) => {
                            const capacities = lineCapacities[line] || [10.5, 10.5, 10.5, 10.5, 10.5, 10.5, 10.5];
                            return (
                              <div key={line} className="grid grid-cols-8 divide-x min-h-[140px] hover:bg-muted/5 transition-colors">
                                {/* Line Label Column */}
                                <div className="p-3 bg-muted/10 flex flex-col justify-center items-center gap-1 border-r">
                                  <span className="font-extrabold text-sm text-primary">{line}</span>
                                  <span className="text-[10px] text-muted-foreground font-mono text-center">
                                    Capacity:<br />
                                    {formatNumber(capacities.reduce((s,v)=>s+v, 0))}h/tuần
                                  </span>
                                </div>

                                {/* Days Columns */}
                                {dayDefs.map((day, dayIdx) => {
                                  const cellItems = results.filter(
                                    (item) => item.assignedLine === line && item.outputs[dayIdx] > 0
                                  );
                                  const dayCapacity = capacities[dayIdx];
                                  const isZeroCap = dayCapacity === 0;

                                  return (
                                    <div
                                      key={day.name}
                                      className={`p-2 space-y-2 overflow-y-auto max-h-[220px] ${
                                        isZeroCap ? "bg-muted/20" : ""
                                      }`}
                                    >
                                      {isZeroCap ? (
                                        <div className="text-[10px] text-muted-foreground/40 italic text-center py-8">
                                          Không hoạt động
                                        </div>
                                      ) : cellItems.length === 0 ? (
                                        <div className="text-[10px] text-muted-foreground/20 italic text-center py-8">
                                          Trống
                                        </div>
                                      ) : (
                                        cellItems.map((item) => {
                                          const hasWarns = item.warnings.length > 0;
                                          return (
                                            <div
                                              key={item.rowIndex}
                                              className={`p-2 rounded-lg border text-left text-xs transition-shadow hover:shadow-xs space-y-1 ${
                                                hasWarns
                                                  ? "bg-amber-50/50 border-amber-200 dark:bg-amber-950/10 dark:border-amber-900"
                                                  : "bg-emerald-50/10 border-emerald-200 dark:border-emerald-950/30"
                                              }`}
                                            >
                                              <div className="flex items-center justify-between gap-1">
                                                <span className="font-bold text-primary truncate block max-w-[80px]" title={item.item}>
                                                  {item.item}
                                                </span>
                                                <span className="text-[9px] font-mono text-muted-foreground shrink-0 bg-muted px-1 rounded">
                                                  MO: {item.mo}
                                                </span>
                                              </div>
                                              <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                                                <span>Qty: <strong className="text-foreground">{formatNumber(item.outputs[dayIdx])}</strong></span>
                                                <span>Time: <strong className="text-foreground">{formatNumber(item.times[dayIdx])}h</strong></span>
                                              </div>
                                              {hasWarns && (
                                                <span className="text-[8px] font-semibold text-amber-700 dark:text-amber-400 block">
                                                  ⚠️ Vượt công suất tuần
                                                </span>
                                              )}
                                            </div>
                                          );
                                        })
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-16 text-muted-foreground space-y-2">
                      <Calendar className="mx-auto size-12 text-muted-foreground/30" />
                      <p className="font-medium text-sm">Chưa có dữ liệu lịch phân bổ</p>
                      <p className="text-xs">Tải file Excel lên và bấm nút Tính toán để hiển thị sơ đồ phân bổ trực quan cho các Line sản xuất.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 4: Rules & Accords */}
              {activeTab === "rules" && (
                <div className="text-left space-y-6">
                  <div>
                    <h3 className="font-bold text-base text-foreground mb-1">Các Quy Tắc Tính Toán Điểm & Thứ Tự Sản Xuất Mới</h3>
                    <p className="text-sm text-muted-foreground">
                      Các quy tắc được tự động tính toán dựa trên cấu hình line và ràng buộc round-robin.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <RuleItemCard
                      num="1"
                      title="Quy tắc tính Điểm Ưu Tiên"
                      desc={
                        <div>
                          <p className="mb-2">Điểm ưu tiên được tính bằng tích số nhân của 7 tiêu chí quan trọng tương tự trước đây:</p>
                          <ul className="list-disc pl-5 space-y-1 text-xs">
                            <li><strong>PMC ưu tiên 1:</strong> PMC chứa "uu tien 1" = 6.</li>
                            <li><strong>Quy trình SAP:</strong> Description chứa "sap" hoặc Letter rolling ≠ No = 5.</li>
                            <li><strong>Quy trình KAP:</strong> Description chứa "kap" hoặc Ink Printing ≠ No = 5.</li>
                            <li><strong>Mã hàng 34- (Tiện):</strong> Mã item bắt đầu bằng "34-" = 5.</li>
                            <li><strong>Sắp xếp cuộn:</strong> Description chứa "smp", "stpk" hoặc Tape and reel ≠ No = 4.</li>
                            <li><strong>Hàn chì:</strong> Solder PN là "yes" = 3.</li>
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
                          <p className="mb-2">Khi phân bổ, hệ thống gom nhóm và sắp xếp thứ tự các MO như sau:</p>
                          <ol className="list-decimal pl-5 space-y-1 text-xs">
                            <li><strong>Gom nhóm theo mã sản phẩm (Item - Cột C)</strong>. Các MO có cùng Item sẽ được sản xuất trên cùng một Line đã gán để giảm tối đa changeover.</li>
                            <li>Sắp xếp các nhóm dựa trên so sánh MO tốt nhất: điểm <strong>Priority Score</strong> cao nhất $\rightarrow$ <strong>Material Rank</strong> cao nhất $\rightarrow$ <strong>Promise Date</strong> và <strong>Ship Date</strong> sớm nhất.</li>
                          </ol>
                        </div>
                      }
                    />

                    <RuleItemCard
                      num="3"
                      title="Cân bằng tải Line & Round-Robin"
                      desc={
                        <div>
                          <p className="mb-2">Hệ thống phân bổ các nhóm Item tuần tự theo thứ tự vòng tròn L1, L2, L3... L16 (Bỏ qua L13):</p>
                          <ul className="list-disc pl-5 space-y-1 text-xs">
                            <li>Mỗi nhóm Item chỉ được phép gán cố định cho **duy nhất 1 Line**, không được chạy song song trên nhiều Line.</li>
                            <li>Mục tiêu giúp dàn đều công việc của các Line sản xuất, không Line nào chạy quá nhiều hoặc chạy quá ít.</li>
                          </ul>
                        </div>
                      }
                    />

                    <RuleItemCard
                      num="4"
                      title="Quy tắc xếp lịch cả tuần"
                      desc={
                        <div>
                          <p className="mb-2">Đơn hàng chạy trên Line được phép chạy tràn sang các ngày tiếp theo trong tuần:</p>
                          <ul className="list-disc pl-5 space-y-1 text-xs">
                            <li>Một đơn hàng khi bắt đầu được lập lịch ở ngày $D$ (ngày đầu tiên line còn thời gian trống) thì được phép chạy liên tục từ ngày $D$ cho đến hết tuần (Day 7).</li>
                            <li>Nếu số lượng lớn vượt quá công suất cả tuần của Line gán, số lượng dư thừa sẽ bị bỏ trống và ghi nhận cảnh báo vượt công suất tuần.</li>
                          </ul>
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

"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "./input";

interface AutocompleteOption {
  id: number;
  label: string;
}

interface AutocompleteProps {
  options: AutocompleteOption[];
  value: number | string | undefined;
  onChange: (id: number | "") => void;
  placeholder?: string;
  className?: string;
}

export function Autocomplete({
  options,
  value,
  onChange,
  placeholder = "Tìm kiếm...",
  className
}: AutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [inputValue, setInputValue] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Find the currently selected option
  const selectedOption = options.find((opt) => opt.id === Number(value));

  // Sync input value with selected option when value changes
  useEffect(() => {
    if (selectedOption) {
      setInputValue(selectedOption.label);
      setSearchQuery("");
    } else {
      setInputValue("");
      setSearchQuery("");
    }
  }, [value, selectedOption]);

  // Click outside detection to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Reset input value to match selected option if they typed but didn't select
        if (selectedOption) {
          setInputValue(selectedOption.label);
        } else {
          setInputValue("");
        }
        setSearchQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [selectedOption]);

  // Filter options based on search query
  const filteredOptions = options.filter((option) => {
    // If user is focused and has typed something, filter by query.
    // Otherwise, show all options.
    if (!searchQuery.trim()) return true;
    return option.label.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    setSearchQuery(val);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    // Select the entire text on focus for easier typing on tablets
    if (inputRef.current) {
      inputRef.current.select();
    }
  };

  const handleSelectOption = (option: AutocompleteOption) => {
    onChange(option.id);
    setInputValue(option.label);
    setSearchQuery("");
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setInputValue("");
    setSearchQuery("");
    setIsOpen(true);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          className="pl-9 pr-9 h-10 text-sm"
        />
        {(inputValue || searchQuery) && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 transition-colors"
            title="Xóa lựa chọn"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Floating Dropdown List */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-1.5 max-h-60 overflow-y-auto rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-lg z-50 py-1 divide-y divide-zinc-50 dark:divide-zinc-900 scrollbar-thin">
          {filteredOptions.length === 0 ? (
            <div className="py-4 px-4 text-sm text-zinc-400 text-center italic">
              Không tìm thấy kết quả nào
            </div>
          ) : (
            filteredOptions.map((option) => {
              const isSelected = selectedOption?.id === option.id;
              return (
                <div
                  key={option.id}
                  onClick={() => handleSelectOption(option)}
                  className={cn(
                    "flex items-center justify-between py-3 px-4 text-sm cursor-pointer select-none transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-900 active:bg-zinc-100 dark:active:bg-zinc-900",
                    isSelected
                      ? "text-primary font-semibold bg-zinc-50 dark:bg-zinc-900/50"
                      : "text-zinc-700 dark:text-zinc-300"
                  )}
                  style={{ minHeight: "44px" }} // Explicit min-height for tablet touch target
                >
                  <span className="truncate pr-4">{option.label}</span>
                  {isSelected && <Check className="h-4 w-4 shrink-0 text-primary" />}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

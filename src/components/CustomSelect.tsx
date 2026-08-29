import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, Check, Search, X } from "lucide-react";

export interface SelectOption {
  value: string | number;
  label: string;
  icon?: React.ReactNode;
  description?: string;
  badge?: string;
  disabled?: boolean;
}

export interface CustomSelectProps {
  options: SelectOption[];
  value: string | number;
  onChange: (value: any) => void;
  placeholder?: string;
  label?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  searchable?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "dark" | "glass" | "light";
  error?: string;
}

export function CustomSelect({
  options = [],
  value,
  onChange,
  placeholder = "اختر من القائمة...",
  label,
  icon,
  disabled = false,
  searchable = true,
  className = "",
  size = "md",
  variant = "dark",
  error,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen]);

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  const filteredOptions = options.filter(
    (opt) =>
      opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (opt.description && opt.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const sizeClasses = {
    sm: "py-1.5 px-3 text-xs rounded-lg",
    md: "py-2.5 px-3.5 text-xs sm:text-sm rounded-xl",
    lg: "py-3 px-4 text-sm rounded-2xl",
  };

  const variantClasses = {
    dark: "bg-slate-900 border-slate-700/80 text-slate-100 hover:border-purple-500/60 shadow-lg shadow-slate-950/40",
    glass: "bg-slate-900/80 backdrop-blur-md border-slate-700/60 text-slate-100 hover:border-purple-500/60 shadow-xl",
    light: "bg-white border-slate-200 text-slate-800 hover:border-purple-500 shadow-sm",
  };

  const handleSelect = (optionValue: string | number) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchQuery("");
  };

  return (
    <div className={`relative w-full ${className}`} ref={containerRef} dir="rtl">
      {label && (
        <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
          <span>{label}</span>
          {selectedOption?.badge && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
              {selectedOption.badge}
            </span>
          )}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between gap-2 border font-medium transition-all cursor-pointer outline-none ${
          sizeClasses[size]
        } ${variantClasses[variant]} ${
          isOpen ? "ring-2 ring-purple-500/50 border-purple-500 shadow-purple-900/20" : ""
        } ${disabled ? "opacity-50 cursor-not-allowed bg-slate-950/40 border-slate-800" : ""}`}
      >
        <div className="flex items-center gap-2.5 truncate min-w-0">
          {icon && <span className="text-purple-400 shrink-0">{icon}</span>}
          {selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
          <span className={`truncate ${!selectedOption ? "text-slate-400" : ""}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0 mr-1">
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-purple-400" : ""
            }`}
          />
        </div>
      </button>

      {error && <p className="text-[11px] font-medium text-rose-400 mt-1">{error}</p>}

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 4 }}
            exit={{ opacity: 0, scale: 0.96, y: -6 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 left-0 z-50 mt-1 w-full max-h-64 overflow-hidden rounded-2xl bg-slate-900/95 border border-slate-700/80 shadow-2xl shadow-black/80 backdrop-blur-xl flex flex-col"
          >
            {/* Search filter input if searchable and option count > 4 */}
            {searchable && options.length > 4 && (
              <div className="p-2 border-b border-slate-800 bg-slate-950/60 sticky top-0 z-10">
                <div className="relative flex items-center">
                  <Search className="w-3.5 h-3.5 absolute right-2.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="بحث في القائمة..."
                    className="w-full pr-8 pl-7 py-1.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute left-2 text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* List items container */}
            <div className="p-1.5 overflow-y-auto custom-scrollbar space-y-0.5 max-h-52">
              {filteredOptions.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 font-medium">
                  لا توجد نتائج مطابقة
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = String(opt.value) === String(value);
                  return (
                    <button
                      key={String(opt.value)}
                      type="button"
                      disabled={opt.disabled}
                      onClick={() => !opt.disabled && handleSelect(opt.value)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs text-right transition-all cursor-pointer ${
                        isSelected
                          ? "bg-gradient-to-r from-purple-900/60 to-indigo-900/40 text-purple-200 border border-purple-500/30 font-bold"
                          : "text-slate-200 hover:bg-slate-800/80 hover:text-white"
                      } ${opt.disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                    >
                      <div className="flex items-center gap-2.5 truncate min-w-0">
                        {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                        <div className="truncate">
                          <div className="truncate">{opt.label}</div>
                          {opt.description && (
                            <div className="text-[10px] text-slate-400 font-normal truncate mt-0.5">
                              {opt.description}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 mr-2">
                        {opt.badge && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                            {opt.badge}
                          </span>
                        )}
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-purple-500 text-white flex items-center justify-center shadow-sm">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Re-export ListBox as an alias for CustomSelect
export const ListBox = CustomSelect;

"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Search, ChevronDown, ChevronUp } from "lucide-react";

export interface OptionItem {
  value: string;
  display: string;
  description?: string;
  data: any;
}

interface SearchableSelectProps {
  label: string;
  value: string;
  options: OptionItem[];
  loading?: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  onSelect: (option: OptionItem) => void;
  selectName: string;
  required?: boolean;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  label,
  value,
  options,
  loading = false,
  search,
  onSearchChange,
  onSelect,
  selectName,
  required = false,
  error = "",
  placeholder = "Seleccionar...",
  disabled = false,
}) => {
  // ===== Solo un dropdown abierto =====
  const [openSelect, setOpenSelect] = useState<boolean>(false);
  
  const openDropdown = (e: React.MouseEvent) => {
    // Prevent event propagation
    e.stopPropagation();
    e.preventDefault();
    
    console.log(`DEBUG ${selectName} - openDropdown called, disabled:`, disabled, 'current openSelect:', openSelect);
    
    if (!disabled) {
      setOpenSelect((prev) => {
        console.log(`DEBUG ${selectName} - toggling from`, prev, 'to', !prev);
        return !prev;
      });
    }
  };

  // Cerrar al hacer click fuera o con Escape
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isInside = target.closest(`.searchable-select-root-${selectName}`);
      
      if (!isInside) {
        setOpenSelect(false);
      }
    };
    
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenSelect(false);
      }
    };
    
    // Solo agregar event listeners si el dropdown está abierto
    if (openSelect) {
      document.addEventListener("mousedown", onDocClick);
      document.addEventListener("keydown", onKey);
      
      return () => {
        document.removeEventListener("mousedown", onDocClick);
        document.removeEventListener("keydown", onKey);
      };
    }
    return undefined;
  }, [selectName, openSelect, disabled]);

  return (
    <div className={`space-y-2 searchable-select-root searchable-select-root-${selectName} relative`}>
      <Label>
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <div className="relative">
        <Button
          type="button"
          variant="outline"
          className={`w-full justify-between font-normal ${
            error ? "border-red-500" : ""
          }`}
          onClick={(e) => {
            openDropdown(e);
          }}
          disabled={disabled}
          data-state={openSelect ? "open" : "closed"}
        >
          <span className="truncate font-normal">{value || placeholder}</span>
          {openSelect ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>

        {openSelect && (
          <div 
            className="z-[100] w-full mt-1 bg-white border border-[#9CD2D3] rounded-lg shadow-xl max-h-60 overflow-hidden" 
            style={{
              width: '100%',
              position: 'absolute',
              top: '100%',
              left: '0',
              zIndex: 9999
            }}
          >
            <div className="p-2 border-b border-[#9CD2D3]/30 bg-gradient-to-r from-[#4F9BB6]/5 to-[#9CD2D3]/5">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-[#4F9BB6]" />
                <Input
                  placeholder={`Buscar ${label.toLowerCase()}...`}
                  value={search}
                  onChange={(e) => {
                    onSearchChange(e.target.value);
                  }}
                  className="pl-8 border-[#9CD2D3] focus:ring-[#4F9BB6] bg-white"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto bg-white">
              {(() => {
                console.log(`DEBUG SearchableSelect ${selectName} - loading:`, loading, 'options.length:', options.length, 'options:', options);
                return loading ? (
                  <div className="flex items-center justify-center p-4">
                    <Spinner size="sm" />
                    <span className="ml-2">Cargando...</span>
                  </div>
                ) : options.length > 0 ? (
                  options.map((option: OptionItem, idx: number) => (
                    <button
                      key={idx}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-[#9CD2D3]/20 focus:bg-[#9CD2D3]/20 focus:outline-none transition-colors text-[#114C5F]"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onSelect(option);
                        setOpenSelect(false); // cerrar al seleccionar
                      }}
                    >
                      <div className="text-sm font-medium">{option.display}</div>
                      {option.description && (
                        <div className="text-xs text-[#114C5F]/60 font-normal">
                          {option.description}
                        </div>
                      )}
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-gray-500 text-sm font-normal">
                    No se encontraron resultados
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
};

export default SearchableSelect;

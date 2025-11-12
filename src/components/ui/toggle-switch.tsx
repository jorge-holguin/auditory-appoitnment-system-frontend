import React from "react";
import { cn } from "@/lib/utils";

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  className = "",
  size = "md",
}) => {
  const handleClick = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  const sizeClasses = {
    sm: {
      container: "w-8 h-4",
      circle: "w-3 h-3",
      translate: "translate-x-4",
    },
    md: {
      container: "w-11 h-6",
      circle: "w-5 h-5",
      translate: "translate-x-5",
    },
    lg: {
      container: "w-14 h-7",
      circle: "w-6 h-6",
      translate: "translate-x-7",
    },
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        "relative inline-flex shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        checked ? "bg-black" : "bg-gray-200",
        disabled && "opacity-50 cursor-not-allowed",
        sizeClasses[size].container,
        className
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block rounded-full bg-white shadow-lg transform ring-0 transition duration-200 ease-in-out",
          sizeClasses[size].circle,
          checked ? sizeClasses[size].translate : "translate-x-0"
        )}
      />
    </button>
  );
};

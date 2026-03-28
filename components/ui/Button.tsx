"use client";

import { useState } from "react";
import { motion } from "framer-motion";

type Variant = "primary" | "secondary" | "ghost";

const variantStyles: Record<Variant, { base: string; hover: string }> = {
  primary: {
    base: "bg-[#7BB8D4] text-white font-medium rounded-xl relative overflow-hidden",
    hover: "hover:bg-[#5A9BB8] hover:shadow-[0_4px_20px_rgba(123,184,212,0.4)]",
  },
  secondary: {
    base: "bg-white border border-[#E8E0D5] text-[#1C1917] font-medium rounded-xl",
    hover: "hover:border-[#7BB8D4] hover:bg-[#F0F8FC]",
  },
  ghost: {
    base: "bg-transparent text-[#78716C] font-medium rounded-xl",
    hover: "hover:bg-[#F0F8FC] hover:text-[#1C1917]",
  },
};

interface ButtonProps {
  variant?: Variant;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
}

export default function Button({
  variant = "primary",
  className = "",
  children,
  disabled,
  onClick,
  type = "button",
}: ButtonProps) {
  const [hovering, setHovering] = useState(false);
  const v = variantStyles[variant];

  return (
    <motion.button
      type={type}
      whileHover={disabled ? {} : { scale: 1.015 }}
      whileTap={disabled ? {} : { scale: 0.975 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      onHoverStart={() => setHovering(true)}
      onHoverEnd={() => setHovering(false)}
      disabled={disabled}
      onClick={onClick}
      className={`
        inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm
        transition-all duration-150 ease-out
        disabled:opacity-40 disabled:cursor-not-allowed
        ${v.base} ${v.hover} ${className}
      `}
    >
      {variant === "primary" && (
        <span className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
          <motion.span
            className="absolute inset-y-0 w-1/3 skew-x-12"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)",
            }}
            initial={{ x: "-100%" }}
            animate={hovering ? { x: "300%" } : { x: "-100%" }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        </span>
      )}
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </motion.button>
  );
}

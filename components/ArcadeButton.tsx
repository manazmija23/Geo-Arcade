import React from 'react';
import { motion } from 'framer-motion';

interface ArcadeButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'cyan' | 'pink' | 'green' | 'red' | 'yellow' | 'outline';
  className?: string;
  disabled?: boolean;
}

const ArcadeButton: React.FC<ArcadeButtonProps> = ({ 
  onClick, 
  children, 
  variant = 'cyan', 
  className = '',
  disabled = false
}) => {
  const variants = {
    cyan: "bg-cyan-500 hover:bg-cyan-400 border-cyan-700 text-slate-950",
    pink: "bg-pink-500 hover:bg-pink-400 border-pink-700 text-white",
    green: "bg-emerald-500 hover:bg-emerald-400 border-emerald-700 text-white",
    red: "bg-rose-500 hover:bg-rose-400 border-rose-700 text-white",
    yellow: "bg-amber-400 hover:bg-amber-300 border-amber-600 text-slate-950",
    outline: "bg-transparent border-slate-700 text-slate-400 hover:border-cyan-500 hover:text-cyan-400"
  };

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.95, y: 2 }}
      onClick={disabled ? undefined : onClick}
      className={`
        relative px-4 py-2 sm:px-6 sm:py-3 rounded-xl border-b-4 transition-all duration-75 font-arcade text-[10px] sm:text-xs tracking-tighter
        flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]} ${className}
      `}
    >
      {children}
    </motion.button>
  );
};

export default ArcadeButton;
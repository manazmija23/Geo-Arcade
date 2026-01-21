import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Country, GameMode } from '../types.ts';
import { COLORS, MODES } from '../constants.ts';

interface CountryCardProps {
  country: Country;
  mode: GameMode;
  showValue: boolean;
  isNext?: boolean;
  status?: 'correct' | 'wrong' | null;
}

const CountryCard: React.FC<CountryCardProps> = ({ 
  country, 
  mode, 
  showValue, 
  isNext = false,
  status
}) => {
  // Determine what to show as the title: Capital name for capital mode, Country name otherwise
  const title = mode === 'capital' ? country.capital : country.name;
  
  // Logic for the value displayed in the neon text area:
  // For 'capital' and 'population' modes, we show the population count.
  const displayValue = (mode === 'capital' || mode === 'population') 
    ? country.population.toLocaleString() 
    : country[mode as keyof Country]?.toLocaleString();

  const unit = mode === 'area' ? ' km²' : mode === 'density' ? '/km²' : '';
  const subLabel = mode === 'capital' ? `Capital of ${country.name}` : country.region;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: isNext ? 100 : -100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={`
        relative flex flex-col items-center p-3 sm:p-6 rounded-2xl border-2 backdrop-blur-md transition-all duration-300 w-full
        ${status === 'correct' ? 'border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 
          status === 'wrong' ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 
          'border-slate-800 bg-slate-900/40 shadow-lg'}
      `}
    >
      <div className="relative group">
        <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full scale-0 group-hover:scale-100 transition-transform duration-500" />
        <img 
          src={country.flag} 
          alt={country.name} 
          className="relative w-24 h-14 sm:w-32 sm:h-20 object-cover rounded-lg border border-slate-700 shadow-xl"
        />
      </div>

      <h2 className="mt-2 sm:mt-4 text-base sm:text-xl font-bold text-white text-center uppercase tracking-tight line-clamp-1">
        {title}
      </h2>
      
      <p className="mt-0.5 text-[8px] sm:text-[10px] font-arcade text-slate-500 tracking-widest uppercase">
        {subLabel}
      </p>

      <div className="mt-2 sm:mt-4 h-8 sm:h-12 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {showValue ? (
            <motion.div
              key="value"
              initial={{ opacity: 0, y: 5, filter: 'blur(5px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              className="text-lg sm:text-2xl font-bold neon-text-cyan flex items-baseline gap-1 text-center"
            >
              {displayValue}
              <span className="text-[10px] sm:text-xs text-cyan-400/60 font-medium">{unit}</span>
            </motion.div>
          ) : (
            <motion.div
              key="hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xl sm:text-3xl font-arcade text-slate-700 animate-pulse"
            >
              ????
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default CountryCard;
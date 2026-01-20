
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowUp, ArrowDown, RotateCcw, Home, Trophy, 
  Settings, Play, Globe, ChevronDown, Check, X,
  Volume2, VolumeX, Sparkles, Medal, Star
} from 'lucide-react';
import { Country, GameScreen, GuessType, HighScores, GameMode } from './types';
import { BASE_TIME, MIN_TIME, REGIONS, MODES, COLORS } from './constants';
import { soundService } from './services/soundService';
import CountryCard from './components/CountryCard';
import ArcadeButton from './components/ArcadeButton';

interface BonusPopup {
  id: number;
  value: string;
}

interface BgFlag {
  id: number;
  image: string;
  size: number;
  speed: number;
  direction: 'ltr' | 'rtl';
  top: number;
  delay: number;
}

export default function App() {
  // --- Game State ---
  const [screen, setScreen] = useState<GameScreen>('landing');
  const [allCountries, setAllCountries] = useState<Country[]>([]);
  const [currentPool, setCurrentPool] = useState<Country[]>([]);
  const [current, setCurrent] = useState<Country | null>(null);
  const [next, setNext] = useState<Country | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [highScores, setHighScores] = useState<HighScores>({});
  const [timeLeft, setTimeLeft] = useState(BASE_TIME);
  const [mode, setMode] = useState<GameMode>('population');
  const [region, setRegion] = useState('World');
  const [countdown, setCountdown] = useState<number | string>(3);
  const [lastGuessResult, setLastGuessResult] = useState<'correct' | 'wrong' | null>(null);
  const [showNextValue, setShowNextValue] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [bonusPopups, setBonusPopups] = useState<BonusPopup[]>([]);
  
  // --- UI State ---
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showHighscores, setShowHighscores] = useState(false);

  // --- Background Animation State ---
  const [bgFlags, setBgFlags] = useState<BgFlag[]>([]);

  // --- Refs for Process Management ---
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const screenRef = useRef<GameScreen>('landing');
  const popupIdCounter = useRef(0);

  // Sync ref with state for use in callbacks
  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);

  // --- Initial Load ---
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("https://restcountries.com/v3.1/all?fields=name,population,flags,region,area");
        const data = await res.json();
        const cleaned: Country[] = data
          .filter((c: any) => c.population && c.flags?.png && c.name?.common && c.area)
          .map((c: any) => ({
            name: c.name.common,
            population: c.population,
            area: c.area,
            density: Math.round(c.population / c.area),
            flag: c.flags.png,
            region: c.region
          }));
        setAllCountries(cleaned);
        setCurrentPool(cleaned);

        // Generate background flags once countries are loaded
        const sizes = [20, 35, 50, 65, 80]; // 5 sizes
        const speeds = [15, 25, 35];       // 3 speeds
        const lanes = 12;                 // Number of non-overlapping vertical lanes
        
        const generated: BgFlag[] = Array.from({ length: lanes }).map((_, i) => {
          const randomCountry = cleaned[Math.floor(Math.random() * cleaned.length)];
          return {
            id: i,
            image: randomCountry.flag,
            size: sizes[Math.floor(Math.random() * sizes.length)],
            speed: speeds[Math.floor(Math.random() * speeds.length)],
            direction: i % 2 === 0 ? 'ltr' : 'rtl',
            top: (i * (100 / lanes)) + (100 / lanes / 4), // Center in lane
            delay: Math.random() * -30 // Start at random progress
          };
        });
        setBgFlags(generated);

      } catch (err) {
        console.error("API Error", err);
      }
    }
    fetchData();

    const stored = localStorage.getItem('geoArcadeHighScores');
    if (stored) setHighScores(JSON.parse(stored));
    
    return () => {
      clearAllIntervals();
    };
  }, []);

  const clearAllIntervals = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    timerRef.current = null;
    countdownIntervalRef.current = null;
    transitionTimeoutRef.current = null;
  };

  const addBonusPopup = (value: string) => {
    const id = popupIdCounter.current++;
    setBonusPopups(prev => [...prev, { id, value }]);
    setTimeout(() => {
      setBonusPopups(prev => prev.filter(p => p.id !== id));
    }, 5500);
  };

  // --- Helpers ---
  const pickCountry = useCallback((exclude?: string) => {
    if (currentPool.length < 2) return null;
    let picked;
    do {
      picked = currentPool[Math.floor(Math.random() * currentPool.length)];
    } while (picked.name === exclude);
    return picked;
  }, [currentPool]);

  const saveHighScore = (newScore: number) => {
    setHighScores(prev => {
      const key = `${region}:${mode}`;
      const currentHigh = prev[key] || 0;
      if (newScore > currentHigh) {
        const updated = { ...prev, [key]: newScore };
        localStorage.setItem('geoArcadeHighScores', JSON.stringify(updated));
        return updated;
      }
      return prev;
    });
  };

  // --- Actions ---
  const handleRegionChange = (newRegion: string) => {
    setRegion(newRegion);
    const filtered = newRegion === 'World' 
      ? allCountries 
      : allCountries.filter(c => c.region === newRegion);
    setCurrentPool(filtered);
  };

  const startNewGame = () => {
    clearAllIntervals();
    setScore(0);
    setStreak(0);
    setLastGuessResult(null);
    setShowNextValue(false);
    setIsProcessing(false);
    setBonusPopups([]);
    
    const first = pickCountry();
    const second = pickCountry(first?.name);
    if (!first || !second) return;
    setCurrent(first);
    setNext(second);

    setScreen('countdown');
    setCountdown(3);
    soundService.playCountdown(3);

    let count = 3;
    countdownIntervalRef.current = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdown(count);
        soundService.playCountdown(count);
      } else if (count === 0) {
        setCountdown('GO!');
        soundService.playCountdown('GO!');
      } else {
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        if (screenRef.current === 'countdown') {
          setScreen('playing');
          startTimeLoop();
        }
      }
    }, 800);
  };

  const startTimeLoop = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    const duration = Math.max(MIN_TIME, BASE_TIME - (score * 0.2));
    setTimeLeft(duration);
    
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0.05) {
          if (timerRef.current) clearInterval(timerRef.current);
          if (screenRef.current === 'playing') {
            gameOver();
          }
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);
  };

  const gameOver = () => {
    clearAllIntervals();
    setScreen('gameover');
    soundService.playWrong();
    saveHighScore(score);
  };

  const quitGame = () => {
    clearAllIntervals();
    setScreen('landing');
  };

  const handleGuess = (guess: GuessType) => {
    if (isProcessing || !current || !next) return;
    setIsProcessing(true);
    if (timerRef.current) clearInterval(timerRef.current);

    const isCorrect = 
      (guess === 'higher' && next[mode] >= current[mode]) ||
      (guess === 'lower' && next[mode] <= current[mode]);

    setShowNextValue(true);
    setLastGuessResult(isCorrect ? 'correct' : 'wrong');

    // Adjusted delay: Fast for Game Over (400ms), slightly slower for Next Country (1200ms)
    const delay = isCorrect ? 1200 : 400;

    transitionTimeoutRef.current = setTimeout(() => {
      if (screenRef.current !== 'playing') return;

      if (isCorrect) {
        let pointsToAdd = 1;
        const newStreak = streak + 1;

        let bonusAwarded = false;

        // Logic: +5 points for every 10th answer (10, 20, 30...), 
        // +1 point for every 5th answer that is not a 10th (5, 15, 25...)
        if (newStreak % 10 === 0) {
          pointsToAdd += 5;
          addBonusPopup("+5 BONUS");
          bonusAwarded = true;
        } else if (newStreak % 5 === 0) {
          pointsToAdd += 1;
          addBonusPopup("+1 BONUS");
          bonusAwarded = true;
        }

        if (bonusAwarded) {
          soundService.playCoin();
        } else {
          soundService.playCorrect();
        }

        setScore(s => s + pointsToAdd);
        setStreak(newStreak);
        
        const newCurrent = next;
        const newNext = pickCountry(newCurrent.name);
        if (newNext) {
          setCurrent(newCurrent);
          setNext(newNext);
          setLastGuessResult(null);
          setShowNextValue(false);
          setIsProcessing(false);
          startTimeLoop();
        }
      } else {
        gameOver();
      }
    }, delay);
  };

  const toggleSound = () => {
    const newVal = !soundEnabled;
    setSoundEnabled(newVal);
    soundService.setEnabled(newVal);
  };

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-2 sm:p-4 bg-slate-950">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-cyan-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-pink-600/10 rounded-full blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ 
          backgroundImage: `radial-gradient(circle, ${COLORS.cyan} 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }} />
      </div>

      {/* Background Flags Animation (Only for Landing Screen) */}
      <AnimatePresence>
        {screen === 'landing' && (
          <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden opacity-20">
            {bgFlags.map((flag) => (
              <motion.img
                key={flag.id}
                src={flag.image}
                alt=""
                initial={{ x: flag.direction === 'ltr' ? '-10vw' : '110vw' }}
                animate={{ x: flag.direction === 'ltr' ? '110vw' : '-10vw' }}
                transition={{
                  duration: flag.speed,
                  repeat: Infinity,
                  ease: "linear",
                  delay: flag.delay
                }}
                className="absolute object-cover rounded-sm border border-slate-800 shadow-md grayscale-[0.5]"
                style={{
                  top: `${flag.top}%`,
                  width: `${flag.size}px`,
                  aspectRatio: '3/2'
                }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Main Container: Fixed height for Tablet/Desktop to ensure centering works correctly */}
      <div className="relative z-10 w-full max-w-md flex flex-col h-[95vh] sm:h-[85vh] sm:min-h-[700px] sm:max-h-[900px] overflow-hidden">
        <AnimatePresence mode="wait">
          {screen === 'landing' && (
            <motion.div
              key="landing"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="flex-1 flex flex-col items-center justify-center gap-6 sm:gap-10 py-4"
            >
              <div className="text-center space-y-4">
                <motion.div
                  initial={{ y: -10 }}
                  animate={{ y: 0 }}
                  transition={{ repeat: Infinity, repeatType: 'reverse', duration: 2 }}
                  className="flex items-center justify-center mb-2"
                >
                   <div className="p-3 bg-cyan-500 rounded-2xl neon-border">
                      <Globe className="w-8 h-8 sm:w-10 sm:h-10 text-slate-950" />
                   </div>
                </motion.div>
                <h1 className="text-3xl sm:text-5xl font-arcade neon-text-cyan leading-tight tracking-tighter">
                  GEO<br/>ARCADE
                </h1>
                <p className="font-arcade text-[8px] sm:text-[10px] text-slate-500 tracking-[0.2em]">
                  HIGHER OR LOWER
                </p>
              </div>

              <div className="flex flex-col gap-3 w-full max-w-[280px]">
                <ArcadeButton onClick={startNewGame} className="h-14 sm:h-16 text-xs sm:text-sm">
                  <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                  START GAME
                </ArcadeButton>
                
                <div className="grid grid-cols-2 gap-2">
                  <ArcadeButton variant="outline" onClick={() => setShowHighscores(true)}>
                    <Trophy className="w-3.5 h-3.5" />
                    HIGHSCORES
                  </ArcadeButton>
                  <ArcadeButton variant="outline" onClick={() => setShowSettings(true)}>
                    <Settings className="w-3.5 h-3.5" />
                    CONFIG
                  </ArcadeButton>
                </div>
              </div>

              <div className="mt-4 sm:mt-8 flex items-center gap-6">
                <div className="text-center">
                  <p className="text-[8px] text-slate-500 font-arcade mb-1">BEST</p>
                  <p className="text-lg font-bold text-white">{highScores[`${region}:${mode}`] || 0}</p>
                </div>
                <div className="w-px h-6 bg-slate-800" />
                <div className="text-center">
                  <p className="text-[8px] text-slate-500 font-arcade mb-1">REGION</p>
                  <p className="text-xs font-bold text-cyan-400">{region.toUpperCase()}</p>
                </div>
              </div>
            </motion.div>
          )}

          {screen === 'countdown' && (
            <motion.div
              key="countdown"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex items-center justify-center"
            >
              <motion.div
                key={countdown}
                initial={{ scale: 0.5, rotate: -10, opacity: 0 }}
                animate={{ scale: 1.2, rotate: 0, opacity: 1 }}
                exit={{ scale: 2, opacity: 0 }}
                className="text-6xl sm:text-8xl font-arcade neon-text-pink text-pink-500"
              >
                {countdown}
              </motion.div>
            </motion.div>
          )}

          {screen === 'playing' && current && next && (
            <motion.div
              key="playing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col px-2 py-4 justify-center"
            >
              <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
                <AnimatePresence>
                  {bonusPopups.map((popup) => (
                    <motion.div
                      key={popup.id}
                      initial={{ opacity: 0, y: 150, x: '50%' }}
                      animate={{ opacity: 1, y: -350 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 5, ease: "easeOut" }}
                      className="absolute left-1/2 -translate-x-1/2 text-[10px] font-arcade text-amber-400 neon-text-pink whitespace-nowrap"
                    >
                      {popup.value}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              <div className="flex justify-between items-end mb-4 sm:mb-6">
                <div className="space-y-0.5 relative">
                  <p className="text-[8px] font-arcade text-slate-500 uppercase">Score</p>
                  <div className="text-2xl sm:text-3xl font-bold neon-text-cyan">{score.toString().padStart(3, '0')}</div>
                </div>
                
                <div className="flex-1 px-4 sm:px-8 mb-2 flex flex-col items-center">
                  <div className="font-arcade text-[10px] mb-1 tabular-nums neon-text-cyan">
                    {timeLeft.toFixed(2)}
                  </div>
                  <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full ${timeLeft < 3 ? 'bg-rose-500 shadow-[0_0_8px_#ef4444]' : 'bg-cyan-500 shadow-[0_0_8px_#22d3ee]'}`}
                      initial={{ width: '100%' }}
                      animate={{ width: `${(timeLeft / (Math.max(MIN_TIME, BASE_TIME - (score * 0.2)))) * 100}%` }}
                      transition={{ duration: 0.1 }}
                    />
                  </div>
                </div>

                <div className="text-right space-y-0.5">
                  <p className="text-[8px] font-arcade text-slate-500 uppercase">Streak</p>
                  <div className="text-xl sm:text-2xl font-bold text-amber-400">
                    {streak > 0 ? `🔥${streak}` : '--'}
                  </div>
                </div>
              </div>

              <div className="flex-1 flex flex-col gap-2 sm:gap-4 justify-center max-h-[600px]">
                <CountryCard 
                  country={current} 
                  mode={mode} 
                  showValue={true} 
                  status={lastGuessResult === 'correct' ? 'correct' : null}
                />

                <div className="relative h-8 sm:h-12 flex items-center justify-center">
                  <div className="absolute w-full h-px bg-slate-800" />
                  <motion.div 
                    animate={isProcessing ? { rotate: 360 } : {}}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    className="relative z-10 w-8 h-8 sm:w-10 sm:h-10 bg-slate-950 border-2 border-slate-800 rounded-full flex items-center justify-center font-arcade text-[10px] text-slate-500"
                  >
                    VS
                  </motion.div>
                </div>

                <CountryCard 
                  country={next} 
                  mode={mode} 
                  showValue={showNextValue} 
                  isNext={true}
                  status={lastGuessResult}
                />
              </div>

              <div className="mt-4 sm:mt-8 grid grid-cols-2 gap-3 sm:gap-4">
                <ArcadeButton 
                  variant="green" 
                  disabled={isProcessing}
                  onClick={() => handleGuess('higher')}
                  className="h-14 sm:h-16"
                >
                  <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5" />
                  HIGHER
                </ArcadeButton>
                <ArcadeButton 
                  variant="red" 
                  disabled={isProcessing}
                  onClick={() => handleGuess('lower')}
                  className="h-14 sm:h-16"
                >
                  <ArrowDown className="w-4 h-4 sm:w-5 sm:h-5" />
                  LOWER
                </ArcadeButton>
              </div>

              <div className="mt-4 flex justify-between items-center opacity-60">
                 <button onClick={quitGame} className="flex items-center gap-2 text-[8px] sm:text-[10px] font-arcade hover:text-white transition-colors">
                    <Home className="w-3 h-3" /> EXIT
                 </button>
                 <div className="flex items-center gap-3 text-[8px] sm:text-[10px] font-arcade text-slate-600 uppercase">
                    <span>{mode}</span>
                    <span>•</span>
                    <span>{region}</span>
                 </div>
              </div>
            </motion.div>
          )}

          {screen === 'gameover' && (
            <motion.div
              key="gameover"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex-1 flex flex-col items-center justify-center gap-6 py-6"
            >
              <div className="text-center space-y-2">
                <motion.h2 
                  animate={{ x: [-2, 2, -2, 2, 0] }}
                  transition={{ duration: 0.4 }}
                  className="text-3xl sm:text-4xl font-arcade text-rose-500 crt-flicker uppercase"
                >
                  Game Over
                </motion.h2>
                <p className="text-slate-500 text-[10px] sm:text-xs font-arcade">WELL PLAYED!</p>
              </div>

              <div className="w-full bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col items-center gap-4 sm:gap-6 shadow-2xl">
                <div className="text-center">
                  <p className="text-[8px] font-arcade text-slate-500 mb-2 uppercase">Final Score</p>
                  <div className="text-6xl sm:text-7xl font-bold neon-text-pink text-pink-500">{score}</div>
                </div>

                {score >= (highScores[`${region}:${mode}`] || 0) && score > 0 && (
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="bg-amber-400/10 border border-amber-400/50 px-3 py-1.5 rounded-full flex items-center gap-2"
                  >
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span className="text-[8px] font-arcade text-amber-400 uppercase">New Best</span>
                  </motion.div>
                )}

                <div className="w-full grid grid-cols-2 gap-2 sm:gap-4 text-center">
                  <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800/50">
                    <p className="text-[8px] font-arcade text-slate-500 mb-1 uppercase">Streak</p>
                    <p className="text-sm sm:text-lg font-bold">🔥 {streak}</p>
                  </div>
                  <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800/50">
                    <p className="text-[8px] font-arcade text-slate-500 mb-1 uppercase">Mode</p>
                    <p className="text-sm sm:text-lg font-bold uppercase">{mode.substring(0, 3)}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 w-full max-w-[240px]">
                <ArcadeButton onClick={startNewGame} variant="cyan" className="h-12 sm:h-14">
                  <RotateCcw className="w-4 h-4" />
                  RETRY
                </ArcadeButton>
                <ArcadeButton onClick={quitGame} variant="outline" className="h-12 sm:h-14">
                  <Home className="w-4 h-4" />
                  MENU
                </ArcadeButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showSettings && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
                onClick={() => setShowSettings(false)}
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                className="relative bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl p-5 sm:p-6 shadow-2xl"
              >
                <h3 className="text-base font-arcade text-cyan-400 mb-4 flex items-center gap-2">
                  <Settings className="w-4 h-4" /> CONFIG
                </h3>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[8px] font-arcade text-slate-500 uppercase">Game Mode</label>
                    <div className="flex flex-col gap-1.5">
                      {MODES.map(m => (
                        <button
                          key={m.value}
                          onClick={() => setMode(m.value)}
                          className={`
                            px-4 py-2.5 rounded-xl border flex items-center justify-between transition-all
                            ${mode === m.value ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400' : 'bg-slate-950 border-slate-800 text-slate-500'}
                          `}
                        >
                          <span className="font-bold text-xs uppercase">{m.label}</span>
                          {mode === m.value && <Check className="w-3 h-3" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[8px] font-arcade text-slate-500 uppercase">Region</label>
                    <div className="relative">
                      <select 
                        value={region} 
                        onChange={(e) => handleRegionChange(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-xl appearance-none text-xs font-bold focus:outline-none focus:border-cyan-500 transition-colors uppercase"
                      >
                        {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-600 pointer-events-none" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                    <span className="text-[8px] font-arcade text-slate-500 uppercase">Sound</span>
                    <button onClick={toggleSound} className={`p-2 rounded-lg ${soundEnabled ? 'text-cyan-400 bg-cyan-400/10' : 'text-slate-600 bg-slate-800'}`}>
                      {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="mt-6">
                  <ArcadeButton onClick={() => setShowSettings(false)} className="w-full h-12">SAVE</ArcadeButton>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showHighscores && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl"
                onClick={() => setShowHighscores(false)}
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative bg-slate-900 border-2 border-slate-700 w-full max-w-sm rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden"
              >
                {/* Visual accents */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50" />
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-pink-500 to-transparent opacity-50" />
                
                <div className="flex flex-col items-center mb-6">
                  <div className="p-3 bg-amber-400/10 rounded-2xl mb-2">
                    <Trophy className="w-8 h-8 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
                  </div>
                  <h3 className="text-xl font-arcade text-amber-400 tracking-tighter neon-text-pink uppercase">Hall of Fame</h3>
                  <p className="text-[8px] font-arcade text-slate-500 mt-2 uppercase tracking-[0.3em]">Top Results</p>
                </div>

                <div className="space-y-8 max-h-[45vh] overflow-y-auto pr-2 custom-scrollbar">
                  {MODES.map((m, mIdx) => (
                    <div key={m.value} className="space-y-3">
                      <div className="flex items-center gap-2">
                         <div className="h-px flex-1 bg-slate-800" />
                         <h4 className="text-[8px] font-arcade text-cyan-400 uppercase tracking-widest">{m.label}</h4>
                         <div className="h-px flex-1 bg-slate-800" />
                      </div>
                      <div className="space-y-1.5">
                        {REGIONS.map((r, idx) => {
                          const recordKey = `${r}:${m.value}`;
                          const recordVal = highScores[recordKey] || 0;
                          return (
                            <motion.div 
                              key={recordKey}
                              initial={{ x: -20, opacity: 0 }}
                              animate={{ x: 0, opacity: 1 }}
                              transition={{ delay: (mIdx * 0.1) + (idx * 0.03) }}
                              className="group flex items-center justify-between p-2.5 bg-slate-950/50 border border-slate-800 rounded-xl hover:border-cyan-500/50 transition-colors"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-5 h-5 rounded-md bg-slate-900 flex items-center justify-center text-[7px] font-arcade text-slate-500 group-hover:text-cyan-400 transition-colors">
                                  {idx + 1}
                                </div>
                                <span className="text-[9px] font-arcade text-slate-300 uppercase truncate max-w-[110px]">{r}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Star className={`w-2.5 h-2.5 ${recordVal > 0 ? 'text-amber-400' : 'text-slate-800'}`} />
                                <span className="text-sm font-bold font-arcade text-white">{recordVal.toString().padStart(3, '0')}</span>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8">
                  <ArcadeButton onClick={() => setShowHighscores(false)} variant="yellow" className="w-full h-14 group">
                    <div className="flex items-center gap-2">
                       <Home className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                       BACK TO MENU
                    </div>
                  </ArcadeButton>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
      
      <div className="mt-auto py-2 text-[6px] sm:text-[8px] font-arcade text-slate-800 tracking-widest uppercase opacity-40">
        Engine // Rev 2.4 Hall of Fame Update
      </div>
    </div>
  );
}

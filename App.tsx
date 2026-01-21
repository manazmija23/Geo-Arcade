
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowUp, ArrowDown, RotateCcw, Home, Trophy, 
  Settings, Play, Globe, ChevronDown, Check, X,
  Volume2, VolumeX, Sparkles, Medal, Star, Zap, Trash2
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
  const [isShaking, setIsShaking] = useState(false);
  
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

        const lanes = 15;
        const generated: BgFlag[] = Array.from({ length: lanes }).map((_, i) => {
          const randomCountry = cleaned[Math.floor(Math.random() * cleaned.length)];
          return {
            id: i,
            image: randomCountry.flag,
            size: Math.random() * 60 + 20,
            speed: Math.random() * 20 + 20,
            direction: i % 2 === 0 ? 'ltr' : 'rtl',
            top: (i * (100 / lanes)) + 2,
            delay: Math.random() * -40
          };
        });
        setBgFlags(generated);

      } catch (err) {
        console.error("API Error", err);
      }
    }
    fetchData();

    const stored = localStorage.getItem('geoArcadeHighScores');
    if (stored) {
      try {
        setHighScores(JSON.parse(stored));
      } catch (e) {
        console.error("Score parse error", e);
      }
    }
    
    return () => clearAllIntervals();
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
    }, 4000);
  };

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

  const resetHighScores = () => {
    if (confirm("ERASE ALL HIGH SCORES?")) {
      localStorage.removeItem('geoArcadeHighScores');
      setHighScores({});
    }
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
          soundService.playStart();
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
          gameOver();
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);
  };

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const gameOver = () => {
    clearAllIntervals();
    setScreen('gameover');
    soundService.playWrong();
    triggerShake();
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

    if (!isCorrect) soundService.playWrong();

    transitionTimeoutRef.current = setTimeout(() => {
      if (screenRef.current !== 'playing') return;

      if (isCorrect) {
        let pointsToAdd = 1;
        const newStreak = streak + 1;

        if (newStreak % 5 === 0) {
          pointsToAdd += 1;
          addBonusPopup("+1 COMBO!");
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
    }, isCorrect ? 1000 : 400);
  };

  return (
    <motion.div 
      animate={isShaking ? { x: [-10, 10, -8, 8, -5, 5, 0], y: [-10, 10, -8, 8, -5, 5, 0] } : {}}
      transition={{ duration: 0.4 }}
      className="min-h-screen relative flex flex-col items-center justify-center p-2 sm:p-4 bg-slate-950 crt-screen"
    >
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-cyan-600/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-pink-600/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute inset-0 opacity-[0.05]" style={{ 
          backgroundImage: `radial-gradient(circle, ${COLORS.cyan} 1px, transparent 1px)`,
          backgroundSize: '30px 30px'
        }} />
      </div>

      <AnimatePresence>
        {screen === 'landing' && (
          <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden opacity-30">
            {bgFlags.map((flag) => (
              <motion.img
                key={flag.id}
                src={flag.image}
                alt=""
                initial={{ x: flag.direction === 'ltr' ? '-15vw' : '115vw' }}
                animate={{ x: flag.direction === 'ltr' ? '115vw' : '-15vw' }}
                transition={{ duration: flag.speed, repeat: Infinity, ease: "linear", delay: flag.delay }}
                className="absolute object-cover rounded-sm border border-slate-800 shadow-md grayscale-[0.3]"
                style={{ top: `${flag.top}%`, width: `${flag.size}px`, aspectRatio: '3/2' }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      <div className="relative z-10 w-full max-w-md flex flex-col h-[98vh] sm:h-[90vh] overflow-hidden">
        <AnimatePresence mode="wait">
          {screen === 'landing' && (
            <motion.div
              key="landing"
              initial={{ opacity: 0, scale: 0.8, rotateX: 20 }}
              animate={{ opacity: 1, scale: 1, rotateX: 0 }}
              exit={{ opacity: 0, scale: 1.2 }}
              className="flex-1 flex flex-col items-center justify-center gap-8 py-4"
            >
              <div className="text-center space-y-4">
                <motion.div
                  animate={{ y: [0, -15, 0], rotate: [0, 5, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 4 }}
                  className="flex items-center justify-center mb-4"
                >
                   <div className="p-4 bg-cyan-500 rounded-3xl neon-border shadow-[0_0_30px_rgba(34,211,238,0.6)]">
                      <Globe className="w-10 h-10 sm:w-12 sm:h-12 text-slate-950" />
                   </div>
                </motion.div>
                <h1 className="text-4xl sm:text-6xl font-arcade neon-text-cyan leading-none tracking-tighter filter drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]">
                  GEO<br/>ARCADE
                </h1>
                <div className="bg-pink-500 text-white font-arcade text-[7px] sm:text-[9px] px-2 py-1 inline-block animate-bounce shadow-[0_0_10px_rgba(236,72,153,0.5)]">
                  HIGHER OR LOWER EDITION
                </div>
              </div>

              <div className="flex flex-col gap-4 w-full max-w-[300px]">
                <ArcadeButton onClick={startNewGame} className="h-16 sm:h-20 text-sm sm:text-lg neon-border">
                  <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />
                  INSERT COIN [START]
                </ArcadeButton>
                
                <div className="grid grid-cols-2 gap-3">
                  <ArcadeButton variant="outline" onClick={() => setShowHighscores(true)}>
                    <Trophy className="w-4 h-4" />
                    HALL OF FAME
                  </ArcadeButton>
                  <ArcadeButton variant="outline" onClick={() => setShowSettings(true)}>
                    <Settings className="w-4 h-4" />
                    SETTINGS
                  </ArcadeButton>
                </div>
              </div>

              <div className="mt-8 flex items-center gap-10 opacity-80">
                <div className="text-center">
                  <p className="text-[7px] text-slate-500 font-arcade mb-2">HI-SCORE</p>
                  <p className="text-xl font-bold text-amber-400 font-arcade">{highScores[`${region}:${mode}`] || 0}</p>
                </div>
                <div className="text-center">
                  <p className="text-[7px] text-slate-500 font-arcade mb-2">REGION</p>
                  <p className="text-xs font-bold text-cyan-400 font-arcade uppercase">{region}</p>
                </div>
              </div>
            </motion.div>
          )}

          {screen === 'countdown' && (
            <motion.div
              key="countdown"
              className="flex-1 flex items-center justify-center"
            >
              <motion.div
                key={countdown}
                initial={{ scale: 0, rotate: -45, opacity: 0 }}
                animate={{ scale: 1.5, rotate: 0, opacity: 1 }}
                exit={{ scale: 3, opacity: 0, filter: 'blur(10px)' }}
                className="text-7xl sm:text-9xl font-arcade neon-text-pink text-pink-500"
              >
                {countdown}
              </motion.div>
            </motion.div>
          )}

          {screen === 'playing' && current && next && (
            <motion.div
              key="playing"
              className="flex-1 flex flex-col px-4 py-4 justify-center relative"
            >
              <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
                <AnimatePresence>
                  {bonusPopups.map((popup) => (
                    <motion.div
                      key={popup.id}
                      initial={{ opacity: 0, y: 150, scale: 0.5 }}
                      animate={{ opacity: 1, y: -450, scale: 1.2, x: [0, 20, -20, 0] }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 3, ease: "easeOut" }}
                      className="absolute left-1/2 -translate-x-1/2 text-lg font-arcade text-amber-400 neon-text-pink whitespace-nowrap"
                    >
                      {popup.value}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              <div className="flex justify-between items-center mb-6 sm:mb-10 bg-slate-900/40 p-3 rounded-2xl border border-slate-800 shadow-inner">
                <div className="space-y-1">
                  <p className="text-[7px] font-arcade text-slate-500 uppercase">Current Score</p>
                  <motion.div 
                    key={score}
                    animate={{ scale: [1, 1.2, 1] }}
                    className="text-2xl sm:text-4xl font-bold neon-text-cyan tabular-nums"
                  >
                    {score.toString().padStart(4, '0')}
                  </motion.div>
                </div>
                
                <div className="flex-1 px-6 flex flex-col items-center">
                  <div className={`font-arcade text-[9px] mb-2 tabular-nums ${timeLeft < 3 ? 'text-rose-500 animate-ping' : 'text-cyan-400'}`}>
                    TIME: {timeLeft.toFixed(1)}s
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full border border-slate-800 p-0.5 shadow-[inset_0_0_10px_black]">
                    <motion.div
                      className={`h-full rounded-full ${timeLeft < 3 ? 'bg-rose-500 shadow-[0_0_12px_#ef4444]' : 'bg-cyan-500 shadow-[0_0_12px_#22d3ee]'}`}
                      initial={{ width: '100%' }}
                      animate={{ width: `${(timeLeft / (Math.max(MIN_TIME, BASE_TIME - (score * 0.2)))) * 100}%` }}
                      transition={{ duration: 0.1 }}
                    />
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <p className="text-[7px] font-arcade text-slate-500 uppercase">Streak</p>
                  <div className={`text-xl sm:text-2xl font-bold ${streak >= 5 ? 'text-amber-400 neon-text-pink' : 'text-slate-400'}`}>
                    {streak > 0 ? `🔥${streak}` : '--'}
                  </div>
                </div>
              </div>

              <div className="flex-1 flex flex-col gap-4 sm:gap-6 justify-center">
                <CountryCard 
                  country={current} 
                  mode={mode} 
                  showValue={true} 
                  status={lastGuessResult === 'correct' ? 'correct' : null}
                />

                <div className="relative h-12 sm:h-16 flex items-center justify-center">
                  <div className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-slate-800 to-transparent" />
                  <motion.div 
                    animate={isProcessing ? { rotate: 360, scale: [1, 1.3, 1] } : { scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="relative z-10 w-12 h-12 sm:w-16 sm:h-16 bg-slate-950 border-4 border-cyan-500/50 rounded-full flex items-center justify-center font-arcade text-xs text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.4)]"
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

              <div className="mt-8 grid grid-cols-2 gap-4">
                <ArcadeButton 
                  variant="green" 
                  disabled={isProcessing}
                  onClick={() => handleGuess('higher')}
                  className="h-16 sm:h-20 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                >
                  <ArrowUp className="w-6 h-6" />
                  HIGHER
                </ArcadeButton>
                <ArcadeButton 
                  variant="red" 
                  disabled={isProcessing}
                  onClick={() => handleGuess('lower')}
                  className="h-16 sm:h-20 shadow-[0_0_15px_rgba(244,63,94,0.3)]"
                >
                  <ArrowDown className="w-6 h-6" />
                  LOWER
                </ArcadeButton>
              </div>

              <div className="mt-6 flex justify-between items-center opacity-40 hover:opacity-100 transition-opacity">
                 <button onClick={quitGame} className="flex items-center gap-2 text-[7px] font-arcade hover:text-rose-500 transition-colors">
                    <Home className="w-3 h-3" /> [ESC] MENU
                 </button>
                 <div className="flex items-center gap-3 text-[7px] font-arcade text-slate-500">
                    <Zap className="w-3 h-3 fill-current" /> {mode.toUpperCase()} MODE
                 </div>
              </div>
            </motion.div>
          )}

          {screen === 'gameover' && (
            <motion.div
              key="gameover"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.5 }}
              className="flex-1 flex flex-col items-center justify-center gap-8 py-6"
            >
              <div className="text-center space-y-4">
                <motion.h2 
                  animate={{ scale: [1, 1.1, 1], rotate: [-2, 2, -2] }}
                  transition={{ duration: 0.2, repeat: Infinity }}
                  className="text-5xl sm:text-7xl font-arcade text-rose-500 crt-flicker neon-text-pink"
                >
                  GAME OVER
                </motion.h2>
                <p className="text-slate-500 text-[10px] font-arcade tracking-[0.4em]">RANK: {score < 5 ? 'NOOB' : score < 15 ? 'ROOKIE' : score < 30 ? 'VETERAN' : 'LEGEND'}</p>
              </div>

              <div className="w-full bg-slate-900/80 backdrop-blur-2xl border-2 border-slate-700 rounded-3xl p-8 flex flex-col items-center gap-8 shadow-[0_0_50px_rgba(0,0,0,0.8)]">
                <div className="text-center relative">
                  <p className="text-[8px] font-arcade text-slate-500 mb-4 uppercase">SCORE EARNED</p>
                  <div className="text-7xl sm:text-8xl font-bold neon-text-pink text-pink-500 drop-shadow-[0_0_20px_rgba(236,72,153,0.8)]">{score}</div>
                  {score >= (highScores[`${region}:${mode}`] || 0) && score > 0 && (
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity }}
                      className="absolute -top-6 -right-12 bg-amber-400 text-slate-950 font-arcade text-[8px] px-3 py-1.5 rounded-full shadow-lg rotate-12"
                    >
                      NEW BEST!
                    </motion.div>
                  )}
                </div>

                <div className="w-full grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                    <p className="text-[7px] font-arcade text-slate-500 mb-2">MAX STREAK</p>
                    <p className="text-xl font-bold font-arcade">🔥{streak}</p>
                  </div>
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                    <p className="text-[7px] font-arcade text-slate-500 mb-2">DIFFICULTY</p>
                    <p className="text-sm font-bold font-arcade text-cyan-400">HARDCORE</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 w-full max-w-[280px]">
                <ArcadeButton onClick={startNewGame} variant="cyan" className="h-16">
                  <RotateCcw className="w-5 h-5" />
                  RETRY? [YES]
                </ArcadeButton>
                <ArcadeButton onClick={quitGame} variant="outline" className="h-14">
                  <Home className="w-5 h-5" />
                  QUIT [MENU]
                </ArcadeButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Overlays (Settings & Highscores) */}
        <AnimatePresence>
          {showSettings && (
             <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setShowSettings(false)} />
               <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} className="relative bg-slate-900 border-4 border-slate-700 w-full max-w-sm rounded-[40px] p-8 shadow-2xl">
                 <div className="text-center mb-8">
                    <h3 className="text-xl font-arcade text-cyan-400 mb-2">DIP SWITCHES</h3>
                    <p className="text-[7px] font-arcade text-slate-500">SYSTEM CONFIGURATION</p>
                 </div>
                 <div className="space-y-6">
                    <div className="space-y-3">
                      <p className="text-[7px] font-arcade text-slate-500">01. GAME MODE</p>
                      <div className="grid grid-cols-1 gap-2">
                        {MODES.map(m => (
                          <button key={m.value} onClick={() => setMode(m.value)} className={`p-3 rounded-xl border-2 font-arcade text-[10px] text-left flex justify-between items-center ${mode === m.value ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.2)]' : 'bg-slate-950 border-slate-800 text-slate-600'}`}>
                            {m.label} {mode === m.value && <Zap className="w-3 h-3 fill-current" />}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <p className="text-[7px] font-arcade text-slate-500">02. REGION SELECT</p>
                      <select value={region} onChange={(e) => setRegion(e.target.value)} className="w-full bg-slate-950 border-2 border-slate-800 p-3 rounded-xl font-arcade text-[10px] text-cyan-400 focus:outline-none focus:border-cyan-500 appearance-none">
                        {REGIONS.map(r => <option key={r} value={r}>{r.toUpperCase()}</option>)}
                      </select>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <p className="text-[7px] font-arcade text-slate-500">03. AUDIO</p>
                      <button onClick={() => setSoundEnabled(!soundEnabled)} className={`p-2 rounded-lg ${soundEnabled ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                        {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                      </button>
                    </div>
                 </div>
                 <ArcadeButton onClick={() => setShowSettings(false)} variant="cyan" className="w-full h-14 mt-8">CLOSE MENU</ArcadeButton>
               </motion.div>
             </div>
          )}

          {showHighscores && (
             <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={() => setShowHighscores(false)} />
               <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} className="relative bg-slate-900 border-4 border-pink-500/50 w-full max-w-sm rounded-[40px] p-6 shadow-2xl flex flex-col max-h-[80vh]">
                 <div className="text-center mb-6">
                    <h3 className="text-xl font-arcade text-pink-500 neon-text-pink mb-2">HALL OF FAME</h3>
                    <p className="text-[7px] font-arcade text-slate-500 uppercase tracking-widest">Global Ranking Data</p>
                 </div>
                 
                 <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
                    {Object.keys(highScores).length > 0 ? (
                      Object.entries(highScores)
                        .sort((a,b) => b[1] - a[1])
                        .map(([key, value]) => {
                          const [r, m] = key.split(':');
                          return (
                            <div key={key} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                              <div className="space-y-1">
                                <p className="text-[6px] font-arcade text-cyan-400 uppercase">{r}</p>
                                <p className="text-[8px] font-bold text-slate-300 uppercase">{m}</p>
                              </div>
                              <div className="text-xl font-arcade text-amber-400 tabular-nums">
                                {value.toString().padStart(3, '0')}
                              </div>
                            </div>
                          );
                        })
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-slate-700 font-arcade text-[8px] text-center gap-4">
                        <Trophy className="w-10 h-10 opacity-10" />
                        NO RECORDS FOUND<br/>INSERT COIN TO PLAY
                      </div>
                    )}
                 </div>

                 <div className="mt-6 flex flex-col gap-2">
                    <button onClick={resetHighScores} className="flex items-center justify-center gap-2 text-[7px] font-arcade text-rose-900 hover:text-rose-500 transition-colors uppercase py-2">
                       <Trash2 size={12} /> Reset Data
                    </button>
                    <ArcadeButton onClick={() => setShowHighscores(false)} variant="pink" className="w-full h-14">BACK TO MENU</ArcadeButton>
                 </div>
               </motion.div>
             </div>
          )}
        </AnimatePresence>
      </div>
      
      <div className="mt-auto py-2 flex flex-col items-center gap-1">
        <div className="flex gap-4 opacity-30">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>
        <div className="text-[6px] font-arcade text-slate-800 tracking-widest uppercase opacity-40">
          CABINET SERIAL: GA-2025-X // REVISION 4.1 // CRT-WARP ENABLED
        </div>
      </div>
    </motion.div>
  );
}

import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Plus, Minus, Crown, Settings2 } from 'lucide-react';

export default function App() {
  // --- 状态管理 ---
  // 比分与队伍信息
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [teamA, setTeamA] = useState("TEAM BLUE");
  const [teamB, setTeamB] = useState("TEAM RED");
  
  // 计时器信息 (默认10分钟 = 600秒)
  const [defaultTime, setDefaultTime] = useState(600);
  const [timeLeft, setTimeLeft] = useState(600);
  const [isRunning, setIsRunning] = useState(false);
  
  // 动画状态
  const [animateA, setAnimateA] = useState(false);
  const [animateB, setAnimateB] = useState(false);

  // --- 计时器逻辑 ---
  useEffect(() => {
    let interval = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsRunning(false);
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  // 格式化时间 MM:SS
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // --- 操作处理 ---
  const handleScore = (team, delta) => {
    if (team === 'A') {
      setScoreA((prev) => Math.max(0, prev + delta));
      setAnimateA(true);
      setTimeout(() => setAnimateA(false), 300);
    } else {
      setScoreB((prev) => Math.max(0, prev + delta));
      setAnimateB(true);
      setTimeout(() => setAnimateB(false), 300);
    }
  };

  const adjustTime = (minutes) => {
    if (isRunning) return; // 运行中不允许调时间
    const newTime = Math.max(0, timeLeft + minutes * 60);
    setTimeLeft(newTime);
    setDefaultTime(newTime);
  };

  const resetAll = () => {
    if (window.confirm("确定要重置整场比赛吗？")) {
      setScoreA(0);
      setScoreB(0);
      setTimeLeft(defaultTime);
      setIsRunning(false);
    }
  };

  const resetTimer = () => {
    setTimeLeft(defaultTime);
    setIsRunning(false);
  };

  // 判断领先
  const isALeading = scoreA > scoreB;
  const isBLeading = scoreB > scoreA;
  const isTimeCritical = timeLeft <= 60 && timeLeft > 0;

  return (
    <div className="min-h-screen w-full bg-slate-950 text-white font-sans overflow-hidden relative flex flex-col selection:bg-cyan-900">
      {/* --- 全局自定义动画与样式 --- */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Teko:wght@500;700&display=swap');
        
        .font-teko { font-family: 'Teko', sans-serif; }
        
        /* 背景网格效果 */
        .bg-grid {
          background-size: 50px 50px;
          background-image: 
            linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
        }

        /* 霓虹发光文字 */
        .neon-text-blue {
          text-shadow: 0 0 10px rgba(6, 182, 212, 0.5), 0 0 40px rgba(6, 182, 212, 0.3), 0 0 80px rgba(6, 182, 212, 0.2);
        }
        .neon-text-red {
          text-shadow: 0 0 10px rgba(244, 63, 94, 0.5), 0 0 40px rgba(244, 63, 94, 0.3), 0 0 80px rgba(244, 63, 94, 0.2);
        }
        .neon-text-timer {
          text-shadow: 0 0 10px rgba(234, 179, 8, 0.5), 0 0 30px rgba(234, 179, 8, 0.3);
        }
        .neon-text-critical {
          text-shadow: 0 0 20px rgba(239, 68, 68, 0.8), 0 0 50px rgba(239, 68, 68, 0.6);
          animation: pulse-critical 1s infinite;
        }

        /* 比分跳动动画 */
        @keyframes pop {
          0% { transform: scale(1); }
          50% { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
        .animate-pop {
          animation: pop 0.3s ease-out forwards;
        }

        /* 紧急时刻心跳动画 */
        @keyframes pulse-critical {
          0%, 100% { transform: scale(1); color: #ef4444; }
          50% { transform: scale(1.05); color: #fca5a5; }
        }
      `}</style>

      {/* 背景层 */}
      <div className="absolute inset-0 bg-grid pointer-events-none opacity-50"></div>
      <div className="absolute top-0 left-0 w-[50vw] h-full bg-cyan-900/5 blur-[150px] pointer-events-none"></div>
      <div className="absolute top-0 right-0 w-[50vw] h-full bg-rose-900/5 blur-[150px] pointer-events-none"></div>

      {/* --- 顶部控制栏 --- */}
      <header className="relative z-10 w-full p-6 flex justify-between items-center bg-slate-900/40 backdrop-blur-md border-b border-white/10 shadow-2xl">
        <div className="flex items-center space-x-2 text-slate-400">
          <Settings2 size={24} className="animate-spin-slow" />
          <span className="tracking-widest font-bold text-xl uppercase">Cyber-Match Protocol</span>
        </div>
        <button 
          onClick={resetAll}
          className="group flex items-center space-x-2 px-5 py-2.5 bg-slate-800 hover:bg-red-900/30 text-slate-300 hover:text-red-400 rounded-lg transition-all border border-slate-700 hover:border-red-500/50"
        >
          <RotateCcw size={18} className="group-hover:-rotate-180 transition-transform duration-500" />
          <span className="font-bold tracking-wider">重置比赛</span>
        </button>
      </header>

      {/* --- 主体内容区 --- */}
      <main className="flex-1 relative z-10 flex flex-row items-center justify-center w-full px-12 pb-10">
        
        {/* === 左侧队伍 (Team A - Blue) === */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="h-16 flex items-end justify-center mb-4 transition-opacity duration-300">
             {isALeading && <Crown className="text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)] animate-bounce" size={48} />}
          </div>
          
          <input 
            type="text" 
            value={teamA}
            onChange={(e) => setTeamA(e.target.value)}
            className="bg-transparent text-center text-5xl md:text-6xl font-black tracking-widest text-white/90 focus:outline-none focus:border-b-2 focus:border-cyan-500 pb-2 mb-8 w-4/5 uppercase neon-text-blue"
            placeholder="队伍A名称"
          />
          
          <div className="relative group">
            <div className={`text-[12rem] md:text-[18rem] leading-none font-teko font-bold text-transparent bg-clip-text bg-gradient-to-b from-cyan-300 to-cyan-600 neon-text-blue transition-transform ${animateA ? 'animate-pop' : ''}`}>
              {scoreA}
            </div>
            {/* 隐藏的快捷操作遮罩 (方便在大屏点击数字两侧) */}
            <div className="absolute inset-0 flex">
              <div className="w-1/2 cursor-pointer" onClick={() => handleScore('A', -1)}></div>
              <div className="w-1/2 cursor-pointer" onClick={() => handleScore('A', 1)}></div>
            </div>
          </div>

          <div className="flex space-x-6 mt-12">
            <button 
              onClick={() => handleScore('A', -1)}
              className="w-20 h-20 flex items-center justify-center bg-slate-800/80 hover:bg-slate-700 text-cyan-500 rounded-2xl border-2 border-cyan-900/50 hover:border-cyan-500 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all active:scale-95"
            >
              <Minus size={40} />
            </button>
            <button 
              onClick={() => handleScore('A', 1)}
              className="w-24 h-24 flex items-center justify-center bg-cyan-600/20 hover:bg-cyan-500/30 text-cyan-400 rounded-2xl border-2 border-cyan-500 hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] transition-all active:scale-95"
            >
              <Plus size={56} />
            </button>
          </div>
        </div>


        {/* === 中间计时区 === */}
        <div className="w-1/4 min-w-[350px] flex flex-col items-center justify-center px-4">
          
          <div className="bg-slate-900/80 backdrop-blur-xl p-8 rounded-3xl border border-white/5 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col items-center w-full">
            <div className="text-slate-400 tracking-[0.3em] font-bold mb-4 uppercase text-sm">Match Time</div>
            
            <div className="flex items-center space-x-4 mb-8">
              {!isRunning && (
                <button onClick={() => adjustTime(-1)} className="text-slate-500 hover:text-white transition p-2 bg-slate-800 rounded-lg active:scale-95">
                  <Minus size={20} />
                </button>
              )}
              
              <div className={`text-7xl md:text-8xl font-teko font-bold tracking-wider tabular-nums 
                  ${isTimeCritical ? 'neon-text-critical' : 'text-yellow-400 neon-text-timer'}`}>
                {formatTime(timeLeft)}
              </div>

              {!isRunning && (
                <button onClick={() => adjustTime(1)} className="text-slate-500 hover:text-white transition p-2 bg-slate-800 rounded-lg active:scale-95">
                  <Plus size={20} />
                </button>
              )}
            </div>

            <div className="flex space-x-4 w-full">
              <button 
                onClick={() => setIsRunning(!isRunning)}
                disabled={timeLeft === 0}
                className={`flex-1 py-4 flex justify-center items-center rounded-xl font-bold text-xl transition-all shadow-lg active:scale-95
                  ${timeLeft === 0 ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 
                    isRunning 
                      ? 'bg-amber-600/20 text-amber-500 border border-amber-600 hover:bg-amber-600/30' 
                      : 'bg-green-600/20 text-green-400 border border-green-600 hover:bg-green-600/30 hover:shadow-[0_0_20px_rgba(34,197,94,0.4)]'
                  }`}
              >
                {isRunning ? <Pause className="mr-2" /> : <Play className="mr-2" />}
                {isRunning ? '暂停' : '开始'}
              </button>
              
              <button 
                onClick={resetTimer}
                className="px-6 py-4 bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-xl transition-all active:scale-95 border border-transparent hover:border-slate-500"
                title="重置时间"
              >
                <RotateCcw size={24} />
              </button>
            </div>
          </div>
          
          {timeLeft === 0 && !isRunning && (
            <div className="mt-8 animate-pulse text-2xl font-bold tracking-widest text-red-500 uppercase neon-text-critical">
              TIME OVER
            </div>
          )}

        </div>


        {/* === 右侧队伍 (Team B - Red) === */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="h-16 flex items-end justify-center mb-4 transition-opacity duration-300">
             {isBLeading && <Crown className="text-rose-400 drop-shadow-[0_0_15px_rgba(244,63,94,0.8)] animate-bounce" size={48} />}
          </div>
          
          <input 
            type="text" 
            value={teamB}
            onChange={(e) => setTeamB(e.target.value)}
            className="bg-transparent text-center text-5xl md:text-6xl font-black tracking-widest text-white/90 focus:outline-none focus:border-b-2 focus:border-rose-500 pb-2 mb-8 w-4/5 uppercase neon-text-red"
            placeholder="队伍B名称"
          />
          
          <div className="relative group">
             <div className={`text-[12rem] md:text-[18rem] leading-none font-teko font-bold text-transparent bg-clip-text bg-gradient-to-b from-rose-300 to-rose-600 neon-text-red transition-transform ${animateB ? 'animate-pop' : ''}`}>
              {scoreB}
            </div>
            {/* 隐藏的快捷操作遮罩 */}
            <div className="absolute inset-0 flex">
              <div className="w-1/2 cursor-pointer" onClick={() => handleScore('B', -1)}></div>
              <div className="w-1/2 cursor-pointer" onClick={() => handleScore('B', 1)}></div>
            </div>
          </div>

          <div className="flex space-x-6 mt-12">
            <button 
              onClick={() => handleScore('B', 1)}
              className="w-24 h-24 flex items-center justify-center bg-rose-600/20 hover:bg-rose-500/30 text-rose-400 rounded-2xl border-2 border-rose-500 hover:shadow-[0_0_30px_rgba(244,63,94,0.6)] transition-all active:scale-95"
            >
              <Plus size={56} />
            </button>
            <button 
              onClick={() => handleScore('B', -1)}
              className="w-20 h-20 flex items-center justify-center bg-slate-800/80 hover:bg-slate-700 text-rose-500 rounded-2xl border-2 border-rose-900/50 hover:border-rose-500 hover:shadow-[0_0_20px_rgba(244,63,94,0.4)] transition-all active:scale-95"
            >
              <Minus size={40} />
            </button>
          </div>
        </div>

      </main>
    </div>
  );
}
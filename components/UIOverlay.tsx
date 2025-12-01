
import React, { useMemo } from 'react';
import { GameState, GameStats, Player, WeaponType, UpgradeOption, UpgradeType, PlayerStats } from '../types';
import { WEAPON_DEFINITIONS, COLORS, BOOK_QUOTES, LIBRARY } from '../constants';
import { audioService } from '../services/audioService';

interface UIOverlayProps {
  gameState: GameState;
  stats: GameStats;
  player: Player;
  onStartGameSelect: () => void; // Go to Game Select
  onStartGame: (bookId: string) => void; // Start actual game with book ID
  onSelectUpgrade: (option: UpgradeOption) => void;
  onRestart: () => void;
  onResume: () => void;
  onReadNovel: () => void;
  selectedBookId: string | null;
}

export const UIOverlay: React.FC<UIOverlayProps> = ({
  gameState, stats, player, onStartGameSelect, onStartGame, onSelectUpgrade, onRestart, onResume, onReadNovel, selectedBookId
}) => {
  const hpPercent = Math.max(0, (player.hp / player.stats.maxHp) * 100);
  const expPercent = Math.max(0, (player.exp / player.nextLevelExp) * 100);
  const isDefaultGame = !selectedBookId || selectedBookId === 'ningen';

  const upgradeOptions = useMemo(() => {
    if (gameState !== GameState.LEVEL_UP || !isDefaultGame) return [];
    
    const options: UpgradeOption[] = [];
    const types: ('WEAPON' | 'STAT')[] = ['WEAPON', 'STAT', 'STAT'];
    if (Math.random() > 0.5) types[0] = 'STAT';

    types.forEach(t => {
      if (t === 'WEAPON') {
         const wKeys = Object.values(WeaponType);
         const wType = wKeys[Math.floor(Math.random() * wKeys.length)];
         const def = WEAPON_DEFINITIONS[wType];
         options.push({
           type: UpgradeType.WEAPON,
           weaponType: wType,
           name: def.name,
           description: def.description,
           rarity: 'COMMON'
         });
      } else {
         const statKeys: (keyof PlayerStats)[] = ['meleeDamage', 'rangedDamage', 'attackSpeed', 'maxHp', 'armor', 'speed', 'hpRegen'];
         const key = statKeys[Math.floor(Math.random() * statKeys.length)];
         let val = 0;
         let name = "";
         let desc = "";
         
         switch(key) {
           case 'meleeDamage': val=2; name="筋力"; desc="近接ダメージ +2"; break;
           case 'rangedDamage': val=2; name="技術"; desc="遠距離ダメージ +2"; break;
           case 'attackSpeed': val=10; name="狂気"; desc="攻撃速度 +10%"; break;
           case 'maxHp': val=5; name="生命"; desc="最大HP +5"; break;
           case 'armor': val=1; name="外套"; desc="被ダメージ -1"; break;
           case 'speed': val=0.3; name="逃走"; desc="移動速度 +0.3"; break;
           case 'hpRegen': val=1; name="休息"; desc="HP再生 +1/5s"; break;
         }
         
         options.push({
           type: UpgradeType.STAT,
           statKey: key,
           value: val,
           name, description: desc,
           rarity: Math.random() > 0.8 ? 'RARE' : 'COMMON'
         });
      }
    });
    return options.slice(0, 3);
  }, [gameState, player.level, isDefaultGame]);

  const currentQuote = useMemo(() => {
     const quotes = selectedBookId ? BOOK_QUOTES[selectedBookId] : BOOK_QUOTES['ningen'];
     const q = quotes || BOOK_QUOTES['ningen'];
     if (stats.wave <= 3) return q[0] || q[q.length-1];
     if (stats.wave <= 6) return q[1] || q[q.length-1];
     if (stats.wave <= 9) return q[2] || q[q.length-1];
     return q[q.length-1];
  }, [stats.wave, selectedBookId]);

  const handleDodgeTouch = (e: React.TouchEvent | React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
  };

  const StatRow = ({ label, val, unit = '' }: { label: string, val: number, unit?: string }) => (
    <div className="flex justify-between text-[10px] text-gray-400 font-serif">
      <span>{label}</span>
      <span className="text-gray-200">{val > 0 ? '+' : ''}{val}{unit}</span>
    </div>
  );

  // --- MENU Screen (Tosho Yugijo) ---
  if (gameState === GameState.MENU) {
    return (
      <div className="absolute inset-0 bg-black flex items-center justify-center z-50 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')]"></div>
        <div className="flex flex-row-reverse items-start gap-8 md:gap-16">
            <div className="writing-vertical-rl text-5xl md:text-7xl font-serif text-gray-200 tracking-widest border-l-4 border-red-900 pl-8 py-4">
              図書遊戯場
            </div>
            <div className="flex flex-col justify-end h-96 pb-8 gap-12">
                 <p className="writing-vertical-rl text-gray-600 font-serif text-sm tracking-widest ml-4">
                    文学に潜り、其の世界を体験せよ。
                 </p>
                 <div className="flex gap-8">
                    <button 
                        onClick={() => { audioService.toggle(true); onStartGameSelect(); }}
                        className="writing-vertical-rl text-xl text-red-900 font-serif hover:text-red-500 transition-colors tracking-[0.5em] border-r border-gray-800 pr-4 h-32"
                    >
                        遊戯
                    </button>
                    <button 
                        onClick={() => { onReadNovel(); }}
                        className="writing-vertical-rl text-xl text-gray-500 font-serif hover:text-gray-300 transition-colors tracking-[0.5em] border-r border-gray-800 pr-4 h-32"
                    >
                        読書
                    </button>
                 </div>
            </div>
        </div>
      </div>
    );
  }

  // --- GAME SELECT Screen ---
  if (gameState === GameState.GAME_SELECT) {
    return (
        <div className="absolute inset-0 bg-[#1c1917] flex flex-col items-center justify-center z-50 text-white font-serif overflow-hidden">
             <h2 className="text-2xl mb-12 tracking-[1em] text-gray-400 border-b border-gray-700 pb-4">遊戯選択</h2>
             
             <div className="flex gap-6 md:gap-12 flex-wrap justify-center px-8 z-10">
                {LIBRARY.map((book) => (
                    <button 
                        key={book.id}
                        onClick={() => { audioService.playExp(); onStartGame(book.id); }}
                        className="group relative w-32 md:w-40 h-56 bg-neutral-900 shadow-2xl hover:scale-105 transition-all duration-300 flex flex-col items-center justify-center p-4 border border-gray-800"
                    >
                        {/* Book Spine / Cover visualization */}
                        <div className="absolute inset-0 opacity-50 transition-opacity group-hover:opacity-80" style={{ backgroundColor: book.color }}></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                        
                        <div className="writing-vertical-rl text-white font-serif text-lg md:text-xl tracking-widest font-bold z-10 drop-shadow-lg">
                            {book.title}
                        </div>
                        
                        <div className="absolute bottom-4 text-[10px] text-gray-300 z-10 font-sans opacity-0 group-hover:opacity-100 transition-opacity">
                           潜る
                        </div>
                    </button>
                ))}
            </div>

            <button 
                onClick={() => window.location.reload()} // Quick way back to menu state reset
                className="mt-16 text-gray-500 hover:text-white transition-colors tracking-widest text-sm z-10"
            >
                戻る
            </button>
        </div>
    );
  }

  // --- PLAYING / HUD ---
  if (gameState === GameState.PLAYING || gameState === GameState.LEVEL_UP || gameState === GameState.VICTORY) {
    return (
      <>
        {stats.bossHp !== undefined && stats.bossMaxHp && (
          <div className="absolute top-12 left-1/2 -translate-x-1/2 w-3/4 h-2 z-20 pointer-events-none">
             <div className="w-full h-full bg-red-950/50 border border-red-900 relative">
               <div className="h-full bg-red-800 transition-all duration-300 ease-out opacity-80" style={{ width: `${(stats.bossHp / stats.bossMaxHp) * 100}%` }} />
             </div>
             <p className="text-center text-red-700 text-xs font-serif mt-1 tracking-widest">
                 {selectedBookId === 'social_contract' ? '専制君主' : '世間'}
             </p>
          </div>
        )}

        {isDefaultGame && (
         <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start pointer-events-none text-white font-serif text-xs z-10 opacity-80 mix-blend-screen">
          <div className="flex flex-col gap-2 w-1/3">
            <div className="flex items-center gap-2">
              <span className="text-red-800">命</span>
              <div className="w-24 h-1 bg-gray-900 relative">
                <div className="h-full bg-red-700" style={{ width: `${hpPercent}%` }} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">業</span>
              <div className="w-24 h-1 bg-gray-900 relative">
                <div className="h-full bg-gray-400" style={{ width: `${expPercent}%` }} />
              </div>
            </div>
          </div>

          <div className="text-center w-1/3">
            <div className="text-gray-400 text-lg tracking-[0.5em]">第{stats.wave}章</div>
          </div>

          <div className="w-1/3 flex flex-col items-end gap-1">
            <div className="flex gap-1 flex-wrap justify-end max-w-[200px] opacity-70">
               {player.weapons.map((w, i) => (
                 <div key={i} className="w-6 h-6 border border-gray-800 bg-black flex items-center justify-center text-[10px] relative text-gray-400">
                    {w.type === WeaponType.PEN ? '筆' : w.type === WeaponType.BOTTLE ? '酒' : w.type === WeaponType.KATANA ? '刀' : '書'}
                 </div>
               ))}
            </div>
          </div>
         </div>
        )}
        
        {!isDefaultGame && (
             <div className="absolute top-4 left-4 text-white font-serif z-10 pointer-events-none">
                 <p className="text-xl tracking-widest">{selectedBookId === 'lemon' ? '得点' : '団結'}: {stats.score}</p>
             </div>
        )}

        {isDefaultGame && (
        <div className="absolute top-24 left-4 w-32 bg-transparent p-2 pointer-events-none hidden md:block opacity-60">
           <div className="flex flex-col gap-1 border-l border-gray-800 pl-2">
             <StatRow label="筋力" val={player.stats.meleeDamage} />
             <StatRow label="技術" val={player.stats.rangedDamage} />
             <StatRow label="速度" val={player.stats.attackSpeed} unit="%" />
             <StatRow label="敏捷" val={Math.round((player.stats.speed - 2.5)*10)} />
           </div>
        </div>
        )}
        
        {/* Mobile Dodge Button (Only for Ningen) */}
        {isDefaultGame && (
        <div 
            className="absolute bottom-8 right-8 w-20 h-20 rounded-full bg-red-900/30 border border-red-800 flex items-center justify-center pointer-events-auto active:bg-red-900/60 transition-colors z-30 touch-manipulation md:hidden"
            onTouchStart={handleDodgeTouch}
            onMouseDown={handleDodgeTouch}
        >
            <span className="text-red-500 text-xs font-serif tracking-widest pointer-events-none">回避</span>
        </div>
        )}
        
        {/* Mobile Action Button (For Lemon) */}
        {selectedBookId === 'lemon' && (
         <div 
            className="absolute bottom-8 right-8 w-20 h-20 rounded-full bg-yellow-900/30 border border-yellow-800 flex items-center justify-center pointer-events-auto active:bg-yellow-900/60 transition-colors z-30 touch-manipulation md:hidden"
            onTouchStart={handleDodgeTouch} // Reusing space key trigger
            onMouseDown={handleDodgeTouch}
        >
            <span className="text-yellow-500 text-xs font-serif tracking-widest pointer-events-none">設置</span>
        </div>
        )}

        {gameState === GameState.LEVEL_UP && isDefaultGame && (
          <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-50 animate-in fade-in duration-500 pointer-events-auto">
            <h2 className="text-gray-300 font-serif text-2xl mb-8 tracking-[0.5em] border-b border-gray-800 pb-2">資材調達</h2>
            <div className="flex flex-col md:flex-row gap-6 p-4 w-full max-w-4xl justify-center items-center">
              {upgradeOptions.map((opt, idx) => (
                   <button 
                    key={idx}
                    onClick={() => { audioService.playExp(); onSelectUpgrade(opt); }}
                    className={`w-full max-w-[250px] md:w-56 h-64 md:h-72 bg-neutral-950 border transition-all duration-500 flex flex-col items-center p-6 text-center group relative hover:bg-neutral-900
                      ${opt.rarity === 'RARE' ? 'border-yellow-900/50' : 'border-gray-800 hover:border-gray-600'}
                    `}
                   >
                     <div className="writing-vertical-rl text-lg font-serif text-gray-500 h-full absolute left-4 top-4 pointer-events-none opacity-30">
                        {opt.type === 'WEAPON' ? '武器' : '能力'}
                     </div>
                     <div className="my-auto relative z-10">
                        <div className="text-4xl mb-6 opacity-80 grayscale group-hover:grayscale-0 transition-all duration-500">
                            {opt.weaponType === WeaponType.PEN ? '✒️' : 
                             opt.weaponType === WeaponType.BOTTLE ? '🍶' : 
                             opt.weaponType ? '⚔️' : '☤'}
                        </div>
                        <h3 className={`font-serif text-lg mb-4 tracking-widest ${opt.rarity === 'RARE' ? 'text-yellow-700' : 'text-gray-300'}`}>
                            {opt.name}
                        </h3>
                        <p className="text-xs text-gray-500 font-serif leading-loose">{opt.description}</p>
                     </div>
                   </button>
              ))}
            </div>
          </div>
        )}
        
        {gameState === GameState.VICTORY && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50 text-white animate-in zoom-in duration-500">
                <h2 className="text-4xl font-serif text-yellow-500 tracking-[1em] mb-4">大願成就</h2>
                 <p className="text-gray-400 font-serif tracking-widest mb-12">
                     {selectedBookId === 'lemon' ? '不吉な塊は粉砕された' : '自由は勝ち取られた'}
                 </p>
                <button onClick={onRestart} className="border-b border-gray-500 pb-1 text-gray-300 hover:text-white">帰還</button>
            </div>
        )}
      </>
    );
  }

  if (gameState === GameState.WAVE_CLEARED) {
      return (
        <div className="absolute inset-0 bg-black flex flex-col items-center justify-center z-50 animate-in fade-in duration-1000">
           <div className="flex flex-row-reverse gap-12 h-2/3 items-start justify-center opacity-90 p-8">
             <div className="writing-vertical-rl text-red-900 font-serif text-2xl md:text-3xl tracking-[0.2em] border-l border-red-950 pl-6 h-full">
                {currentQuote.chapter}
             </div>
             <div className="writing-vertical-rl text-gray-300 font-serif text-base md:text-lg leading-loose tracking-widest h-full whitespace-pre-line fade-in-delay">
                {currentQuote.text}
             </div>
           </div>
           
           <button 
             onClick={onResume}
             className="absolute bottom-12 left-1/2 -translate-x-1/2 text-gray-500 font-serif text-sm tracking-widest hover:text-red-900 transition-colors duration-700 p-4"
           >
             ページを捲る
           </button>
        </div>
      )
  }

  if (gameState === GameState.GAME_OVER) {
    return (
      <div className="absolute inset-0 bg-black flex flex-col items-center justify-center z-50 text-white">
        <div className="flex flex-row-reverse gap-4 mb-12">
            <h2 className="writing-vertical-rl text-6xl font-serif text-red-900 tracking-widest">
                {selectedBookId === 'lemon' ? '爆死' : selectedBookId === 'social_contract' ? '服従' : '人間'}
            </h2>
            <h2 className="writing-vertical-rl text-6xl font-serif text-gray-200 tracking-widest">
                {selectedBookId === 'lemon' ? '' : selectedBookId === 'social_contract' ? '' : '失格'}
            </h2>
        </div>
        <div className="text-center font-serif">
          {isDefaultGame && <p className="mb-8 text-gray-600 text-sm tracking-widest">第 {stats.wave} 章ニテ、断筆</p>}
          <button 
            onClick={onRestart}
            className="text-gray-400 hover:text-white transition-colors tracking-widest text-lg border-b border-gray-800 pb-1"
          >
            転生
          </button>
        </div>
      </div>
    );
  }

  if (gameState === GameState.PAUSED) {
    return (
      <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-50 text-white">
        <h2 className="text-2xl font-serif mb-12 text-gray-500 tracking-[1em]">思案</h2>
        <button onClick={onResume} className="mb-8 text-gray-300 hover:text-white font-serif tracking-widest">再開</button>
        <button onClick={onRestart} className="text-xs text-red-900 hover:text-red-700 font-serif">破り捨てる</button>
      </div>
    );
  }

  return null;
};

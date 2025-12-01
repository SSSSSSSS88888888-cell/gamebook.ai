
import React, { useMemo, useState, useEffect } from 'react';
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

// Tutorial content for each game
const TUTORIALS: Record<string, { title: string; controls: { key: string; action: string }[]; tips: string[] }> = {
  ningen: {
    title: '人間失格',
    controls: [
      { key: 'WASD / 矢印', action: '移動' },
      { key: 'マウス', action: '攻撃方向' },
      { key: 'クリック', action: '攻撃' },
      { key: 'SPACE', action: '回避（ダッシュ）' },
      { key: 'ESC', action: 'ポーズ' }
    ],
    tips: [
      '敵を倒してEXPを集めレベルアップ！',
      '新しい武器やスキルを選択して強化',
      'Wave 10ごとにボス出現'
    ]
  },
  lemon: {
    title: '檸檬',
    controls: [
      { key: '← →', action: '本を左右に移動' },
      { key: 'SPACE / ↓', action: '本を落とす' },
      { key: 'クリック', action: '檸檬を置く' }
    ],
    tips: [
      '本を積み上げてタワーを作れ！',
      '最後に檸檬を頂上に置いて爆破',
      '高く積むほど高スコア'
    ]
  },
  social_contract: {
    title: '社会契約論',
    controls: [
      { key: 'クリック', action: '市民を移動' },
      { key: 'ドラッグ', action: '範囲選択' }
    ],
    tips: [
      '市民を集結させて「一般意志」を高めろ！',
      'CONTRACT状態でダメージ最大',
      '王の攻撃から市民を守れ'
    ]
  }
};

export const UIOverlay: React.FC<UIOverlayProps> = ({
  gameState, stats, player, onStartGameSelect, onStartGame, onSelectUpgrade, onRestart, onResume, onReadNovel, selectedBookId
}) => {
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialDismissed, setTutorialDismissed] = useState<Record<string, boolean>>({});

  // Show tutorial on first play of each game
  useEffect(() => {
    if (gameState === GameState.PLAYING && selectedBookId && stats.wave === 1 && stats.timeElapsed > 40) {
      const key = selectedBookId || 'ningen';
      if (!tutorialDismissed[key]) {
        setShowTutorial(true);
      }
    }
  }, [gameState, selectedBookId, stats.wave, stats.timeElapsed, tutorialDismissed]);

  const dismissTutorial = () => {
    const key = selectedBookId || 'ningen';
    setTutorialDismissed(prev => ({ ...prev, [key]: true }));
    setShowTutorial(false);
  };
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
    <div className="flex justify-between text-[10px] text-[#00f5ff] font-pixel">
      <span>{label}</span>
      <span className="text-[#ffea00]">{val > 0 ? '+' : ''}{val}{unit}</span>
    </div>
  );

  // --- MENU Screen (80s Retro Style) ---
  if (gameState === GameState.MENU) {
    return (
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a2e] via-[#1a0a3e] to-[#0a0a1a] flex flex-col items-center justify-center z-50 text-white overflow-hidden crt-effect">
        {/* Animated Grid Background */}
        <div className="absolute inset-0 retro-grid"></div>

        {/* Floating Stars */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="pixel-star"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1.5 + Math.random() * 2}s`
              }}
            />
          ))}
        </div>

        {/* Main Title */}
        <div className="relative z-10 text-center mb-8">
          <h1 className="font-pixel text-3xl md:text-5xl mb-2 chromatic-aberration neon-cyan-glow tracking-wider">
            GameBook
          </h1>
          <div className="font-pixel text-xl md:text-2xl">
            <span className="text-[#ff2d95] neon-pink-glow">.</span>
            <span className="text-[#00f5ff] neon-cyan-glow">a</span>
            <span className="text-[#ffea00] neon-yellow-glow">i</span>
          </div>
        </div>

        {/* Subtitle */}
        <p className="font-pixel text-[10px] md:text-xs text-[#39ff14] mb-4 text-center px-4 neon-text" style={{ color: '#39ff14' }}>
          ★ LITERATURE ADVENTURE RPG ★
        </p>
        <p className="font-pixel text-xs md:text-sm text-[#ff2d95] mb-10 text-center px-4 neon-pink-glow float">
          文学の世界へダイブせよ！
        </p>

        {/* Menu Buttons */}
        <div className="flex flex-col gap-6 z-10">
          <button
            onClick={() => { audioService.toggle(true); onStartGameSelect(); }}
            className="pixel-btn neon-cyan-glow text-sm md:text-base px-8 py-4 hover:scale-105 transition-transform"
            style={{
              background: 'linear-gradient(180deg, #00f5ff33 0%, #00f5ff11 100%)',
              border: '3px solid #00f5ff'
            }}
          >
            <span className="blink mr-2">▶</span> GAME START
          </button>

          <button
            onClick={() => { onReadNovel(); }}
            className="pixel-btn neon-yellow-glow text-sm md:text-base px-8 py-4 hover:scale-105 transition-transform"
            style={{
              background: 'linear-gradient(180deg, #ffea0033 0%, #ffea0011 100%)',
              border: '3px solid #ffea00'
            }}
          >
            <span className="mr-2">📖</span> READ NOVEL
          </button>
        </div>

        {/* Decorative Elements */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center z-10">
          <p className="font-pixel text-[10px] text-gray-400 mb-2 blink">
            - PRESS START -
          </p>
          <p className="font-pixel text-[8px] text-gray-600">
            © 2024 GameBook.ai
          </p>
        </div>

        {/* Corner Decorations */}
        <div className="absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 border-[#ff2d95]"></div>
        <div className="absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 border-[#00f5ff]"></div>
        <div className="absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 border-[#00f5ff]"></div>
        <div className="absolute bottom-4 right-4 w-8 h-8 border-b-4 border-r-4 border-[#ff2d95]"></div>
      </div>
    );
  }

  // --- GAME SELECT Screen (80s Retro Style) ---
  if (gameState === GameState.GAME_SELECT) {
    const bookColors: Record<string, string> = {
      'ningen': '#ff2d95',
      'lemon': '#ffea00',
      'social_contract': '#00f5ff'
    };

    return (
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a2e] via-[#1a0a3e] to-[#0a0a1a] flex flex-col items-center justify-center z-50 text-white overflow-hidden crt-effect">
             {/* Animated Grid Background */}
             <div className="absolute inset-0 retro-grid"></div>

             {/* Floating Stars */}
             <div className="absolute inset-0 pointer-events-none overflow-hidden">
               {[...Array(15)].map((_, i) => (
                 <div
                   key={i}
                   className="pixel-star"
                   style={{
                     left: `${Math.random() * 100}%`,
                     top: `${Math.random() * 100}%`,
                     animationDelay: `${Math.random() * 2}s`,
                     animationDuration: `${1.5 + Math.random() * 2}s`
                   }}
                 />
               ))}
             </div>

             {/* Title */}
             <div className="text-center z-10 mb-6">
               <h2 className="font-pixel text-xl md:text-3xl mb-3 neon-cyan-glow tracking-wider">
                 SELECT BOOK
               </h2>
               <div className="flex items-center justify-center gap-2">
                 <span className="font-pixel text-[#ffea00] text-lg">▼</span>
                 <p className="font-pixel text-sm text-[#ff2d95] neon-pink-glow">
                   冒険する本を選べ！
                 </p>
                 <span className="font-pixel text-[#ffea00] text-lg">▼</span>
               </div>
             </div>

             {/* Book Selection Grid */}
             <div className="flex gap-4 md:gap-8 flex-wrap justify-center px-4 z-10">
                {LIBRARY.map((book, index) => {
                    const neonColor = bookColors[book.id] || '#00f5ff';
                    return (
                      <button
                          key={book.id}
                          onClick={() => { audioService.playExp(); onStartGame(book.id); }}
                          className="book-card group relative w-28 md:w-36 h-44 md:h-56 flex flex-col items-center justify-center p-3 transition-all duration-300"
                          style={{
                            background: `linear-gradient(180deg, ${neonColor}22 0%, ${neonColor}08 100%)`,
                            border: `3px solid ${neonColor}`,
                            boxShadow: `0 0 15px ${neonColor}55, inset 0 0 20px ${neonColor}11`
                          }}
                      >
                          {/* Pixel Art Book Icon */}
                          <div
                            className="w-12 h-16 md:w-16 md:h-20 mb-3 relative"
                            style={{
                              background: `linear-gradient(135deg, ${neonColor} 0%, ${neonColor}88 100%)`,
                              boxShadow: `4px 4px 0 rgba(0,0,0,0.5)`,
                              imageRendering: 'pixelated'
                            }}
                          >
                            {/* Book spine detail */}
                            <div
                              className="absolute left-0 top-0 w-2 h-full"
                              style={{ background: `${neonColor}44` }}
                            />
                            {/* Book lines */}
                            <div className="absolute inset-2 flex flex-col justify-center gap-1">
                              <div className="h-1 bg-black/30"></div>
                              <div className="h-1 bg-black/30 w-3/4"></div>
                              <div className="h-1 bg-black/30"></div>
                            </div>
                          </div>

                          {/* Book Title */}
                          <div
                            className="font-pixel text-[10px] md:text-xs text-center leading-relaxed z-10 neon-text"
                            style={{ color: neonColor }}
                          >
                            {book.title}
                          </div>

                          {/* Hover Instruction */}
                          <div
                            className="absolute bottom-2 font-pixel text-[8px] opacity-0 group-hover:opacity-100 transition-opacity blink"
                            style={{ color: neonColor }}
                          >
                            ▶ ENTER
                          </div>

                          {/* Corner Accents */}
                          <div className="absolute top-1 left-1 w-2 h-2 border-t border-l" style={{ borderColor: neonColor }}></div>
                          <div className="absolute top-1 right-1 w-2 h-2 border-t border-r" style={{ borderColor: neonColor }}></div>
                          <div className="absolute bottom-1 left-1 w-2 h-2 border-b border-l" style={{ borderColor: neonColor }}></div>
                          <div className="absolute bottom-1 right-1 w-2 h-2 border-b border-r" style={{ borderColor: neonColor }}></div>
                      </button>
                    );
                })}
            </div>

            {/* Back Button */}
            <button
                onClick={() => window.location.reload()}
                className="mt-10 font-pixel text-xs text-gray-400 hover:text-[#ff2d95] transition-colors z-10 px-6 py-2 border border-gray-600 hover:border-[#ff2d95]"
            >
              ← BACK
            </button>

            {/* Corner Decorations */}
            <div className="absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 border-[#ff2d95]"></div>
            <div className="absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 border-[#00f5ff]"></div>
            <div className="absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 border-[#00f5ff]"></div>
            <div className="absolute bottom-4 right-4 w-8 h-8 border-b-4 border-r-4 border-[#ff2d95]"></div>
        </div>
    );
  }

  // --- PLAYING / HUD ---
  if (gameState === GameState.PLAYING || gameState === GameState.LEVEL_UP || gameState === GameState.VICTORY) {
    const tutorial = TUTORIALS[selectedBookId || 'ningen'];

    return (
      <>
        {/* Tutorial Overlay */}
        {showTutorial && tutorial && (
          <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-[100] pointer-events-auto animate-in fade-in duration-300">
            <div
              className="max-w-md w-full mx-4 p-6 relative"
              style={{
                background: 'linear-gradient(180deg, #1a0a3e 0%, #0a0a2e 100%)',
                border: '3px solid #00f5ff',
                boxShadow: '0 0 30px #00f5ff55, inset 0 0 20px #00f5ff11'
              }}
            >
              {/* Title */}
              <div className="text-center mb-6">
                <h2 className="font-pixel text-lg text-[#ffea00] neon-yellow-glow mb-2">HOW TO PLAY</h2>
                <p className="font-pixel text-sm text-[#ff2d95] neon-pink-glow">{tutorial.title}</p>
              </div>

              {/* Controls */}
              <div className="mb-6">
                <h3 className="font-pixel text-[10px] text-[#39ff14] mb-3 neon-text" style={{ color: '#39ff14' }}>★ CONTROLS ★</h3>
                <div className="space-y-2">
                  {tutorial.controls.map((ctrl, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <span
                        className="font-pixel text-[10px] px-2 py-1 bg-black/50"
                        style={{ border: '2px solid #bf00ff', color: '#bf00ff' }}
                      >
                        {ctrl.key}
                      </span>
                      <span className="font-pixel text-[10px] text-[#00f5ff]">{ctrl.action}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tips */}
              <div className="mb-6">
                <h3 className="font-pixel text-[10px] text-[#39ff14] mb-3 neon-text" style={{ color: '#39ff14' }}>★ TIPS ★</h3>
                <ul className="space-y-2">
                  {tutorial.tips.map((tip, i) => (
                    <li key={i} className="font-pixel text-[9px] text-white flex items-start gap-2">
                      <span className="text-[#ffea00]">▶</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Start Button */}
              <button
                onClick={dismissTutorial}
                className="w-full pixel-btn text-[#00f5ff] border-2 border-[#00f5ff] py-3 hover:bg-[#00f5ff]/20 transition-colors"
              >
                <span className="blink">▶</span> START GAME
              </button>

              {/* Corner accents */}
              <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#ff2d95]"></div>
              <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#00f5ff]"></div>
              <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#00f5ff]"></div>
              <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#ff2d95]"></div>
            </div>
          </div>
        )}

        {stats.bossHp !== undefined && stats.bossMaxHp && (
          <div className="absolute top-12 left-1/2 -translate-x-1/2 w-3/4 z-20 pointer-events-none">
             <div className="w-full h-3 bg-black/80 border-2 border-[#ff2d95] relative" style={{ boxShadow: '0 0 10px #ff2d9555' }}>
               <div className="h-full bg-gradient-to-r from-[#ff2d95] to-[#ff6b35] transition-all duration-300 ease-out" style={{ width: `${(stats.bossHp / stats.bossMaxHp) * 100}%` }} />
             </div>
             <p className="text-center text-[#ff2d95] text-xs font-pixel mt-1 neon-pink-glow">
                 {selectedBookId === 'social_contract' ? 'BOSS: TYRANT' : 'BOSS: SOCIETY'}
             </p>
          </div>
        )}

        {isDefaultGame && (
         <div className="absolute top-0 left-0 w-full p-3 flex justify-between items-start pointer-events-none text-white font-pixel text-[10px] z-10">
          <div className="flex flex-col gap-2 w-1/3 bg-black/50 p-2 border border-[#00f5ff]/30" style={{ boxShadow: 'inset 0 0 10px rgba(0,245,255,0.1)' }}>
            <div className="flex items-center gap-2">
              <span className="text-[#ff2d95]">HP</span>
              <div className="flex-1 h-2 bg-black border border-[#ff2d95]/50 relative">
                <div className="h-full bg-gradient-to-r from-[#ff2d95] to-[#ff6b35]" style={{ width: `${hpPercent}%` }} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#00f5ff]">EXP</span>
              <div className="flex-1 h-2 bg-black border border-[#00f5ff]/50 relative">
                <div className="h-full bg-gradient-to-r from-[#00f5ff] to-[#39ff14]" style={{ width: `${expPercent}%` }} />
              </div>
            </div>
            <div className="text-[8px] text-[#ffea00]">LV.{player.level}</div>
          </div>

          <div className="text-center w-1/3">
            <div className="text-[#ffea00] text-sm neon-yellow-glow">STAGE {stats.wave}</div>
            <div className="text-[8px] text-[#00f5ff] mt-1">SCORE: {stats.score || stats.kills * 100}</div>
          </div>

          <div className="w-1/3 flex flex-col items-end gap-1">
            <div className="flex gap-1 flex-wrap justify-end max-w-[200px]">
               {player.weapons.map((w, i) => (
                 <div key={i} className="w-7 h-7 border-2 border-[#bf00ff] bg-black/80 flex items-center justify-center text-[10px] relative text-[#bf00ff]" style={{ boxShadow: '0 0 5px #bf00ff55' }}>
                    {w.type === WeaponType.PEN ? '✒' : w.type === WeaponType.BOTTLE ? '🍶' : w.type === WeaponType.KATANA ? '⚔' : '📕'}
                 </div>
               ))}
            </div>
          </div>
         </div>
        )}

        {!isDefaultGame && (
             <div className="absolute top-4 left-4 z-10 pointer-events-none bg-black/50 px-4 py-2 border border-[#ffea00]/50">
                 <p className="font-pixel text-sm text-[#ffea00] neon-yellow-glow">{selectedBookId === 'lemon' ? 'SCORE' : 'UNITY'}: {stats.score}</p>
             </div>
        )}

        {isDefaultGame && (
        <div className="absolute top-24 left-3 w-28 bg-black/60 p-2 pointer-events-none hidden md:block border border-[#00f5ff]/30">
           <div className="flex flex-col gap-1">
             <StatRow label="ATK" val={player.stats.meleeDamage} />
             <StatRow label="RNG" val={player.stats.rangedDamage} />
             <StatRow label="SPD" val={player.stats.attackSpeed} unit="%" />
             <StatRow label="AGI" val={Math.round((player.stats.speed - 2.5)*10)} />
           </div>
        </div>
        )}
        
        {/* Mobile Dodge Button (Only for Ningen) */}
        {isDefaultGame && (
        <div
            className="absolute bottom-8 right-8 w-20 h-20 rounded-lg bg-black/70 border-4 border-[#ff2d95] flex items-center justify-center pointer-events-auto active:bg-[#ff2d95]/30 transition-colors z-30 touch-manipulation md:hidden"
            style={{ boxShadow: '0 0 15px #ff2d9555, inset 0 0 10px #ff2d9522' }}
            onTouchStart={handleDodgeTouch}
            onMouseDown={handleDodgeTouch}
        >
            <span className="text-[#ff2d95] text-[10px] font-pixel pointer-events-none neon-pink-glow">DODGE</span>
        </div>
        )}

        {/* Mobile Action Button (For Lemon) */}
        {selectedBookId === 'lemon' && (
         <div
            className="absolute bottom-8 right-8 w-20 h-20 rounded-lg bg-black/70 border-4 border-[#ffea00] flex items-center justify-center pointer-events-auto active:bg-[#ffea00]/30 transition-colors z-30 touch-manipulation md:hidden"
            style={{ boxShadow: '0 0 15px #ffea0055, inset 0 0 10px #ffea0022' }}
            onTouchStart={handleDodgeTouch}
            onMouseDown={handleDodgeTouch}
        >
            <span className="text-[#ffea00] text-[10px] font-pixel pointer-events-none neon-yellow-glow">DROP</span>
        </div>
        )}

        {gameState === GameState.LEVEL_UP && isDefaultGame && (
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a2e]/95 to-black/95 flex flex-col items-center justify-center z-50 animate-in fade-in duration-500 pointer-events-auto">
            <h2 className="font-pixel text-xl md:text-2xl text-[#ffea00] mb-2 neon-yellow-glow">LEVEL UP!</h2>
            <p className="font-pixel text-xs text-[#00f5ff] mb-8">SELECT YOUR POWER</p>
            <div className="flex flex-col md:flex-row gap-4 p-4 w-full max-w-4xl justify-center items-center">
              {upgradeOptions.map((opt, idx) => (
                   <button
                    key={idx}
                    onClick={() => { audioService.playExp(); onSelectUpgrade(opt); }}
                    className="w-full max-w-[200px] md:w-48 h-56 md:h-64 bg-black/80 transition-all duration-300 flex flex-col items-center p-4 text-center group relative hover:scale-105"
                    style={{
                      border: `3px solid ${opt.rarity === 'RARE' ? '#ffea00' : '#00f5ff'}`,
                      boxShadow: `0 0 15px ${opt.rarity === 'RARE' ? '#ffea0055' : '#00f5ff55'}, inset 0 0 20px ${opt.rarity === 'RARE' ? '#ffea0011' : '#00f5ff11'}`
                    }}
                   >
                     <div className="font-pixel text-[8px] text-[#bf00ff] absolute top-2 left-2">
                        {opt.type === 'WEAPON' ? 'WEAPON' : 'SKILL'}
                     </div>
                     {opt.rarity === 'RARE' && (
                       <div className="font-pixel text-[8px] text-[#ffea00] absolute top-2 right-2 blink">★RARE</div>
                     )}
                     <div className="my-auto relative z-10">
                        <div className="text-4xl mb-4 group-hover:scale-125 transition-transform duration-300">
                            {opt.weaponType === WeaponType.PEN ? '✒️' :
                             opt.weaponType === WeaponType.BOTTLE ? '🍶' :
                             opt.weaponType ? '⚔️' : '💎'}
                        </div>
                        <h3 className="font-pixel text-sm mb-3" style={{ color: opt.rarity === 'RARE' ? '#ffea00' : '#00f5ff' }}>
                            {opt.name}
                        </h3>
                        <p className="text-[10px] text-[#39ff14] font-pixel leading-relaxed">{opt.description}</p>
                     </div>
                     <div className="absolute bottom-2 font-pixel text-[8px] text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity blink">
                       ▶ SELECT
                     </div>
                   </button>
              ))}
            </div>
          </div>
        )}

        {gameState === GameState.VICTORY && (
            <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a2e]/95 to-black/95 flex flex-col items-center justify-center z-50 text-white animate-in zoom-in duration-500">
                <h2 className="font-pixel text-3xl md:text-4xl text-[#ffea00] mb-4 neon-yellow-glow">VICTORY!</h2>
                <h3 className="font-pixel text-xl text-[#39ff14] mb-8 neon-text" style={{ color: '#39ff14' }}>★ QUEST COMPLETE ★</h3>
                 <p className="font-pixel text-xs text-[#00f5ff] mb-12">
                     {selectedBookId === 'lemon' ? 'THE OMINOUS MASS WAS DESTROYED' : 'FREEDOM HAS BEEN WON'}
                 </p>
                <button onClick={onRestart} className="pixel-btn text-[#ffea00] border-2 border-[#ffea00] px-8 py-3 hover:bg-[#ffea00]/20 transition-colors">
                  RETURN HOME
                </button>
            </div>
        )}
      </>
    );
  }

  if (gameState === GameState.WAVE_CLEARED) {
      return (
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a2e] to-black flex flex-col items-center justify-center z-50 animate-in fade-in duration-1000">
           <div className="text-center mb-8">
             <h2 className="font-pixel text-xl text-[#39ff14] mb-2 neon-text" style={{ color: '#39ff14' }}>STAGE {stats.wave} CLEAR!</h2>
             <p className="font-pixel text-xs text-[#00f5ff]">★ ★ ★</p>
           </div>
           <div className="flex flex-row-reverse gap-8 h-1/2 items-start justify-center opacity-90 p-4 bg-black/50 border border-[#bf00ff]/30" style={{ boxShadow: '0 0 20px #bf00ff33' }}>
             <div className="writing-vertical-rl text-[#ff2d95] font-serif text-xl md:text-2xl tracking-[0.2em] border-l-2 border-[#ff2d95]/50 pl-4 h-full neon-pink-glow">
                {currentQuote.chapter}
             </div>
             <div className="writing-vertical-rl text-[#00f5ff] font-serif text-sm md:text-base leading-loose tracking-widest h-full whitespace-pre-line">
                {currentQuote.text}
             </div>
           </div>

           <button
             onClick={onResume}
             className="absolute bottom-12 left-1/2 -translate-x-1/2 font-pixel text-sm text-[#ffea00] hover:text-[#39ff14] transition-colors duration-300 p-4 blink"
           >
             ▶ NEXT STAGE
           </button>
        </div>
      )
  }

  if (gameState === GameState.GAME_OVER) {
    return (
      <div className="absolute inset-0 bg-gradient-to-b from-[#2e0a0a] to-black flex flex-col items-center justify-center z-50 text-white">
        <h2 className="font-pixel text-4xl md:text-5xl text-[#ff2d95] mb-4 chromatic-aberration">
          GAME OVER
        </h2>
        <div className="flex gap-2 mb-8">
          <span className="font-pixel text-[#ff2d95]">☠</span>
          <span className="font-pixel text-[#ff6b35]">☠</span>
          <span className="font-pixel text-[#ffea00]">☠</span>
        </div>
        <div className="text-center font-pixel bg-black/50 p-6 border border-[#ff2d95]/30 mb-8">
          {isDefaultGame && <p className="text-xs text-[#00f5ff] mb-4">STAGE {stats.wave} - SCORE: {stats.kills * 100}</p>}
          <p className="text-[10px] text-gray-500">
            {selectedBookId === 'lemon' ? 'EXPLOSION...' : selectedBookId === 'social_contract' ? 'SUBMISSION...' : 'DISQUALIFIED...'}
          </p>
        </div>
        <button
          onClick={onRestart}
          className="pixel-btn text-[#00f5ff] border-2 border-[#00f5ff] px-8 py-3 hover:bg-[#00f5ff]/20 transition-colors"
        >
          CONTINUE? <span className="blink">▶</span>
        </button>
      </div>
    );
  }

  if (gameState === GameState.PAUSED) {
    const tutorial = TUTORIALS[selectedBookId || 'ningen'];
    return (
      <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center z-50 text-white">
        <h2 className="font-pixel text-2xl text-[#ffea00] mb-8 neon-yellow-glow">PAUSED</h2>
        <div className="flex flex-col gap-4">
          <button onClick={onResume} className="pixel-btn text-[#00f5ff] border-2 border-[#00f5ff] px-8 py-3 hover:bg-[#00f5ff]/20 transition-colors">
            ▶ RESUME
          </button>
          <button
            onClick={() => { setShowTutorial(true); onResume(); }}
            className="pixel-btn text-[#39ff14] border-2 border-[#39ff14] px-8 py-3 hover:bg-[#39ff14]/20 transition-colors"
          >
            ? HELP
          </button>
          <button onClick={onRestart} className="font-pixel text-xs text-[#ff2d95] hover:text-[#ff6b35] transition-colors mt-4">
            ✕ QUIT GAME
          </button>
        </div>

        {/* Quick Controls Reference */}
        {tutorial && (
          <div className="mt-8 p-4 bg-black/50 border border-[#bf00ff]/30 max-w-xs">
            <h3 className="font-pixel text-[10px] text-[#bf00ff] mb-3 text-center">CONTROLS</h3>
            <div className="space-y-1">
              {tutorial.controls.slice(0, 3).map((ctrl, i) => (
                <div key={i} className="flex justify-between text-[8px]">
                  <span className="text-[#ffea00]">{ctrl.key}</span>
                  <span className="text-gray-400">{ctrl.action}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
};

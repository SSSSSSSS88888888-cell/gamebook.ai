
import React, { useState, useCallback } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { LemonGame } from './components/LemonGame';
import { SocialGame } from './components/SocialGame';
import { UIOverlay } from './components/UIOverlay';
import { NovelReader } from './components/NovelReader';
import { GameState, GameStats, Player, UpgradeOption } from './types';
import { INITIAL_PLAYER_STATS } from './constants';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [stats, setStats] = useState<GameStats>({ wave: 1, score: 0, kills: 0, timeElapsed: 0 });
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  
  // Player state for UI
  const [playerState, setPlayerState] = useState<Player>({
    id: 0, x: 0, y: 0, width: 0, height: 0, color: '',
    hp: INITIAL_PLAYER_STATS.maxHp, 
    stats: { ...INITIAL_PLAYER_STATS },
    level: 1, exp: 0, nextLevelExp: 10,
    weapons: [],
    direction: 1, markedForDeletion: false,
    invincibility: 0,
    isDodging: false,
    dodgeCooldown: 0,
    debuffs: { guilt: 0, confused: 0, poison: 0 }
  });

  const [upgradeSelection, setUpgradeSelection] = useState<UpgradeOption | null>(null);

  const handleStartGameSelect = () => {
      setGameState(GameState.GAME_SELECT);
  };

  const handleStartGame = (bookId: string) => {
    setSelectedBookId(bookId);
    setGameState(GameState.PLAYING);
    // Reset stats for new game
    setStats({ wave: 1, score: 0, kills: 0, timeElapsed: 0, bossHp: undefined, bossMaxHp: undefined });
  };

  const handleReadNovel = () => {
    setGameState(GameState.NOVEL_READER);
  };

  const handleLevelUp = useCallback(() => {
    // Handled by Canvas state change
  }, []);

  const handleSelectUpgrade = (option: UpgradeOption) => {
    setUpgradeSelection(option);
    setTimeout(() => setUpgradeSelection(null), 100); 
  };

  const handleRestart = () => {
    window.location.reload();
  };

  return (
    <div className="relative w-full h-screen bg-gradient-to-b from-[#0a0a2e] via-[#0f0f1a] to-[#0a0a1a] flex items-center justify-center p-4 overflow-hidden select-none" style={{ touchAction: 'none' }}>
      <div className="relative w-full max-w-[800px] aspect-[4/3] bg-[#0a0a1a] shadow-2xl overflow-hidden pixel-border pulse-border rounded-sm">
        
        {/* Game Render Layer */}
        {gameState !== GameState.MENU && gameState !== GameState.GAME_SELECT && gameState !== GameState.NOVEL_READER && (
            <>
               {(!selectedBookId || selectedBookId === 'ningen') && (
                <GameCanvas 
                  gameState={gameState} 
                  setGameState={setGameState}
                  setStats={setStats}
                  setPlayerState={setPlayerState}
                  upgradeSelection={upgradeSelection}
                  onLevelUp={handleLevelUp}
                />
               )}
               {selectedBookId === 'lemon' && (
                <LemonGame 
                  gameState={gameState}
                  setGameState={setGameState}
                  setStats={setStats}
                />
               )}
               {selectedBookId === 'social_contract' && (
                 <SocialGame
                   gameState={gameState}
                   setGameState={setGameState}
                   setStats={setStats}
                 />
               )}
            </>
        )}

        {/* Novel Reader Layer */}
        {gameState === GameState.NOVEL_READER && (
            <NovelReader onBack={() => setGameState(GameState.MENU)} />
        )}

        {/* UI / Menu Layer */}
        {gameState !== GameState.NOVEL_READER && (
          <UIOverlay 
            gameState={gameState}
            stats={stats}
            player={playerState}
            onStartGameSelect={handleStartGameSelect}
            onStartGame={handleStartGame}
            onReadNovel={handleReadNovel}
            onSelectUpgrade={handleSelectUpgrade}
            onRestart={handleRestart}
            onResume={() => setGameState(GameState.PLAYING)}
            selectedBookId={selectedBookId}
          />
        )}
        
        {/* Post-processing effects */}
        <div className="scanlines pointer-events-none opacity-10"></div>
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-black/40 via-transparent to-black/40 mix-blend-multiply"></div>
      </div>
      
      {/* Footer Info - 80s Retro Style */}
      <div className="absolute bottom-4 font-pixel text-[10px] text-[#00f5ff] opacity-70 neon-cyan-glow">
        ★ GameBook.ai ★ RETRO LITERATURE RPG ★
      </div>
    </div>
  );
};

export default App;

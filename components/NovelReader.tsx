

import React, { useState, useRef, useEffect } from 'react';
import { LIBRARY } from '../constants';
import { audioService } from '../services/audioService';

interface NovelReaderProps {
  onBack: () => void;
}

export const NovelReader: React.FC<NovelReaderProps> = ({ onBack }) => {
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [chapterIndex, setChapterIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const selectedBook = LIBRARY.find(b => b.id === selectedBookId);
  const currentChapter = selectedBook ? selectedBook.chapters[chapterIndex] : null;

  // Reset scroll on chapter change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [chapterIndex, selectedBookId]);

  const handleBookSelect = (id: string) => {
      setSelectedBookId(id);
      setChapterIndex(0);
      audioService.playExp();
  };

  const handleReturnToShelf = () => {
      setSelectedBookId(null);
  };

  const handleNext = () => {
    if (selectedBook && chapterIndex < selectedBook.chapters.length - 1) {
      setChapterIndex(prev => prev + 1);
      audioService.playExp();
    }
  };

  const handlePrev = () => {
    if (chapterIndex > 0) {
      setChapterIndex(prev => prev - 1);
      audioService.playExp();
    }
  };

  // --- Bookshelf View ---
  if (!selectedBookId || !currentChapter) {
      return (
        <div className="absolute inset-0 bg-[#1c1917] flex flex-col items-center justify-center z-50 text-white font-serif overflow-hidden animate-in fade-in duration-300">
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] pointer-events-none"></div>
            
            <h2 className="text-2xl mb-12 tracking-[1em] text-gray-400 border-b border-gray-700 pb-4">私設図書室</h2>
            
            <div className="flex gap-8 md:gap-16 flex-wrap justify-center px-8 z-10">
                {LIBRARY.map((book) => (
                    <button 
                        key={book.id}
                        onClick={() => handleBookSelect(book.id)}
                        className="group relative w-32 md:w-40 h-48 md:h-56 bg-neutral-800 shadow-2xl transition-transform transform hover:-translate-y-4 hover:shadow-neutral-900/50 flex flex-col items-center justify-between p-4 border-r-4 border-b-4 border-black"
                        style={{ backgroundColor: book.color }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-tr from-black/40 to-transparent pointer-events-none"></div>
                        <div className="absolute left-2 top-0 bottom-0 w-[2px] bg-white/20"></div>
                        
                        <div className="writing-vertical-rl text-white font-serif text-lg md:text-xl tracking-widest font-bold h-full pt-4 drop-shadow-md z-10">
                            {book.title}
                        </div>
                        <div className="text-[10px] text-white/80 pb-2 z-10 font-sans tracking-wider">
                            {book.author}
                        </div>
                    </button>
                ))}
            </div>

            <button 
                onClick={onBack}
                className="mt-16 text-gray-500 hover:text-white transition-colors tracking-widest text-sm z-10"
            >
                閉じる
            </button>
        </div>
      );
  }

  // --- Reader View ---
  return (
    <div className="absolute inset-0 bg-[#e6dcc8] text-[#2c241b] flex flex-col items-center justify-center z-50 overflow-hidden font-serif animate-in fade-in duration-500">
       {/* Background Texture */}
       <div className="absolute inset-0 opacity-40 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] mix-blend-multiply"></div>
       <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-black/20 via-transparent to-black/20"></div>

       {/* Header */}
       <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-center z-10 border-b border-[#c4b59d] bg-[#e6dcc8]/90 backdrop-blur-sm">
          <button 
             onClick={handleReturnToShelf}
             className="text-sm tracking-widest hover:text-red-800 transition-colors border border-transparent hover:border-red-800/20 px-4 py-1 rounded"
          >
             書架ニ戻ル
          </button>
          <div className="text-lg tracking-[0.3em] font-bold text-[#4a3b2a]">
             {currentChapter.title}
          </div>
          <div className="text-xs tracking-widest opacity-60">
             {chapterIndex + 1} / {selectedBook.chapters.length}
          </div>
       </div>

       {/* Text Area (Vertical) */}
       <div 
         ref={scrollRef}
         className="w-full h-full pt-20 pb-20 overflow-x-auto overflow-y-hidden flex flex-row-reverse items-center"
         style={{ scrollBehavior: 'smooth' }}
       >
          <div className="h-[80%] min-w-[100vw] flex flex-row-reverse px-12 md:px-32">
              <div 
                 className="writing-vertical-rl text-orientation-upright text-base md:text-lg leading-loose tracking-widest whitespace-pre-wrap h-full"
                 style={{ columnGap: '3rem' }}
              >
                 {currentChapter.content}
              </div>
          </div>
       </div>

       {/* Navigation Footer */}
       <div className="absolute bottom-0 left-0 w-full p-6 flex justify-center items-center gap-8 z-10 bg-gradient-to-t from-[#e6dcc8] to-transparent">
          <button 
             onClick={handlePrev}
             disabled={chapterIndex === 0}
             className={`px-6 py-2 border border-[#8c7b66] rounded hover:bg-[#d6cbb8] transition-all tracking-widest text-sm ${chapterIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'opacity-100'}`}
          >
             前ノ章
          </button>
          
          <span className="text-xs opacity-50 tracking-widest">
            {/* Page dots could go here */}
            ◆
          </span>

          <button 
             onClick={handleNext}
             disabled={chapterIndex === selectedBook.chapters.length - 1}
             className={`px-6 py-2 border border-[#8c7b66] rounded hover:bg-[#d6cbb8] transition-all tracking-widest text-sm ${chapterIndex === selectedBook.chapters.length - 1 ? 'opacity-30 cursor-not-allowed' : 'opacity-100'}`}
          >
             次ノ章
          </button>
       </div>
    </div>
  );
};

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

type Mood = 'idle' | 'happy' | 'eating' | 'sleeping';

const SUMMON_KEYWORD = 'buddy';

const MOOD_CONFIG: Record<Mood, { emoji: string; message: string }> = {
  idle:     { emoji: '🐰', message: '（・ω・）' },
  happy:    { emoji: '🐰', message: '好舒服～謝謝！' },
  eating:   { emoji: '🥕', message: '啃啃啃啃啃' },
  sleeping: { emoji: '🐰', message: 'zzz...' },
};

export default function Buddy() {
  const [visible, setVisible] = useState(false);
  const [mood, setMood] = useState<Mood>('idle');
  const [bounce, setBounce] = useState(false);
  const typedRef = useRef('');
  const moodTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerBounce = () => {
    setBounce(true);
    setTimeout(() => setBounce(false), 600);
  };

  const resetSleepTimer = useCallback(() => {
    if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    if (mood === 'sleeping') setMood('idle');
    sleepTimerRef.current = setTimeout(() => setMood('sleeping'), 15000);
  }, [mood]);

  // Reset sleep timer when mood changes (not sleeping)
  useEffect(() => {
    if (!visible) return;
    if (mood !== 'sleeping') {
      resetSleepTimer();
    }
    return () => {
      if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, mood]);

  const summon = useCallback(() => {
    setVisible(true);
    setMood('idle');
    triggerBounce();
  }, []);

  // Summon via custom event (triggered by header tap sequence)
  useEffect(() => {
    const handleSummon = () => summon();
    window.addEventListener('summon-buddy', handleSummon);
    return () => window.removeEventListener('summon-buddy', handleSummon);
  }, [summon]);

  // Summon via keyboard: type "buddy" outside of inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) return;

      typedRef.current = (typedRef.current + e.key).slice(-SUMMON_KEYWORD.length);
      if (typedRef.current.toLowerCase() === SUMMON_KEYWORD) {
        summon();
        typedRef.current = '';
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [summon]);

  const setMoodTemporarily = (m: Mood, duration = 2500) => {
    if (moodTimerRef.current) clearTimeout(moodTimerRef.current);
    setMood(m);
    moodTimerRef.current = setTimeout(() => setMood('idle'), duration);
  };

  const handlePet = () => {
    triggerBounce();
    setMoodTemporarily('happy');
  };

  const handleFeed = () => {
    triggerBounce();
    setMoodTemporarily('eating', 3000);
  };

  const handleDismiss = () => {
    setVisible(false);
    if (moodTimerRef.current) clearTimeout(moodTimerRef.current);
    if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
  };

  if (!visible) return null;

  const { emoji, message } = MOOD_CONFIG[mood];

  return (
    <div
      className="fixed bottom-20 right-4 z-50 flex flex-col items-center gap-1 select-none"
      style={bounce ? { animation: 'buddyBounce 0.6s ease' } : undefined}
    >
      {/* Speech bubble */}
      <div className="bg-white border border-green-300 rounded-2xl px-3 py-1.5 text-xs text-green-700 shadow-md relative whitespace-nowrap">
        {message}
        <span className="absolute bottom-[-7px] left-1/2 -translate-x-1/2 block w-3 h-3 bg-white border-r border-b border-green-300 rotate-45" />
      </div>

      {/* Pet body */}
      <div
        className="text-5xl cursor-pointer hover:scale-110 transition-transform active:scale-95 mt-1"
        onClick={handlePet}
        title="摸摸牠"
        role="button"
        aria-label="摸摸電子寵物"
      >
        {emoji}
      </div>

      {/* Actions */}
      <div className="flex gap-1.5 mt-0.5">
        <button
          onClick={handleFeed}
          className="bg-orange-100 hover:bg-orange-200 text-orange-700 text-xs px-2 py-1 rounded-lg transition-colors font-medium"
        >
          🥕 餵食
        </button>
        <button
          onClick={handleDismiss}
          className="bg-gray-100 hover:bg-gray-200 text-gray-500 text-xs px-2 py-1 rounded-lg transition-colors"
        >
          掰掰
        </button>
      </div>

      {/* Re-summon hint */}
      <p className="text-[10px] text-gray-400 mt-0.5">點 🌿 五下可再次召喚</p>
    </div>
  );
}

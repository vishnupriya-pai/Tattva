'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  Moon,
  PlusCircle,
  Sun,
  User,
  ShieldCheck,
} from 'lucide-react';
import type { Inquiry } from '@tattva/contracts';
import { useTheme } from '../../context/ThemeContext';

export type TopNavView = 'home' | 'workspace' | 'workspaces' | 'masterclass' | 'community' | 'create' | 'profile';

export interface TopNavBarProps {
  activeView?: TopNavView;
  onChangeView: (view: TopNavView) => void;
  staminaScore?: number;
  streakDays?: number;
  user?: {
    id: string;
    isAnonymous: boolean;
  };
  onStartNewInquiry?: () => void;
  inquiries?: Inquiry[];
  activeInquiryId?: string | null;
  onSelectInquiry?: (id: string) => void;
  onOpenInquirySwitcher?: () => void;
}

export const TopNavBar: React.FC<TopNavBarProps> = ({
  activeView = 'home',
  onChangeView,
  staminaScore = 0,
  streakDays = 0,
  user = { id: 'anonymous', isAnonymous: true },
  onStartNewInquiry,
  inquiries = [],
  activeInquiryId,
  onSelectInquiry,
  onOpenInquirySwitcher,
}) => {
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (!accountMenuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAccountMenuOpen(false);
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target as Node)
      ) {
        setAccountMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [accountMenuOpen]);

  const handleStartInquiry = () => {
    setAccountMenuOpen(false);
    if (onStartNewInquiry) {
      onStartNewInquiry();
    } else {
      onChangeView('create');
    }
  };

  return (
    <header className="shrink-0 border-b border-white/10 bg-[#0b0d0f] z-40 text-slate-200">
      <div className="h-16 px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Left: TATTVA Brand with Sacred Geometry Wireframe Icon */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onChangeView('home')}
            title="TATTVA: Intellectual Execution Platform"
            className="flex items-center gap-2.5 text-left cursor-pointer group"
          >
            {/* Sacred Geometry Emblem */}
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-stone-800 to-stone-900 border border-white/15 flex items-center justify-center shadow-inner group-hover:border-[#c59a67]/60 transition">
              <svg
                className="w-4.5 h-4.5 text-[#c59a67]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              >
                <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5" />
                <line x1="12" y1="2" x2="12" y2="22" />
                <line x1="2" y1="8.5" x2="22" y2="15.5" />
                <line x1="2" y1="15.5" x2="22" y2="8.5" />
              </svg>
            </div>

            <div className="leading-tight">
              <div className="flex items-baseline gap-2">
                <span className="text-base font-extrabold tracking-[0.18em] text-white font-sans uppercase">
                  TATTVA
                </span>
                <span className="hidden xl:inline text-[9px] font-mono tracking-widest text-slate-400 uppercase">
                  INTELLECTUAL EXECUTION PLATFORM
                </span>
              </div>
            </div>
          </button>
        </div>

        {/* Center: Navigation Tabs */}
        <nav className="flex items-center gap-5 sm:gap-6 text-xs font-medium">
          <button
            type="button"
            onClick={() => onChangeView('home')}
            className={`py-1 transition relative cursor-pointer ${
              activeView === 'home'
                ? 'text-white font-semibold after:absolute after:bottom-[-20px] after:left-0 after:right-0 after:h-[2px] after:bg-[#c59a67]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Overview
          </button>

          <button
            type="button"
            onClick={() => {
              if (activeView === 'workspace' && onOpenInquirySwitcher) {
                onOpenInquirySwitcher();
              } else {
                onChangeView('workspace');
              }
            }}
            className={`py-1 transition relative cursor-pointer flex items-center gap-1.5 ${
              activeView === 'workspace'
                ? 'text-white font-semibold after:absolute after:bottom-[-20px] after:left-0 after:right-0 after:h-[2px] after:bg-[#c59a67]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Knowledge Graph</span>
            {inquiries.length > 0 && (
              <span
                onClick={(e) => {
                  if (onOpenInquirySwitcher) {
                    e.stopPropagation();
                    onOpenInquirySwitcher();
                  }
                }}
                title="Switch inquiry"
                className="rounded-full bg-[#c59a67]/20 border border-[#c59a67]/30 px-1.5 py-0.2 text-[10px] font-mono text-[#c59a67] font-semibold hover:bg-[#c59a67]/40 transition"
              >
                {inquiries.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onChangeView('workspaces')}
            className={`py-1 transition relative cursor-pointer ${
              activeView === 'workspaces'
                ? 'text-white font-semibold after:absolute after:bottom-[-20px] after:left-0 after:right-0 after:h-[2px] after:bg-[#c59a67]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Source Papers & Ingestion
          </button>

          <button
            type="button"
            onClick={() => onChangeView('profile')}
            className={`py-1 transition relative cursor-pointer ${
              activeView === 'profile'
                ? 'text-white font-semibold after:absolute after:bottom-[-20px] after:left-0 after:right-0 after:h-[2px] after:bg-[#c59a67]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Proof Ledger & Replay
          </button>
        </nav>

        {/* Right: Cognitive Stamina, Theme Toggle & User Capsule */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Verified Replay Link */}
          {activeInquiryId && (
            <a
              href={`/verify/${activeInquiryId}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Open cryptographic Proof-of-Struggle replay for this inquiry"
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#c59a67]/40 bg-[#c59a67]/10 hover:bg-[#c59a67]/20 text-[#c59a67] transition cursor-pointer text-xs font-mono font-medium shadow-[0_0_12px_rgba(197,154,103,0.15)]"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#c59a67]" />
              <span>Verified Replay</span>
            </a>
          )}

          {/* Cognitive Stamina Badge */}
          <div
            title="Cognitive Stamina: Verified intellectual activity"
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-white/10 bg-[#13161b]"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-[#a3e635] shadow-[0_0_8px_#a3e635]" />
            <span className="font-mono text-xs font-bold text-white tabular-nums">
              {staminaScore.toLocaleString()}
            </span>
            <span className="text-[10px] font-mono tracking-wider text-slate-400 uppercase hidden sm:inline">
              STAMINA
            </span>
            {streakDays > 1 && (
              <span className="text-[10px] font-mono text-[#c59a67] border-l border-white/10 pl-2 ml-0.5">
                {streakDays}-day streak
              </span>
            )}
          </div>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/10 bg-[#13161b] hover:border-white/20 transition cursor-pointer text-slate-300 hover:text-white"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden xl:inline font-mono text-[11px] font-medium">Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-teal-700" />
                <span className="hidden xl:inline font-mono text-[11px] font-medium">Dark</span>
              </>
            )}
          </button>

          {/* Account Profile / Session Capsule */}
          <div ref={accountMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setAccountMenuOpen((prev) => !prev)}
              aria-expanded={accountMenuOpen}
              aria-haspopup="menu"
              title={`Identity: ${user.id} (${user.isAnonymous ? 'Anonymous' : 'Authenticated'})`}
              className="flex items-center gap-1.5 p-1 rounded-full border border-white/15 bg-[#181b22] hover:border-[#c59a67]/60 cursor-pointer transition"
            >
              <div className="w-6 h-6 rounded-full bg-stone-800 text-stone-200 flex items-center justify-center text-[10px] font-bold font-mono border border-white/10">
                <User className="w-3.5 h-3.5 text-slate-300" />
              </div>
              <ChevronDown
                className={`w-3 h-3 text-slate-400 mr-1 transition-transform ${
                  accountMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {accountMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-64 rounded-xl bg-[#13161b] border border-white/10 shadow-2xl p-3 z-50 space-y-2.5"
              >
                <div className="pb-2.5 border-b border-white/10">
                  <div className="text-xs font-bold text-white truncate font-mono">
                    {user.id}
                  </div>
                  <div className="font-mono text-[10px] text-[#c59a67] truncate mt-0.5">
                    {user.isAnonymous ? 'Anonymous Session' : 'Verified Learner'}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
                    System: Active &middot; {staminaScore} Stamina
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      onChangeView('profile');
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 font-medium text-slate-300 hover:text-white hover:bg-white/5 rounded-lg text-left cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5 text-[#c59a67]" />
                    <span>View Profile</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleStartInquiry}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 font-medium text-slate-300 hover:text-white hover:bg-white/5 rounded-lg text-left cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-[#c59a67]" />
                    <span>Launch New Inquiry</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      toggleTheme();
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 font-medium text-slate-300 hover:text-white hover:bg-white/5 rounded-lg text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      {theme === 'dark' ? (
                        <Sun className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <Moon className="w-3.5 h-3.5 text-teal-700" />
                      )}
                      <span>Appearance</span>
                    </div>
                    <span className="font-mono text-[10px] font-bold text-[#c59a67] px-2 py-0.5 rounded bg-white/5 border border-white/10 uppercase">
                      {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

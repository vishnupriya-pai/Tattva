'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  Moon,
  PlusCircle,
  Sun,
  User,
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
    <header className="shrink-0 border-b border-line bg-bg z-40 text-fg">
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
            <div className="w-8 h-8 rounded-lg bg-surface-1 border border-line-strong flex items-center justify-center shadow-inner group-hover:border-line-strong transition">
              <svg
                className="w-4.5 h-4.5 text-fg"
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
                <span className="text-base font-extrabold tracking-[0.18em] text-fg font-sans uppercase">
                  TATTVA
                </span>
                <span className="hidden xl:inline text-[9px] font-mono tracking-widest text-fg-muted uppercase">
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
                ? 'text-fg font-semibold after:absolute after:bottom-[-20px] after:left-0 after:right-0 after:h-[2px] after:bg-gold'
                : 'text-fg-muted hover:text-fg'
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
                ? 'text-fg font-semibold after:absolute after:bottom-[-20px] after:left-0 after:right-0 after:h-[2px] after:bg-gold'
                : 'text-fg-muted hover:text-fg'
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
                className="rounded-full bg-surface-2 border border-line-strong px-1.5 py-0.2 text-[10px] font-mono text-fg-muted font-semibold hover:bg-surface-3 transition"
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
                ? 'text-fg font-semibold after:absolute after:bottom-[-20px] after:left-0 after:right-0 after:h-[2px] after:bg-gold'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            Workspaces
          </button>

          <button
            type="button"
            onClick={() => onChangeView('masterclass')}
            className={`py-1 transition relative cursor-pointer ${
              activeView === 'masterclass'
                ? 'text-fg font-semibold after:absolute after:bottom-[-20px] after:left-0 after:right-0 after:h-[2px] after:bg-gold'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            Masterclass
          </button>

          <button
            type="button"
            onClick={() => onChangeView('community')}
            className={`py-1 transition relative cursor-pointer ${
              activeView === 'community'
                ? 'text-fg font-semibold after:absolute after:bottom-[-20px] after:left-0 after:right-0 after:h-[2px] after:bg-gold'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            Community
          </button>
        </nav>

        {/* Right: Cognitive Stamina, Theme Toggle & User Capsule */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Cognitive Stamina Badge */}
          <div
            title="Cognitive Stamina: Verified intellectual activity"
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-line bg-surface-1"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-live" />
            <span className="font-mono text-xs font-bold text-gold tabular-nums">
              {staminaScore.toLocaleString()}
            </span>
            <span className="text-[10px] font-mono tracking-wider text-fg-muted uppercase hidden sm:inline">
              STAMINA
            </span>
            {streakDays > 1 && (
              <span className="text-[10px] font-mono text-fg-muted border-l border-line pl-2 ml-0.5">
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
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-line bg-surface-1 hover:border-line-strong transition cursor-pointer text-fg-body hover:text-fg"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-fg-muted" />
                <span className="hidden xl:inline font-mono text-[11px] font-medium">Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-fg-muted" />
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
              className="flex items-center gap-1.5 p-1 rounded-full border border-line-strong bg-surface-2 hover:border-line-strong cursor-pointer transition"
            >
              <div className="w-6 h-6 rounded-full bg-surface-2 text-fg flex items-center justify-center text-[10px] font-bold font-mono border border-line">
                <User className="w-3.5 h-3.5 text-fg-body" />
              </div>
              <ChevronDown
                className={`w-3 h-3 text-fg-muted mr-1 transition-transform ${
                  accountMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {accountMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-64 rounded-xl bg-surface-1 border border-line shadow-2xl p-3 z-50 space-y-2.5"
              >
                <div className="pb-2.5 border-b border-line">
                  <div className="text-xs font-bold text-fg truncate font-mono">
                    {user.id}
                  </div>
                  <div className="font-mono text-[10px] text-fg-muted truncate mt-0.5">
                    {user.isAnonymous ? 'Anonymous Session' : 'Verified Learner'}
                  </div>
                  <div className="text-[10px] text-fg-muted truncate mt-0.5 font-mono">
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
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 font-medium text-fg-body hover:text-fg hover:bg-surface-2/5 rounded-lg text-left cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5 text-fg-muted" />
                    <span>View Profile</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleStartInquiry}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 font-medium text-fg-body hover:text-fg hover:bg-surface-2/5 rounded-lg text-left cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-fg-muted" />
                    <span>Launch New Inquiry</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      toggleTheme();
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 font-medium text-fg-body hover:text-fg hover:bg-surface-2/5 rounded-lg text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      {theme === 'dark' ? (
                        <Sun className="w-3.5 h-3.5 text-fg-muted" />
                      ) : (
                        <Moon className="w-3.5 h-3.5 text-fg-muted" />
                      )}
                      <span>Appearance</span>
                    </div>
                    <span className="font-mono text-[10px] font-bold text-fg-muted px-2 py-0.5 rounded bg-surface-2/5 border border-line uppercase">
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

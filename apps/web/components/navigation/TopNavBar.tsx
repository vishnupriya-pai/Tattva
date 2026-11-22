'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  LogIn,
  LogOut,
  Menu,
  Moon,
  ShieldCheck,
  PlusCircle,
  Sun,
  User,
} from 'lucide-react';
import type { Inquiry } from '@tattva/contracts';
import { useTheme } from '../../context/ThemeContext';
import { NAV_ITEMS, type TopNavView } from './navItems';
import { MOBILE_NAV_DRAWER_ID, MobileNavDrawer } from './MobileNavDrawer';

export type { TopNavView };

export interface TopNavBarProps {
  activeView?: TopNavView;
  onChangeView: (view: TopNavView) => void;
  staminaScore?: number;
  streakDays?: number;
  user?: {
    id: string;
    isAnonymous: boolean;
    email?: string | null;
  };
  onOpenAccount?: (mode: 'save' | 'signin') => void;
  onSignOut?: () => void;
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
  onOpenAccount,
  onSignOut,
  onStartNewInquiry,
  inquiries = [],
  activeInquiryId,
  onSelectInquiry,
  onOpenInquirySwitcher,
}) => {
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const { theme, toggleTheme } = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement | null>(null);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    hamburgerRef.current?.focus();
  }, []);

  const selectView = (view: TopNavView) => {
    if (view === 'workspace' && activeView === 'workspace' && onOpenInquirySwitcher) {
      onOpenInquirySwitcher();
    } else {
      onChangeView(view);
    }
  };

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
        <div className="flex items-center gap-2 shrink-0">
          <button
            ref={hamburgerRef}
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
            aria-expanded={drawerOpen}
            aria-controls={MOBILE_NAV_DRAWER_ID}
            className="-ml-2 flex h-11 w-11 items-center justify-center rounded-lg text-fg-body hover:text-fg hover:bg-surface-2 transition cursor-pointer lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
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
              <span className="text-lg font-semibold text-fg font-display tracking-[0.12em] uppercase">
                TATTVA
              </span>
            </div>
          </button>
        </div>

        <nav className="hidden lg:flex items-center gap-6 text-xs font-medium">
          {NAV_ITEMS.map(({ view, label }) => {
            const active = activeView === view;
            return (
              <button
                key={view}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => selectView(view)}
                className={`py-1 transition relative cursor-pointer flex items-center gap-1.5 ${
                  active
                    ? 'text-fg font-semibold after:absolute after:bottom-[-20px] after:left-0 after:right-0 after:h-[2px] after:bg-gold'
                    : 'text-fg-muted hover:text-fg'
                }`}
              >
                <span>{label}</span>
                {view === 'workspace' && inquiries.length > 0 && (
                  <span
                    onClick={(e) => {
                      if (onOpenInquirySwitcher) {
                        e.stopPropagation();
                        onOpenInquirySwitcher();
                      }
                    }}
                    title="Switch inquiry"
                    className="rounded-full bg-surface-2 border border-line-strong px-1.5 py-0.2 text-xs font-mono text-fg-muted font-semibold hover:bg-surface-3 transition"
                  >
                    {inquiries.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right: Cognitive Stamina, Theme Toggle & User Capsule */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Cognitive Stamina Badge */}
          <div
            title="Cognitive Stamina: Verified intellectual activity"
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-line bg-surface-1"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-live" />
            <span className="font-mono text-xs font-bold text-gold tabular-nums">
              {staminaScore.toLocaleString()}
            </span>
            <span className="text-xs font-mono text-fg-muted hidden sm:inline">
              Stamina
            </span>
            {streakDays > 1 && (
              <span className="hidden sm:inline text-xs font-mono text-fg-muted border-l border-line pl-2 ml-0.5">
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
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-line bg-surface-1 hover:border-line-strong transition cursor-pointer text-fg-body hover:text-fg"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-fg-muted" />
                <span className="hidden xl:inline font-mono text-xs font-medium">Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-fg-muted" />
                <span className="hidden xl:inline font-mono text-xs font-medium">Dark</span>
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
              title={user.isAnonymous ? 'Anonymous session' : (user.email ?? 'Signed in')}
              className="flex items-center gap-1.5 p-1 rounded-full border border-line-strong bg-surface-2 hover:border-line-strong cursor-pointer transition"
            >
              <div className="w-6 h-6 rounded-full bg-surface-2 text-fg flex items-center justify-center text-xs font-bold font-mono border border-line">
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
                    {user.isAnonymous ? 'Anonymous Session' : (user.email ?? 'Verified Learner')}
                  </div>
                  <div className="font-mono text-xs text-fg-muted truncate mt-0.5">
                    {user.isAnonymous ? 'Progress lives in this browser only' : 'Verified Learner'}
                  </div>
                  <div className="text-xs text-fg-muted truncate mt-0.5 font-mono">
                    System: Active &middot; {staminaScore} Stamina
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  {user.isAnonymous && onOpenAccount && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setAccountMenuOpen(false);
                          onOpenAccount('save');
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 font-semibold text-fg hover:bg-surface-2/5 rounded-lg text-left cursor-pointer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-gold" />
                        <span>Save your progress</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAccountMenuOpen(false);
                          onOpenAccount('signin');
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 font-medium text-fg-body hover:text-fg hover:bg-surface-2/5 rounded-lg text-left cursor-pointer"
                      >
                        <LogIn className="w-3.5 h-3.5 text-fg-muted" />
                        <span>Sign in</span>
                      </button>
                    </>
                  )}

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
                    <span className="font-mono text-xs font-bold text-fg-muted px-2 py-0.5 rounded bg-surface-2/5 border border-line ">
                      {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                    </span>
                  </button>

                  {!user.isAnonymous && onSignOut && (
                    <button
                      type="button"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        onSignOut();
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 font-medium text-fg-body hover:text-fg hover:bg-surface-2/5 rounded-lg text-left cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5 text-fg-muted" />
                      <span>Sign out</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <MobileNavDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        activeView={activeView}
        onSelectView={(view) => {
          setDrawerOpen(false);
          selectView(view);
        }}
        inquiryCount={inquiries.length}
        theme={theme}
        onToggleTheme={toggleTheme}
        onSaveProgress={
          user.isAnonymous && onOpenAccount
            ? () => {
                setDrawerOpen(false);
                onOpenAccount('save');
              }
            : undefined
        }
      />
    </header>
  );
};

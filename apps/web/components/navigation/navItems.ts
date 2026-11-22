import { LayoutDashboard, Library, MonitorPlay, Network, Users, type LucideIcon } from 'lucide-react';

export type TopNavView = 'home' | 'workspace' | 'workspaces' | 'masterclass' | 'community' | 'create' | 'profile';

export const NAV_ITEMS: ReadonlyArray<{ view: TopNavView; label: string; Icon: LucideIcon }> = [
  { view: 'home', label: 'Overview', Icon: LayoutDashboard },
  { view: 'workspace', label: 'Knowledge Graph', Icon: Network },
  { view: 'workspaces', label: 'Workspaces', Icon: Library },
  { view: 'masterclass', label: 'Masterclass', Icon: MonitorPlay },
  { view: 'community', label: 'Community', Icon: Users },
];

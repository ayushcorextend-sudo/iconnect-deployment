import { memo, useMemo } from 'react';
import {
  LayoutDashboard, BookOpen, GraduationCap, Sparkles, User,
  Upload, ClipboardCheck, Bell,
  Users, BarChart3, Settings,
} from 'lucide-react';

/**
 * BottomNav — native-feeling tab bar for mobile PWA.
 *
 * Rules:
 * - Rendered at <768px only (CSS controls visibility via .bottom-nav display)
 * - Role-aware items: doctor / contentadmin / superadmin
 * - Safe-area aware via .bottom-nav padding in mobile.css
 * - Opens Sparkles → triggers chatbot mode 'chat' for doctor
 * - Active state derived from `page` prop (matches Sidebar page keys)
 * - 5 items max per role (Apple HIG / Material guidance)
 */

// Role → 5-item nav config. `key` maps to useAppStore.page values.
const NAV_ITEMS = {
  doctor: [
    { key: 'dashboard', label: 'Home',    Icon: LayoutDashboard },
    { key: 'ebooks',    label: 'Library', Icon: BookOpen },
    { key: 'exam',      label: 'Exams',   Icon: GraduationCap },
    { key: '__ai',      label: 'AI',      Icon: Sparkles, isAI: true },
    { key: 'profile',   label: 'Profile', Icon: User },
  ],
  contentadmin: [
    { key: 'dashboard',     label: 'Home',         Icon: LayoutDashboard },
    { key: 'upload',        label: 'Upload',       Icon: Upload },
    { key: 'exam-manage',   label: 'Exams',        Icon: ClipboardCheck },
    { key: 'notifications', label: 'Alerts',       Icon: Bell,            badgeKey: 'unread' },
    { key: 'profile',       label: 'Profile',      Icon: User },
  ],
  superadmin: [
    { key: 'dashboard',     label: 'Home',     Icon: LayoutDashboard },
    { key: 'users',         label: 'Users',    Icon: Users },
    { key: 'reports',       label: 'Reports',  Icon: BarChart3 },
    { key: 'notifications', label: 'Alerts',   Icon: Bell,           badgeKey: 'unread' },
    { key: 'settings',      label: 'Settings', Icon: Settings },
  ],
};

function BottomNav({
  role,
  page,
  setPage,
  unreadCount = 0,
  pendingCount = 0,
  onOpenAI,
}) {
  const items = useMemo(() => NAV_ITEMS[role] || NAV_ITEMS.doctor, [role]);

  // Map an item's badgeKey to the actual count from props
  const getBadge = (badgeKey) => {
    if (badgeKey === 'unread') return unreadCount;
    if (badgeKey === 'pending') return pendingCount;
    return 0;
  };

  const handleTap = (item) => {
    // Haptic feedback on iOS/Android where supported
    if (navigator.vibrate) {
      try { navigator.vibrate(8); } catch (e) { /* ignore */ }
    }
    if (item.isAI) {
      if (onOpenAI) onOpenAI();
      return;
    }
    if (item.key !== page) setPage(item.key);
  };

  return (
    <nav className="bottom-nav" aria-label="Primary navigation" role="navigation">
      <div className="bottom-nav-inner">
        {items.map((item) => {
          const { Icon } = item;
          const isActive = !item.isAI && page === item.key;
          const badge = item.badgeKey ? getBadge(item.badgeKey) : 0;
          return (
            <button
              key={item.key}
              type="button"
              className={`bottom-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => handleTap(item)}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon strokeWidth={isActive ? 2.25 : 1.75} />
              <span>{item.label}</span>
              {badge > 0 && (
                <span className="bottom-nav-badge" aria-label={`${badge} unread`}>
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default memo(BottomNav);

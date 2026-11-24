import { useState } from 'react';
import { useInterview } from '../context/InterviewContext';
import { translate } from '../i18n';
import { 
  Home, MessageSquare, LayoutDashboard, Clock, FileText, User, Settings, LogOut,
  Mic, MicOff, Camera, CameraOff, RefreshCw, Phone, Video, PhoneOff, Clock as ClockIcon,
  Bot, Lightbulb, Menu as MenuIcon, X
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: Home, href: '#', active: false },
  { id: 'new', label: 'New Interview', icon: MessageSquare, href: '#', active: true, isCodeIcon: true },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '#', active: false },
  { id: 'history', label: 'History', icon: Clock, href: '#', active: false },
  { id: 'cv', label: 'CV Analysis', icon: FileText, href: '#', active: false },
  { id: 'profile', label: 'Profile', icon: User, href: '#', active: false },
  { id: 'settings', label: 'Settings', icon: Settings, href: '#', active: false },
];

function NavCodeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6"></polyline>
      <polyline points="8 6 2 12 8 18"></polyline>
    </svg>
  );
}

function MirvuLogo({ collapsed = false }) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        <svg className="absolute -right-1 -bottom-1 w-3 h-3" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2">
          <path d="M23 7l-7 5 7 5V7z"></path>
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
        </svg>
      </div>
      {!collapsed && <span className="text-white text-xl font-bold tracking-tight">Mirvu</span>}
    </div>
  );
}

export function Sidebar({ collapsed = false, onToggle, user, className = '' }) {
  const { state } = useInterview();
  const t = (key) => translate(state.config.language, key);
  const [mobileOpen, setMobileOpen] = useState(false);
  const displayUser = user || { fullName: 'User', initials: 'U', roleTitle: '' };
  
  return (
    <>
      <aside className={`
        fixed left-0 top-0 h-full w-[265px] bg-[#0B2A5B] flex flex-col z-40 transition-all duration-300
        ${collapsed ? 'w-[80px]' : 'w-[265px]'} ${className}
      `}>
        <div className="flex items-center justify-between h-16 px-5 border-b border-white/10">
          <MirvuLogo collapsed={collapsed} />
        </div>
        <div className="px-5 py-4">
          <p className="text-[10px] font-semibold text-white/50 uppercase tracking-wider mb-4">{t('MENU')}</p>
          <nav className="space-y-1" role="navigation" aria-label="Main navigation">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.id}
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                    ${item.active 
                      ? 'bg-[#2563EB] text-white' 
                      : 'text-white/70 hover:bg-white/10 hover:text-white'}
                  `}
                >
                  <span className="flex-shrink-0 w-5 h-5">
                    {item.isCodeIcon ? <NavCodeIcon /> : <Icon className="w-5 h-5" />}
                  </span>
                  {!collapsed && <span>{t(item.label)}</span>}
                </a>
              );
            })}
          </nav>
        </div>
        <div className="mt-auto p-4">
          <div className="rounded-xl border border-white/20 bg-white/5 p-3">
            <button className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-white/30 text-white/80 text-sm hover:bg-white/10 transition-colors" aria-label="Log out">
              <LogOut className="w-4 h-4" /> {!collapsed && <span>{t('Log out')}</span>}
            </button>
            <div className="border-t border-white/10 my-3"></div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#2563EB]/30 flex items-center justify-center text-white font-bold text-sm">
                {displayUser.initials}
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{displayUser.fullName}</p>
                  <p className="text-[11px] text-white/50 truncate">{displayUser.roleTitle}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
      {/* Mobile drawer would be added here if needed */}
    </>
  );
}

export function Header({ 
  session,
  user,
  timeLeft,
  onEndInterview,
  onMenuToggle,
  className = ''
}) {
  const { state } = useInterview();
  const t = (key) => translate(state.config.language, key);
  const displayUser = user || { initials: 'U' };
  const displaySession = session || { 
    interviewType: 'Interview', 
    topic: '', 
    level: '', 
    language: '',
    interviewerName: 'Aria'
  };
  
  const subtitle = [displaySession.interviewType, displaySession.topic, displaySession.level, displaySession.language]
    .filter(Boolean).join(' · ');
  
  return (
    <header className={`fixed top-0 left-[265px] right-0 h-[72px] bg-white border-b border-gray-200 z-30 flex items-center justify-between px-6 ${className}`}>
      <div className="flex items-center gap-4">
        <button onClick={onMenuToggle} className="lg:hidden p-2 rounded-lg hover:bg-gray-100" aria-label="Open menu">
          <MenuIcon className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          <span className="font-bold text-[#0B1F4D]">{t('Interview in progress')}</span>
        </div>
        {subtitle && <span className="text-sm text-[#5B6B8C] hidden md:inline">· {subtitle}</span>}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100">
          <ClockIcon className="w-4 h-4 text-[#2563EB]" />
          <span className="font-mono text-sm text-[#0B1F4D]">{timeLeft || '00:00'} {t('left')}</span>
        </div>
        <button onClick={onEndInterview} className="px-4 py-2 bg-white border border-red-300 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors" aria-label="End interview">
          {t('End interview')}
        </button>
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-[#2563EB] font-bold text-sm">
          {displayUser.initials}
        </div>
      </div>
    </header>
  );
}

export function InterviewLayout({ children, user, session, timeLeft, onEndInterview }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  
  return (
    <div className="min-h-screen bg-[#F3F7FE]">
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
        user={user}
      />
      <Header 
        user={user}
        session={session}
        timeLeft={timeLeft}
        onEndInterview={onEndInterview}
        onMenuToggle={() => setMobileSidebarOpen(true)}
      />
      <main className={`pt-[72px] pl-[265px] min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'pl-[80px]' : 'pl-[265px]'}`}>
        <div className="max-w-[1060px] mx-auto p-6 space-y-4">
          {children}
        </div>
      </main>
    </div>
  );
}

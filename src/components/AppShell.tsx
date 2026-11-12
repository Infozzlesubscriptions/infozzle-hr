import { Bell, CalendarDays, ChartNoAxesCombined, ClipboardCheck, FileClock, Gauge, House, LogOut, Menu, Settings, Users, X } from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'

const nav = [
  { to: '/', label: 'Overview', icon: Gauge }, { to: '/employees', label: 'Employees', icon: Users },
  { to: '/leave', label: 'Leave', icon: ClipboardCheck }, { to: '/wfh', label: 'Work from home', icon: House },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays }, { to: '/onboarding', label: 'Onboarding', icon: FileClock },
  { to: '/reports', label: 'Reports', icon: ChartNoAxesCombined }, { to: '/audit-logs', label: 'Audit logs', icon: FileClock },
  { to: '/settings', label: 'Settings', icon: Settings },
]

function Navigation({ close }: { close?: () => void }) {
  return <nav className="space-y-1">{nav.map(({ to, label, icon: Icon }) => <NavLink end={to === '/'} onClick={close} key={to} to={to} className={({ isActive }) => clsx('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition', isActive ? 'bg-lime text-forest-deep' : 'text-white/67 hover:bg-white/8 hover:text-white')}><Icon className="size-[18px]" />{label}</NavLink>)}</nav>
}

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { data: unread = 0 } = useQuery({ queryKey: ['notifications', 'unread-count'], queryFn: () => api.get<{ count: number }>('/notifications/unread-count').then(r => r.data.count), refetchInterval: 60_000 })
  const signOut = async () => { await logout(); navigate('/login') }
  return <div className="min-h-screen bg-paper lg:grid lg:grid-cols-[248px_1fr]">
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col bg-forest-deep p-5 lg:flex">
      <Brand /><div className="mt-8 flex-1 overflow-y-auto"><Navigation /></div><Profile user={user} onLogout={signOut} />
    </aside>
    {mobileOpen && <div className="fixed inset-0 z-50 bg-forest-deep p-5 lg:hidden"><div className="flex items-center justify-between"><Brand /><button aria-label="Close navigation" className="text-white" onClick={() => setMobileOpen(false)}><X /></button></div><div className="mt-8"><Navigation close={() => setMobileOpen(false)} /></div><div className="absolute inset-x-5 bottom-5"><Profile user={user} onLogout={signOut} /></div></div>}
    <div className="lg:col-start-2">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-black/7 bg-paper/90 px-4 backdrop-blur-xl sm:px-7">
        <button aria-label="Open navigation" className="rounded-lg p-2 lg:hidden" onClick={() => setMobileOpen(true)}><Menu /></button><p className="hidden text-sm text-black/45 sm:block">People operations / <span className="font-semibold text-ink">Workspace</span></p>
        <button aria-label="Notifications" onClick={() => navigate('/notifications')} className="relative rounded-xl border border-black/8 bg-white p-2.5"><Bell className="size-5" />{unread > 0 && <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-clay px-1 text-[10px] font-bold text-white">{unread > 9 ? '9+' : unread}</span>}</button>
      </header>
      <main className="mx-auto max-w-[1500px] p-4 sm:p-7 lg:p-9"><Outlet /></main>
    </div>
  </div>
}

function Brand() { return <div className="flex items-center gap-3"><div className="rounded-lg bg-white px-2 py-1.5"><img src="/infozzle-logo.png" alt="Infozzle" className="h-7 w-auto" /></div><p className="text-[10px] uppercase tracking-[.2em] text-white/45">HR portal</p></div> }
function Profile({ user, onLogout }: { user: ReturnType<typeof useAuth>['user']; onLogout: () => void }) { return <div className="flex items-center gap-3 border-t border-white/10 pt-4"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-mint text-sm font-bold text-forest">{user?.name?.slice(0, 2).toUpperCase()}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-white">{user?.name}</p><p className="text-xs text-white/45">{user?.role}</p></div><button aria-label="Log out" className="text-white/55 hover:text-white" onClick={onLogout}><LogOut className="size-4" /></button></div> }

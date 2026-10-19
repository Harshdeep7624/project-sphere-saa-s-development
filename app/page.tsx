'use client'

import { useState } from 'react'
import {
  Bell, BookOpen, CalendarDays, CheckCircle2, ChevronDown, CircleHelp,
  Clock3, FolderKanban, LayoutDashboard, LogOut, Menu, MessageSquare,
  MoreHorizontal, Plus, Search, Settings, Sparkles, Target, Users, X,
} from 'lucide-react'

const navItems = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Projects', icon: FolderKanban },
  { label: 'Tasks', icon: CheckCircle2, count: '6' },
  { label: 'Milestones', icon: Target },
  { label: 'Notifications', icon: Bell, count: '3' },
]

const projects = [
  { name: 'Campus Connect', type: 'Web application', progress: 78, color: 'indigo', members: 4, deadline: 'Oct 24' },
  { name: 'EcoTrack Mobile', type: 'Mobile application', progress: 46, color: 'teal', members: 3, deadline: 'Nov 08' },
  { name: 'Study Buddy AI', type: 'Research project', progress: 32, color: 'amber', members: 5, deadline: 'Dec 02' },
]

const activities = [
  { icon: CheckCircle2, title: 'You completed “API integration”', detail: 'Campus Connect · 12 min ago', tone: 'green' },
  { icon: MessageSquare, title: 'Dr. Williams left feedback', detail: 'EcoTrack Mobile · 1 hr ago', tone: 'purple' },
  { icon: Users, title: 'Maya joined your project', detail: 'Study Buddy AI · 3 hrs ago', tone: 'orange' },
]

function ProgressRing({ value }: { value: number }) {
  return <div className="progress-ring" style={{ '--progress': `${value * 3.6}deg` } as React.CSSProperties}><span>{value}%</span></div>
}

function Sidebar({ active, setActive, open, setOpen }: { active: string; setActive: (value: string) => void; open: boolean; setOpen: (value: boolean) => void }) {
  return <>
    {open && <button aria-label="Close menu" className="sidebar-overlay" onClick={() => setOpen(false)} />}
    <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
      <div className="brand"><div className="brand-mark"><Sparkles size={17} /></div><span>Project<span className="brand-accent">Sphere</span></span><button className="mobile-close" onClick={() => setOpen(false)}><X size={18} /></button></div>
      <div className="workspace"><div className="workspace-avatar">CS</div><div><strong>Computer Science</strong><small>2024 · Semester 2</small></div><ChevronDown size={15} className="muted-icon" /></div>
      <nav className="nav-list" aria-label="Main navigation">
        <span className="nav-label">Workspace</span>
        {navItems.map(({ label, icon: Icon, count }) => <button key={label} className={`nav-item ${active === label ? 'nav-active' : ''}`} onClick={() => { setActive(label); setOpen(false) }}><Icon size={18} strokeWidth={1.8} /><span>{label}</span>{count && <b>{count}</b>}</button>)}
        <span className="nav-label nav-label-spaced">Personal</span>
        <button className="nav-item"><CalendarDays size={18} strokeWidth={1.8} /><span>Calendar</span></button>
        <button className="nav-item"><BookOpen size={18} strokeWidth={1.8} /><span>Resources</span></button>
      </nav>
      <div className="sidebar-bottom"><button className="nav-item"><CircleHelp size={18} /><span>Help center</span></button><button className="nav-item"><Settings size={18} /><span>Settings</span></button><div className="profile"><div className="profile-avatar">AM</div><div><strong>Alex Morgan</strong><small>Student</small></div><MoreHorizontal size={18} className="muted-icon" /></div></div>
    </aside>
  </>
}

function Dashboard() {
  return <div className="dashboard-content">
    <section className="welcome-row"><div><p className="eyebrow">MONDAY, OCTOBER 19, 2026</p><h1>Good morning, Alex <span aria-hidden="true">✦</span></h1><p className="subtitle">Here&apos;s what&apos;s happening across your projects.</p></div><button className="primary-btn"><Plus size={17} /> New project</button></section>
    <div className="demo-notice"><Sparkles size={16} /><span><strong>Prototype workspace</strong> · You&apos;re viewing sample data for demonstration purposes.</span><button aria-label="Dismiss notice"><X size={15} /></button></div>
    <section className="stats-grid"><div className="stat-card"><div className="stat-icon indigo-bg"><FolderKanban size={18} /></div><div><span>Active projects</span><strong>3</strong><small className="stat-positive">+1 this semester</small></div></div><div className="stat-card"><div className="stat-icon orange-bg"><Clock3 size={18} /></div><div><span>Pending tasks</span><strong>6</strong><small>2 due this week</small></div></div><div className="stat-card"><div className="stat-icon teal-bg"><Target size={18} /></div><div><span>Avg. completion</span><strong>52%</strong><small className="stat-positive">+8% vs. last month</small></div></div><div className="stat-card"><div className="stat-icon rose-bg"><Bell size={18} /></div><div><span>Unread updates</span><strong>3</strong><small>From faculty &amp; peers</small></div></div></section>
    <div className="section-heading"><div><h2>Active projects</h2><p>Keep your capstone work moving forward.</p></div><button className="text-btn">View all <span>→</span></button></div>
    <section className="project-grid">{projects.map((project) => <article className="project-card" key={project.name}><div className="project-top"><div className={`project-logo ${project.color}`}><FolderKanban size={19} /></div><button className="icon-btn" aria-label={`More options for ${project.name}`}><MoreHorizontal size={19} /></button></div><h3>{project.name}</h3><p className="project-type">{project.type}</p><div className="project-meta"><span><Users size={14} /> {project.members} members</span><span><CalendarDays size={14} /> {project.deadline}</span></div><div className="progress-line"><span style={{ width: `${project.progress}%` }} className={project.color} /></div><div className="progress-label"><span>Progress</span><strong>{project.progress}%</strong></div></article>)}</section>
    <section className="lower-grid"><article className="panel completion-panel"><div className="panel-heading"><div><h2>Project completion</h2><p>Progress across your active work</p></div><button className="select-btn">This semester <ChevronDown size={14} /></button></div><div className="chart-area"><div className="chart-y"><span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span></div><div className="chart"><div className="grid-lines"><i /><i /><i /><i /><i /></div><svg viewBox="0 0 600 170" preserveAspectRatio="none" aria-label="Project completion trend chart"><defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#6657d9" stopOpacity=".22" /><stop offset="100%" stopColor="#6657d9" stopOpacity="0" /></linearGradient></defs><path d="M0 146 C45 139, 70 145, 105 121 S160 110, 195 116 S240 94, 280 91 S330 104, 360 80 S400 75, 440 58 S485 63, 520 39 S565 28, 600 22 L600 170 L0 170Z" fill="url(#chartFill)" /><path d="M0 146 C45 139, 70 145, 105 121 S160 110, 195 116 S240 94, 280 91 S330 104, 360 80 S400 75, 440 58 S485 63, 520 39 S565 28, 600 22" fill="none" stroke="#6657d9" strokeWidth="3" strokeLinecap="round" /></svg><div className="chart-x"><span>Sep 01</span><span>Sep 15</span><span>Oct 01</span><span>Oct 15</span><span>Oct 30</span></div></div></div></article><article className="panel"><div className="panel-heading"><div><h2>Upcoming deadlines</h2><p>Stay ahead of what&apos;s next.</p></div><button className="icon-btn"><MoreHorizontal size={19} /></button></div><div className="deadline-list"><div className="deadline-item"><div className="date-box"><strong>24</strong><span>OCT</span></div><div><strong>Final UI prototype</strong><small>Campus Connect · in 5 days</small></div><span className="priority high">High</span></div><div className="deadline-item"><div className="date-box"><strong>28</strong><span>OCT</span></div><div><strong>Research methodology</strong><small>Study Buddy AI · in 9 days</small></div><span className="priority medium">Medium</span></div><div className="deadline-item"><div className="date-box"><strong>08</strong><span>NOV</span></div><div><strong>Beta release</strong><small>EcoTrack Mobile · in 20 days</small></div><span className="priority low">Low</span></div></div></article></section>
    <section className="bottom-grid"><article className="panel"><div className="panel-heading"><div><h2>Recent activity</h2><p>Latest updates from your workspace.</p></div><button className="text-btn">See all <span>→</span></button></div><div className="activity-list">{activities.map(({ icon: Icon, title, detail, tone }) => <div className="activity" key={title}><div className={`activity-icon ${tone}`}><Icon size={16} /></div><div><strong>{title}</strong><small>{detail}</small></div><button className="icon-btn"><MoreHorizontal size={17} /></button></div>)}</div></article><article className="tip-card"><div className="tip-glow" /><Sparkles size={20} className="tip-spark" /><p className="eyebrow">CAPSTONE TIP</p><h2>Small steps make big progress.</h2><p>Break your next milestone into smaller tasks to keep momentum and make progress visible to your team.</p><button className="tip-btn">Explore task planning <span>→</span></button></article></section>
  </div>
}

export default function Page() {
  const [active, setActive] = useState('Overview')
  const [open, setOpen] = useState(false)
  return <div className="app-shell"><Sidebar active={active} setActive={setActive} open={open} setOpen={setOpen} /><main className="main"><header className="topbar"><button className="menu-btn" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu size={21} /></button><div className="breadcrumbs"><span>Workspace</span><span>/</span><strong>{active}</strong></div><div className="top-actions"><button className="search-btn"><Search size={18} /><span>Search anything...</span><kbd>⌘ K</kbd></button><button className="top-icon" aria-label="Notifications"><Bell size={19} /><i /></button><div className="top-avatar">AM</div></div></header><div className="page-wrap">{active === 'Overview' ? <Dashboard /> : <div className="empty-view"><div className="empty-icon"><FolderKanban size={28} /></div><h1>{active}</h1><p>This area is ready for your {active.toLowerCase()} workflow. Connect it to the Express.js backend when you&apos;re ready.</p><span className="sample-pill"><Sparkles size={14} /> Frontend prototype</span></div>}</div></main></div>
}

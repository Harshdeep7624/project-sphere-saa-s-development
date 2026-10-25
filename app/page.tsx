"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
Activity,
Bell,
BookOpen,
CalendarDays,
CheckCircle2,
ChevronDown,
CircleHelp,
Clock,
FolderKanban,
LayoutDashboard,
LogOut,
Menu,
Plus,
Search,
Settings,
Sparkles,
Users,
X,
} from "lucide-react";

type UserRole = "student" | "faculty" | "admin";

type CurrentUser = {
id: string;
name: string;
email: string;
role: UserRole;
};

type Project = {
_id: string;
title: string;
description: string;
category: string;
status: string;
deadline: string;
githubUrl?: string;
createdAt?: string;
};

const navItems = [
{ label: "Overview", icon: LayoutDashboard },
{ label: "My Projects", icon: FolderKanban },
{ label: "My Tasks", icon: CheckCircle2 },
{ label: "Team", icon: Users },
];

const categories = [
"Web Development",
"AI/ML",
"Data Science",
"Mobile App",
"Other",
];

function Sidebar({
active,
setActive,
open,
setOpen,
user,
onLogout,
loggingOut,
}: {
active: string;
setActive: (value: string) => void;
open: boolean;
setOpen: (value: boolean) => void;
user: CurrentUser;
onLogout: () => void;
loggingOut: boolean;
}) {
const initials = user.name
.trim()
.split(/\s+/)
.map((part) => part[0])
.join("")
.slice(0, 2)
.toUpperCase();

return (
<>
{open && (
<button
className="sidebar-overlay"
onClick={() => setOpen(false)}
aria-label="Close navigation"
/>
)}


  <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
    <div className="brand">
      <div className="brand-mark">
        <Sparkles size={17} />
      </div>

      <span>
        Project<span className="brand-accent">Sphere</span>
      </span>

      <button
        className="mobile-close"
        onClick={() => setOpen(false)}
        aria-label="Close menu"
      >
        <X size={18} />
      </button>
    </div>

    <div className="workspace">
      <div className="workspace-avatar">CS</div>

      <div>
        <strong>Computer Science</strong>
        <small>Academic Workspace</small>
      </div>

      <ChevronDown size={15} className="muted-icon" />
    </div>

    <nav className="nav-list" aria-label="Main navigation">
      <span className="nav-label">Workspace</span>

      {navItems.map(({ label, icon: Icon }) => (
        <button
          key={label}
          className={`nav-item ${
            active === label ? "nav-active" : ""
          }`}
          onClick={() => {
            setActive(label);
            setOpen(false);
          }}
        >
          <Icon size={18} strokeWidth={1.8} />
          <span>{label}</span>
        </button>
      ))}

      <span className="nav-label nav-label-spaced">Personal</span>

      <button
        className={`nav-item ${
          active === "Calendar" ? "nav-active" : ""
        }`}
        onClick={() => {
          setActive("Calendar");
          setOpen(false);
        }}
      >
        <CalendarDays size={18} />
        <span>Calendar</span>
      </button>

      <button
        className={`nav-item ${
          active === "Resources" ? "nav-active" : ""
        }`}
        onClick={() => {
          setActive("Resources");
          setOpen(false);
        }}
      >
        <BookOpen size={18} />
        <span>Resources</span>
      </button>
    </nav>

    <div className="sidebar-bottom">
      <button className="nav-item">
        <CircleHelp size={18} />
        <span>Help center</span>
      </button>

      <button className="nav-item">
        <Settings size={18} />
        <span>Settings</span>
      </button>

      <div className="profile">
        <div className="profile-avatar">{initials}</div>

        <div className="profile-details">
          <strong>{user.name}</strong>
          <small>{user.role}</small>
        </div>

        <button
          type="button"
          className="icon-btn"
          onClick={onLogout}
          disabled={loggingOut}
          aria-label="Log out"
          title="Log out"
        >
          <LogOut size={18} />
        </button>
      </div>
    </div>
  </aside>
</>


);
}

function CreateProjectModal({
onClose,
onCreated,
}: {
onClose: () => void;
onCreated: () => void;
}) {
const [title, setTitle] = useState("");
const [description, setDescription] = useState("");
const [category, setCategory] = useState("AI/ML");
const [deadline, setDeadline] = useState("");
const [githubUrl, setGithubUrl] = useState("");
const [saving, setSaving] = useState(false);
const [error, setError] = useState("");

async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
event.preventDefault();
setSaving(true);
setError("");

try {
  const response = await fetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({
      title,
      description,
      category,
      deadline,
      githubUrl,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    setError(data.message || "Unable to create project.");
    return;
  }

  onCreated();
  onClose();
} catch {
  setError("Unable to connect to the server. Please try again.");
} finally {
  setSaving(false);
}

}

return (
<div
className="modal-backdrop"
onMouseDown={(event) => {
if (event.target === event.currentTarget && !saving) {
onClose();
}
}}
> <section
     className="project-modal"
     role="dialog"
     aria-modal="true"
     aria-labelledby="create-project-title"
   > <div className="modal-heading"> <div> <span className="eyebrow"> <Sparkles size={14} /> PROJECT WORKSPACE </span> <h2 id="create-project-title">Create a project</h2> <p>Start planning your next academic project.</p> </div>


      <button
        type="button"
        className="icon-btn"
        onClick={onClose}
        disabled={saving}
        aria-label="Close form"
      >
        <X size={20} />
      </button>
    </div>

    <form onSubmit={handleSubmit} className="project-form">
      <label>
        Project title
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="e.g. AI-Powered Attendance System"
          minLength={3}
          maxLength={100}
          required
        />
      </label>

      <label>
        Description
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Describe your project, its goals, and its features..."
          maxLength={2000}
          rows={4}
          required
        />
      </label>

      <label>
        Category
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          required
        >
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>

      <label>
        Project deadline
        <input
          type="date"
          value={deadline}
          onChange={(event) => setDeadline(event.target.value)}
          required
        />
      </label>

      <label>
        GitHub repository URL <span>(optional)</span>
        <input
          type="url"
          value={githubUrl}
          onChange={(event) => setGithubUrl(event.target.value)}
          placeholder="https://github.com/username/repository"
        />
      </label>

      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}

      <div className="modal-actions">
        <button
          type="button"
          className="secondary-button"
          onClick={onClose}
          disabled={saving}
        >
          Cancel
        </button>

        <button
          type="submit"
          className="primary-button"
          disabled={saving}
        >
          <Plus size={17} />
          {saving ? "Creating..." : "Create Project"}
        </button>
      </div>
    </form>
  </section>
</div>


);
}

function Dashboard({
user,
projects,
projectsLoading,
projectsError,
onCreateProject,
onRetry,
}: {
user: CurrentUser;
projects: Project[];
projectsLoading: boolean;
projectsError: string;
onCreateProject: () => void;
onRetry: () => void;
}) {
const firstName = user.name.trim().split(/\s+/)[0];

const pendingProjects = projects.filter(
(project) => project.status === "Pending"
).length;

const activeProjects = projects.filter(
(project) =>
project.status === "In Progress" || project.status === "Approved"
).length;

function formatDate(value: string) {
const date = new Date(value);


if (Number.isNaN(date.getTime())) return "Date unavailable";

return date.toLocaleDateString("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
});


}

return (
<> <section className="welcome-section"> <div> <span className="eyebrow"> <Sparkles size={14} /> YOUR WORKSPACE </span>

      <h1>
        Welcome back, {firstName} <span aria-hidden="true">✦</span>
      </h1>

      <p className="auth-description">
        Here&apos;s what&apos;s happening with your academic projects.
      </p>
    </div>

    <button className="primary-button" onClick={onCreateProject}>
      <Plus size={17} />
      New Project
    </button>
  </section>

  <section className="stats-grid" aria-label="Project statistics">
    <article className="stat-card">
      <div className="stat-icon">
        <FolderKanban size={20} />
      </div>
      <span>Active Projects</span>
      <strong>{projectsLoading ? "—" : activeProjects}</strong>
      <small>Approved or in-progress projects</small>
    </article>

    <article className="stat-card">
      <div className="stat-icon">
        <CheckCircle2 size={20} />
      </div>
      <span>Completed Projects</span>
      <strong>
        {projectsLoading
          ? "—"
          : projects.filter((project) => project.status === "Completed")
              .length}
      </strong>
      <small>Projects marked as completed</small>
    </article>

    <article className="stat-card">
      <div className="stat-icon">
        <Clock size={20} />
      </div>
      <span>Pending Approval</span>
      <strong>{projectsLoading ? "—" : pendingProjects}</strong>
      <small>Projects awaiting review</small>
    </article>

    <article className="stat-card">
      <div className="stat-icon">
        <Activity size={20} />
      </div>
      <span>Your Role</span>
      <strong className="role-value">
        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
      </strong>
      <small>ProjectSphere account</small>
    </article>
  </section>

  <section className="dashboard-section">
    <div className="section-heading">
      <div>
        <h2>My Projects</h2>
        <p>Your academic projects in one place.</p>
      </div>

      <button
        className="text-button"
        onClick={onCreateProject}
      >
        <Plus size={16} /> New project
      </button>
    </div>

    {projectsError && (
      <div className="empty-state">
        <p>{projectsError}</p>
        <button className="secondary-button" onClick={onRetry}>
          Try again
        </button>
      </div>
    )}

    {projectsLoading && !projectsError && (
      <div className="empty-state">
        <p>Loading your projects...</p>
      </div>
    )}

    {!projectsLoading && !projectsError && projects.length === 0 && (
      <div className="empty-state">
        <div className="empty-icon">
          <FolderKanban size={28} />
        </div>

        <h3>No projects yet</h3>

        <p>
          Create your first academic project to start tracking your work.
        </p>

        <button className="primary-button" onClick={onCreateProject}>
          <Plus size={17} />
          Create your first project
        </button>
      </div>
    )}

    {!projectsLoading && !projectsError && projects.length > 0 && (
      <div className="projects-grid">
        {projects.map((project) => (
          <article className="project-card" key={project._id}>
            <div className="project-card-top">
              <div className="project-card-icon">
                <FolderKanban size={21} />
              </div>

              <span
                className={`project-status status-${project.status
                  .toLowerCase()
                  .replace(/\s+/g, "-")}`}
              >
                {project.status}
              </span>
            </div>

            <h3>{project.title}</h3>

            <p className="project-description">
              {project.description}
            </p>

            <div className="project-meta">
              <span>{project.category}</span>
              <span>
                <CalendarDays size={15} />
                {formatDate(project.deadline)}
              </span>
            </div>

            {project.githubUrl && (
              <a
                className="text-button project-github"
                href={project.githubUrl}
                target="_blank"
                rel="noreferrer"
              >
                View GitHub repository ↗
              </a>
            )}
          </article>
        ))}
      </div>
    )}
  </section>

  <section className="dashboard-section">
    <div className="section-heading">
      <div>
        <h2>Upcoming Tasks</h2>
        <p>Keep track of your next deadlines.</p>
      </div>
    </div>

    <div className="empty-state compact-empty">
      <CheckCircle2 size={25} />
      <p>Task management is coming next.</p>
    </div>
  </section>
</>


);
}

export default function Page() {
const [active, setActive] = useState("Overview");
const [open, setOpen] = useState(false);
const [user, setUser] = useState<CurrentUser | null>(null);
const [checkingAuth, setCheckingAuth] = useState(true);
const [loggingOut, setLoggingOut] = useState(false);
const [authError, setAuthError] = useState("");

const [projects, setProjects] = useState<Project[]>([]);
const [projectsLoading, setProjectsLoading] = useState(true);
const [projectsError, setProjectsError] = useState("");
const [showCreateForm, setShowCreateForm] = useState(false);

const router = useRouter();

async function loadProjects() {
setProjectsLoading(true);
setProjectsError("");

try {
  const response = await fetch("/api/projects", {
    method: "GET",
    cache: "no-store",
    credentials: "same-origin",
  });

  const data = await response.json();

  if (!response.ok) {
    setProjectsError(data.message || "Unable to load projects.");
    return;
  }

  setProjects(Array.isArray(data.projects) ? data.projects : []);
} catch {
  setProjectsError("Unable to connect to the server. Please try again.");
} finally {
  setProjectsLoading(false);
}


}

useEffect(() => {
let cancelled = false;


async function loadUser() {
  try {
    const response = await fetch("/api/auth/me", {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
    });

    if (!response.ok) {
      router.replace("/login");
      return;
    }

    const data = await response.json();

    if (!data.user) {
      router.replace("/login");
      return;
    }

    if (!cancelled) {
      setUser(data.user as CurrentUser);
    }
  } catch {
    if (!cancelled) {
      setAuthError("Unable to verify your session. Please try again.");
    }
  } finally {
    if (!cancelled) {
      setCheckingAuth(false);
    }
  }
}

loadUser();

return () => {
  cancelled = true;
};


}, [router]);

useEffect(() => {
if (user) {
loadProjects();
}
}, [user]);

async function handleLogout() {
setLoggingOut(true);
setAuthError("");

try {
  const response = await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "same-origin",
  });

  if (!response.ok) {
    setAuthError("Logout failed. Please try again.");
    setLoggingOut(false);
    return;
  }

  router.replace("/login");
  router.refresh();
} catch {
  setAuthError("Unable to log out. Please try again.");
  setLoggingOut(false);
}


}

if (checkingAuth) {
return ( <main className="auth-page"> <section className="auth-card"> <div className="auth-brand">
Project<span>Sphere</span> </div> <p className="auth-description">Loading your workspace...</p> </section> </main>
);
}

if (!user) {
return ( <main className="auth-page"> <section className="auth-card"> <h1>Session unavailable</h1> <p className="auth-description">
{authError || "Redirecting you to login..."} </p> <Link href="/login" className="auth-submit">
Go to login </Link> </section> </main>
);
}

return ( <div className="app-shell"> <Sidebar
     active={active}
     setActive={setActive}
     open={open}
     setOpen={setOpen}
     user={user}
     onLogout={handleLogout}
     loggingOut={loggingOut}
   />


  <main className="main">
    <header className="topbar">
      <button
        className="menu-btn"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
      >
        <Menu size={21} />
      </button>

      <div className="breadcrumbs">
        <span>Workspace</span>
        <span>/</span>
        <strong>{active}</strong>
      </div>

      <div className="top-actions">
        <button className="search-btn">
          <Search size={18} />
          <span>Search anything...</span>
          <kbd>Ctrl K</kbd>
        </button>

        <button className="top-icon" aria-label="Notifications">
          <Bell size={19} />
        </button>

        <div className="top-avatar">
          {user.name
            .trim()
            .split(/\s+/)
            .map((part) => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()}
        </div>
      </div>
    </header>

    <div className="page-wrap">
      {authError && (
        <div className="auth-error" role="alert">
          {authError}
        </div>
      )}

      {active === "Overview" || active === "My Projects" ? (
        <>
          {active === "Overview" && (
            <Dashboard
              user={user}
              projects={projects}
              projectsLoading={projectsLoading}
              projectsError={projectsError}
              onCreateProject={() => setShowCreateForm(true)}
              onRetry={loadProjects}
            />
          )}

          {active === "My Projects" && (
            <section className="dashboard-section">
              <div className="section-heading">
                <div>
                  <h2>My Projects</h2>
                  <p>All your saved academic projects.</p>
                </div>

                <button
                  className="primary-button"
                  onClick={() => setShowCreateForm(true)}
                >
                  <Plus size={17} />
                  New Project
                </button>
              </div>

              {projectsLoading && <p>Loading your projects...</p>}

              {projectsError && (
                <div className="empty-state">
                  <p>{projectsError}</p>
                  <button
                    className="secondary-button"
                    onClick={loadProjects}
                  >
                    Try again
                  </button>
                </div>
              )}

              {!projectsLoading &&
                !projectsError &&
                projects.length === 0 && (
                  <div className="empty-state">
                    <FolderKanban size={28} />
                    <h3>No projects yet</h3>
                    <p>Create your first project to get started.</p>
                    <button
                      className="primary-button"
                      onClick={() => setShowCreateForm(true)}
                    >
                      <Plus size={17} />
                      Create Project
                    </button>
                  </div>
                )}

              {!projectsLoading &&
                !projectsError &&
                projects.length > 0 && (
                  <div className="projects-grid">
                    {projects.map((project) => (
                      <article
                        className="project-card"
                        key={project._id}
                      >
                        <div className="project-card-top">
                          <div className="project-card-icon">
                            <FolderKanban size={21} />
                          </div>
                          <span
                            className={`project-status status-${project.status
                              .toLowerCase()
                              .replace(/\s+/g, "-")}`}
                          >
                            {project.status}
                          </span>
                        </div>

                        <h3>{project.title}</h3>
                        <p className="project-description">
                          {project.description}
                        </p>

                        <div className="project-meta">
                          <span>{project.category}</span>
                          <span>
                            <CalendarDays size={15} />
                            {new Date(
                              project.deadline
                            ).toLocaleDateString("en-IN")}
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
            </section>
          )}
        </>
      ) : (
        <section className="empty-view">
          <div className="empty-icon">
            <FolderKanban size={28} />
          </div>

          <h1>{active}</h1>

          <p>
            The {active.toLowerCase()} workspace is ready for the next
            development stage.
          </p>

          <span className="sample-pill">
            <Sparkles size={14} /> ProjectSphere
          </span>
        </section>
      )}
    </div>
  </main>

  {showCreateForm && (
    <CreateProjectModal
      onClose={() => setShowCreateForm(false)}
      onCreated={() => {
        loadProjects();
      }}
    />
  )}
</div>


);
}

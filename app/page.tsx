"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
Activity,
Bell,
BookOpen,
CalendarDays,
CheckCircle2,
ChevronDown,
ChevronLeft,
ChevronRight,
CircleHelp,
Clock,
FolderKanban,
LayoutDashboard,
LogOut,
Menu,
Plus,
Pencil,
Search,
Settings,
Trash2,
Sparkles,
Users,
X,
Check,
ClipboardCheck,
XCircle,
RotateCcw,
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

const projectStatuses = [
"Pending",
"Approved",
"Rejected",
"In Progress",
"Completed",
];
type ReviewProject = {
  _id: string;
  id?: string;
  title: string;
  description: string;
  category: string;
  status: string;
  deadline: string;
  githubUrl?: string;
  createdAt?: string;
  student?: {
    name: string;
    email: string;
  } | null;
};


function dateForInput(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

type TaskCategory =
  | "General"
  | "Planning"
  | "Research"
  | "Documentation"
  | "Development"
  | "Submission"
  | "Other";

type TaskPriority = "Low" | "Medium" | "High";

type TaskStatus = "Pending" | "In Progress" | "Completed";

type TaskItem = {
  _id: string;
  id?: string;
  title: string;
  description: string;
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
  createdAt?: string;
  updatedAt?: string;
};

const taskCategories: TaskCategory[] = [
  "General",
  "Planning",
  "Research",
  "Documentation",
  "Development",
  "Submission",
  "Other",
];

const taskPriorities: TaskPriority[] = ["Low", "Medium", "High"];

const taskStatuses: TaskStatus[] = ["Pending", "In Progress", "Completed"];


function Sidebar({
active,
setActive,
open,
setOpen,
user,
onLogout,
loggingOut,
pendingReviewCount,
}: {
active: string;
setActive: (value: string) => void;
open: boolean;
setOpen: (value: boolean) => void;
user: CurrentUser;
onLogout: () => void;
loggingOut: boolean;
pendingReviewCount?: number;
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
      {(user.role === "faculty" || user.role === "admin") && (
        <button
          type="button"
          className={`nav-item ${
            active === "Review Queue" ? "nav-active" : ""
          }`}
          onClick={() => {
            setActive("Review Queue");
            setOpen(false);
          }}
        >
          <ClipboardCheck size={18} strokeWidth={1.8} />
          <span>Review Queue</span>
          {typeof pendingReviewCount === "number" && pendingReviewCount > 0 && (
            <b>{pendingReviewCount}</b>
          )}
        </button>
      )}

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

function ProjectFormModal({
onClose,
onCreated,
project,
}: {
onClose: () => void;
onCreated: () => void;
project?: Project | null;
}) {
const [title, setTitle] = useState(project?.title ?? "");
const [description, setDescription] = useState(project?.description ?? "");
const [category, setCategory] = useState(project?.category ?? "AI/ML");
const [deadline, setDeadline] = useState(dateForInput(project?.deadline));
const [githubUrl, setGithubUrl] = useState(project?.githubUrl ?? "");
const [saving, setSaving] = useState(false);
const [error, setError] = useState("");

async function handleSubmit(event: FormEvent<HTMLFormElement>) {
event.preventDefault();
setSaving(true);
setError("");

try {
  const response = await fetch(
    project ? `/api/projects/${encodeURIComponent(project._id)}` : "/api/projects",
    {
    method: project ? "PATCH" : "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({
      title,
      description,
      category,
      deadline,
      githubUrl,
    }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    setError(data.message || "Unable to save project.");
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
     aria-labelledby="project-form-title"
   > <div className="modal-heading"> <div> <span className="eyebrow"> <Sparkles size={14} /> PROJECT WORKSPACE </span> <h2 id="project-form-title">{project ? "Edit project" : "Create a project"}</h2> <p>{project ? "Update your project details." : "Start planning your next academic project."}</p> </div>


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
          {project ? <Pencil size={17} /> : <Plus size={17} />}
          {saving ? "Saving..." : project ? "Save Changes" : "Create Project"}
        </button>
      </div>
    </form>
  </section>
</div>

)


}

function TaskFormModal({
  onClose,
  onSaved,
  task,
}: {
  onClose: () => void;
  onSaved: () => void;
  task?: TaskItem | null;
}) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [category, setCategory] = useState<TaskCategory>(task?.category ?? "General");
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? "Medium");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "Pending");
  const [dueDate, setDueDate] = useState(dateForInput(task?.dueDate));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        task ? `/api/tasks/${encodeURIComponent(task._id)}` : "/api/tasks",
        {
          method: task ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            title,
            description,
            category,
            priority,
            status,
            dueDate,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Unable to save task.");
        return;
      }

      onSaved();
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
    >
      <section
        className="project-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-form-title"
      >
        <div className="modal-heading">
          <div>
            <span className="eyebrow">
              <CheckCircle2 size={14} /> TASK WORKSPACE
            </span>
            <h2 id="task-form-title">{task ? "Edit Task" : "Create a Task"}</h2>
            <p>{task ? "Update your task details." : "Add a new task to organize your academic work."}</p>
          </div>

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
            Task title
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Complete Literature Review"
              minLength={3}
              maxLength={120}
              required
            />
          </label>

          <label>
            Description <span>(optional)</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Add extra context, requirements, or notes..."
              maxLength={2000}
              rows={3}
            />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "12px" }}>
            <label>
              Category
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value as TaskCategory)}
                required
              >
                {taskCategories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Priority
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value as TaskPriority)}
                required
              >
                {taskPriorities.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Status
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as TaskStatus)}
                required
              >
                {taskStatuses.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label>
            Due date
            <input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              required
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
              {task ? <Pencil size={17} /> : <Plus size={17} />}
              {saving ? "Saving..." : task ? "Save Changes" : "Create Task"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function ProjectActions({
  project,
  onEdit,
  onDelete,
  deletingProjectId,
}: {
  project: Project;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
  deletingProjectId: string | null;
}) {
  const isDeleting = deletingProjectId === project._id;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "14px" }}>
      <button
        type="button"
        className="secondary-button"
        onClick={() => onEdit(project)}
        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
      >
        <Pencil size={15} />
        Edit
      </button>
      <button
        type="button"
        className="secondary-button"
        onClick={() => onDelete(project)}
        disabled={isDeleting}
        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px", color: "#b42318", borderColor: "#f0b7b2" }}
      >
        <Trash2 size={15} />
        {isDeleting ? "Deleting..." : "Delete"}
      </button>
    </div>
  );
}

function Dashboard({
user,
projects,
displayProjects,
projectsLoading,
projectsError,
onCreateProject,
onRetry,
onEditProject,
onDeleteProject,
deletingProjectId,
tasks,
tasksLoading,
onNavigateTasks,
onCreateTask,
onUpdateTaskStatus,
projectStats,
}: {
user: CurrentUser;
projects: Project[];
displayProjects: Project[];
projectsLoading: boolean;
projectsError: string;
onCreateProject: () => void;
onRetry: () => void;
onEditProject: (project: Project) => void;
onDeleteProject: (project: Project) => void;
deletingProjectId: string | null;
tasks: TaskItem[];
tasksLoading: boolean;
onNavigateTasks: () => void;
onCreateTask: () => void;
onUpdateTaskStatus: (taskId: string, status: TaskStatus) => void;
projectStats?: {
  total: number;
  active: number;
  completed: number;
  pending: number;
};
}) {
const firstName = user.name.trim().split(/\s+/)[0];

const pendingProjects = projectStats
  ? projectStats.pending
  : projects.filter((project) => project.status === "Pending").length;

const activeProjects = projectStats
  ? projectStats.active
  : projects.filter(
      (project) =>
        project.status === "In Progress" || project.status === "Approved"
    ).length;

const completedProjects = projectStats
  ? projectStats.completed
  : projects.filter((project) => project.status === "Completed").length;

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
        {projectsLoading ? "—" : completedProjects}
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

    {!projectsLoading && !projectsError && projects.length > 0 && displayProjects.length === 0 && (
      <div className="empty-state">
        <FolderKanban size={25} />
        <h3>No matching projects</h3>
        <p>Try changing your search or project filters.</p>
      </div>
    )}

    {!projectsLoading && !projectsError && displayProjects.length > 0 && (
      <div className="projects-grid">
        {displayProjects.map((project) => (
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
                View GitHub repository →
              </a>
            )}

            <ProjectActions
              project={project}
              onEdit={onEditProject}
              onDelete={onDeleteProject}
              deletingProjectId={deletingProjectId}
            />
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

      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <button
          className="text-button"
          onClick={onCreateTask}
          type="button"
        >
          <Plus size={16} /> New task
        </button>
        <button
          className="text-button"
          onClick={onNavigateTasks}
          type="button"
        >
          View all tasks →
        </button>
      </div>
    </div>

    {tasksLoading ? (
      <div className="empty-state compact-empty">
        <p>Loading upcoming tasks...</p>
      </div>
    ) : (() => {
      const pendingUpcomingTasks = tasks
        .filter((t) => t.status !== "Completed")
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
        .slice(0, 4);

      if (pendingUpcomingTasks.length === 0) {
        return (
          <div className="empty-state compact-empty">
            <CheckCircle2 size={25} />
            <p>No upcoming pending tasks.</p>
            <button className="secondary-button" onClick={onCreateTask} type="button" style={{ marginTop: "8px" }}>
              <Plus size={15} /> Add a task
            </button>
          </div>
        );
      }

      return (
        <div className="tasks-grid">
          {pendingUpcomingTasks.map((task) => {
            const dueTime = new Date(task.dueDate).getTime();
            const now = Date.now();
            const isOverdue = !Number.isNaN(dueTime) && dueTime < now - 86400000;
            const isDueSoon = !Number.isNaN(dueTime) && !isOverdue && dueTime <= now + 7 * 86400000;

            return (
              <article className="task-item-panel" key={task._id}>
                <div className="task-item-header">
                  <div className="task-item-title-wrap">
                    <h3>{task.title}</h3>
                    {task.description && <p>{task.description}</p>}
                  </div>

                  <div className="task-badges">
                    <span className="sample-pill">{task.category}</span>
                    <span className={`priority ${task.priority.toLowerCase()}`}>
                      {task.priority}
                    </span>
                  </div>
                </div>

                <div className="task-item-footer">
                  <div className="task-meta-left">
                    <span className={isOverdue ? "task-overdue" : isDueSoon ? "task-due-soon" : ""}>
                      <CalendarDays size={14} />
                      Due {formatDate(task.dueDate)}
                      {isOverdue ? " (Overdue)" : isDueSoon ? " (Due soon)" : ""}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <select
                      className="task-status-select"
                      value={task.status}
                      onChange={(e) => onUpdateTaskStatus(task._id, e.target.value as TaskStatus)}
                      aria-label="Change task status"
                    >
                      {taskStatuses.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      );
    })()}
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
const [editingProject, setEditingProject] = useState<Project | null>(null);
const [searchQuery, setSearchQuery] = useState("");
const [categoryFilter, setCategoryFilter] = useState("All categories");
const [statusFilter, setStatusFilter] = useState("All statuses");
const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
const [projectActionError, setProjectActionError] = useState("");
const searchInputRef = useRef<HTMLInputElement>(null);
const [tasks, setTasks] = useState<TaskItem[]>([]);
const [tasksLoading, setTasksLoading] = useState(true);
const [tasksError, setTasksError] = useState("");
const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
const [taskActionError, setTaskActionError] = useState("");
const [taskSearchQuery, setTaskSearchQuery] = useState("");
const [taskCategoryFilter, setTaskCategoryFilter] = useState("All categories");
const [taskPriorityFilter, setTaskPriorityFilter] = useState("All priorities");
const [taskStatusFilter, setTaskStatusFilter] = useState("All statuses");
const [reviewQueue, setReviewQueue] = useState<ReviewProject[]>([]);
const [reviewQueueLoading, setReviewQueueLoading] = useState(false);
const [reviewQueueError, setReviewQueueError] = useState("");
const [reviewingProjectId, setReviewingProjectId] = useState<string | null>(null);
const [reviewSuccessMessage, setReviewSuccessMessage] = useState("");
const [reviewFilterStatus, setReviewFilterStatus] = useState("Pending");
const [reviewSearchQuery, setReviewSearchQuery] = useState("");

const [projectPage, setProjectPage] = useState(1);
const [projectTotalPages, setProjectTotalPages] = useState(1);
const [projectTotal, setProjectTotal] = useState(0);
const [projectStats, setProjectStats] = useState({
  total: 0,
  active: 0,
  completed: 0,
  pending: 0,
});
const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);

const [taskPage, setTaskPage] = useState(1);
const [taskTotalPages, setTaskTotalPages] = useState(1);
const [taskTotal, setTaskTotal] = useState(0);
const [taskStats, setTaskStats] = useState({
  total: 0,
  inProgress: 0,
  dueSoon: 0,
  completed: 0,
});
const [debouncedTaskSearchQuery, setDebouncedTaskSearchQuery] = useState(taskSearchQuery);

const router = useRouter();

async function loadProjects(
  page = projectPage,
  search = debouncedSearchQuery,
  category = categoryFilter,
  status = statusFilter
) {
  setProjectsLoading(true);
  setProjectsError("");

  try {
    const params = new URLSearchParams({
      page: String(page),
      limit: "20",
    });
    if (search.trim()) params.set("search", search.trim());
    if (category !== "All categories") params.set("category", category);
    if (status !== "All statuses") params.set("status", status);

    const response = await fetch(`/api/projects?${params.toString()}`, {
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
    if (typeof data.total === "number") setProjectTotal(data.total);
    if (typeof data.totalPages === "number") setProjectTotalPages(Math.max(1, data.totalPages));
    if (typeof data.page === "number") setProjectPage(data.page);
    if (data.stats) {
      setProjectStats({
        total: data.stats.total ?? 0,
        active: data.stats.active ?? 0,
        completed: data.stats.completed ?? 0,
        pending: data.stats.pending ?? 0,
      });
    }
  } catch {
    setProjectsError("Unable to connect to the server. Please try again.");
  } finally {
    setProjectsLoading(false);
  }
}

async function loadTasks(
  page = taskPage,
  search = debouncedTaskSearchQuery,
  category = taskCategoryFilter,
  priority = taskPriorityFilter,
  status = taskStatusFilter
) {
  setTasksLoading(true);
  setTasksError("");

  try {
    const params = new URLSearchParams({
      page: String(page),
      limit: "20",
    });
    if (search.trim()) params.set("search", search.trim());
    if (category !== "All categories") params.set("category", category);
    if (priority !== "All priorities") params.set("priority", priority);
    if (status !== "All statuses") params.set("status", status);

    const response = await fetch(`/api/tasks?${params.toString()}`, {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
    });

    const data = await response.json();

    if (!response.ok) {
      setTasksError(data.message || "Unable to load tasks.");
      return;
    }

    setTasks(Array.isArray(data.tasks) ? data.tasks : []);
    if (typeof data.total === "number") setTaskTotal(data.total);
    if (typeof data.totalPages === "number") setTaskTotalPages(Math.max(1, data.totalPages));
    if (typeof data.page === "number") setTaskPage(data.page);
    if (data.stats) {
      setTaskStats({
        total: data.stats.total ?? 0,
        inProgress: data.stats.inProgress ?? 0,
        dueSoon: data.stats.dueSoon ?? 0,
        completed: data.stats.completed ?? 0,
      });
    }
  } catch {
    setTasksError("Unable to connect to the server. Please try again.");
  } finally {
    setTasksLoading(false);
  }
}

function handleEditTask(task: TaskItem) {
  setTaskActionError("");
  setShowCreateTaskModal(false);
  setEditingTask(task);
}

async function handleDeleteTask(task: TaskItem) {
  const confirmed = window.confirm(`Delete "${task.title}"? This action cannot be undone.`);
  if (!confirmed) return;

  setTaskActionError("");
  setDeletingTaskId(task._id);

  try {
    const response = await fetch(`/api/tasks/${encodeURIComponent(task._id)}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    const data = await response.json();

    if (!response.ok) {
      setTaskActionError(data.message || "Unable to delete this task.");
      return;
    }

    if (tasks.length === 1 && taskPage > 1) {
      setTaskPage((prev) => Math.max(1, prev - 1));
    } else {
      void loadTasks(taskPage);
    }
  } catch {
    setTaskActionError("Unable to connect to the server. Please try again.");
  } finally {
    setDeletingTaskId(null);
  }
}

async function handleQuickStatusChange(taskId: string, newStatus: TaskStatus) {
  setTaskActionError("");

  // Optimistic update
  setTasks((current) =>
    current.map((item) => (item._id === taskId ? { ...item, status: newStatus } : item))
  );

  try {
    const response = await fetch(`/api/tasks/${encodeURIComponent(taskId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ status: newStatus }),
    });

    const data = await response.json();

    if (!response.ok) {
      setTaskActionError(data.message || "Unable to update task status.");
      void loadTasks();
    }
  } catch {
    setTaskActionError("Unable to connect to the server. Please try again.");
    void loadTasks();
  }
}

  async function loadReviewQueue(status = reviewFilterStatus) {
    if (!user || (user.role !== "faculty" && user.role !== "admin")) return;
    setReviewQueueLoading(true);
    setReviewQueueError("");

    try {
      const response = await fetch(`/api/projects/review-queue?status=${encodeURIComponent(status)}`, {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin",
      });

      const data = await response.json();

      if (!response.ok) {
        setReviewQueueError(data.message || "Unable to load review queue.");
        return;
      }

      setReviewQueue(Array.isArray(data.projects) ? data.projects : []);
    } catch {
      setReviewQueueError("Unable to connect to the server. Please try again.");
    } finally {
      setReviewQueueLoading(false);
    }
  }

  async function handleReviewProject(projectId: string, decision: "Approved" | "Rejected") {
    setReviewingProjectId(projectId);
    setReviewSuccessMessage("");
    setReviewQueueError("");

    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ decision }),
      });

      const data = await response.json();

      if (!response.ok) {
        setReviewQueueError(data.message || `Unable to ${decision.toLowerCase()} project.`);
        return;
      }

      setReviewSuccessMessage(data.message || `Project ${decision.toLowerCase()} successfully!`);

      setReviewQueue((prev) =>
        prev.map((p) => (p._id === projectId ? { ...p, status: decision } : p))
      );

      void loadProjects();
    } catch {
      setReviewQueueError("Unable to connect to the server. Please try again.");
    } finally {
      setReviewingProjectId(null);
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

// Debounce search inputs (300ms)
useEffect(() => {
  const handler = setTimeout(() => {
    setDebouncedSearchQuery(searchQuery);
  }, 300);
  return () => clearTimeout(handler);
}, [searchQuery]);

useEffect(() => {
  const handler = setTimeout(() => {
    setDebouncedTaskSearchQuery(taskSearchQuery);
  }, 300);
  return () => clearTimeout(handler);
}, [taskSearchQuery]);

// Reset to page 1 when project search or filters change
const isInitialProjectFilterMount = useRef(true);
useEffect(() => {
  if (isInitialProjectFilterMount.current) {
    isInitialProjectFilterMount.current = false;
    return;
  }
  setProjectPage(1);
}, [debouncedSearchQuery, categoryFilter, statusFilter]);

// Reset to page 1 when task search or filters change
const isInitialTaskFilterMount = useRef(true);
useEffect(() => {
  if (isInitialTaskFilterMount.current) {
    isInitialTaskFilterMount.current = false;
    return;
  }
  setTaskPage(1);
}, [debouncedTaskSearchQuery, taskCategoryFilter, taskPriorityFilter, taskStatusFilter]);

// Fetch projects whenever page or filters change
useEffect(() => {
  if (user) {
    void loadProjects(projectPage, debouncedSearchQuery, categoryFilter, statusFilter);
  }
}, [user, projectPage, debouncedSearchQuery, categoryFilter, statusFilter]);

// Fetch tasks whenever page or filters change
useEffect(() => {
  if (user) {
    void loadTasks(taskPage, debouncedTaskSearchQuery, taskCategoryFilter, taskPriorityFilter, taskStatusFilter);
  }
}, [user, taskPage, debouncedTaskSearchQuery, taskCategoryFilter, taskPriorityFilter, taskStatusFilter]);

useEffect(() => {
  if (user && (user.role === "faculty" || user.role === "admin")) {
    void loadReviewQueue("Pending");
  }
}, [user]);

useEffect(() => {
  function handleSearchShortcut(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      searchInputRef.current?.focus();
    }
  }

  window.addEventListener("keydown", handleSearchShortcut);
  return () => window.removeEventListener("keydown", handleSearchShortcut);
}, []);

function handleEditProject(project: Project) {
  setProjectActionError("");
  setShowCreateForm(false);
  setEditingProject(project);
}

async function handleDeleteProject(project: Project) {
  const confirmed = window.confirm(`Delete "${project.title}"? This action cannot be undone.`);
  if (!confirmed) return;

  setProjectActionError("");
  setDeletingProjectId(project._id);

  try {
    const response = await fetch(`/api/projects/${encodeURIComponent(project._id)}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    const data = await response.json();

    if (!response.ok) {
      setProjectActionError(data.message || "Unable to delete this project.");
      return;
    }

    if (projects.length === 1 && projectPage > 1) {
      setProjectPage((prev) => Math.max(1, prev - 1));
    } else {
      void loadProjects(projectPage);
    }
  } catch {
    setProjectActionError("Unable to connect to the server. Please try again.");
  } finally {
    setDeletingProjectId(null);
  }
}

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

// Projects and tasks are filtered server-side across all database records
const filteredProjects = projects;
const filteredTasks = tasks;

const normalizedReviewSearch = reviewSearchQuery.trim().toLowerCase();
const filteredReviewQueue = reviewQueue.filter((p) => {
  const matchesSearch =
    !normalizedReviewSearch ||
    [
      p.title,
      p.description,
      p.category,
      p.status,
      p.student?.name || "",
      p.student?.email || "",
    ].some((v) => v.toLowerCase().includes(normalizedReviewSearch));
  return matchesSearch;
});

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
     pendingReviewCount={reviewQueue.filter((p) => p.status === "Pending").length}
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
        <label className="search-btn" style={{ cursor: "text" }}>
          <Search size={18} />
          <input
            ref={searchInputRef}
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search projects..."
            aria-label="Search projects by title, description, category, or status"
            style={{ width: "100%", minWidth: 0, background: "transparent", border: 0, outline: "none", color: "inherit", font: "inherit" }}
          />
          <kbd>Ctrl K</kbd>
        </label>

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

      {projectActionError && (
        <div className="auth-error" role="alert">
          {projectActionError}
        </div>
      )}

      {active === "Overview" || active === "My Projects" ? (
        <>
          {active === "Overview" && (
            <Dashboard
              user={user}
              projects={projects}
              displayProjects={filteredProjects}
              projectsLoading={projectsLoading}
              projectsError={projectsError}
              onCreateProject={() => { setEditingProject(null); setShowCreateForm(true); }}
              onRetry={() => void loadProjects(projectPage)}
              onEditProject={handleEditProject}
              onDeleteProject={handleDeleteProject}
              deletingProjectId={deletingProjectId}
              tasks={tasks}
              tasksLoading={tasksLoading}
              onNavigateTasks={() => setActive("My Tasks")}
              onCreateTask={() => { setEditingTask(null); setShowCreateTaskModal(true); }}
              onUpdateTaskStatus={handleQuickStatusChange}
              projectStats={projectStats}
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

              <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", margin: "12px 0 18px", alignItems: "center" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: "6px", flex: "1 1 180px", fontSize: "13px" }}>
                  Category
                  <select
                    value={categoryFilter}
                    onChange={(event) => setCategoryFilter(event.target.value)}
                    aria-label="Filter projects by category"
                    style={{ border: "1px solid #d7dce3", borderRadius: "10px", padding: "10px 12px", background: "white", color: "#202939", font: "inherit", minWidth: 0 }}
                  >
                    <option>All categories</option>
                    {categories.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: "6px", flex: "1 1 180px", fontSize: "13px" }}>
                  Status
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    aria-label="Filter projects by status"
                    style={{ border: "1px solid #d7dce3", borderRadius: "10px", padding: "10px 12px", background: "white", color: "#202939", font: "inherit", minWidth: 0 }}
                  >
                    <option>All statuses</option>
                    {projectStatuses.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </label>
                {(searchQuery || categoryFilter !== "All categories" || statusFilter !== "All statuses") && (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => { setSearchQuery(""); setCategoryFilter("All categories"); setStatusFilter("All statuses"); }}
                    style={{ alignSelf: "flex-end" }}
                  >
                    Clear filters
                  </button>
                )}
              </div>

              {projectsLoading && <p>Loading your projects...</p>}

              {projectsError && (
                <div className="empty-state">
                  <p>{projectsError}</p>
                  <button
                    className="secondary-button"
                    onClick={() => void loadProjects(projectPage)}
                  >
                    Try again
                  </button>
                </div>
              )}

              {!projectsLoading &&
                !projectsError &&
                projectTotal === 0 &&
                !searchQuery &&
                categoryFilter === "All categories" &&
                statusFilter === "All statuses" && (
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
                projectTotal === 0 &&
                (searchQuery || categoryFilter !== "All categories" || statusFilter !== "All statuses") && (
                  <div className="empty-state">
                    <FolderKanban size={28} />
                    <h3>No matching projects</h3>
                    <p>Try changing your search or filters.</p>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => { setSearchQuery(""); setCategoryFilter("All categories"); setStatusFilter("All statuses"); }}
                    >
                      Clear filters
                    </button>
                  </div>
                )}

              {!projectsLoading &&
                !projectsError &&
                filteredProjects.length > 0 && (
                  <>
                    <div className="projects-grid">
                      {filteredProjects.map((project) => (
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

                          {project.githubUrl && (
                            <a
                              className="text-button project-github"
                              href={project.githubUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              View GitHub repository →
                            </a>
                          )}

                          <ProjectActions
                            project={project}
                            onEdit={handleEditProject}
                            onDelete={handleDeleteProject}
                            deletingProjectId={deletingProjectId}
                          />
                        </article>
                      ))}
                    </div>

                    {/* My Projects Pagination Controls */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: "24px",
                        paddingTop: "16px",
                        borderTop: "1px solid #eef2f6",
                        flexWrap: "wrap",
                        gap: "12px",
                      }}
                    >
                      <span style={{ fontSize: "13px", color: "#64748b" }}>
                        Page <strong>{projectPage}</strong> of <strong>{projectTotalPages}</strong> ({projectTotal} {projectTotal === 1 ? "project" : "projects"})
                      </span>

                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => setProjectPage((prev) => Math.max(1, prev - 1))}
                          disabled={projectPage <= 1 || projectsLoading}
                          aria-label="Previous page of projects"
                        >
                          <ChevronLeft size={16} /> Previous
                        </button>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => setProjectPage((prev) => Math.min(projectTotalPages, prev + 1))}
                          disabled={projectPage >= projectTotalPages || projectsLoading}
                          aria-label="Next page of projects"
                        >
                          Next <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  </>
                )}
            </section>
          )}
        </>
     ) : active === "My Tasks" ? (
  <section className="dashboard-section">
    <div className="welcome-section">
      <div>
        <span className="eyebrow">
          <CheckCircle2 size={14} />
          TASK MANAGEMENT
        </span>

        <h1>My Tasks</h1>

        <p className="auth-description">
          Organize your work, track deadlines, and stay productive.
        </p>
      </div>

      <button
        type="button"
        className="primary-button"
        onClick={() => {
          setEditingTask(null);
          setShowCreateTaskModal(true);
        }}
      >
        <Plus size={17} />
        New Task
      </button>
    </div>

    {/* Live Statistics Grid */}
    <section className="stats-grid" aria-label="Task statistics">
      <article className="stat-card">
        <div className="stat-icon">
          <CheckCircle2 size={20} />
        </div>
        <span>Total Tasks</span>
        <strong>{tasksLoading ? "—" : taskStats.total}</strong>
        <small>Across your workspace</small>
      </article>

      <article className="stat-card">
        <div className="stat-icon">
          <Clock size={20} />
        </div>
        <span>In Progress</span>
        <strong>{tasksLoading ? "—" : taskStats.inProgress}</strong>
        <small>Tasks currently underway</small>
      </article>

      <article className="stat-card">
        <div className="stat-icon">
          <CalendarDays size={20} />
        </div>
        <span>Due Soon</span>
        <strong>{tasksLoading ? "—" : taskStats.dueSoon}</strong>
        <small>Due within 7 days</small>
      </article>

      <article className="stat-card">
        <div className="stat-icon">
          <Activity size={20} />
        </div>
        <span>Completed</span>
        <strong>{tasksLoading ? "—" : taskStats.completed}</strong>
        <small>Finished tasks</small>
      </article>
    </section>

    {/* Filter & Search Bar */}
    <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", margin: "16px 0 20px", alignItems: "center" }}>
      <label style={{ display: "flex", flexDirection: "column", gap: "6px", flex: "1 1 180px", fontSize: "13px" }}>
        Search
        <input
          type="search"
          value={taskSearchQuery}
          onChange={(e) => setTaskSearchQuery(e.target.value)}
          placeholder="Search by title or description..."
          style={{ border: "1px solid #d7dce3", borderRadius: "10px", padding: "9px 12px", background: "white", color: "#202939", font: "inherit", minWidth: 0 }}
        />
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: "6px", flex: "1 1 140px", fontSize: "13px" }}>
        Category
        <select
          value={taskCategoryFilter}
          onChange={(e) => setTaskCategoryFilter(e.target.value)}
          style={{ border: "1px solid #d7dce3", borderRadius: "10px", padding: "10px 12px", background: "white", color: "#202939", font: "inherit", minWidth: 0 }}
        >
          <option>All categories</option>
          {taskCategories.map((item) => <option key={item}>{item}</option>)}
        </select>
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: "6px", flex: "1 1 130px", fontSize: "13px" }}>
        Priority
        <select
          value={taskPriorityFilter}
          onChange={(e) => setTaskPriorityFilter(e.target.value)}
          style={{ border: "1px solid #d7dce3", borderRadius: "10px", padding: "10px 12px", background: "white", color: "#202939", font: "inherit", minWidth: 0 }}
        >
          <option>All priorities</option>
          {taskPriorities.map((item) => <option key={item}>{item}</option>)}
        </select>
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: "6px", flex: "1 1 130px", fontSize: "13px" }}>
        Status
        <select
          value={taskStatusFilter}
          onChange={(e) => setTaskStatusFilter(e.target.value)}
          style={{ border: "1px solid #d7dce3", borderRadius: "10px", padding: "10px 12px", background: "white", color: "#202939", font: "inherit", minWidth: 0 }}
        >
          <option>All statuses</option>
          {taskStatuses.map((item) => <option key={item}>{item}</option>)}
        </select>
      </label>

      {(taskSearchQuery || taskCategoryFilter !== "All categories" || taskPriorityFilter !== "All priorities" || taskStatusFilter !== "All statuses") && (
        <button
          type="button"
          className="secondary-button"
          onClick={() => {
            setTaskSearchQuery("");
            setTaskCategoryFilter("All categories");
            setTaskPriorityFilter("All priorities");
            setTaskStatusFilter("All statuses");
          }}
          style={{ alignSelf: "flex-end" }}
        >
          Clear filters
        </button>
      )}
    </div>

    {taskActionError && (
      <div className="auth-error" role="alert" style={{ marginBottom: "16px" }}>
        {taskActionError}
      </div>
    )}

    {tasksError && (
      <div className="empty-state">
        <p>{tasksError}</p>
        <button className="secondary-button" onClick={() => void loadTasks(taskPage)} type="button">
          Try again
        </button>
      </div>
    )}

    {tasksLoading && !tasksError && (
      <div className="empty-state">
        <p>Loading your tasks...</p>
      </div>
    )}

    {!tasksLoading &&
      !tasksError &&
      taskTotal === 0 &&
      !taskSearchQuery &&
      taskCategoryFilter === "All categories" &&
      taskPriorityFilter === "All priorities" &&
      taskStatusFilter === "All statuses" && (
        <div className="empty-state">
          <div className="empty-icon">
            <CheckCircle2 size={28} />
          </div>
          <h3>No tasks yet</h3>
          <p>Create your first task to start organizing your work and tracking deadlines.</p>
          <button
            className="primary-button"
            type="button"
            onClick={() => {
              setEditingTask(null);
              setShowCreateTaskModal(true);
            }}
          >
            <Plus size={17} />
            Create your first task
          </button>
        </div>
      )}

    {!tasksLoading &&
      !tasksError &&
      taskTotal === 0 &&
      (taskSearchQuery ||
        taskCategoryFilter !== "All categories" ||
        taskPriorityFilter !== "All priorities" ||
        taskStatusFilter !== "All statuses") && (
        <div className="empty-state">
          <CheckCircle2 size={25} />
          <h3>No matching tasks</h3>
          <p>Try changing your search keywords or filters.</p>
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setTaskSearchQuery("");
              setTaskCategoryFilter("All categories");
              setTaskPriorityFilter("All priorities");
              setTaskStatusFilter("All statuses");
            }}
          >
            Clear filters
          </button>
        </div>
      )}

    {!tasksLoading && !tasksError && filteredTasks.length > 0 && (
      <>
        <div className="tasks-grid">
          {filteredTasks.map((task) => {
            const dueTime = new Date(task.dueDate).getTime();
            const now = Date.now();
            const isOverdue = task.status !== "Completed" && !Number.isNaN(dueTime) && dueTime < now - 86400000;
            const isDueSoon = task.status !== "Completed" && !Number.isNaN(dueTime) && !isOverdue && dueTime <= now + 7 * 86400000;
            const isDeleting = deletingTaskId === task._id;

            return (
              <article className="task-item-panel" key={task._id}>
                <div className="task-item-header">
                  <div className="task-item-title-wrap">
                    <h3 style={{ textDecoration: task.status === "Completed" ? "line-through" : "none", color: task.status === "Completed" ? "#94a3b8" : "inherit" }}>
                      {task.title}
                    </h3>
                    {task.description && <p>{task.description}</p>}
                  </div>

                  <div className="task-badges">
                    <span className="sample-pill">{task.category}</span>
                    <span className={`priority ${task.priority.toLowerCase()}`}>
                      {task.priority}
                    </span>
                  </div>
                </div>

                <div className="task-item-footer">
                  <div className="task-meta-left">
                    <span className={isOverdue ? "task-overdue" : isDueSoon ? "task-due-soon" : ""}>
                      <CalendarDays size={14} />
                      Due {new Date(task.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      {isOverdue ? " (Overdue)" : isDueSoon ? " (Due soon)" : ""}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <select
                      className="task-status-select"
                      value={task.status}
                      onChange={(e) => handleQuickStatusChange(task._id, e.target.value as TaskStatus)}
                      aria-label="Change task status"
                    >
                      {taskStatuses.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => handleEditTask(task)}
                      style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "5px 10px", fontSize: "12px" }}
                    >
                      <Pencil size={13} />
                      Edit
                    </button>

                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => handleDeleteTask(task)}
                      disabled={isDeleting}
                      style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "5px 10px", fontSize: "12px", color: "#b42318", borderColor: "#f0b7b2" }}
                    >
                      <Trash2 size={13} />
                      {isDeleting ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* My Tasks Pagination Controls */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "24px",
            paddingTop: "16px",
            borderTop: "1px solid #eef2f6",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <span style={{ fontSize: "13px", color: "#64748b" }}>
            Page <strong>{taskPage}</strong> of <strong>{taskTotalPages}</strong> ({taskTotal} {taskTotal === 1 ? "task" : "tasks"})
          </span>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setTaskPage((prev) => Math.max(1, prev - 1))}
              disabled={taskPage <= 1 || tasksLoading}
              aria-label="Previous page of tasks"
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setTaskPage((prev) => Math.min(taskTotalPages, prev + 1))}
              disabled={taskPage >= taskTotalPages || tasksLoading}
              aria-label="Next page of tasks"
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </>
    )}
  </section>
) : active === "Team" ? (
  <section className="dashboard-section">
    <section className="welcome-section">
      <div>
        <span className="eyebrow">
          <Users size={14} />
          COLLABORATION
        </span>

        <h1>My Team</h1>

        <p className="auth-description">
          Connect with teammates and collaborate on academic projects.
        </p>
      </div>

      <button
        className="primary-button"
        onClick={() =>
          alert("Team invitations will be implemented later.")
        }
      >
        <Plus size={17} />
        Invite Member
      </button>
    </section>

    <section className="stats-grid">
      <article className="stat-card">
        <div className="stat-icon"><Users size={20} /></div>
        <span>Team Members</span>
        <strong>4</strong>
        <small>Sample team overview</small>
      </article>

      <article className="stat-card">
        <div className="stat-icon"><FolderKanban size={20} /></div>
        <span>Shared Projects</span>
        <strong>3</strong>
        <small>Sample project count</small>
      </article>

      <article className="stat-card">
        <div className="stat-icon"><CheckCircle2 size={20} /></div>
        <span>Tasks Completed</span>
        <strong>12</strong>
        <small>Sample team activity</small>
      </article>

      <article className="stat-card">
        <div className="stat-icon"><Activity size={20} /></div>
        <span>Workspace</span>
        <strong>Active</strong>
        <small>Computer Science</small>
      </article>
    </section>

    <section className="dashboard-section">
      <div className="section-heading">
        <div>
          <h2>Team Members</h2>
          <p>Meet the people in your academic workspace.</p>
        </div>
      </div>

      <div className="team-grid">
        {[
          {
            name: user.name,
            role: "Workspace Owner",
            email: user.email,
          },
          {
            name: "Aarav Sharma",
            role: "Team Member",
            email: "aarav@example.com",
          },
          {
            name: "Priya Verma",
            role: "Team Member",
            email: "priya@example.com",
          },
          {
            name: "Rahul Mehta",
            role: "Team Member",
            email: "rahul@example.com",
          },
        ].map((member) => (
          <article className="panel team-card" key={member.email}>
            <div className="team-avatar">
              {member.name
                .trim()
                .split(/\s+/)
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>

            <h3>{member.name}</h3>

            <span className="sample-pill">{member.role}</span>

            <p className="team-email">{member.email}</p>

            <div className="team-card-footer">
              <span>
                <span className="team-status-dot" />
                Sample workspace
              </span>
            </div>
          </article>
        ))}
      </div>

      <p className="auth-description">
        Only your account information comes from your current session.
        The other members are sample data for the UI preview.
      </p>
    </section>

    <section className="dashboard-section">
      <div className="section-heading">
        <div>
          <h2>Recent Team Activity</h2>
          <p>A preview of the collaboration activity feed.</p>
        </div>
      </div>

      <div className="panel activity-item">
        <div className="activity-icon">
          <FolderKanban size={17} />
        </div>
        <div>
          <strong>Project workspace created</strong>
          <p>Your team can organize academic work here.</p>
        </div>
      </div>

      <div className="panel activity-item">
        <div className="activity-icon">
          <CheckCircle2 size={17} />
        </div>
        <div>
          <strong>Task tracking workspace prepared</strong>
          <p>Task assignments and activity tracking will be added later.</p>
        </div>
      </div>
    </section>
  </section>
) : active === "Calendar" ? (
  <CalendarView projects={projects} />
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

      {(showCreateForm || editingProject) && (
        <ProjectFormModal
          key={editingProject?._id ?? "new-project"}
          project={editingProject}
          onClose={() => { setShowCreateForm(false); setEditingProject(null); }}
          onCreated={() => {
            setProjectPage(1);
            void loadProjects(1);
          }}
        />
      )}

      {(showCreateTaskModal || editingTask) && (
        <TaskFormModal
          key={editingTask?._id ?? "new-task"}
          task={editingTask}
          onClose={() => { setShowCreateTaskModal(false); setEditingTask(null); }}
          onSaved={() => {
            setShowCreateTaskModal(false);
            setEditingTask(null);
            setTaskPage(1);
            void loadTasks(1);
          }}
        />
      )}
    </div>
  </main>
</div>
  );
}

function CalendarView({ projects }: { projects: Project[] }) {
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const today = new Date();

  const monthName = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const calendarDays = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  function changeMonth(amount: number) {
    setCurrentDate(new Date(year, month + amount, 1));
  }

  function isToday(day: number) {
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  }

  function getProjectsForDay(day: number) {
    return projects.filter((project) => {
      const deadline = new Date(project.deadline);

      return (
        !Number.isNaN(deadline.getTime()) &&
        deadline.getFullYear() === year &&
        deadline.getMonth() === month &&
        deadline.getDate() === day
      );
    });
  }

  const upcomingProjects = projects
    .filter((project) => {
      const deadline = new Date(project.deadline);

      return (
        !Number.isNaN(deadline.getTime()) &&
        deadline >= new Date(today.getFullYear(), today.getMonth(), today.getDate())
      );
    })
    .sort(
      (a, b) =>
        new Date(a.deadline).getTime() -
        new Date(b.deadline).getTime()
    );

  return (
    <section className="dashboard-section">
      <section className="welcome-section">
        <div>
          <span className="eyebrow">
            <CalendarDays size={14} />
            PLANNING WORKSPACE
          </span>

          <h1>Calendar</h1>

          <p className="auth-description">
            Plan your academic work and keep track of project deadlines.
          </p>
        </div>
      </section>

      <div className="calendar-layout">
        <section className="panel calendar-panel">
          <div className="calendar-header">
            <div>
              <h2>{monthName}</h2>
              <p>Monthly overview</p>
            </div>

            <div className="calendar-controls">
              <button
                type="button"
                className="secondary-button"
                onClick={() => changeMonth(-1)}
                aria-label="Previous month"
              >
                ←
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={() => setCurrentDate(new Date())}
              >
                Today
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={() => changeMonth(1)}
                aria-label="Next month"
              >
                →
              </button>
            </div>
          </div>

          <div className="calendar-grid">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
              (day) => (
                <div className="calendar-weekday" key={day}>
                  {day}
                </div>
              )
            )}

            {calendarDays.map((day, index) => {
              const dayProjects = day
                ? getProjectsForDay(day)
                : [];

              return (
                <div
                  className={`calendar-day ${
                    day ? "" : "calendar-day-empty"
                  } ${day && isToday(day) ? "calendar-today" : ""}`}
                  key={`${year}-${month}-${index}`}
                >
                  {day && (
                    <>
                      <span className="calendar-day-number">{day}</span>

                      {dayProjects.slice(0, 2).map((project) => (
                        <span
                          className="calendar-event"
                          key={project._id}
                          title={project.title}
                        >
                          {project.title}
                        </span>
                      ))}

                      {dayProjects.length > 2 && (
                        <small>+{dayProjects.length - 2} more</small>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <aside className="panel upcoming-panel">
          <span className="eyebrow">
            <Clock size={14} />
            DEADLINES
          </span>

          <h2>Upcoming Projects</h2>

          <p className="auth-description">
            Deadlines from your saved projects.
          </p>

          {upcomingProjects.length === 0 ? (
            <div className="calendar-empty">
              <CalendarDays size={25} />

              <p>No upcoming project deadlines.</p>

              <small>
                Create a project with a deadline to see it here.
              </small>
            </div>
          ) : (
            upcomingProjects.map((project) => (
              <article className="upcoming-project" key={project._id}>
                <div className="upcoming-project-icon">
                  <FolderKanban size={17} />
                </div>

                <div>
                  <strong>{project.title}</strong>

                  <p>
                    {new Date(project.deadline).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>

                  <span className="sample-pill">{project.status}</span>
                </div>
              </article>
            ))
          )}
        </aside>
      </div>
    </section>
  );
}

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
AlertCircle,
UserPlus,
UserMinus,
Crown,
Shield,
Mail,
ExternalLink,
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
teamId?: { _id: string; name: string } | string | null;
createdBy?: { _id?: string; id?: string; name?: string; email?: string } | string;
};

type TeamMemberItem = {
  id: string;
  name: string;
  email: string;
  userRole: string;
  teamRole: "owner" | "admin" | "member";
  joinedAt: string | null;
  isCurrentUser: boolean;
};

type TeamSharedProject = {
  id: string;
  title: string;
  category: string;
  status: string;
  deadline: string;
};

type TeamItem = {
  id: string;
  name: string;
  description: string;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  isOwner: boolean;
  currentUserRole: "owner" | "admin" | "member" | null;
  members: TeamMemberItem[];
  projects: TeamSharedProject[];
  createdAt: string;
};

type TeamInvitationItem = {
  id: string;
  teamId: string;
  teamName: string;
  inviter: {
    name: string;
    email: string;
  };
  role: "admin" | "member";
  status: "pending" | "accepted" | "rejected" | "canceled";
  createdAt: string;
};

type TeamPendingInvite = {
  id: string;
  teamId: string;
  teamName: string;
  inviteeEmail: string;
  role: "admin" | "member";
  status: string;
  createdAt: string;
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
teams = [],
}: {
onClose: () => void;
onCreated: () => void;
project?: Project | null;
teams?: TeamItem[];
}) {
const [title, setTitle] = useState(project?.title ?? "");
const [description, setDescription] = useState(project?.description ?? "");
const [category, setCategory] = useState(project?.category ?? "AI/ML");
const [deadline, setDeadline] = useState(dateForInput(project?.deadline));
const [githubUrl, setGithubUrl] = useState(project?.githubUrl ?? "");
const initialTeamId = typeof project?.teamId === "object" && project?.teamId !== null
  ? (project.teamId as { _id?: string })._id || ""
  : typeof project?.teamId === "string"
  ? project.teamId
  : "";
const [teamId, setTeamId] = useState(initialTeamId);
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
      teamId: teamId || null,
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

      {teams && teams.length > 0 && (
        <label>
          Associated Team <span>(optional)</span>
          <select
            value={teamId}
            onChange={(event) => setTeamId(event.target.value)}
          >
            <option value="">Personal Project (No Team)</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      )}

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

function CreateTeamModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (team: TeamItem) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (name.trim().length < 2) {
      setError("Team name must be at least 2 characters.");
      return;
    }
    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Unable to create team.");
        return;
      }

      onCreated(data.team);
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
        aria-labelledby="create-team-title"
      >
        <div className="modal-heading">
          <div>
            <span className="eyebrow">
              <Users size={14} /> COLLABORATION
            </span>
            <h2 id="create-team-title">Create a new team</h2>
            <p>Form a team to collaborate with classmates on academic projects.</p>
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
            Team name
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Distributed Systems Group"
              minLength={2}
              maxLength={100}
              required
            />
          </label>

          <label>
            Description <span>(optional)</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe your team workspace, project goals, and subjects..."
              maxLength={500}
              rows={3}
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
              {saving ? "Creating..." : "Create Team"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function InviteMemberModal({
  team,
  onClose,
  onInvited,
}: {
  team: TeamItem;
  onClose: () => void;
  onInvited: () => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) {
      setError("Please provide an email address.");
      return;
    }
    setSending(true);
    setError("");

    try {
      const response = await fetch(`/api/teams/${encodeURIComponent(team.id)}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          email: email.trim(),
          role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Unable to send invitation.");
        return;
      }

      onInvited();
      onClose();
    } catch {
      setError("Unable to connect to the server. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !sending) {
          onClose();
        }
      }}
    >
      <section
        className="project-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-modal-title"
      >
        <div className="modal-heading">
          <div>
            <span className="eyebrow">
              <UserPlus size={14} /> TEAM INVITATION
            </span>
            <h2 id="invite-modal-title">Invite to {team.name}</h2>
            <p>Send an invitation to a classmate or collaborator.</p>
          </div>

          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            disabled={sending}
            aria-label="Close form"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="project-form">
          <label>
            Invitee email address
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="e.g. classmate@university.edu"
              required
            />
          </label>

          <label>
            Team role
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as "member" | "admin")}
            >
              <option value="member">Member (Can view shared projects & tasks)</option>
              <option value="admin">Manager (Can invite and remove team members)</option>
            </select>
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
              disabled={sending}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="primary-button"
              disabled={sending}
            >
              <Mail size={16} />
              {sending ? "Sending..." : "Send Invitation"}
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

function TeamWorkspaceView({
  user,
  teams,
  selectedTeam,
  onSelectTeam,
  onCreateTeam,
  onInviteMember,
  onDeleteTeam,
  onLeaveTeam,
  onRemoveMember,
  receivedInvitations,
  onRespondInvitation,
  sentInvitations,
  onCancelSentInvitation,
  loading,
  error,
  actionMessage,
  actionError,
  onDismissActionMessage,
  availableProjects,
  onLinkProject,
  onUnlinkProject,
  onCreateProjectForTeam,
  onSelectProject,
}: {
  user: CurrentUser;
  teams: TeamItem[];
  selectedTeam: TeamItem | null;
  onSelectTeam: (teamId: string) => void;
  onCreateTeam: () => void;
  onInviteMember: () => void;
  onDeleteTeam: (teamId: string) => void;
  onLeaveTeam: (teamId: string) => void;
  onRemoveMember: (teamId: string, memberId: string, memberName: string) => void;
  receivedInvitations: TeamInvitationItem[];
  onRespondInvitation: (invId: string, action: "accept" | "reject") => void;
  sentInvitations: TeamPendingInvite[];
  onCancelSentInvitation: (invId: string) => void;
  loading: boolean;
  error: string;
  actionMessage: string;
  actionError: string;
  onDismissActionMessage: () => void;
  availableProjects: Project[];
  onLinkProject: (teamId: string, projectId: string) => void;
  onUnlinkProject: (teamId: string, projectId: string) => void;
  onCreateProjectForTeam: () => void;
  onSelectProject: (projectId: string) => void;
}) {
  return (
    <section className="dashboard-section">
      {/* Welcome / Action Header */}
      <section className="welcome-section">
        <div>
          <span className="eyebrow">
            <Users size={14} />
            COLLABORATION
          </span>
          <h1>My Teams & Workspace</h1>
          <p className="auth-description">
            Connect with classmates and collaborate on academic projects in real time.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            className="secondary-button"
            onClick={onCreateTeam}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <Plus size={16} />
            Create Team
          </button>
          {selectedTeam && (selectedTeam.isOwner || selectedTeam.currentUserRole === "admin") && (
            <button
              type="button"
              className="primary-button"
              onClick={onInviteMember}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <UserPlus size={16} />
              Invite Member
            </button>
          )}
        </div>
      </section>

      {/* Global Alerts */}
      {actionMessage && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            borderRadius: "10px",
            background: "#ecfdf5",
            border: "1px solid #a7f3d0",
            color: "#065f46",
            fontSize: "14px",
            marginBottom: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <CheckCircle2 size={18} color="#059669" />
            <span>{actionMessage}</span>
          </div>
          <button
            type="button"
            onClick={onDismissActionMessage}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#065f46" }}
            aria-label="Dismiss message"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {actionError && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            borderRadius: "10px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#991b1b",
            fontSize: "14px",
            marginBottom: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <AlertCircle size={18} color="#dc2626" />
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={onDismissActionMessage}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#991b1b" }}
            aria-label="Dismiss error"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Received Invitations Banner */}
      {receivedInvitations.length > 0 && (
        <section
          style={{
            padding: "18px 20px",
            borderRadius: "14px",
            background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
            border: "1px solid #fde68a",
            marginBottom: "24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "#f59e0b",
                color: "white",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Mail size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", color: "#78350f" }}>
                Pending Invitations ({receivedInvitations.length})
              </h3>
              <p style={{ margin: 0, fontSize: "13px", color: "#92400e" }}>
                You have been invited to collaborate with the following teams:
              </p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {receivedInvitations.map((inv) => (
              <div
                key={inv.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "12px",
                  background: "white",
                  padding: "12px 16px",
                  borderRadius: "10px",
                  border: "1px solid #fef3c7",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                }}
              >
                <div>
                  <strong style={{ fontSize: "15px", color: "#1e293b" }}>{inv.teamName}</strong>
                  <div style={{ fontSize: "13px", color: "#64748b", marginTop: "2px" }}>
                    Invited by <strong>{inv.inviter?.name || "A team member"}</strong> ({inv.inviter?.email}) • Role:{" "}
                    <span
                      style={{
                        textTransform: "capitalize",
                        fontWeight: 600,
                        color: inv.role === "admin" ? "#4338ca" : "#0284c7",
                      }}
                    >
                      {inv.role === "admin" ? "Manager" : "Member"}
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => onRespondInvitation(inv.id, "accept")}
                    style={{
                      background: "#16a34a",
                      borderColor: "#16a34a",
                      padding: "6px 14px",
                      fontSize: "13px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    <Check size={14} /> Accept
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => onRespondInvitation(inv.id, "reject")}
                    style={{
                      padding: "6px 14px",
                      fontSize: "13px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    <X size={14} /> Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Team Switcher Tabs (when user has multiple teams) */}
      {teams.length > 1 && (
        <div
          style={{
            display: "flex",
            gap: "8px",
            overflowX: "auto",
            paddingBottom: "12px",
            marginBottom: "20px",
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          {teams.map((t) => {
            const isSelected = t.id === selectedTeam?.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onSelectTeam(t.id)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "20px",
                  border: isSelected ? "2px solid #4f46e5" : "1px solid #cbd5e1",
                  background: isSelected ? "#eef2ff" : "white",
                  color: isSelected ? "#4338ca" : "#475569",
                  fontWeight: isSelected ? 700 : 500,
                  fontSize: "13px",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  whiteSpace: "nowrap",
                  transition: "all 0.15s ease",
                }}
              >
                <Users size={14} color={isSelected ? "#4338ca" : "#64748b"} />
                <span>{t.name}</span>
                <span
                  style={{
                    fontSize: "11px",
                    padding: "2px 6px",
                    borderRadius: "10px",
                    background: isSelected ? "#4338ca" : "#f1f5f9",
                    color: isSelected ? "white" : "#64748b",
                  }}
                >
                  {t.members.length}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="panel" style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
          Loading teams and workspaces...
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="panel" style={{ textAlign: "center", padding: "30px", color: "#dc2626" }}>
          {error}
        </div>
      )}

      {/* Empty State: No Teams */}
      {teams.length === 0 && !loading && (
        <div
          className="panel"
          style={{
            textAlign: "center",
            padding: "48px 24px",
            maxWidth: "560px",
            margin: "24px auto",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              margin: "0 auto 18px",
              borderRadius: "20px",
              background: "#eff6ff",
              color: "#2563eb",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Users size={32} />
          </div>
          <h3 style={{ fontSize: "20px", margin: "0 0 8px", color: "#1e293b" }}>
            No Teams Joined Yet
          </h3>
          <p style={{ color: "#64748b", fontSize: "14px", lineHeight: 1.5, margin: "0 0 24px" }}>
            Create your first team to collaborate with classmates on shared academic projects, or accept an invitation sent to your email.
          </p>
          <button
            type="button"
            className="primary-button"
            onClick={onCreateTeam}
            style={{ display: "inline-flex", alignItems: "center", gap: "8px", margin: "0 auto" }}
          >
            <Plus size={18} />
            Create a New Team
          </button>
        </div>
      )}

      {/* Selected Team Workspace */}
      {selectedTeam && !loading && (
        <>
          {/* Live KPI Statistics Grid */}
          <section className="stats-grid" aria-label="Team metrics">
            <article className="stat-card">
              <div className="stat-icon">
                <Users size={20} />
              </div>
              <span>Team Members</span>
              <strong>{selectedTeam.members.length}</strong>
              <small>Active collaborators</small>
            </article>

            <article className="stat-card">
              <div className="stat-icon">
                <FolderKanban size={20} />
              </div>
              <span>Shared Projects</span>
              <strong>{selectedTeam.projects.length}</strong>
              <small>Collaborative workspaces</small>
            </article>

            <article className="stat-card">
              <div className="stat-icon">
                <Mail size={20} />
              </div>
              <span>Pending Invites</span>
              <strong>{sentInvitations.length}</strong>
              <small>Awaiting response</small>
            </article>

            <article className="stat-card">
              <div className="stat-icon">
                {selectedTeam.isOwner ? <Crown size={20} color="#d97706" /> : <Shield size={20} color="#4f46e5" />}
              </div>
              <span>Your Role</span>
              <strong style={{ fontSize: "18px" }}>
                {selectedTeam.isOwner ? "Owner" : selectedTeam.currentUserRole === "admin" ? "Manager" : "Member"}
              </strong>
              <small>
                {selectedTeam.isOwner
                  ? "Full workspace control"
                  : selectedTeam.currentUserRole === "admin"
                  ? "Can manage members"
                  : "Team collaborator"}
              </small>
            </article>
          </section>

          {/* Team Overview Card */}
          <div
            className="panel"
            style={{
              padding: "20px 24px",
              marginBottom: "24px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <h2 style={{ margin: 0, fontSize: "20px", color: "#1e293b" }}>{selectedTeam.name}</h2>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "3px 10px",
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: 600,
                    background: selectedTeam.isOwner ? "#fef3c7" : "#e0e7ff",
                    color: selectedTeam.isOwner ? "#92400e" : "#4338ca",
                  }}
                >
                  {selectedTeam.isOwner ? <Crown size={12} /> : <Shield size={12} />}
                  {selectedTeam.isOwner ? "Workspace Owner" : selectedTeam.currentUserRole === "admin" ? "Team Manager" : "Team Member"}
                </span>
              </div>
              {selectedTeam.description && (
                <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: "14px", maxWidth: "680px" }}>
                  {selectedTeam.description}
                </p>
              )}
              <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginTop: "12px", fontSize: "12px", color: "#94a3b8" }}>
                <span>Created by <strong>{selectedTeam.owner?.name || "Team Owner"}</strong> ({selectedTeam.owner?.email})</span>
                <span>•</span>
                <span>Created {new Date(selectedTeam.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              {selectedTeam.isOwner ? (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => onDeleteTeam(selectedTeam.id)}
                  style={{
                    color: "#b42318",
                    borderColor: "#f0b7b2",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "13px",
                  }}
                >
                  <Trash2 size={14} /> Delete Team
                </button>
              ) : (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => onLeaveTeam(selectedTeam.id)}
                  style={{
                    color: "#b42318",
                    borderColor: "#f0b7b2",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "13px",
                  }}
                >
                  <LogOut size={14} /> Leave Team
                </button>
              )}
            </div>
          </div>

          {/* Team Members Directory */}
          <section className="dashboard-section" style={{ marginBottom: "28px" }}>
            <div className="section-heading">
              <div>
                <h2>Team Members ({selectedTeam.members.length})</h2>
                <p>Active participants contributing to this team.</p>
              </div>
              {(selectedTeam.isOwner || selectedTeam.currentUserRole === "admin") && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={onInviteMember}
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px" }}
                >
                  <UserPlus size={14} />
                  Invite Member
                </button>
              )}
            </div>

            <div className="team-grid">
              {selectedTeam.members.map((member) => {
                const isOwner = member.teamRole === "owner";
                const isManager = member.teamRole === "admin";
                const initials = member.name
                  .trim()
                  .split(/\s+/)
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();
                const canRemove = (selectedTeam.isOwner || selectedTeam.currentUserRole === "admin") && !isOwner && !member.isCurrentUser;

                return (
                  <article className="panel team-card" key={member.id} style={{ position: "relative" }}>
                    <div
                      className="team-avatar"
                      style={{
                        background: isOwner ? "#fef3c7" : isManager ? "#e0e7ff" : "#f1f5f9",
                        color: isOwner ? "#d97706" : isManager ? "#4f46e5" : "#475569",
                      }}
                    >
                      {initials}
                    </div>

                    <h3 style={{ marginBottom: "6px" }}>
                      {member.name}
                      {member.isCurrentUser && (
                        <span
                          style={{
                            fontSize: "11px",
                            color: "#4f46e5",
                            fontWeight: 600,
                            marginLeft: "6px",
                            background: "#eef2ff",
                            padding: "1px 6px",
                            borderRadius: "8px",
                          }}
                        >
                          You
                        </span>
                      )}
                    </h3>

                    <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginBottom: "8px" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "2px 8px",
                          borderRadius: "10px",
                          fontSize: "11px",
                          fontWeight: 600,
                          background: isOwner ? "#fef3c7" : isManager ? "#e0e7ff" : "#f1f5f9",
                          color: isOwner ? "#92400e" : isManager ? "#4338ca" : "#475569",
                        }}
                      >
                        {isOwner ? <Crown size={11} /> : isManager ? <Shield size={11} /> : null}
                        {isOwner ? "Workspace Owner" : isManager ? "Team Manager" : "Team Member"}
                      </span>

                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: "10px",
                          fontSize: "11px",
                          fontWeight: 500,
                          background: "#f8fafc",
                          color: "#64748b",
                          border: "1px solid #e2e8f0",
                          textTransform: "capitalize",
                        }}
                      >
                        {member.userRole}
                      </span>
                    </div>

                    <p className="team-email">{member.email}</p>

                    <div className="team-card-footer" style={{ justifyContent: "space-between", alignItems: "center" }}>
                      <span>
                        <span className="team-status-dot" />
                        {member.joinedAt
                          ? `Joined ${new Date(member.joinedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}`
                          : "Active"}
                      </span>

                      {canRemove && (
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => onRemoveMember(selectedTeam.id, member.id, member.name)}
                          style={{
                            padding: "3px 8px",
                            fontSize: "11px",
                            color: "#b42318",
                            borderColor: "#f0b7b2",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <UserMinus size={12} /> Remove
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          {/* Shared Team Projects Section */}
          <section className="dashboard-section" style={{ marginBottom: "28px" }}>
            <div className="section-heading">
              <div>
                <h2>Shared Team Projects ({selectedTeam.projects.length})</h2>
                <p>Projects accessible to all members of {selectedTeam.name}.</p>
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                <button
                  type="button"
                  className="primary-button"
                  onClick={onCreateProjectForTeam}
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px" }}
                >
                  <Plus size={14} />
                  New Project for Team
                </button>
              </div>
            </div>

            {/* Option to link existing unlinked projects */}
            {availableProjects.filter((p) => !p.teamId).length > 0 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  flexWrap: "wrap",
                  padding: "12px 16px",
                  background: "#f8fafc",
                  borderRadius: "10px",
                  border: "1px dashed #cbd5e1",
                  marginBottom: "16px",
                }}
              >
                <span style={{ fontSize: "13px", color: "#475569", fontWeight: 500 }}>
                  Link one of your personal projects to this team:
                </span>
                <select
                  defaultValue=""
                  style={{
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    padding: "6px 12px",
                    fontSize: "13px",
                    background: "white",
                    color: "#1e293b",
                  }}
                  onChange={(e) => {
                    if (e.target.value) {
                      onLinkProject(selectedTeam.id, e.target.value);
                      e.target.value = "";
                    }
                  }}
                  aria-label="Select personal project to link"
                >
                  <option value="" disabled>
                    Select a project to link...
                  </option>
                  {availableProjects
                    .filter((p) => !p.teamId)
                    .map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.title} ({p.category})
                      </option>
                    ))}
                </select>
              </div>
            )}

            {selectedTeam.projects.length === 0 ? (
              <div
                className="panel"
                style={{
                  padding: "32px 20px",
                  textAlign: "center",
                  color: "#64748b",
                }}
              >
                <FolderKanban size={32} style={{ margin: "0 auto 10px", color: "#94a3b8" }} />
                <h3 style={{ margin: "0 0 6px", fontSize: "16px", color: "#334155" }}>
                  No Projects Linked Yet
                </h3>
                <p style={{ margin: 0, fontSize: "13px" }}>
                  Create a new project or link an existing project to share it with your team.
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))",
                  gap: "16px",
                }}
              >
                {selectedTeam.projects.map((proj) => (
                  <article
                    key={proj.id}
                    className="panel"
                    style={{
                      padding: "18px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", marginBottom: "8px" }}>
                        <span
                          style={{
                            fontSize: "11px",
                            padding: "2px 8px",
                            borderRadius: "10px",
                            fontWeight: 600,
                            background: "#e0e7ff",
                            color: "#4338ca",
                          }}
                        >
                          {proj.category}
                        </span>
                        <span
                          className={`project-status status-${proj.status.toLowerCase().replace(/\s+/g, "-")}`}
                          style={{ fontSize: "11px", padding: "2px 8px" }}
                        >
                          {proj.status}
                        </span>
                      </div>

                      <h3 style={{ fontSize: "16px", margin: "0 0 8px", color: "#1e293b" }}>{proj.title}</h3>

                      <div style={{ fontSize: "12px", color: "#64748b", display: "flex", alignItems: "center", gap: "5px" }}>
                        <CalendarDays size={13} />
                        Deadline: {new Date(proj.deadline).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "14px", paddingTop: "12px", borderTop: "1px solid #f1f5f9" }}>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => onSelectProject(proj.id)}
                        style={{ fontSize: "12px", padding: "5px 10px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                      >
                        <ExternalLink size={12} /> View in Projects
                      </button>

                      {(selectedTeam.isOwner || selectedTeam.currentUserRole === "admin") && (
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => onUnlinkProject(selectedTeam.id, proj.id)}
                          style={{
                            fontSize: "11px",
                            padding: "5px 8px",
                            color: "#b42318",
                            borderColor: "#f0b7b2",
                          }}
                          title="Unlink from this team"
                        >
                          Unlink
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* Pending Sent Invitations Section */}
          {(selectedTeam.isOwner || selectedTeam.currentUserRole === "admin" || sentInvitations.length > 0) && (
            <section className="dashboard-section">
              <div className="section-heading">
                <div>
                  <h2>Pending Invitations ({sentInvitations.length})</h2>
                  <p>Invitations sent to join {selectedTeam.name}.</p>
                </div>
              </div>

              {sentInvitations.length === 0 ? (
                <div className="panel" style={{ padding: "20px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
                  No pending invitations for this team.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {sentInvitations.map((inv) => (
                    <div
                      key={inv.id}
                      className="panel"
                      style={{
                        padding: "12px 16px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "10px",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <Mail size={15} color="#6366f1" />
                          <strong style={{ fontSize: "14px", color: "#1e293b" }}>{inv.inviteeEmail}</strong>
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 600,
                              padding: "2px 7px",
                              borderRadius: "10px",
                              background: inv.role === "admin" ? "#e0e7ff" : "#f1f5f9",
                              color: inv.role === "admin" ? "#4338ca" : "#475569",
                            }}
                          >
                            {inv.role === "admin" ? "Manager" : "Member"}
                          </span>
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 600,
                              padding: "2px 7px",
                              borderRadius: "10px",
                              background: "#fef3c7",
                              color: "#92400e",
                            }}
                          >
                            Pending
                          </span>
                        </div>
                        <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "3px" }}>
                          Sent {new Date(inv.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                      </div>

                      {(selectedTeam.isOwner || selectedTeam.currentUserRole === "admin") && (
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => onCancelSentInvitation(inv.id)}
                          style={{
                            fontSize: "12px",
                            padding: "4px 10px",
                            color: "#b42318",
                            borderColor: "#f0b7b2",
                          }}
                        >
                          Cancel Invite
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </section>
  );
}

function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  loading = false,
  onConfirm,
  onClose,
}: {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "primary";
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="project-modal"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-desc"
        style={{ width: "min(100%, 460px)", maxHeight: "calc(100dvh - 24px)", overflowY: "auto" }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 16 }}>
          <div className={`confirm-modal-icon ${variant}`} style={{ flexShrink: 0, margin: 0 }}>
            <AlertCircle size={24} />
          </div>
          <div>
            <h3
              id="confirm-dialog-title"
              style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 700, color: "var(--foreground)" }}
            >
              {title}
            </h3>
            <p
              id="confirm-dialog-desc"
              style={{ margin: 0, fontSize: 13, color: "#64748b", lineHeight: 1.5 }}
            >
              {message}
            </p>
          </div>
        </div>

        <div className="modal-actions" style={{ marginTop: 24 }}>
          <button
            type="button"
            className="secondary-button"
            onClick={onClose}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={variant === "danger" ? "danger-button" : "primary-button"}
            onClick={() => void onConfirm()}
            disabled={loading}
          >
            {loading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReviewQueueWorkspaceView({
  reviewQueue,
  loading,
  error,
  filterStatus,
  onFilterChange,
  searchQuery,
  onSearchChange,
  onReviewProject,
  reviewingProjectId,
  successMessage,
  onRefresh,
}: {
  reviewQueue: ReviewProject[];
  loading: boolean;
  error: string;
  filterStatus: string;
  onFilterChange: (status: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onReviewProject: (id: string, decision: "Approved" | "Rejected") => void;
  reviewingProjectId: string | null;
  successMessage: string;
  onRefresh: () => void;
}) {
  const filteredProjects = reviewQueue.filter((p) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.status.toLowerCase().includes(q) ||
      (p.student?.name && p.student.name.toLowerCase().includes(q)) ||
      (p.student?.email && p.student.email.toLowerCase().includes(q))
    );
  });

  return (
    <section className="dashboard-section">
      <section className="welcome-section">
        <div>
          <span className="eyebrow">
            <ClipboardCheck size={14} />
            FACULTY WORKSPACE
          </span>
          <h1>Review Queue</h1>
          <p className="auth-description">
            Evaluate student project proposals, provide academic feedback, and track submission statuses.
          </p>
        </div>
      </section>

      {successMessage && (
        <div className="status-banner success" style={{ marginBottom: 16 }}>
          <CheckCircle2 size={16} />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="status-banner error" style={{ marginBottom: 16 }}>
          <AlertCircle size={16} />
          <span>{error}</span>
          <button type="button" className="secondary-button" onClick={onRefresh} style={{ marginLeft: "auto", padding: "4px 10px", fontSize: 12 }}>
            Retry
          </button>
        </div>
      )}

      <div className="project-toolbar" style={{ marginTop: 16 }}>
        <div className="project-search-wrap">
          <Search size={16} className="search-icon" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by student, title, category..."
            aria-label="Search review queue"
            className="project-search"
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => onFilterChange(e.target.value)}
          aria-label="Filter by review status"
          className="category-filter"
        >
          <option value="Pending">Pending Review</option>
          <option value="Approved">Approved Projects</option>
          <option value="Rejected">Changes Requested</option>
          <option value="All">All Submissions</option>
        </select>

        <button
          type="button"
          onClick={onRefresh}
          className="secondary-button refresh-button"
          disabled={loading}
          aria-label="Refresh review queue"
        >
          <RotateCcw size={15} />
          <span>Refresh</span>
        </button>
      </div>

      {loading && !error && (
        <div className="empty-state" style={{ marginTop: 24 }}>
          <p>Loading submission queue...</p>
        </div>
      )}

      {!loading && !error && filteredProjects.length === 0 && (
        <div className="empty-state" style={{ marginTop: 24 }}>
          <div className="empty-icon">
            <ClipboardCheck size={28} />
          </div>
          <h3>No submissions found</h3>
          <p>
            {searchQuery
              ? "No student projects matched your search query."
              : `There are currently no projects matching the "${filterStatus}" status filter.`}
          </p>
          {filterStatus !== "Pending" && (
            <button
              type="button"
              className="secondary-button"
              onClick={() => onFilterChange("Pending")}
            >
              View Pending Submissions
            </button>
          )}
        </div>
      )}

      {!loading && filteredProjects.length > 0 && (
        <div className="review-queue-grid">
          {filteredProjects.map((project) => {
            const isReviewing = reviewingProjectId === project._id;
            const statusClass =
              project.status === "Approved"
                ? "approved"
                : project.status === "Rejected"
                ? "rejected"
                : "pending";

            return (
              <article key={project._id} className="review-card">
                <div className="review-card-top">
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                      <span className="category-pill">{project.category}</span>
                      <span className={`status-pill ${statusClass}`}>{project.status}</span>
                    </div>
                    <h3 className="review-card-title">{project.title}</h3>
                  </div>

                  {project.deadline && (
                    <div style={{ fontSize: 12, color: "#64748b", display: "inline-flex", alignItems: "center", gap: 5 }}>
                      <Clock size={14} />
                      <span>
                        Deadline:{" "}
                        {new Date(project.deadline).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  )}
                </div>

                <p className="review-card-desc">{project.description}</p>

                {project.student && (
                  <div className="review-student-info">
                    <Users size={14} style={{ color: "var(--primary)" }} />
                    <span>
                      Submitted by: <strong>{project.student.name}</strong> ({project.student.email})
                    </span>
                  </div>
                )}

                {project.githubUrl && (
                  <div style={{ margin: "8px 0", fontSize: 12 }}>
                    <a
                      href={project.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--primary)", textDecoration: "none" }}
                    >
                      <ExternalLink size={13} />
                      <span>View GitHub Repository</span>
                    </a>
                  </div>
                )}

                <div className="review-actions">
                  <button
                    type="button"
                    className="approve-btn"
                    onClick={() => onReviewProject(project._id, "Approved")}
                    disabled={isReviewing || project.status === "Approved"}
                    aria-label={`Approve project ${project.title}`}
                  >
                    <Check size={16} />
                    <span>{isReviewing ? "Processing..." : "Approve Project"}</span>
                  </button>

                  <button
                    type="button"
                    className="reject-btn"
                    onClick={() => onReviewProject(project._id, "Rejected")}
                    disabled={isReviewing || project.status === "Rejected"}
                    aria-label={`Request changes for project ${project.title}`}
                  >
                    <XCircle size={16} />
                    <span>{isReviewing ? "Processing..." : "Request Changes"}</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
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

// Team collaboration state
const [teams, setTeams] = useState<TeamItem[]>([]);
const [teamsLoading, setTeamsLoading] = useState(false);
const [teamsError, setTeamsError] = useState("");
const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

const [receivedInvitations, setReceivedInvitations] = useState<TeamInvitationItem[]>([]);
const [loadingReceivedInvitations, setLoadingReceivedInvitations] = useState(false);

const [sentInvitations, setSentInvitations] = useState<TeamPendingInvite[]>([]);
const [loadingSentInvitations, setLoadingSentInvitations] = useState(false);

const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
const [showInviteModal, setShowInviteModal] = useState(false);
const [teamActionLoading, setTeamActionLoading] = useState(false);
const [teamActionMessage, setTeamActionMessage] = useState("");
const [teamActionError, setTeamActionError] = useState("");

const [confirmDialog, setConfirmDialog] = useState<{
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: "danger" | "warning" | "primary";
  onConfirm: () => void | Promise<void>;
}>({
  isOpen: false,
  title: "",
  message: "",
  onConfirm: () => {},
});
const [confirmLoading, setConfirmLoading] = useState(false);

const router = useRouter();

async function loadTeams(preferredTeamId?: string) {
  setTeamsLoading(true);
  setTeamsError("");
  try {
    const res = await fetch("/api/teams", {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
    });
    const data = await res.json();
    if (!res.ok) {
      setTeamsError(data.message || "Unable to load teams.");
      return;
    }
    const teamList: TeamItem[] = Array.isArray(data.teams) ? data.teams : [];
    setTeams(teamList);
    if (preferredTeamId && teamList.some((t) => t.id === preferredTeamId)) {
      setSelectedTeamId(preferredTeamId);
    } else if (teamList.length > 0) {
      setSelectedTeamId((prev) => (prev && teamList.some((t) => t.id === prev) ? prev : teamList[0].id));
    } else {
      setSelectedTeamId(null);
    }
  } catch {
    setTeamsError("Unable to connect to server.");
  } finally {
    setTeamsLoading(false);
  }
}

async function loadReceivedInvitations() {
  setLoadingReceivedInvitations(true);
  try {
    const res = await fetch("/api/teams/invitations", {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
    });
    const data = await res.json();
    if (res.ok && Array.isArray(data.invitations)) {
      setReceivedInvitations(data.invitations);
    }
  } catch {
    // Non-blocking
  } finally {
    setLoadingReceivedInvitations(false);
  }
}

async function loadSentInvitations(teamId: string) {
  if (!teamId) return;
  setLoadingSentInvitations(true);
  try {
    const res = await fetch(`/api/teams/${encodeURIComponent(teamId)}/invitations`, {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
    });
    const data = await res.json();
    if (res.ok && Array.isArray(data.invitations)) {
      setSentInvitations(data.invitations);
    } else {
      setSentInvitations([]);
    }
  } catch {
    setSentInvitations([]);
  } finally {
    setLoadingSentInvitations(false);
  }
}

async function handleRespondInvitation(invitationId: string, action: "accept" | "reject") {
  setTeamActionLoading(true);
  setTeamActionError("");
  setTeamActionMessage("");
  try {
    const res = await fetch(`/api/teams/invitations/${encodeURIComponent(invitationId)}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (!res.ok) {
      setTeamActionError(data.message || `Unable to ${action} invitation.`);
      return;
    }
    setTeamActionMessage(data.message || `Invitation ${action}ed successfully.`);
    void loadReceivedInvitations();
    void loadTeams();
    void loadProjects();
  } catch {
    setTeamActionError("Network error while responding to invitation.");
  } finally {
    setTeamActionLoading(false);
  }
}

async function handleRemoveMember(teamId: string, memberUserId: string, memberName: string) {
  setConfirmDialog({
    isOpen: true,
    title: "Remove Team Member",
    message: `Are you sure you want to remove "${memberName}" from the team? They will immediately lose access to team projects.`,
    confirmLabel: "Remove Member",
    variant: "danger",
    onConfirm: async () => {
      setConfirmLoading(true);
      setTeamActionLoading(true);
      setTeamActionError("");
      setTeamActionMessage("");
      try {
        const res = await fetch(`/api/teams/${encodeURIComponent(teamId)}/members/${encodeURIComponent(memberUserId)}`, {
          method: "DELETE",
          credentials: "same-origin",
        });
        const data = await res.json();
        if (!res.ok) {
          setTeamActionError(data.message || "Unable to remove member.");
          return;
        }
        setTeamActionMessage(data.message || "Member removed from team.");
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        void loadTeams(teamId);
      } catch {
        setTeamActionError("Network error while removing member.");
      } finally {
        setTeamActionLoading(false);
        setConfirmLoading(false);
      }
    },
  });
}

async function handleLeaveTeam(teamId: string) {
  if (!user) return;
  setConfirmDialog({
    isOpen: true,
    title: "Leave Team",
    message: "Are you sure you want to leave this team? You will lose access to all shared team projects.",
    confirmLabel: "Leave Team",
    variant: "danger",
    onConfirm: async () => {
      setConfirmLoading(true);
      setTeamActionLoading(true);
      setTeamActionError("");
      setTeamActionMessage("");
      try {
        const res = await fetch(`/api/teams/${encodeURIComponent(teamId)}/members/${encodeURIComponent(user.id)}`, {
          method: "DELETE",
          credentials: "same-origin",
        });
        const data = await res.json();
        if (!res.ok) {
          setTeamActionError(data.message || "Unable to leave team.");
          return;
        }
        setTeamActionMessage(data.message || "You left the team.");
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        void loadTeams();
        void loadProjects();
      } catch {
        setTeamActionError("Network error while leaving team.");
      } finally {
        setTeamActionLoading(false);
        setConfirmLoading(false);
      }
    },
  });
}

async function handleDeleteTeam(teamId: string) {
  setConfirmDialog({
    isOpen: true,
    title: "Delete Team",
    message: "Are you sure you want to delete this team? All member associations will be removed. All shared projects will safely remain in their creators' personal workspaces.",
    confirmLabel: "Delete Team",
    variant: "danger",
    onConfirm: async () => {
      setConfirmLoading(true);
      setTeamActionLoading(true);
      setTeamActionError("");
      setTeamActionMessage("");
      try {
        const res = await fetch(`/api/teams/${encodeURIComponent(teamId)}`, {
          method: "DELETE",
          credentials: "same-origin",
        });
        const data = await res.json();
        if (!res.ok) {
          setTeamActionError(data.message || "Unable to delete team.");
          return;
        }
        setTeamActionMessage(data.message || "Team deleted successfully.");
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        void loadTeams();
        void loadProjects();
      } catch {
        setTeamActionError("Network error while deleting team.");
      } finally {
        setTeamActionLoading(false);
        setConfirmLoading(false);
      }
    },
  });
}

async function handleLinkProjectToTeam(teamId: string, projectId: string) {
  if (!projectId) return;
  setTeamActionLoading(true);
  setTeamActionError("");
  setTeamActionMessage("");
  try {
    const res = await fetch(`/api/teams/${encodeURIComponent(teamId)}/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ projectId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setTeamActionError(data.message || "Unable to link project to team.");
      return;
    }
    setTeamActionMessage(data.message || "Project linked to team!");
    void loadTeams(teamId);
    void loadProjects();
  } catch {
    setTeamActionError("Network error while linking project.");
  } finally {
    setTeamActionLoading(false);
  }
}

async function handleUnlinkProjectFromTeam(teamId: string, projectId: string) {
  setConfirmDialog({
    isOpen: true,
    title: "Unlink Project",
    message: "Unlink this project from the team? It will remain in the creator's personal workspace.",
    confirmLabel: "Unlink Project",
    variant: "warning",
    onConfirm: async () => {
      setConfirmLoading(true);
      setTeamActionLoading(true);
      setTeamActionError("");
      setTeamActionMessage("");
      try {
        const res = await fetch(`/api/teams/${encodeURIComponent(teamId)}/projects/${encodeURIComponent(projectId)}`, {
          method: "DELETE",
          credentials: "same-origin",
        });
        const data = await res.json();
        if (!res.ok) {
          setTeamActionError(data.message || "Unable to unlink project.");
          return;
        }
        setTeamActionMessage(data.message || "Project unlinked from team.");
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        void loadTeams(teamId);
        void loadProjects();
      } catch {
        setTeamActionError("Network error while unlinking project.");
      } finally {
        setTeamActionLoading(false);
        setConfirmLoading(false);
      }
    },
  });
}

async function handleCancelSentInvitation(teamId: string, invitationId: string) {
  setTeamActionLoading(true);
  setTeamActionError("");
  try {
    const res = await fetch(`/api/teams/${encodeURIComponent(teamId)}/invitations/${encodeURIComponent(invitationId)}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    const data = await res.json();
    if (!res.ok) {
      setTeamActionError(data.message || "Unable to cancel invitation.");
      return;
    }
    setTeamActionMessage("Invitation cancelled.");
    void loadSentInvitations(teamId);
  } catch {
    setTeamActionError("Network error while cancelling invitation.");
  } finally {
    setTeamActionLoading(false);
  }
}

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

function handleDeleteTask(task: TaskItem) {
  setConfirmDialog({
    isOpen: true,
    title: `Delete "${task.title}"?`,
    message: "This action cannot be undone. This task will be permanently removed from your workspace.",
    confirmLabel: "Delete Task",
    variant: "danger",
    onConfirm: async () => {
      setConfirmLoading(true);
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

        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));

        if (tasks.length === 1 && taskPage > 1) {
          setTaskPage((prev) => Math.max(1, prev - 1));
        } else {
          void loadTasks(taskPage);
        }
      } catch {
        setTaskActionError("Unable to connect to the server. Please try again.");
      } finally {
        setConfirmLoading(false);
        setDeletingTaskId(null);
      }
    },
  });
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
  if (user) {
    void loadTeams();
    void loadReceivedInvitations();
  }
}, [user]);

useEffect(() => {
  if (selectedTeamId) {
    void loadSentInvitations(selectedTeamId);
  } else {
    setSentInvitations([]);
  }
}, [selectedTeamId]);

useEffect(() => {
  function syncTabParam() {
    try {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get("tab");
        if (tab === "team" || tab === "teams") {
          setActive("Team");
        }
      }
    } catch {
      // Safe fallback
    }
  }
  syncTabParam();
  window.addEventListener("popstate", syncTabParam);
  return () => window.removeEventListener("popstate", syncTabParam);
}, []);

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

function handleDeleteProject(project: Project) {
  setConfirmDialog({
    isOpen: true,
    title: `Delete "${project.title}"?`,
    message: "This action cannot be undone. All project settings and task associations will be permanently removed.",
    confirmLabel: "Delete Project",
    variant: "danger",
    onConfirm: async () => {
      setConfirmLoading(true);
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

        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));

        if (projects.length === 1 && projectPage > 1) {
          setProjectPage((prev) => Math.max(1, prev - 1));
        } else {
          void loadProjects(projectPage);
        }
      } catch {
        setProjectActionError("Unable to connect to the server. Please try again.");
      } finally {
        setConfirmLoading(false);
        setDeletingProjectId(null);
      }
    },
  });
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
  <TeamWorkspaceView
    user={user!}
    teams={teams}
    selectedTeam={teams.find((t) => t.id === selectedTeamId) || (teams.length > 0 ? teams[0] : null)}
    onSelectTeam={(teamId) => setSelectedTeamId(teamId)}
    onCreateTeam={() => setShowCreateTeamModal(true)}
    onInviteMember={() => setShowInviteModal(true)}
    onDeleteTeam={(teamId) => void handleDeleteTeam(teamId)}
    onLeaveTeam={(teamId) => void handleLeaveTeam(teamId)}
    onRemoveMember={(teamId, memberId, memberName) => void handleRemoveMember(teamId, memberId, memberName)}
    receivedInvitations={receivedInvitations}
    onRespondInvitation={(invId, action) => void handleRespondInvitation(invId, action)}
    sentInvitations={sentInvitations}
    onCancelSentInvitation={(invId) => {
      const currentTeam = teams.find((t) => t.id === selectedTeamId) || (teams.length > 0 ? teams[0] : null);
      if (currentTeam) void handleCancelSentInvitation(currentTeam.id, invId);
    }}
    loading={teamsLoading}
    error={teamsError}
    actionMessage={teamActionMessage}
    actionError={teamActionError}
    onDismissActionMessage={() => {
      setTeamActionMessage("");
      setTeamActionError("");
    }}
    availableProjects={projects}
    onLinkProject={(teamId, projectId) => void handleLinkProjectToTeam(teamId, projectId)}
    onUnlinkProject={(teamId, projectId) => void handleUnlinkProjectFromTeam(teamId, projectId)}
    onCreateProjectForTeam={() => {
      setEditingProject(null);
      setShowCreateForm(true);
    }}
    onSelectProject={() => {
      setActive("My Projects");
    }}
  />
) : active === "Calendar" ? (
  <CalendarView projects={projects} />
) : active === "Review Queue" ? (
  <ReviewQueueWorkspaceView
    reviewQueue={reviewQueue}
    loading={reviewQueueLoading}
    error={reviewQueueError}
    filterStatus={reviewFilterStatus}
    onFilterChange={(st) => {
      setReviewFilterStatus(st);
      void loadReviewQueue(st);
    }}
    searchQuery={reviewSearchQuery}
    onSearchChange={setReviewSearchQuery}
    onReviewProject={(id, dec) => void handleReviewProject(id, dec)}
    reviewingProjectId={reviewingProjectId}
    successMessage={reviewSuccessMessage}
    onRefresh={() => void loadReviewQueue(reviewFilterStatus)}
  />
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
          teams={teams}
          onClose={() => { setShowCreateForm(false); setEditingProject(null); }}
          onCreated={() => {
            setProjectPage(1);
            void loadProjects(1);
            void loadTeams();
          }}
        />
      )}

      {showCreateTeamModal && (
        <CreateTeamModal
          onClose={() => setShowCreateTeamModal(false)}
          onCreated={(newTeam) => {
            setTeamActionMessage(`Team "${newTeam.name}" created successfully!`);
            void loadTeams(newTeam.id);
          }}
        />
      )}

      {showInviteModal && (() => {
        const currentTeam = teams.find((t) => t.id === selectedTeamId) || (teams.length > 0 ? teams[0] : null);
        if (!currentTeam) return null;
        return (
          <InviteMemberModal
            team={currentTeam}
            onClose={() => setShowInviteModal(false)}
            onInvited={() => {
              setTeamActionMessage("Invitation sent successfully!");
              void loadSentInvitations(currentTeam.id);
            }}
          />
        );
      })()}

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

      <ConfirmationModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        variant={confirmDialog.variant}
        loading={confirmLoading}
        onConfirm={confirmDialog.onConfirm}
        onClose={() => {
          if (!confirmLoading) {
            setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          }
        }}
      />
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

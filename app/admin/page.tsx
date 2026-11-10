"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  LayoutDashboard,
  Users,
  FolderKanban,
  CheckCircle2,
  Clock,
  AlertCircle,
  LogOut,
  ArrowLeft,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  UserCheck,
  UserX,
  ShieldAlert,
  BarChart3,
  Calendar,
  Layers,
  Check,
  Filter,
  History,
  Bell,
  Eye,
  Key,
  CheckCheck,
  FileText,
} from "lucide-react";

type UserRole = "student" | "faculty" | "admin";

type AdminProfile = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type AuditLogEntry = {
  id: string;
  actor: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  action: string;
  targetEntity: string;
  targetId: string;
  details: Record<string, unknown>;
  createdAt: string;
};

type PlatformStats = {
  users: {
    total: number;
    active?: number;
    suspended?: number;
    students: number;
    faculty: number;
    admins: number;
  };
  projects: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    inProgress: number;
    completed: number;
    byCategory: Record<string, number>;
  };
  tasks: {
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
    completionRate: number;
  };
  recentRegistrations: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
  }>;
  recentSubmissions: Array<{
    id: string;
    title: string;
    category: string;
    status: string;
    deadline: string;
    createdAt: string;
    authorName: string;
    authorEmail: string;
  }>;
  recentReviews?: Array<{
    id: string;
    title: string;
    category: string;
    status: string;
    reviewNotes: string;
    reviewedAt: string;
    reviewerName: string;
    reviewerEmail: string;
    studentName: string;
    studentEmail: string;
  }>;
};

type ManagedUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive?: boolean;
  projectCount: number;
  createdAt: string;
};

type ManagedProject = {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  deadline: string;
  githubUrl: string;
  createdAt: string;
  reviewNotes?: string;
  reviewedAt?: string;
  reviewer?: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  author: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
};

type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

// Role Pill Component
function RoleBadge({ role }: { role: string }) {
  let bg = "#eef0fb";
  let color = "#4b43a7";
  if (role === "admin") {
    bg = "#fef2f2";
    color = "#b91c1c";
  } else if (role === "faculty") {
    bg = "#ecfdf5";
    color = "#047857";
  }
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.2rem 0.55rem",
        borderRadius: "9999px",
        fontSize: "0.75rem",
        fontWeight: 700,
        textTransform: "capitalize",
        background: bg,
        color,
        letterSpacing: "0.02em",
      }}
    >
      {role}
    </span>
  );
}

// Status Pill Component
function StatusBadge({ status }: { status: string }) {
  let bg = "#f3f4f6";
  let color = "#4b5563";
  if (status === "Approved") {
    bg = "#ecfdf5";
    color = "#047857";
  } else if (status === "Pending") {
    bg = "#fffbeb";
    color = "#b45309";
  } else if (status === "Rejected") {
    bg = "#fef2f2";
    color = "#b91c1c";
  } else if (status === "In Progress") {
    bg = "#eff6ff";
    color = "#1d4ed8";
  } else if (status === "Completed") {
    bg = "#f5f3ff";
    color = "#6d28d9";
  }
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.2rem 0.55rem",
        borderRadius: "9999px",
        fontSize: "0.75rem",
        fontWeight: 700,
        background: bg,
        color,
      }}
    >
      {status}
    </span>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();

  // Authentication & admin profile state
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "projects" | "audit">("overview");

  // Global notification toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // 1. Overview Tab State
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState("");

  // 2. User Management Tab State
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [debouncedUserSearch, setDebouncedUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<string>("all");
  const [userStatusFilter, setUserStatusFilter] = useState<string>("all");
  const [userPage, setUserPage] = useState(1);
  const [userPagination, setUserPagination] = useState<PaginationMeta>({ page: 1, limit: 20, total: 0, totalPages: 1 });

  // Role Update Modal State
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>("student");
  const [roleUpdateLoading, setRoleUpdateLoading] = useState(false);
  const [roleUpdateError, setRoleUpdateError] = useState("");

  // Account Suspension / Activation Modal State
  const [deactivatingUser, setDeactivatingUser] = useState<ManagedUser | null>(null);
  const [activatingUser, setActivatingUser] = useState<ManagedUser | null>(null);
  const [statusActionLoading, setStatusActionLoading] = useState(false);

  // 3. Project Explorer Tab State
  const [projects, setProjects] = useState<ManagedProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState("");
  const [projectSearch, setProjectSearch] = useState("");
  const [debouncedProjectSearch, setDebouncedProjectSearch] = useState("");
  const [projectCategoryFilter, setProjectCategoryFilter] = useState("all");
  const [projectStatusFilter, setProjectStatusFilter] = useState("all");
  const [projectPage, setProjectPage] = useState(1);
  const [projectPagination, setProjectPagination] = useState<PaginationMeta>({ page: 1, limit: 20, total: 0, totalPages: 1 });

  // Inspect Review Modal State
  const [inspectingProject, setInspectingProject] = useState<ManagedProject | null>(null);

  // 4. Audit Logs Tab State
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState("");
  const [auditSearch, setAuditSearch] = useState("");
  const [debouncedAuditSearch, setDebouncedAuditSearch] = useState("");
  const [auditActionFilter, setAuditActionFilter] = useState("All");
  const [auditEntityFilter, setAuditEntityFilter] = useState("All");
  const [auditPage, setAuditPage] = useState(1);
  const [auditPagination, setAuditPagination] = useState<PaginationMeta>({ page: 1, limit: 25, total: 0, totalPages: 1 });

  // Admin Notifications State
  const [adminNotifications, setAdminNotifications] = useState<Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    link: string;
    read: boolean;
    createdAt: string;
  }>>([]);
  const [adminUnreadCount, setAdminUnreadCount] = useState(0);
  const [showAdminNotificationDropdown, setShowAdminNotificationDropdown] = useState(false);
  const [loadingAdminNotifications, setLoadingAdminNotifications] = useState(false);

  // Admin Settings & Profile Modal State
  const [showAdminSettingsModal, setShowAdminSettingsModal] = useState(false);
  const [adminSettingsTab, setAdminSettingsTab] = useState<"profile" | "security">("profile");
  const [adminNameInput, setAdminNameInput] = useState("");
  const [savingAdminProfile, setSavingAdminProfile] = useState(false);
  const [adminProfileMessage, setAdminProfileMessage] = useState("");
  const [adminProfileError, setAdminProfileError] = useState("");

  const [adminCurrentPassword, setAdminCurrentPassword] = useState("");
  const [adminNewPassword, setAdminNewPassword] = useState("");
  const [adminConfirmPassword, setAdminConfirmPassword] = useState("");
  const [savingAdminPassword, setSavingAdminPassword] = useState(false);
  const [adminPasswordMessage, setAdminPasswordMessage] = useState("");
  const [adminPasswordError, setAdminPasswordError] = useState("");

  // Search Debouncing
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedUserSearch(userSearch);
      setUserPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [userSearch]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedProjectSearch(projectSearch);
      setProjectPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [projectSearch]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedAuditSearch(auditSearch);
      setAuditPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [auditSearch]);

  // Toast timer auto-dismiss
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Initial Admin Profile Verification
  useEffect(() => {
    async function verifyCaller() {
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
        if (!data.user || data.user.role !== "admin") {
          router.replace("/");
          return;
        }

        setAdmin(data.user);
      } catch {
        router.replace("/login");
      } finally {
        setAuthLoading(false);
      }
    }

    verifyCaller();
  }, [router]);

  // Fetch Overview Stats
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError("");
    try {
      const response = await fetch("/api/admin/stats", {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin",
      });
      const data = await response.json();
      if (!response.ok) {
        setStatsError(data.message || "Unable to load platform statistics.");
        return;
      }
      setStats(data.stats);
    } catch {
      setStatsError("Network error while loading platform statistics.");
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Fetch Users
  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError("");
    try {
      const params = new URLSearchParams({
        page: userPage.toString(),
        limit: "20",
      });
      if (debouncedUserSearch) params.set("search", debouncedUserSearch);
      if (userRoleFilter && userRoleFilter !== "all") params.set("role", userRoleFilter);
      if (userStatusFilter && userStatusFilter !== "all") params.set("status", userStatusFilter);

      const response = await fetch(`/api/admin/users?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin",
      });
      const data = await response.json();
      if (!response.ok) {
        setUsersError(data.message || "Unable to load user directory.");
        return;
      }
      setUsers(data.users || []);
      setUserPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });
    } catch {
      setUsersError("Network error while loading user directory.");
    } finally {
      setUsersLoading(false);
    }
  }, [userPage, debouncedUserSearch, userRoleFilter, userStatusFilter]);

  // Fetch Projects
  const loadProjects = useCallback(async () => {
    setProjectsLoading(true);
    setProjectsError("");
    try {
      const params = new URLSearchParams({
        page: projectPage.toString(),
        limit: "20",
      });
      if (debouncedProjectSearch) params.set("search", debouncedProjectSearch);
      if (projectCategoryFilter && projectCategoryFilter !== "all") params.set("category", projectCategoryFilter);
      if (projectStatusFilter && projectStatusFilter !== "all") params.set("status", projectStatusFilter);

      const response = await fetch(`/api/admin/projects?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin",
      });
      const data = await response.json();
      if (!response.ok) {
        setProjectsError(data.message || "Unable to load projects repository.");
        return;
      }
      setProjects(data.projects || []);
      setProjectPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });
    } catch {
      setProjectsError("Network error while loading projects repository.");
    } finally {
      setProjectsLoading(false);
    }
  }, [projectPage, debouncedProjectSearch, projectCategoryFilter, projectStatusFilter]);

  // Fetch Audit Logs
  const loadAuditLogs = useCallback(async () => {
    setAuditLoading(true);
    setAuditError("");
    try {
      const params = new URLSearchParams({
        page: auditPage.toString(),
        limit: "25",
      });
      if (debouncedAuditSearch) params.set("search", debouncedAuditSearch);
      if (auditActionFilter && auditActionFilter !== "All") params.set("action", auditActionFilter);
      if (auditEntityFilter && auditEntityFilter !== "All") params.set("targetEntity", auditEntityFilter);

      const response = await fetch(`/api/admin/audit-logs?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin",
      });
      const data = await response.json();
      if (!response.ok) {
        setAuditError(data.message || "Unable to load audit logs.");
        return;
      }
      setAuditLogs(data.logs || []);
      setAuditPagination(data.pagination || { page: 1, limit: 25, total: 0, totalPages: 1 });
    } catch {
      setAuditError("Network error while loading audit logs.");
    } finally {
      setAuditLoading(false);
    }
  }, [auditPage, debouncedAuditSearch, auditActionFilter, auditEntityFilter]);

  // Load appropriate data when tab or filters change
  useEffect(() => {
    if (admin) {
      if (activeTab === "overview") loadStats();
      else if (activeTab === "users") loadUsers();
      else if (activeTab === "projects") loadProjects();
      else if (activeTab === "audit") loadAuditLogs();
    }
  }, [admin, activeTab, loadStats, loadUsers, loadProjects, loadAuditLogs]);

  // Handle Account Status (Activation / Deactivation) Toggle
  async function handleToggleUserStatus(targetUser: ManagedUser, newStatus: boolean) {
    setStatusActionLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${targetUser.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ isActive: newStatus }),
      });
      const data = await response.json();
      if (!response.ok) {
        setToast({ message: data.message || "Failed to update user status.", type: "error" });
        return;
      }
      setToast({
        message: data.message || `User account ${newStatus ? "activated" : "deactivated"} successfully.`,
        type: "success",
      });
      setDeactivatingUser(null);
      setActivatingUser(null);
      loadUsers();
      if (stats) loadStats();
    } catch {
      setToast({ message: "Network error while updating account status.", type: "error" });
    } finally {
      setStatusActionLoading(false);
    }
  }

  // Admin Notifications Management
  const loadAdminNotifications = useCallback(async () => {
    try {
      setLoadingAdminNotifications(true);
      const res = await fetch("/api/notifications", { credentials: "same-origin" });
      if (res.ok) {
        const data = await res.json();
        setAdminNotifications(data.notifications || []);
        setAdminUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // Non-blocking
    } finally {
      setLoadingAdminNotifications(false);
    }
  }, []);

  useEffect(() => {
    if (admin) {
      setAdminNameInput(admin.name);
      void loadAdminNotifications();
      const interval = setInterval(() => {
        void loadAdminNotifications();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [admin, loadAdminNotifications]);

  async function handleMarkAdminNotificationRead(id: string, link?: string) {
    try {
      await fetch(`/api/notifications/${encodeURIComponent(id)}/read`, {
        method: "PATCH",
        credentials: "same-origin",
      });
      setAdminNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setAdminUnreadCount((c) => Math.max(0, c - 1));
      if (link) {
        if (link.includes("projects")) setActiveTab("projects");
        setShowAdminNotificationDropdown(false);
      }
    } catch {
      // Non-blocking
    }
  }

  async function handleMarkAllAdminNotificationsRead() {
    try {
      await fetch("/api/notifications/read-all", {
        method: "PATCH",
        credentials: "same-origin",
      });
      setAdminNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setAdminUnreadCount(0);
    } catch {
      // Non-blocking
    }
  }

  async function handleUpdateAdminName(e: React.FormEvent) {
    e.preventDefault();
    if (!adminNameInput.trim()) {
      setAdminProfileError("Name cannot be empty.");
      return;
    }
    setSavingAdminProfile(true);
    setAdminProfileMessage("");
    setAdminProfileError("");
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ name: adminNameInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAdminProfileError(data.message || "Failed to update profile.");
        return;
      }
      setAdminProfileMessage("Profile updated successfully!");
      if (admin) {
        setAdmin({ ...admin, name: data.user.name });
      }
    } catch {
      setAdminProfileError("Network error. Please try again.");
    } finally {
      setSavingAdminProfile(false);
    }
  }

  async function handleChangeAdminPassword(e: React.FormEvent) {
    e.preventDefault();
    setAdminPasswordMessage("");
    setAdminPasswordError("");
    if (!adminCurrentPassword) {
      setAdminPasswordError("Current password is required.");
      return;
    }
    if (adminNewPassword.length < 8) {
      setAdminPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (adminNewPassword !== adminConfirmPassword) {
      setAdminPasswordError("New passwords do not match.");
      return;
    }
    setSavingAdminPassword(true);
    try {
      const res = await fetch("/api/profile/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          currentPassword: adminCurrentPassword,
          newPassword: adminNewPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAdminPasswordError(data.message || "Failed to update password.");
        return;
      }
      setAdminPasswordMessage("Password changed successfully!");
      setAdminCurrentPassword("");
      setAdminNewPassword("");
      setAdminConfirmPassword("");
    } catch {
      setAdminPasswordError("Network error. Please try again.");
    } finally {
      setSavingAdminPassword(false);
    }
  }

  // Handle Role Update Submission
  async function handleRoleUpdateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;

    setRoleUpdateLoading(true);
    setRoleUpdateError("");

    try {
      const response = await fetch(`/api/admin/users/${editingUser.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ role: selectedRole }),
      });

      const data = await response.json();

      if (!response.ok) {
        setRoleUpdateError(data.message || "Failed to update user role.");
        return;
      }

      setToast({
        message: data.message || `User role updated to ${selectedRole} successfully.`,
        type: "success",
      });

      setEditingUser(null);
      loadUsers();
      if (stats) loadStats();
    } catch {
      setRoleUpdateError("Network error while updating role.");
    } finally {
      setRoleUpdateLoading(false);
    }
  }

  // Handle Logout
  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
      router.push("/login");
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  }

  // Format dates cleanly
  function formatDate(isoString?: string) {
    if (!isoString) return "—";
    const d = new Date(isoString);
    return Number.isNaN(d.getTime())
      ? "—"
      : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  if (authLoading) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--background)" }}>
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <ShieldCheck size={44} style={{ color: "var(--primary)", margin: "0 auto 1rem", animation: "pulse 2s infinite" }} />
          <p style={{ color: "var(--foreground)", fontWeight: 600 }}>Verifying administrator session...</p>
        </div>
      </main>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", color: "var(--foreground)", display: "flex", flexDirection: "column" }}>
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            zIndex: 100,
            background: toast.type === "success" ? "#065f46" : "#991b1b",
            color: "#fff",
            padding: "0.75rem 1.25rem",
            borderRadius: "8px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            fontSize: "0.875rem",
            fontWeight: 600,
          }}
        >
          {toast.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer", marginLeft: "0.5rem", padding: 0 }}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Top Header */}
      <header className="admin-header">
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "8px",
                background: "linear-gradient(135deg, var(--primary) 0%, #302682 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
              }}
            >
              <ShieldCheck size={22} strokeWidth={2.2} />
            </div>
            <div>
              <span style={{ fontWeight: 800, fontSize: "1.15rem", letterSpacing: "-0.02em" }}>
                Project<span style={{ color: "var(--primary)" }}>Sphere</span>
              </span>
              <span
                style={{
                  marginLeft: "0.5rem",
                  fontSize: "0.7rem",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  background: "var(--accent)",
                  color: "var(--accent-foreground)",
                  padding: "0.15rem 0.5rem",
                  borderRadius: "4px",
                }}
              >
                Admin
              </span>
            </div>
          </div>
        </div>

        <div className="admin-header-actions">
          {/* Notification Bell */}
          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setShowAdminNotificationDropdown((prev) => !prev)}
              aria-label="Admin notifications"
              style={{
                position: "relative",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 36,
                height: 36,
                borderRadius: "6px",
                border: "1px solid var(--border)",
                background: "var(--card)",
                color: "var(--foreground)",
                cursor: "pointer",
              }}
            >
              <Bell size={17} />
              {adminUnreadCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: "-4px",
                    right: "-4px",
                    background: "#ef4444",
                    color: "#ffffff",
                    fontSize: "10px",
                    fontWeight: 700,
                    borderRadius: "10px",
                    minWidth: "16px",
                    height: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 3px",
                    border: "2px solid var(--card)",
                  }}
                >
                  {adminUnreadCount > 99 ? "99+" : adminUnreadCount}
                </span>
              )}
            </button>

            {showAdminNotificationDropdown && (
              <NotificationDropdown
                notifications={adminNotifications}
                unreadCount={adminUnreadCount}
                loading={loadingAdminNotifications}
                onMarkAsRead={handleMarkAdminNotificationRead}
                onMarkAllAsRead={handleMarkAllAdminNotificationsRead}
                onClose={() => setShowAdminNotificationDropdown(false)}
              />
            )}
          </div>

          {/* Admin Profile Button */}
          <button
            type="button"
            onClick={() => {
              setAdminSettingsTab("profile");
              setShowAdminSettingsModal(true);
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.45rem",
              fontSize: "0.85rem",
              fontWeight: 600,
              color: "var(--foreground)",
              padding: "0.45rem 0.85rem",
              borderRadius: "6px",
              border: "1px solid var(--border)",
              background: "var(--card)",
              cursor: "pointer",
            }}
            title="Admin Profile & Security"
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: "var(--primary)",
                color: "#fff",
                fontSize: "11px",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {admin?.name?.charAt(0).toUpperCase() || "A"}
            </div>
            <span className="admin-header-label">Profile</span>
          </button>

          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              fontSize: "0.85rem",
              fontWeight: 600,
              color: "var(--foreground)",
              padding: "0.45rem 0.85rem",
              borderRadius: "6px",
              border: "1px solid var(--border)",
              background: "var(--card)",
              textDecoration: "none",
            }}
          >
            <ArrowLeft size={15} />
            <span className="admin-header-label">Student Workspace</span>
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              fontSize: "0.85rem",
              fontWeight: 600,
              color: "var(--destructive)",
              padding: "0.45rem 0.85rem",
              borderRadius: "6px",
              border: "1px solid rgba(216, 76, 101, 0.25)",
              background: "#fff5f5",
              cursor: "pointer",
            }}
          >
            <LogOut size={15} />
            <span>{loggingOut ? "Signing out..." : "Logout"}</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="admin-main-container">
        {/* Navigation Tabs Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--border)",
            marginBottom: "1.75rem",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {[
              { id: "overview", label: "Overview", icon: LayoutDashboard },
              { id: "users", label: "User Management", icon: Users },
              { id: "projects", label: "Project Explorer", icon: FolderKanban },
              { id: "audit", label: "Audit Logs", icon: History },
            ].map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.75rem 1.15rem",
                    fontSize: "0.925rem",
                    fontWeight: active ? 700 : 500,
                    color: active ? "var(--primary)" : "var(--muted-foreground)",
                    borderBottom: active ? "2px solid var(--primary)" : "2px solid transparent",
                    background: "transparent",
                    borderTop: "none",
                    borderLeft: "none",
                    borderRight: "none",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <tab.icon size={17} strokeWidth={active ? 2.2 : 1.8} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div style={{ fontSize: "0.85rem", color: "var(--muted-foreground)", fontWeight: 500 }}>
            Active Admin: <strong style={{ color: "var(--foreground)" }}>{admin?.name}</strong>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: OVERVIEW */}
        {/* ========================================================================= */}
        {activeTab === "overview" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
              <h2 style={{ fontSize: "1.35rem", fontWeight: 800, margin: 0, letterSpacing: "-0.01em" }}>
                Platform Real-Time Analytics
              </h2>
              <button
                type="button"
                onClick={loadStats}
                disabled={statsLoading}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  fontSize: "0.825rem",
                  fontWeight: 600,
                  padding: "0.4rem 0.85rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                  cursor: "pointer",
                }}
              >
                <RefreshCw size={14} style={{ animation: statsLoading ? "spin 1s linear infinite" : "none" }} />
                <span>Refresh</span>
              </button>
            </div>

            {statsError && (
              <div style={{ padding: "1rem", borderRadius: "8px", background: "#fef2f2", color: "#b91c1c", marginBottom: "1.5rem", border: "1px solid #fecaca" }}>
                {statsError}
              </div>
            )}

            {/* Stat Cards Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: "1.25rem", marginBottom: "1.75rem" }}>
              {/* Users Metric */}
              <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "1.35rem", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--muted-foreground)" }}>Registered Users</span>
                  <div style={{ width: 34, height: 34, borderRadius: "6px", background: "var(--secondary)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)" }}>
                    <Users size={18} />
                  </div>
                </div>
                <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--foreground)", marginBottom: "0.4rem" }}>
                  {statsLoading ? "—" : stats?.users.total ?? 0}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.6rem", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.725rem", fontWeight: 700, background: "#ecfdf5", color: "#047857", padding: "0.15rem 0.5rem", borderRadius: "9999px", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#059669" }} />
                    Active: {statsLoading ? "—" : stats?.users.active ?? ((stats?.users.total ?? 0) - (stats?.users.suspended ?? 0))}
                  </span>
                  <span style={{ fontSize: "0.725rem", fontWeight: 700, background: (stats?.users.suspended ?? 0) > 0 ? "#fef2f2" : "#f3f4f6", color: (stats?.users.suspended ?? 0) > 0 ? "#b91c1c" : "#6b7280", padding: "0.15rem 0.5rem", borderRadius: "9999px", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: (stats?.users.suspended ?? 0) > 0 ? "#dc2626" : "#9ca3af" }} />
                    Suspended: {statsLoading ? "—" : stats?.users.suspended ?? 0}
                  </span>
                </div>
                <div style={{ display: "flex", gap: "0.4rem", fontSize: "0.725rem", flexWrap: "wrap", borderTop: "1px solid var(--border)", paddingTop: "0.6rem" }}>
                  <span style={{ background: "var(--muted)", padding: "0.15rem 0.45rem", borderRadius: "4px" }}>
                    Students: <strong>{stats?.users.students ?? 0}</strong>
                  </span>
                  <span style={{ background: "var(--muted)", padding: "0.15rem 0.45rem", borderRadius: "4px" }}>
                    Faculty: <strong>{stats?.users.faculty ?? 0}</strong>
                  </span>
                  <span style={{ background: "var(--muted)", padding: "0.15rem 0.45rem", borderRadius: "4px" }}>
                    Admins: <strong>{stats?.users.admins ?? 0}</strong>
                  </span>
                </div>
              </div>

              {/* Projects Metric */}
              <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "1.35rem", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--muted-foreground)" }}>Total Projects</span>
                  <div style={{ width: 34, height: 34, borderRadius: "6px", background: "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center", color: "#059669" }}>
                    <FolderKanban size={18} />
                  </div>
                </div>
                <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--foreground)", marginBottom: "0.4rem" }}>
                  {statsLoading ? "—" : stats?.projects.total ?? 0}
                </div>
                <div style={{ display: "flex", gap: "0.35rem", fontSize: "0.725rem", flexWrap: "wrap", marginBottom: "0.6rem" }}>
                  <span style={{ background: "#ecfdf5", color: "#047857", padding: "0.15rem 0.45rem", borderRadius: "4px" }}>
                    Approved: <strong>{stats?.projects.approved ?? 0}</strong>
                  </span>
                  <span style={{ background: "#eff6ff", color: "#1d4ed8", padding: "0.15rem 0.45rem", borderRadius: "4px" }}>
                    In Progress: <strong>{stats?.projects.inProgress ?? 0}</strong>
                  </span>
                  <span style={{ background: "#f5f3ff", color: "#6d28d9", padding: "0.15rem 0.45rem", borderRadius: "4px" }}>
                    Completed: <strong>{stats?.projects.completed ?? 0}</strong>
                  </span>
                </div>
                <div style={{ display: "flex", gap: "0.35rem", fontSize: "0.725rem", flexWrap: "wrap", borderTop: "1px solid var(--border)", paddingTop: "0.6rem" }}>
                  <span style={{ background: "#fffbeb", color: "#b45309", padding: "0.15rem 0.45rem", borderRadius: "4px" }}>
                    Pending: <strong>{stats?.projects.pending ?? 0}</strong>
                  </span>
                  <span style={{ background: "#fef2f2", color: "#b91c1c", padding: "0.15rem 0.45rem", borderRadius: "4px" }}>
                    Rejected: <strong>{stats?.projects.rejected ?? 0}</strong>
                  </span>
                </div>
              </div>

              {/* Task Completion Velocity */}
              <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "1.35rem", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--muted-foreground)" }}>Task Delivery</span>
                  <div style={{ width: 34, height: 34, borderRadius: "6px", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#2563eb" }}>
                    <CheckCircle2 size={18} />
                  </div>
                </div>
                <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--foreground)", marginBottom: "0.5rem" }}>
                  {statsLoading ? "—" : `${stats?.tasks.completionRate ?? 0}%`}
                </div>
                <div style={{ width: "100%", height: 6, background: "var(--muted)", borderRadius: 3, overflow: "hidden", marginBottom: "0.5rem" }}>
                  <div style={{ width: `${stats?.tasks.completionRate ?? 0}%`, height: "100%", background: "var(--primary)", borderRadius: 3, transition: "width 0.5s ease" }} />
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>
                  {stats?.tasks.completed ?? 0} completed of {stats?.tasks.total ?? 0} total tasks
                </div>
              </div>

              {/* Review Queue Status */}
              <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "1.35rem", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--muted-foreground)" }}>Review Workload</span>
                  <div style={{ width: 34, height: 34, borderRadius: "6px", background: "#fffbeb", display: "flex", alignItems: "center", justifyContent: "center", color: "#d97706" }}>
                    <Clock size={18} />
                  </div>
                </div>
                <div style={{ fontSize: "2rem", fontWeight: 800, color: (stats?.projects.pending ?? 0) > 0 ? "#b45309" : "var(--foreground)", marginBottom: "0.4rem" }}>
                  {statsLoading ? "—" : stats?.projects.pending ?? 0}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", marginBottom: (stats?.projects.pending ?? 0) > 0 ? "0.6rem" : "0" }}>
                  {(stats?.projects.pending ?? 0) > 0 ? "Submissions requiring faculty or admin review" : "All submissions are currently reviewed"}
                </div>
                {(stats?.projects.pending ?? 0) > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setProjectStatusFilter("Pending");
                      setActiveTab("projects");
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.35rem",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      color: "#b45309",
                      background: "#fffbeb",
                      border: "1px solid #fde68a",
                      borderRadius: "6px",
                      padding: "0.3rem 0.65rem",
                      cursor: "pointer",
                    }}
                  >
                    <span>Inspect Pending Submissions</span>
                    <ChevronRight size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Live Platform Distribution Analytics */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
              {/* Analytics Box 1: User Roles & Account Health */}
              <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "1.25rem", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                  <h3 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Users size={16} style={{ color: "var(--primary)" }} />
                    <span>User Roles & Account Health</span>
                  </h3>
                  <span style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>
                    {stats?.users.total ?? 0} accounts
                  </span>
                </div>

                {/* Proportional Role Bar */}
                <div style={{ marginBottom: "1rem" }}>
                  <div style={{ height: 10, width: "100%", borderRadius: 5, overflow: "hidden", display: "flex", background: "var(--muted)" }}>
                    {stats && stats.users.total > 0 ? (
                      <>
                        <div
                          style={{
                            width: `${(stats.users.students / stats.users.total) * 100}%`,
                            background: "#6657d9",
                            transition: "width 0.4s ease",
                          }}
                          title={`Students: ${stats.users.students}`}
                        />
                        <div
                          style={{
                            width: `${(stats.users.faculty / stats.users.total) * 100}%`,
                            background: "#059669",
                            transition: "width 0.4s ease",
                          }}
                          title={`Faculty: ${stats.users.faculty}`}
                        />
                        <div
                          style={{
                            width: `${(stats.users.admins / stats.users.total) * 100}%`,
                            background: "#d97706",
                            transition: "width 0.4s ease",
                          }}
                          title={`Admins: ${stats.users.admins}`}
                        />
                      </>
                    ) : (
                      <div style={{ width: "100%", background: "var(--muted)" }} />
                    )}
                  </div>

                  {/* Legend & Percentages */}
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.6rem", fontSize: "0.75rem", flexWrap: "wrap", gap: "0.4rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#6657d9" }} />
                      <span>Students: <strong>{stats?.users.students ?? 0}</strong> ({stats && stats.users.total > 0 ? Math.round((stats.users.students / stats.users.total) * 100) : 0}%)</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#059669" }} />
                      <span>Faculty: <strong>{stats?.users.faculty ?? 0}</strong> ({stats && stats.users.total > 0 ? Math.round((stats.users.faculty / stats.users.total) * 100) : 0}%)</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#d97706" }} />
                      <span>Admins: <strong>{stats?.users.admins ?? 0}</strong> ({stats && stats.users.total > 0 ? Math.round((stats.users.admins / stats.users.total) * 100) : 0}%)</span>
                    </div>
                  </div>
                </div>

                {/* Account Health Meter */}
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: "0.85rem", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.8rem" }}>
                  <span style={{ color: "var(--muted-foreground)" }}>Account Activity Status:</span>
                  <div style={{ display: "flex", gap: "0.75rem" }}>
                    <span style={{ color: "#047857", fontWeight: 700 }}>
                      {stats && stats.users.total > 0 ? Math.round(((stats.users.active ?? (stats.users.total - (stats.users.suspended ?? 0))) / stats.users.total) * 100) : 100}% Active
                    </span>
                    <span style={{ color: (stats?.users.suspended ?? 0) > 0 ? "#b91c1c" : "var(--muted-foreground)", fontWeight: 600 }}>
                      {stats?.users.suspended ?? 0} Suspended
                    </span>
                  </div>
                </div>
              </div>

              {/* Analytics Box 2: Project Lifecycle Distribution */}
              <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "1.25rem", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                  <h3 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <FolderKanban size={16} style={{ color: "var(--primary)" }} />
                    <span>Project Lifecycle Distribution</span>
                  </h3>
                  <span style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>
                    {stats?.projects.total ?? 0} projects
                  </span>
                </div>

                {/* Proportional Project Bar */}
                <div style={{ marginBottom: "1rem" }}>
                  <div style={{ height: 10, width: "100%", borderRadius: 5, overflow: "hidden", display: "flex", background: "var(--muted)" }}>
                    {stats && stats.projects.total > 0 ? (
                      <>
                        <div style={{ width: `${(stats.projects.approved / stats.projects.total) * 100}%`, background: "#10b981" }} title="Approved" />
                        <div style={{ width: `${(stats.projects.inProgress / stats.projects.total) * 100}%`, background: "#3b82f6" }} title="In Progress" />
                        <div style={{ width: `${(stats.projects.completed / stats.projects.total) * 100}%`, background: "#8b5cf6" }} title="Completed" />
                        <div style={{ width: `${(stats.projects.pending / stats.projects.total) * 100}%`, background: "#f59e0b" }} title="Pending" />
                        <div style={{ width: `${(stats.projects.rejected / stats.projects.total) * 100}%`, background: "#ef4444" }} title="Rejected" />
                      </>
                    ) : (
                      <div style={{ width: "100%", background: "var(--muted)" }} />
                    )}
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.6rem", fontSize: "0.75rem" }}>
                    <span style={{ background: "#ecfdf5", color: "#047857", padding: "0.15rem 0.45rem", borderRadius: "4px" }}>
                      Approved: <strong>{stats?.projects.approved ?? 0}</strong>
                    </span>
                    <span style={{ background: "#eff6ff", color: "#1d4ed8", padding: "0.15rem 0.45rem", borderRadius: "4px" }}>
                      In Progress: <strong>{stats?.projects.inProgress ?? 0}</strong>
                    </span>
                    <span style={{ background: "#f5f3ff", color: "#6d28d9", padding: "0.15rem 0.45rem", borderRadius: "4px" }}>
                      Completed: <strong>{stats?.projects.completed ?? 0}</strong>
                    </span>
                    <span style={{ background: "#fffbeb", color: "#b45309", padding: "0.15rem 0.45rem", borderRadius: "4px" }}>
                      Pending: <strong>{stats?.projects.pending ?? 0}</strong>
                    </span>
                    <span style={{ background: "#fef2f2", color: "#b91c1c", padding: "0.15rem 0.45rem", borderRadius: "4px" }}>
                      Rejected: <strong>{stats?.projects.rejected ?? 0}</strong>
                    </span>
                  </div>
                </div>

                {/* Approval Rate Meter */}
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: "0.85rem", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.8rem" }}>
                  <span style={{ color: "var(--muted-foreground)" }}>Platform Review Velocity:</span>
                  <span style={{ color: "#059669", fontWeight: 700 }}>
                    {stats && (stats.projects.approved + stats.projects.rejected) > 0
                      ? `${Math.round((stats.projects.approved / (stats.projects.approved + stats.projects.rejected)) * 100)}% approval rate`
                      : "Awaiting initial reviews"}
                  </span>
                </div>
              </div>

              {/* Analytics Box 3: Category Distribution */}
              <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "1.25rem", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.85rem" }}>
                  <h3 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Layers size={16} style={{ color: "var(--primary)" }} />
                    <span>Project Categories</span>
                  </h3>
                  <span style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>
                    {Object.keys(stats?.projects.byCategory || {}).length} categories active
                  </span>
                </div>

                {stats && Object.keys(stats.projects.byCategory || {}).length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {Object.entries(stats.projects.byCategory).map(([cat, count]) => {
                      const pct = stats.projects.total > 0 ? Math.round((count / stats.projects.total) * 100) : 0;
                      return (
                        <div key={cat} style={{ fontSize: "0.775rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.2rem" }}>
                            <span style={{ fontWeight: 600 }}>{cat}</span>
                            <span style={{ color: "var(--muted-foreground)" }}>{count} ({pct}%)</span>
                          </div>
                          <div style={{ width: "100%", height: 5, background: "var(--muted)", borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ width: `${pct}%`, height: "100%", background: "var(--primary)", borderRadius: 3 }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--muted-foreground)", fontSize: "0.8rem" }}>
                    No categorized projects yet.
                  </div>
                )}
              </div>
            </div>

            {/* Split Section: Recent Activity */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: "1.5rem" }}>
              {/* Recent Project Submissions */}
              <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "1.25rem" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 1rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <FolderKanban size={17} style={{ color: "var(--primary)" }} />
                  <span>Recent Project Submissions</span>
                </h3>

                {stats?.recentSubmissions && stats.recentSubmissions.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {stats.recentSubmissions.map((proj) => (
                      <div
                        key={proj.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "0.75rem",
                          borderRadius: "6px",
                          background: "var(--background)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1, marginRight: "1rem" }}>
                          <div style={{ fontWeight: 700, fontSize: "0.875rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {proj.title}
                          </div>
                          <div style={{ fontSize: "0.775rem", color: "var(--muted-foreground)" }}>
                            By {proj.authorName} • {proj.category}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <StatusBadge status={proj.status} />
                          <span style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>
                            {formatDate(proj.createdAt)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: "2rem", textAlign: "center", color: "var(--muted-foreground)", fontSize: "0.875rem" }}>
                    No project submissions recorded yet.
                  </div>
                )}
              </div>

              {/* Recent User Registrations */}
              <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "1.25rem" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 1rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Users size={17} style={{ color: "var(--primary)" }} />
                  <span>Recent Registrations</span>
                </h3>

                {stats?.recentRegistrations && stats.recentRegistrations.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {stats.recentRegistrations.map((u) => (
                      <div
                        key={u.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "0.75rem",
                          borderRadius: "6px",
                          background: "var(--background)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontSize: "0.875rem" }}>{u.name}</div>
                          <div style={{ fontSize: "0.775rem", color: "var(--muted-foreground)" }}>{u.email}</div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <RoleBadge role={u.role} />
                          <span style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>
                            {formatDate(u.createdAt)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: "2rem", textAlign: "center", color: "var(--muted-foreground)", fontSize: "0.875rem" }}>
                    No user accounts registered yet.
                  </div>
                )}
              </div>
            </div>

            {/* Recent Review Activity */}
            <div style={{ marginTop: "1.5rem", background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "1.25rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 1rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <CheckCircle2 size={17} style={{ color: "var(--primary)" }} />
                <span>Recent Review Activity</span>
              </h3>

              {stats?.recentReviews && stats.recentReviews.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {stats.recentReviews.map((rev) => (
                    <div
                      key={rev.id}
                      style={{
                        padding: "0.85rem 1rem",
                        borderRadius: "8px",
                        background: "var(--background)",
                        border: "1px solid var(--border)",
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: "1rem",
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ flex: "1 1 300px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.25rem" }}>
                          <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{rev.title}</span>
                          <StatusBadge status={rev.status} />
                          <span style={{ fontSize: "0.75rem", background: "var(--muted)", padding: "0.15rem 0.4rem", borderRadius: "4px" }}>
                            {rev.category}
                          </span>
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "var(--muted-foreground)", marginBottom: rev.reviewNotes ? "0.35rem" : "0" }}>
                          Submitted by <strong>{rev.studentName}</strong> ({rev.studentEmail}) • Reviewed by <strong>{rev.reviewerName}</strong>
                        </div>
                        {rev.reviewNotes && (
                          <div style={{ fontSize: "0.8rem", background: "rgba(0,0,0,0.02)", borderLeft: "3px solid var(--primary)", padding: "0.35rem 0.65rem", borderRadius: "0 4px 4px 0", fontStyle: "italic" }}>
                            &ldquo;{rev.reviewNotes}&rdquo;
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>
                        {formatDate(rev.reviewedAt)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: "2rem", textAlign: "center", color: "var(--muted-foreground)", fontSize: "0.875rem" }}>
                  No project review activity recorded yet.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: USER MANAGEMENT */}
        {/* ========================================================================= */}
        {activeTab === "users" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
              <h2 style={{ fontSize: "1.35rem", fontWeight: 800, margin: 0, letterSpacing: "-0.01em" }}>
                User Management & Roles
              </h2>

              {/* Search & Filter Controls */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                <div style={{ position: "relative", minWidth: 260 }}>
                  <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.45rem 2rem 0.45rem 2rem",
                      fontSize: "0.85rem",
                      borderRadius: "6px",
                      border: "1px solid var(--border)",
                      background: "var(--card)",
                      color: "var(--foreground)",
                    }}
                  />
                  {userSearch && (
                    <button
                      type="button"
                      onClick={() => setUserSearch("")}
                      style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <select
                  value={userRoleFilter}
                  onChange={(e) => {
                    setUserRoleFilter(e.target.value);
                    setUserPage(1);
                  }}
                  style={{
                    padding: "0.45rem 0.85rem",
                    fontSize: "0.85rem",
                    borderRadius: "6px",
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    color: "var(--foreground)",
                    cursor: "pointer",
                  }}
                >
                  <option value="all">All Roles</option>
                  <option value="student">Students</option>
                  <option value="faculty">Faculty</option>
                  <option value="admin">Administrators</option>
                </select>

                <select
                  value={userStatusFilter}
                  onChange={(e) => {
                    setUserStatusFilter(e.target.value);
                    setUserPage(1);
                  }}
                  style={{
                    padding: "0.45rem 0.85rem",
                    fontSize: "0.85rem",
                    borderRadius: "6px",
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    color: "var(--foreground)",
                    cursor: "pointer",
                  }}
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active Accounts</option>
                  <option value="suspended">Suspended Accounts</option>
                </select>

                <button
                  type="button"
                  onClick={loadUsers}
                  disabled={usersLoading}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    fontSize: "0.825rem",
                    fontWeight: 600,
                    padding: "0.45rem 0.85rem",
                    borderRadius: "6px",
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    cursor: "pointer",
                  }}
                >
                  <RefreshCw size={14} style={{ animation: usersLoading ? "spin 1s linear infinite" : "none" }} />
                </button>
              </div>
            </div>

            {usersError && (
              <div style={{ padding: "1rem", borderRadius: "8px", background: "#fef2f2", color: "#b91c1c", marginBottom: "1.5rem", border: "1px solid #fecaca" }}>
                {usersError}
              </div>
            )}

            {/* Users Table Container */}
            <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
              <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                <table style={{ width: "100%", minWidth: 680, borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
                  <thead>
                    <tr style={{ background: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
                      <th style={{ padding: "0.85rem 1rem", fontWeight: 700, color: "var(--foreground)" }}>User</th>
                      <th style={{ padding: "0.85rem 1rem", fontWeight: 700, color: "var(--foreground)" }}>Email</th>
                      <th style={{ padding: "0.85rem 1rem", fontWeight: 700, color: "var(--foreground)" }}>Role</th>
                      <th style={{ padding: "0.85rem 1rem", fontWeight: 700, color: "var(--foreground)" }}>Status</th>
                      <th style={{ padding: "0.85rem 1rem", fontWeight: 700, color: "var(--foreground)" }}>Projects</th>
                      <th style={{ padding: "0.85rem 1rem", fontWeight: 700, color: "var(--foreground)" }}>Joined</th>
                      <th style={{ padding: "0.85rem 1rem", fontWeight: 700, color: "var(--foreground)", textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersLoading ? (
                      <tr>
                        <td colSpan={7} style={{ padding: "3rem", textAlign: "center", color: "var(--muted-foreground)" }}>
                          <RefreshCw size={24} style={{ animation: "spin 1s linear infinite", margin: "0 auto 0.75rem" }} />
                          <p style={{ margin: 0 }}>Loading user directory...</p>
                        </td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ padding: "3rem", textAlign: "center", color: "var(--muted-foreground)" }}>
                          <Users size={32} style={{ margin: "0 auto 0.75rem", opacity: 0.5 }} />
                          <p style={{ margin: "0 0 0.5rem 0", fontWeight: 600 }}>No users found matching your search</p>
                          {(userSearch || userRoleFilter !== "all" || userStatusFilter !== "all") && (
                            <button
                              type="button"
                              onClick={() => {
                                setUserSearch("");
                                setUserRoleFilter("all");
                                setUserStatusFilter("all");
                              }}
                              style={{ fontSize: "0.8rem", color: "var(--primary)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
                            >
                              Clear search and filters
                            </button>
                          )}
                        </td>
                      </tr>
                    ) : (
                      users.map((u) => {
                        const isCurrentAdmin = u.id === admin?.id;
                        return (
                          <tr key={u.id} style={{ borderBottom: "1px solid var(--border)", transition: "background 0.1s ease" }}>
                            <td style={{ padding: "0.85rem 1rem" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                                <div
                                  style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: "50%",
                                    background: "var(--secondary)",
                                    color: "var(--primary)",
                                    fontWeight: 700,
                                    fontSize: "0.85rem",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  {u.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 700 }}>{u.name}</div>
                                  {isCurrentAdmin && (
                                    <span style={{ fontSize: "0.7rem", color: "var(--primary)", fontWeight: 600 }}>(You)</span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: "0.85rem 1rem", color: "var(--foreground)" }}>{u.email}</td>
                            <td style={{ padding: "0.85rem 1rem" }}>
                              <RoleBadge role={u.role} />
                            </td>
                            <td style={{ padding: "0.85rem 1rem" }}>
                              {u.isActive !== false ? (
                                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#065f46", background: "#ecfdf5", padding: "0.2rem 0.55rem", borderRadius: "4px" }}>
                                  Active
                                </span>
                              ) : (
                                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#991b1b", background: "#fef2f2", padding: "0.2rem 0.55rem", borderRadius: "4px" }}>
                                  Suspended
                                </span>
                              )}
                            </td>
                            <td style={{ padding: "0.85rem 1rem", fontWeight: 600 }}>{u.projectCount}</td>
                            <td style={{ padding: "0.85rem 1rem", color: "var(--muted-foreground)" }}>{formatDate(u.createdAt)}</td>
                            <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                              <div style={{ display: "inline-flex", gap: "0.4rem", alignItems: "center" }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingUser(u);
                                    setSelectedRole(u.role);
                                    setRoleUpdateError("");
                                  }}
                                  style={{
                                    fontSize: "0.8rem",
                                    fontWeight: 600,
                                    color: "var(--primary)",
                                    background: "var(--accent)",
                                    border: "none",
                                    padding: "0.35rem 0.65rem",
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                  }}
                                >
                                  Change Role
                                </button>
                                {!isCurrentAdmin && (
                                  u.isActive !== false ? (
                                    <button
                                      type="button"
                                      onClick={() => setDeactivatingUser(u)}
                                      style={{
                                        fontSize: "0.8rem",
                                        fontWeight: 600,
                                        color: "var(--destructive)",
                                        background: "#fff5f5",
                                        border: "1px solid rgba(216, 76, 101, 0.25)",
                                        padding: "0.35rem 0.65rem",
                                        borderRadius: "4px",
                                        cursor: "pointer",
                                      }}
                                      title="Suspend user account"
                                    >
                                      Suspend
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setActivatingUser(u)}
                                      style={{
                                        fontSize: "0.8rem",
                                        fontWeight: 600,
                                        color: "#059669",
                                        background: "#ecfdf5",
                                        border: "1px solid #a7f3d0",
                                        padding: "0.35rem 0.65rem",
                                        borderRadius: "4px",
                                        cursor: "pointer",
                                      }}
                                      title="Reactivate user account"
                                    >
                                      Activate
                                    </button>
                                  )
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* User Pagination Bar */}
              {userPagination.totalPages > 1 && (
                <div style={{ padding: "0.85rem 1rem", display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--border)", background: "var(--card)" }}>
                  <span style={{ fontSize: "0.825rem", color: "var(--muted-foreground)" }}>
                    Page {userPagination.page} of {userPagination.totalPages} ({userPagination.total} total users)
                  </span>

                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      disabled={userPagination.page <= 1 || usersLoading}
                      onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        padding: "0.35rem 0.65rem",
                        fontSize: "0.8rem",
                        borderRadius: "4px",
                        border: "1px solid var(--border)",
                        background: "var(--card)",
                        cursor: userPagination.page <= 1 ? "not-allowed" : "pointer",
                        opacity: userPagination.page <= 1 ? 0.5 : 1,
                      }}
                    >
                      <ChevronLeft size={14} />
                      <span>Previous</span>
                    </button>

                    <button
                      type="button"
                      disabled={userPagination.page >= userPagination.totalPages || usersLoading}
                      onClick={() => setUserPage((p) => p + 1)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        padding: "0.35rem 0.65rem",
                        fontSize: "0.8rem",
                        borderRadius: "4px",
                        border: "1px solid var(--border)",
                        background: "var(--card)",
                        cursor: userPagination.page >= userPagination.totalPages ? "not-allowed" : "pointer",
                        opacity: userPagination.page >= userPagination.totalPages ? 0.5 : 1,
                      }}
                    >
                      <span>Next</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Role Change Modal */}
            {editingUser && (
              <div
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: "rgba(0,0,0,0.5)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 80,
                  padding: "1rem",
                }}
              >
                <div
                  style={{
                    background: "var(--card)",
                    borderRadius: "var(--radius)",
                    maxWidth: 440,
                    width: "100%",
                    padding: "1.75rem",
                    boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                    <h3 style={{ fontSize: "1.15rem", fontWeight: 800, margin: 0 }}>Modify User Role</h3>
                    <button
                      type="button"
                      onClick={() => setEditingUser(null)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)", margin: "0 0 1.25rem 0" }}>
                    Updating role for <strong>{editingUser.name}</strong> ({editingUser.email}).
                  </p>

                  {roleUpdateError && (
                    <div style={{ padding: "0.75rem", borderRadius: "6px", background: "#fef2f2", color: "#b91c1c", fontSize: "0.85rem", marginBottom: "1rem" }}>
                      {roleUpdateError}
                    </div>
                  )}

                  {editingUser.id === admin?.id && selectedRole !== "admin" && (
                    <div style={{ display: "flex", gap: "0.5rem", padding: "0.75rem", borderRadius: "6px", background: "#fffbeb", color: "#b45309", fontSize: "0.8rem", marginBottom: "1rem" }}>
                      <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                      <span>Warning: Self-demotion is blocked by server security policy to prevent accidental lockout.</span>
                    </div>
                  )}

                  <form onSubmit={handleRoleUpdateSubmit}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
                      {[
                        { role: "student", label: "Student", desc: "Access to personal projects, tasks, and calendar." },
                        { role: "faculty", label: "Faculty", desc: "Access to review queue, project approvals, and feedback." },
                        { role: "admin", label: "Administrator", desc: "Full administrative control, user management, and platform analytics." },
                      ].map((item) => (
                        <label
                          key={item.role}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "0.75rem",
                            padding: "0.75rem",
                            borderRadius: "6px",
                            border: selectedRole === item.role ? "2px solid var(--primary)" : "1px solid var(--border)",
                            background: selectedRole === item.role ? "var(--accent)" : "transparent",
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="radio"
                            name="userRole"
                            value={item.role}
                            checked={selectedRole === item.role}
                            onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                            style={{ marginTop: 3 }}
                          />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: "0.875rem" }}>{item.label}</div>
                            <div style={{ fontSize: "0.775rem", color: "var(--muted-foreground)" }}>{item.desc}</div>
                          </div>
                        </label>
                      ))}
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                      <button
                        type="button"
                        onClick={() => setEditingUser(null)}
                        disabled={roleUpdateLoading}
                        style={{
                          padding: "0.5rem 1rem",
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          borderRadius: "6px",
                          border: "1px solid var(--border)",
                          background: "var(--card)",
                          cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        disabled={roleUpdateLoading || (editingUser.id === admin?.id && selectedRole !== "admin")}
                        style={{
                          padding: "0.5rem 1.25rem",
                          fontSize: "0.85rem",
                          fontWeight: 700,
                          borderRadius: "6px",
                          border: "none",
                          background: "var(--primary)",
                          color: "#fff",
                          cursor: roleUpdateLoading || (editingUser.id === admin?.id && selectedRole !== "admin") ? "not-allowed" : "pointer",
                          opacity: roleUpdateLoading || (editingUser.id === admin?.id && selectedRole !== "admin") ? 0.6 : 1,
                        }}
                      >
                        {roleUpdateLoading ? "Saving..." : "Confirm Role Change"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: PROJECT EXPLORER */}
        {/* ========================================================================= */}
        {activeTab === "projects" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
              <h2 style={{ fontSize: "1.35rem", fontWeight: 800, margin: 0, letterSpacing: "-0.01em" }}>
                Platform Project Explorer
              </h2>

              {/* Filters & Search */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                <div style={{ position: "relative", minWidth: 260 }}>
                  <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
                  <input
                    type="text"
                    placeholder="Search title or description..."
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.45rem 2rem 0.45rem 2rem",
                      fontSize: "0.85rem",
                      borderRadius: "6px",
                      border: "1px solid var(--border)",
                      background: "var(--card)",
                      color: "var(--foreground)",
                    }}
                  />
                  {projectSearch && (
                    <button
                      type="button"
                      onClick={() => setProjectSearch("")}
                      style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <select
                  value={projectCategoryFilter}
                  onChange={(e) => {
                    setProjectCategoryFilter(e.target.value);
                    setProjectPage(1);
                  }}
                  style={{
                    padding: "0.45rem 0.85rem",
                    fontSize: "0.85rem",
                    borderRadius: "6px",
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    color: "var(--foreground)",
                    cursor: "pointer",
                  }}
                >
                  <option value="all">All Categories</option>
                  <option value="Web Development">Web Development</option>
                  <option value="AI/ML">AI/ML</option>
                  <option value="Data Science">Data Science</option>
                  <option value="Mobile App">Mobile App</option>
                  <option value="Other">Other</option>
                </select>

                <select
                  value={projectStatusFilter}
                  onChange={(e) => {
                    setProjectStatusFilter(e.target.value);
                    setProjectPage(1);
                  }}
                  style={{
                    padding: "0.45rem 0.85rem",
                    fontSize: "0.85rem",
                    borderRadius: "6px",
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    color: "var(--foreground)",
                    cursor: "pointer",
                  }}
                >
                  <option value="all">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Rejected">Rejected</option>
                </select>

                <button
                  type="button"
                  onClick={loadProjects}
                  disabled={projectsLoading}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    fontSize: "0.825rem",
                    fontWeight: 600,
                    padding: "0.45rem 0.85rem",
                    borderRadius: "6px",
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    cursor: "pointer",
                  }}
                >
                  <RefreshCw size={14} style={{ animation: projectsLoading ? "spin 1s linear infinite" : "none" }} />
                </button>
              </div>
            </div>

            {projectsError && (
              <div style={{ padding: "1rem", borderRadius: "8px", background: "#fef2f2", color: "#b91c1c", marginBottom: "1.5rem", border: "1px solid #fecaca" }}>
                {projectsError}
              </div>
            )}

            {/* Projects Table Container */}
            <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
              <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                <table style={{ width: "100%", minWidth: 700, borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
                  <thead>
                    <tr style={{ background: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
                      <th style={{ padding: "0.85rem 1rem", fontWeight: 700, color: "var(--foreground)" }}>Project Title</th>
                      <th style={{ padding: "0.85rem 1rem", fontWeight: 700, color: "var(--foreground)" }}>Student Author</th>
                      <th style={{ padding: "0.85rem 1rem", fontWeight: 700, color: "var(--foreground)" }}>Category</th>
                      <th style={{ padding: "0.85rem 1rem", fontWeight: 700, color: "var(--foreground)" }}>Status</th>
                      <th style={{ padding: "0.85rem 1rem", fontWeight: 700, color: "var(--foreground)" }}>Deadline</th>
                      <th style={{ padding: "0.85rem 1rem", fontWeight: 700, color: "var(--foreground)" }}>Submitted</th>
                      <th style={{ padding: "0.85rem 1rem", fontWeight: 700, color: "var(--foreground)", textAlign: "right" }}>Links</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectsLoading ? (
                      <tr>
                        <td colSpan={7} style={{ padding: "3rem", textAlign: "center", color: "var(--muted-foreground)" }}>
                          <RefreshCw size={24} style={{ animation: "spin 1s linear infinite", margin: "0 auto 0.75rem" }} />
                          <p style={{ margin: 0 }}>Loading platform projects...</p>
                        </td>
                      </tr>
                    ) : projects.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ padding: "3rem", textAlign: "center", color: "var(--muted-foreground)" }}>
                          <FolderKanban size={32} style={{ margin: "0 auto 0.75rem", opacity: 0.5 }} />
                          <p style={{ margin: "0 0 0.5rem 0", fontWeight: 600 }}>No projects found matching the criteria</p>
                          {(projectSearch || projectCategoryFilter !== "all" || projectStatusFilter !== "all") && (
                            <button
                              type="button"
                              onClick={() => {
                                setProjectSearch("");
                                setProjectCategoryFilter("all");
                                setProjectStatusFilter("all");
                              }}
                              style={{ fontSize: "0.8rem", color: "var(--primary)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
                            >
                              Clear search and filters
                            </button>
                          )}
                        </td>
                      </tr>
                    ) : (
                      projects.map((p) => (
                        <tr key={p.id} style={{ borderBottom: "1px solid var(--border)", transition: "background 0.1s ease" }}>
                          <td style={{ padding: "0.85rem 1rem", maxWidth: 280 }}>
                            <div style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.title}</div>
                            <div style={{ fontSize: "0.775rem", color: "var(--muted-foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {p.description || "No description provided"}
                            </div>
                          </td>
                          <td style={{ padding: "0.85rem 1rem" }}>
                            <div style={{ fontWeight: 600 }}>{p.author.name}</div>
                            <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>{p.author.email}</div>
                          </td>
                          <td style={{ padding: "0.85rem 1rem" }}>
                            <span style={{ fontSize: "0.8rem", background: "var(--muted)", padding: "0.2rem 0.5rem", borderRadius: "4px" }}>
                              {p.category}
                            </span>
                          </td>
                          <td style={{ padding: "0.85rem 1rem" }}>
                            <StatusBadge status={p.status} />
                          </td>
                          <td style={{ padding: "0.85rem 1rem", color: "var(--foreground)" }}>{formatDate(p.deadline)}</td>
                          <td style={{ padding: "0.85rem 1rem", color: "var(--muted-foreground)" }}>{formatDate(p.createdAt)}</td>
                          <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                            <div style={{ display: "inline-flex", gap: "0.5rem", alignItems: "center", justifyContent: "flex-end" }}>
                              {(p.reviewNotes || p.status === "Approved" || p.status === "Rejected") && (
                                <button
                                  type="button"
                                  onClick={() => setInspectingProject(p)}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.3rem",
                                    fontSize: "0.8rem",
                                    color: "var(--foreground)",
                                    background: "var(--muted)",
                                    border: "1px solid var(--border)",
                                    padding: "0.25rem 0.55rem",
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                    fontWeight: 600,
                                  }}
                                  title="Inspect review details"
                                >
                                  <Eye size={12} />
                                  <span>Review</span>
                                </button>
                              )}
                              {p.githubUrl ? (
                                <a
                                  href={p.githubUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.3rem",
                                    fontSize: "0.8rem",
                                    color: "var(--primary)",
                                    textDecoration: "none",
                                    fontWeight: 600,
                                  }}
                                >
                                  <span>Code</span>
                                  <ExternalLink size={12} />
                                </a>
                              ) : (
                                <span style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>—</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Project Pagination Bar */}
              {projectPagination.totalPages > 1 && (
                <div style={{ padding: "0.85rem 1rem", display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--border)", background: "var(--card)" }}>
                  <span style={{ fontSize: "0.825rem", color: "var(--muted-foreground)" }}>
                    Page {projectPagination.page} of {projectPagination.totalPages} ({projectPagination.total} total matching projects)
                  </span>

                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      disabled={projectPagination.page <= 1 || projectsLoading}
                      onClick={() => setProjectPage((p) => Math.max(1, p - 1))}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        padding: "0.35rem 0.65rem",
                        fontSize: "0.8rem",
                        borderRadius: "4px",
                        border: "1px solid var(--border)",
                        background: "var(--card)",
                        cursor: projectPagination.page <= 1 ? "not-allowed" : "pointer",
                        opacity: projectPagination.page <= 1 ? 0.5 : 1,
                      }}
                    >
                      <ChevronLeft size={14} />
                      <span>Previous</span>
                    </button>

                    <button
                      type="button"
                      disabled={projectPagination.page >= projectPagination.totalPages || projectsLoading}
                      onClick={() => setProjectPage((p) => p + 1)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        padding: "0.35rem 0.65rem",
                        fontSize: "0.8rem",
                        borderRadius: "4px",
                        border: "1px solid var(--border)",
                        background: "var(--card)",
                        cursor: projectPagination.page >= projectPagination.totalPages ? "not-allowed" : "pointer",
                        opacity: projectPagination.page >= projectPagination.totalPages ? 0.5 : 1,
                      }}
                    >
                      <span>Next</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: AUDIT LOGS / ACTIVITY HISTORY */}
        {/* ========================================================================= */}
        {activeTab === "audit" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <h2 style={{ fontSize: "1.35rem", fontWeight: 800, margin: 0, letterSpacing: "-0.01em" }}>
                  System Audit Logs & Activity History
                </h2>
                <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.85rem", color: "var(--muted-foreground)" }}>
                  Server-recorded audit trail of all major actions across the platform.
                </p>
              </div>

              {/* Filters & Search */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                <div style={{ position: "relative", minWidth: 260 }}>
                  <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
                  <input
                    type="text"
                    placeholder="Search actor or action..."
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.45rem 2rem 0.45rem 2rem",
                      fontSize: "0.85rem",
                      borderRadius: "6px",
                      border: "1px solid var(--border)",
                      background: "var(--card)",
                      color: "var(--foreground)",
                    }}
                  />
                  {auditSearch && (
                    <button
                      type="button"
                      onClick={() => setAuditSearch("")}
                      style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <select
                  value={auditActionFilter}
                  onChange={(e) => {
                    setAuditActionFilter(e.target.value);
                    setAuditPage(1);
                  }}
                  style={{
                    padding: "0.45rem 0.85rem",
                    fontSize: "0.85rem",
                    borderRadius: "6px",
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    color: "var(--foreground)",
                    cursor: "pointer",
                  }}
                >
                  <option value="All">All Actions</option>
                  <option value="USER_REGISTERED">User Registered</option>
                  <option value="PROJECT_CREATED">Project Created</option>
                  <option value="PROJECT_UPDATED">Project Updated</option>
                  <option value="PROJECT_DELETED">Project Deleted</option>
                  <option value="PROJECT_REVIEWED">Project Reviewed</option>
                  <option value="USER_ROLE_CHANGED">Role Changed</option>
                  <option value="USER_STATUS_CHANGED">Status Changed</option>
                  <option value="PASSWORD_CHANGED">Password Changed</option>
                  <option value="PROFILE_UPDATED">Profile Updated</option>
                </select>

                <select
                  value={auditEntityFilter}
                  onChange={(e) => {
                    setAuditEntityFilter(e.target.value);
                    setAuditPage(1);
                  }}
                  style={{
                    padding: "0.45rem 0.85rem",
                    fontSize: "0.85rem",
                    borderRadius: "6px",
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    color: "var(--foreground)",
                    cursor: "pointer",
                  }}
                >
                  <option value="All">All Entities</option>
                  <option value="User">User</option>
                  <option value="Project">Project</option>
                  <option value="Task">Task</option>
                </select>

                <button
                  type="button"
                  onClick={loadAuditLogs}
                  disabled={auditLoading}
                  style={{
                    padding: "0.45rem 0.75rem",
                    borderRadius: "6px",
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    color: "var(--foreground)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                  }}
                  title="Refresh audit logs"
                >
                  <RefreshCw size={14} style={{ animation: auditLoading ? "spin 1s linear infinite" : "none" }} />
                </button>
              </div>
            </div>

            {auditError && (
              <div style={{ padding: "1rem", borderRadius: "8px", background: "#fef2f2", color: "#b91c1c", marginBottom: "1.5rem", border: "1px solid #fecaca" }}>
                {auditError}
              </div>
            )}

            {/* Audit Logs Table */}
            <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
              <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                <table style={{ width: "100%", minWidth: 700, borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
                  <thead>
                    <tr style={{ background: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
                      <th style={{ padding: "0.85rem 1rem", fontWeight: 700, color: "var(--foreground)" }}>Timestamp</th>
                      <th style={{ padding: "0.85rem 1rem", fontWeight: 700, color: "var(--foreground)" }}>Actor</th>
                      <th style={{ padding: "0.85rem 1rem", fontWeight: 700, color: "var(--foreground)" }}>Action</th>
                      <th style={{ padding: "0.85rem 1rem", fontWeight: 700, color: "var(--foreground)" }}>Target</th>
                      <th style={{ padding: "0.85rem 1rem", fontWeight: 700, color: "var(--foreground)" }}>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLoading ? (
                      <tr>
                        <td colSpan={5} style={{ padding: "3rem", textAlign: "center", color: "var(--muted-foreground)" }}>
                          <RefreshCw size={24} style={{ animation: "spin 1s linear infinite", margin: "0 auto 0.75rem" }} />
                          <p style={{ margin: 0 }}>Loading audit logs...</p>
                        </td>
                      </tr>
                    ) : auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: "3rem", textAlign: "center", color: "var(--muted-foreground)" }}>
                          <History size={32} style={{ margin: "0 auto 0.75rem", opacity: 0.5 }} />
                          <p style={{ margin: "0 0 0.5rem 0", fontWeight: 600 }}>No audit logs recorded matching your search</p>
                          {(auditSearch || auditActionFilter !== "All" || auditEntityFilter !== "All") && (
                            <button
                              type="button"
                              onClick={() => {
                                setAuditSearch("");
                                setAuditActionFilter("All");
                                setAuditEntityFilter("All");
                              }}
                              style={{ fontSize: "0.8rem", color: "var(--primary)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
                            >
                              Clear search and filters
                            </button>
                          )}
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map((log) => (
                        <tr key={log.id} style={{ borderBottom: "1px solid var(--border)", transition: "background 0.1s ease" }}>
                          <td style={{ padding: "0.85rem 1rem", color: "var(--muted-foreground)", fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                            {formatDate(log.createdAt)}
                          </td>
                          <td style={{ padding: "0.85rem 1rem" }}>
                            <div style={{ fontWeight: 600 }}>{log.actor.name}</div>
                            <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>
                              {log.actor.email} • <span style={{ textTransform: "capitalize" }}>{log.actor.role}</span>
                            </div>
                          </td>
                          <td style={{ padding: "0.85rem 1rem" }}>
                            <span
                              style={{
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                padding: "0.2rem 0.55rem",
                                borderRadius: "4px",
                                background:
                                  log.action.includes("REVIEWED") || log.action.includes("APPROVED")
                                    ? "#ecfdf5"
                                    : log.action.includes("DELETED") || log.action.includes("REJECTED")
                                    ? "#fef2f2"
                                    : log.action.includes("ROLE") || log.action.includes("STATUS")
                                    ? "#fffbeb"
                                    : "var(--muted)",
                                color:
                                  log.action.includes("REVIEWED") || log.action.includes("APPROVED")
                                    ? "#065f46"
                                    : log.action.includes("DELETED") || log.action.includes("REJECTED")
                                    ? "#991b1b"
                                    : log.action.includes("ROLE") || log.action.includes("STATUS")
                                    ? "#b45309"
                                    : "var(--foreground)",
                              }}
                            >
                              {log.action}
                            </span>
                          </td>
                          <td style={{ padding: "0.85rem 1rem", fontSize: "0.825rem" }}>
                            <strong>{log.targetEntity}</strong>
                            <div style={{ fontSize: "0.7rem", color: "var(--muted-foreground)", fontFamily: "monospace" }}>
                              {log.targetId}
                            </div>
                          </td>
                          <td style={{ padding: "0.85rem 1rem", fontSize: "0.8rem", maxWidth: 320 }}>
                            {log.details && Object.keys(log.details).length > 0 ? (
                              <div
                                style={{
                                  background: "var(--background)",
                                  padding: "0.4rem 0.6rem",
                                  borderRadius: "4px",
                                  border: "1px solid var(--border)",
                                  fontFamily: "monospace",
                                  fontSize: "0.75rem",
                                  overflowX: "auto",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {JSON.stringify(log.details)}
                              </div>
                            ) : (
                              <span style={{ color: "var(--muted-foreground)" }}>—</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Audit Pagination Bar */}
              {auditPagination.totalPages > 1 && (
                <div style={{ padding: "0.85rem 1rem", display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--border)", background: "var(--card)" }}>
                  <span style={{ fontSize: "0.825rem", color: "var(--muted-foreground)" }}>
                    Page {auditPagination.page} of {auditPagination.totalPages} ({auditPagination.total} total events)
                  </span>

                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      disabled={auditPagination.page <= 1 || auditLoading}
                      onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        padding: "0.35rem 0.65rem",
                        fontSize: "0.8rem",
                        borderRadius: "4px",
                        border: "1px solid var(--border)",
                        background: "var(--card)",
                        cursor: auditPagination.page <= 1 ? "not-allowed" : "pointer",
                        opacity: auditPagination.page <= 1 ? 0.5 : 1,
                      }}
                    >
                      <ChevronLeft size={14} />
                      <span>Previous</span>
                    </button>

                    <button
                      type="button"
                      disabled={auditPagination.page >= auditPagination.totalPages || auditLoading}
                      onClick={() => setAuditPage((p) => Math.min(auditPagination.totalPages, p + 1))}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        padding: "0.35rem 0.65rem",
                        fontSize: "0.8rem",
                        borderRadius: "4px",
                        border: "1px solid var(--border)",
                        background: "var(--card)",
                        cursor: auditPagination.page >= auditPagination.totalPages ? "not-allowed" : "pointer",
                        opacity: auditPagination.page >= auditPagination.totalPages ? 0.5 : 1,
                      }}
                    >
                      <span>Next</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Account Suspension Confirmation Modal */}
      {deactivatingUser && (
        <DeactivateUserModal
          user={deactivatingUser}
          onConfirm={() => handleToggleUserStatus(deactivatingUser, false)}
          onClose={() => setDeactivatingUser(null)}
          loading={statusActionLoading}
        />
      )}

      {/* Account Activation Confirmation Modal */}
      {activatingUser && (
        <ActivateUserModal
          user={activatingUser}
          onConfirm={() => handleToggleUserStatus(activatingUser, true)}
          onClose={() => setActivatingUser(null)}
          loading={statusActionLoading}
        />
      )}

      {/* Inspect Review Details Modal */}
      {inspectingProject && (
        <InspectReviewModal
          project={inspectingProject}
          onClose={() => setInspectingProject(null)}
        />
      )}

      {/* Admin Settings & Password Modal */}
      {showAdminSettingsModal && admin && (
        <AdminSettingsModal
          admin={admin}
          tab={adminSettingsTab}
          onTabChange={setAdminSettingsTab}
          nameInput={adminNameInput}
          onNameInputChange={setAdminNameInput}
          onSaveProfile={handleUpdateAdminName}
          savingProfile={savingAdminProfile}
          profileMessage={adminProfileMessage}
          profileError={adminProfileError}
          currentPassword={adminCurrentPassword}
          onCurrentPasswordChange={setAdminCurrentPassword}
          newPassword={adminNewPassword}
          onNewPasswordChange={setAdminNewPassword}
          confirmPassword={adminConfirmPassword}
          onConfirmPasswordChange={setAdminConfirmPassword}
          onSavePassword={handleChangeAdminPassword}
          savingPassword={savingAdminPassword}
          passwordMessage={adminPasswordMessage}
          passwordError={adminPasswordError}
          onClose={() => {
            setShowAdminSettingsModal(false);
            setAdminProfileMessage("");
            setAdminProfileError("");
            setAdminPasswordMessage("");
            setAdminPasswordError("");
          }}
        />
      )}
    </div>
  );
}

function DeactivateUserModal({
  user,
  onConfirm,
  onClose,
  loading,
}: {
  user: ManagedUser;
  onConfirm: () => Promise<void>;
  onClose: () => void;
  loading: boolean;
}) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 85,
        padding: "1rem",
      }}
    >
      <div
        style={{
          background: "var(--card)",
          borderRadius: "var(--radius)",
          maxWidth: 420,
          width: "100%",
          maxHeight: "calc(100dvh - 2rem)",
          overflowY: "auto",
          padding: "1.5rem",
          boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)",
          border: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--destructive)", marginBottom: "0.75rem" }}>
          <ShieldAlert size={22} />
          <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>Confirm Account Suspension</h3>
        </div>

        <p style={{ fontSize: "0.875rem", color: "var(--foreground)", lineHeight: 1.45, margin: "0 0 1rem 0" }}>
          Are you sure you want to deactivate <strong>{user.name}</strong> ({user.email})?
        </p>

        <div style={{ padding: "0.75rem", background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", borderRadius: "6px", fontSize: "0.8rem", marginBottom: "1.25rem", lineHeight: 1.4 }}>
          Deactivating this user revokes their active sessions and prevents them from logging in. All user projects, tasks, and historical reviews will be preserved.
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              padding: "0.45rem 0.85rem",
              borderRadius: "6px",
              border: "1px solid var(--border)",
              background: "var(--card)",
              color: "var(--foreground)",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: "0.45rem 0.85rem",
              borderRadius: "6px",
              border: "none",
              background: "var(--destructive)",
              color: "#fff",
              fontSize: "0.85rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {loading ? "Deactivating..." : "Deactivate Account"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ActivateUserModal({
  user,
  onConfirm,
  onClose,
  loading,
}: {
  user: ManagedUser;
  onConfirm: () => Promise<void>;
  onClose: () => void;
  loading: boolean;
}) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 85,
        padding: "1rem",
      }}
    >
      <div
        style={{
          background: "var(--card)",
          borderRadius: "var(--radius)",
          maxWidth: 420,
          width: "100%",
          maxHeight: "calc(100dvh - 2rem)",
          overflowY: "auto",
          padding: "1.5rem",
          boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)",
          border: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#059669", marginBottom: "0.75rem" }}>
          <UserCheck size={22} />
          <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>Restore Account Access</h3>
        </div>

        <p style={{ fontSize: "0.875rem", color: "var(--foreground)", lineHeight: 1.45, margin: "0 0 1rem 0" }}>
          Are you sure you want to restore access for <strong>{user.name}</strong> ({user.email})?
        </p>

        <div style={{ padding: "0.75rem", background: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0", borderRadius: "6px", fontSize: "0.8rem", marginBottom: "1.25rem", lineHeight: 1.4 }}>
          Reactivating this account restores the user&apos;s ability to sign in and interact with their projects, tasks, and reviews.
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              padding: "0.45rem 0.85rem",
              borderRadius: "6px",
              border: "1px solid var(--border)",
              background: "var(--card)",
              color: "var(--foreground)",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: "0.45rem 0.85rem",
              borderRadius: "6px",
              border: "none",
              background: "#059669",
              color: "#fff",
              fontSize: "0.85rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {loading ? "Activating..." : "Activate Account"}
          </button>
        </div>
      </div>
    </div>
  );
}

function InspectReviewModal({
  project,
  onClose,
}: {
  project: ManagedProject;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 85,
        padding: "1rem",
      }}
    >
      <div
        style={{
          background: "var(--card)",
          borderRadius: "var(--radius)",
          maxWidth: 480,
          width: "100%",
          maxHeight: "calc(100dvh - 2rem)",
          overflowY: "auto",
          padding: "1.5rem",
          boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)",
          border: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <FileText size={20} style={{ color: "var(--primary)" }} />
            <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>Review Audit Details</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", fontSize: "0.85rem" }}>
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>Project Title</div>
            <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{project.title}</div>
          </div>

          <div style={{ display: "flex", gap: "1.5rem" }}>
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>Status</div>
              <StatusBadge status={project.status} />
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>Category</div>
              <div style={{ fontWeight: 600 }}>{project.category}</div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>Student Author</div>
            <div style={{ fontWeight: 600 }}>{project.author.name} ({project.author.email})</div>
          </div>

          {project.reviewer && (
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>Reviewed By</div>
              <div style={{ fontWeight: 600 }}>
                {project.reviewer.name} ({project.reviewer.email}) • <span style={{ textTransform: "capitalize" }}>{project.reviewer.role}</span>
              </div>
            </div>
          )}

          {project.reviewedAt && (
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>Reviewed At</div>
              <div>{new Date(project.reviewedAt).toLocaleString("en-IN")}</div>
            </div>
          )}

          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", marginBottom: "4px" }}>Faculty Review Feedback</div>
            <div
              style={{
                padding: "0.75rem",
                borderRadius: "6px",
                background: project.status === "Approved" ? "#ecfdf5" : "#fef2f2",
                color: project.status === "Approved" ? "#065f46" : "#991b1b",
                border: `1px solid ${project.status === "Approved" ? "#a7f3d0" : "#fecaca"}`,
                lineHeight: 1.45,
                fontSize: "0.85rem",
              }}
            >
              {project.reviewNotes || "No written notes were provided with this decision."}
            </div>
          </div>

          {project.githubUrl && (
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", marginBottom: "4px" }}>Repository Link</div>
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  color: "var(--primary)",
                  fontSize: "0.825rem",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                <span>{project.githubUrl}</span>
                <ExternalLink size={13} />
              </a>
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.25rem" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "0.45rem 1rem",
              borderRadius: "6px",
              border: "1px solid var(--border)",
              background: "var(--card)",
              color: "var(--foreground)",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminSettingsModal({
  admin,
  tab,
  onTabChange,
  nameInput,
  onNameInputChange,
  onSaveProfile,
  savingProfile,
  profileMessage,
  profileError,
  currentPassword,
  onCurrentPasswordChange,
  newPassword,
  onNewPasswordChange,
  confirmPassword,
  onConfirmPasswordChange,
  onSavePassword,
  savingPassword,
  passwordMessage,
  passwordError,
  onClose,
}: {
  admin: AdminProfile;
  tab: "profile" | "security";
  onTabChange: (t: "profile" | "security") => void;
  nameInput: string;
  onNameInputChange: (v: string) => void;
  onSaveProfile: (e: React.FormEvent) => Promise<void>;
  savingProfile: boolean;
  profileMessage: string;
  profileError: string;
  currentPassword: string;
  onCurrentPasswordChange: (v: string) => void;
  newPassword: string;
  onNewPasswordChange: (v: string) => void;
  confirmPassword: string;
  onConfirmPasswordChange: (v: string) => void;
  onSavePassword: (e: React.FormEvent) => Promise<void>;
  savingPassword: boolean;
  passwordMessage: string;
  passwordError: string;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 90,
        padding: "1rem",
      }}
    >
      <div
        style={{
          background: "var(--card)",
          borderRadius: "var(--radius)",
          maxWidth: 460,
          width: "100%",
          maxHeight: "calc(100dvh - 2rem)",
          overflowY: "auto",
          padding: "1.75rem",
          boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)",
          border: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800 }}>Admin Account Settings</h3>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Controls */}
        <div style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid var(--border)", marginBottom: "1.25rem" }}>
          <button
            type="button"
            onClick={() => onTabChange("profile")}
            style={{
              background: "none",
              border: "none",
              padding: "0.5rem 1rem",
              fontSize: "0.85rem",
              fontWeight: tab === "profile" ? 700 : 500,
              color: tab === "profile" ? "var(--primary)" : "var(--muted-foreground)",
              borderBottom: tab === "profile" ? "2px solid var(--primary)" : "2px solid transparent",
              cursor: "pointer",
            }}
          >
            Profile
          </button>
          <button
            type="button"
            onClick={() => onTabChange("security")}
            style={{
              background: "none",
              border: "none",
              padding: "0.5rem 1rem",
              fontSize: "0.85rem",
              fontWeight: tab === "security" ? 700 : 500,
              color: tab === "security" ? "var(--primary)" : "var(--muted-foreground)",
              borderBottom: tab === "security" ? "2px solid var(--primary)" : "2px solid transparent",
              cursor: "pointer",
            }}
          >
            Security & Password
          </button>
        </div>

        {/* Profile Tab */}
        {tab === "profile" && (
          <form onSubmit={onSaveProfile} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {profileMessage && (
              <div style={{ padding: "0.6rem 0.85rem", background: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0", borderRadius: "6px", fontSize: "0.825rem" }}>
                {profileMessage}
              </div>
            )}
            {profileError && (
              <div style={{ padding: "0.6rem 0.85rem", background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", borderRadius: "6px", fontSize: "0.825rem" }}>
                {profileError}
              </div>
            )}

            <div>
              <label style={{ display: "block", fontSize: "0.825rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                Administrator Name
              </label>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => onNameInputChange(e.target.value)}
                required
                minLength={2}
                maxLength={100}
                style={{
                  width: "100%",
                  padding: "0.45rem 0.75rem",
                  fontSize: "0.85rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  background: "var(--background)",
                  color: "var(--foreground)",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.825rem", fontWeight: 600, color: "var(--muted-foreground)", marginBottom: "0.35rem" }}>
                Email Address (locked)
              </label>
              <input
                type="email"
                value={admin.email}
                disabled
                style={{
                  width: "100%",
                  padding: "0.45rem 0.75rem",
                  fontSize: "0.85rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  background: "var(--muted)",
                  color: "var(--muted-foreground)",
                  cursor: "not-allowed",
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: "0.45rem 0.85rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                  color: "var(--foreground)",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingProfile}
                style={{
                  padding: "0.45rem 1rem",
                  borderRadius: "6px",
                  border: "none",
                  background: "var(--primary)",
                  color: "#fff",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {savingProfile ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        )}

        {/* Security Tab */}
        {tab === "security" && (
          <form onSubmit={onSavePassword} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {passwordMessage && (
              <div style={{ padding: "0.6rem 0.85rem", background: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0", borderRadius: "6px", fontSize: "0.825rem" }}>
                {passwordMessage}
              </div>
            )}
            {passwordError && (
              <div style={{ padding: "0.6rem 0.85rem", background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", borderRadius: "6px", fontSize: "0.825rem" }}>
                {passwordError}
              </div>
            )}

            <div>
              <label style={{ display: "block", fontSize: "0.825rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => onCurrentPasswordChange(e.target.value)}
                required
                placeholder="Enter current password"
                style={{
                  width: "100%",
                  padding: "0.45rem 0.75rem",
                  fontSize: "0.85rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  background: "var(--background)",
                  color: "var(--foreground)",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.825rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                New Password (8–72 characters)
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => onNewPasswordChange(e.target.value)}
                required
                minLength={8}
                maxLength={72}
                placeholder="Enter new password"
                style={{
                  width: "100%",
                  padding: "0.45rem 0.75rem",
                  fontSize: "0.85rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  background: "var(--background)",
                  color: "var(--foreground)",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.825rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => onConfirmPasswordChange(e.target.value)}
                required
                minLength={8}
                maxLength={72}
                placeholder="Confirm new password"
                style={{
                  width: "100%",
                  padding: "0.45rem 0.75rem",
                  fontSize: "0.85rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  background: "var(--background)",
                  color: "var(--foreground)",
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: "0.45rem 0.85rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                  color: "var(--foreground)",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingPassword}
                style={{
                  padding: "0.45rem 1rem",
                  borderRadius: "6px",
                  border: "none",
                  background: "var(--primary)",
                  color: "#fff",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {savingPassword ? "Updating..." : "Update Password"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function NotificationDropdown({
  notifications,
  unreadCount,
  loading,
  onMarkAsRead,
  onMarkAllAsRead,
  onClose,
}: {
  notifications: Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    link: string;
    read: boolean;
    createdAt: string;
  }>;
  unreadCount: number;
  loading: boolean;
  onMarkAsRead: (id: string, link?: string) => Promise<void>;
  onMarkAllAsRead: () => Promise<void>;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  function formatRelativeTime(dateStr: string) {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return "Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    return new Date(dateStr).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  }

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        top: "calc(100% + 8px)",
        right: 0,
        width: "min(350px, calc(100vw - 32px))",
        maxWidth: "90vw",
        maxHeight: "440px",
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.15)",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: "1px solid var(--border)",
          background: "var(--muted)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <strong style={{ fontSize: "0.9rem", color: "var(--foreground)" }}>Notifications</strong>
          {unreadCount > 0 && (
            <span
              style={{
                fontSize: "0.7rem",
                fontWeight: 700,
                background: "#fee2e2",
                color: "#dc2626",
                padding: "1px 6px",
                borderRadius: "10px",
              }}
            >
              {unreadCount} new
            </span>
          )}
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={onMarkAllAsRead}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "0.75rem",
              color: "var(--primary)",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "2px 4px",
            }}
          >
            <CheckCheck size={14} />
            Mark all read
          </button>
        )}
      </div>

      <div style={{ overflowY: "auto", flex: 1 }}>
        {loading && notifications.length === 0 && (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--muted-foreground)", fontSize: "0.85rem" }}>
            Loading updates...
          </div>
        )}

        {!loading && notifications.length === 0 && (
          <div style={{ padding: "2.5rem 1rem", textAlign: "center", color: "var(--muted-foreground)" }}>
            <Bell size={24} style={{ margin: "0 auto 8px", opacity: 0.5 }} />
            <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>No notifications yet</div>
            <div style={{ fontSize: "0.75rem", marginTop: "2px" }}>Platform updates will appear here.</div>
          </div>
        )}

        {notifications.map((item) => (
          <div
            key={item.id}
            onClick={() => void onMarkAsRead(item.id, item.link)}
            style={{
              padding: "10px 14px",
              borderBottom: "1px solid var(--border)",
              background: item.read ? "transparent" : "rgba(37, 99, 235, 0.04)",
              cursor: item.link ? "pointer" : "default",
              transition: "background 0.15s ease",
              display: "flex",
              gap: "10px",
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                flexShrink: 0,
                marginTop: "2px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background:
                  item.type === "PROJECT_APPROVED"
                    ? "#ecfdf5"
                    : item.type === "PROJECT_REJECTED"
                    ? "#fef2f2"
                    : item.type === "PROJECT_SUBMITTED"
                    ? "#eff6ff"
                    : "var(--muted)",
                color:
                  item.type === "PROJECT_APPROVED"
                    ? "#059669"
                    : item.type === "PROJECT_REJECTED"
                    ? "#dc2626"
                    : item.type === "PROJECT_SUBMITTED"
                    ? "#2563eb"
                    : "var(--muted-foreground)",
              }}
            >
              {item.type === "PROJECT_APPROVED" ? (
                <Check size={14} />
              ) : item.type === "PROJECT_REJECTED" ? (
                <X size={14} />
              ) : (
                <Bell size={14} />
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "6px" }}>
                <strong
                  style={{
                    fontSize: "0.8rem",
                    color: item.read ? "var(--foreground)" : "var(--primary)",
                    fontWeight: item.read ? 600 : 700,
                  }}
                >
                  {item.title}
                </strong>
                <span style={{ fontSize: "0.68rem", color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>
                  {formatRelativeTime(item.createdAt)}
                </span>
              </div>
              <p
                style={{
                  margin: "2px 0 0",
                  fontSize: "0.76rem",
                  color: "var(--muted-foreground)",
                  lineHeight: 1.35,
                  wordBreak: "break-word",
                }}
              >
                {item.message}
              </p>
            </div>

            {!item.read && (
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "var(--primary)",
                  marginTop: "8px",
                  flexShrink: 0,
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

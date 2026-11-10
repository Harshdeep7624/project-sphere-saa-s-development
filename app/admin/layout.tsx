import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, verifyAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Command Center",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
  },
};

/**
 * ProjectSphere — Admin Layout Server-Side Guard
 *
 * Enforces strict two-tier server-side access control:
 * 1. Unauthenticated users are redirected to /login.
 * 2. Authenticated users whose active database role is NOT "admin"
 *    are redirected to their appropriate workspace ("/").
 * 3. Eliminates stale JWT claims by querying MongoDB directly via verifyAdmin().
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Verify existence of valid authentication token
  const authUser = await getCurrentUser();
  if (!authUser) {
    redirect("/login");
  }

  // 2. Database-backed role verification
  // Ensures that administrative privileges have not been revoked in MongoDB Atlas
  const adminUser = await verifyAdmin();
  if (!adminUser) {
    redirect("/");
  }

  return <>{children}</>;
}

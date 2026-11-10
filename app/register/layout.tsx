import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Join ProjectSphere to collaborate with your team and submit projects for academic faculty review.",
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

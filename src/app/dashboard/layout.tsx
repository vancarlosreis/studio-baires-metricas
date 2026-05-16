import { TopNav } from "@/components/top-nav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-paper-grid flex min-h-screen flex-col">
      <TopNav />
      <main className="flex-1">{children}</main>
    </div>
  );
}

/**
 * Layout da rota /dashboard/contas/[handle].
 * Agora que o /dashboard/layout.tsx já provê Sidebar + tema unificado,
 * só faz passthrough.
 */
export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

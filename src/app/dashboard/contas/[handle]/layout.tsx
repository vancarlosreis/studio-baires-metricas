/**
 * Layout dark escopado pra rota /dashboard/contas/[handle].
 *
 * Usa `fixed inset-0 z-50` pra cobrir o layout pai (`/dashboard/layout.tsx`
 * com TopNav + bg-paper-grid). Isso evita ter que refatorar o layout pai
 * e mantém o escopo do redesign cirúrgico — login e demais telas do
 * dashboard continuam com a identidade editorial Y2K.
 */
export default function AccountDarkLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dark-scope fixed inset-0 z-50 overflow-auto">
      <div className="relative z-10 mx-auto min-h-screen max-w-[1600px] px-6 py-6">
        {children}
      </div>
    </div>
  );
}

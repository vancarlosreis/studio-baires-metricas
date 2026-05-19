import Link from "next/link";

export const metadata = {
  title: "Política de Privacidade — Studio Baires",
  description:
    "Como o Studio Baires coleta, usa e protege os dados dos seus usuários.",
};

const LAST_UPDATED = "16 de maio de 2026";
const CONTACT_EMAIL = "contato@studiobaires.com"; // TODO: atualizar para o e-mail real

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="headline-display text-3xl text-fg">{title}</h2>
      <div className="space-y-3 text-base leading-relaxed text-fg-muted">
        {children}
      </div>
    </section>
  );
}

export default function PrivacidadePage() {
  return (
    <div className="theme-glow relative min-h-screen bg-bg text-fg">
      {/* Topo */}
      <header className="border-b border-border bg-surface/60 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6 sm:px-8">
          <Link
            href="/"
            className="headline-display text-2xl text-fg hover:opacity-80"
          >
            Studio Baires
          </Link>
          <Link
            href="/"
            className="text-sm font-semibold text-fg-muted underline-offset-4 hover:text-fg hover:underline"
          >
            Voltar
          </Link>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="mx-auto max-w-3xl px-6 py-16 sm:px-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-fg-muted">
          Política
        </p>
        <h1 className="headline-display mt-2 text-5xl text-fg sm:text-6xl">
          Política de <span className="dark-text-grad">Privacidade</span>
        </h1>
        <p className="mt-4 text-sm text-fg-muted">
          Última atualização: {LAST_UPDATED}
        </p>

        <div className="mt-12 space-y-12">
          <p className="text-base leading-relaxed text-fg-muted">
            O Studio Baires Métricas (&ldquo;Studio Baires&rdquo;, &ldquo;nós&rdquo;) é uma plataforma de
            análise de métricas do Instagram para agências e seus clientes. Esta
            Política descreve quais dados coletamos, como usamos e quais são os
            seus direitos, em conformidade com a{" "}
            <strong className="text-fg">
              Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018)
            </strong>{" "}
            e com os termos da{" "}
            <strong className="text-fg">Meta Platforms</strong> (Instagram
            Graph API).
          </p>

          <Section title="1. Dados que coletamos">
            <p>Coletamos apenas o estritamente necessário:</p>
            <ul className="ml-5 list-disc space-y-2">
              <li>
                <strong className="text-fg">Dados de autenticação:</strong>{" "}
                seu e-mail e nome (via Google ou link mágico).
              </li>
              <li>
                <strong className="text-fg">Dados das contas Instagram conectadas:</strong>{" "}
                quando você conecta uma conta Business/Creator, recebemos da
                Meta o ID da conta, username, foto de perfil, e métricas
                públicas e privadas autorizadas (seguidores, alcance,
                impressões, engajamento por post, etc.).
              </li>
              <li>
                <strong className="text-fg">Tokens de acesso da Meta:</strong>{" "}
                armazenados de forma criptografada (AES-256-GCM) e usados
                exclusivamente pra consultar a API oficial do Instagram.
              </li>
              <li>
                <strong className="text-fg">Dados técnicos:</strong> cookies
                de sessão pra manter você logado.
              </li>
            </ul>
          </Section>

          <Section title="2. Como usamos seus dados">
            <ul className="ml-5 list-disc space-y-2">
              <li>Exibir métricas das contas Instagram conectadas em painéis e relatórios.</li>
              <li>Gerar relatórios PDF brandados pra entrega aos clientes da agência.</li>
              <li>Manter sua sessão ativa e proteger sua conta.</li>
              <li>
                <strong className="text-fg">
                  Não usamos seus dados para treinar modelos de IA, não vendemos
                  dados a terceiros, não compartilhamos com anunciantes.
                </strong>
              </li>
            </ul>
          </Section>

          <Section title="3. Compartilhamento com terceiros">
            <p>
              Compartilhamos dados apenas com provedores estritamente
              necessários para a operação:
            </p>
            <ul className="ml-5 list-disc space-y-2">
              <li>
                <strong className="text-fg">Supabase</strong> — armazenamento
                de banco de dados e autenticação.
              </li>
              <li>
                <strong className="text-fg">Vercel</strong> — hospedagem da
                aplicação.
              </li>
              <li>
                <strong className="text-fg">Meta Platforms</strong> — fonte
                oficial dos dados do Instagram (somente leitura via API
                autorizada por você).
              </li>
              <li>
                <strong className="text-fg">Google</strong> — somente se você
                escolher login com Google.
              </li>
            </ul>
            <p>
              Nenhum desses provedores recebe dados além do necessário pra
              prestar seu serviço, e todos são certificados em padrões
              internacionais (SOC 2, ISO 27001).
            </p>
          </Section>

          <Section title="4. Retenção e exclusão">
            <p>
              Mantemos seus dados enquanto sua conta estiver ativa. Você pode
              solicitar a exclusão completa a qualquer momento, escrevendo pra{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="font-semibold text-fg underline-offset-4 hover:underline"
              >
                {CONTACT_EMAIL}
              </a>
              . Excluímos todos os seus dados em até 30 dias após a solicitação,
              incluindo backups.
            </p>
            <p>
              Você também pode revogar o acesso da nossa plataforma à sua conta
              Instagram a qualquer momento, indo em{" "}
              <a
                href="https://accountscenter.instagram.com/apps_and_websites"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-fg underline-offset-4 hover:underline"
              >
                Configurações do Instagram → Apps e sites
              </a>
              .
            </p>
          </Section>

          <Section title="5. Seus direitos (LGPD)">
            <p>Como titular dos dados, você tem direito a:</p>
            <ul className="ml-5 list-disc space-y-2">
              <li>Acessar seus dados pessoais que armazenamos.</li>
              <li>Corrigir dados incompletos, inexatos ou desatualizados.</li>
              <li>Solicitar a anonimização, bloqueio ou eliminação.</li>
              <li>Portar seus dados pra outro fornecedor.</li>
              <li>Revogar consentimento a qualquer momento.</li>
            </ul>
            <p>
              Pra exercer qualquer um desses direitos, escreva pra{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="font-semibold text-fg underline-offset-4 hover:underline"
              >
                {CONTACT_EMAIL}
              </a>
              . Respondemos em até 15 dias.
            </p>
          </Section>

          <Section title="6. Segurança">
            <p>
              Tokens da Meta são criptografados em repouso (AES-256-GCM) e em
              trânsito (TLS 1.3). Acesso ao banco é restrito por Row-Level
              Security: nenhum usuário consegue ler dados de outro, mesmo via
              consulta direta.
            </p>
          </Section>

          <Section title="7. Cookies">
            <p>
              Usamos apenas cookies essenciais (sessão de autenticação). Não
              usamos cookies de rastreamento, analytics de terceiros ou
              publicidade.
            </p>
          </Section>

          <Section title="8. Mudanças nesta política">
            <p>
              Podemos atualizar esta política eventualmente. Mudanças materiais
              serão notificadas por e-mail. A versão mais recente está sempre
              disponível em{" "}
              <Link
                href="/privacidade"
                className="font-semibold text-fg underline-offset-4 hover:underline"
              >
                /privacidade
              </Link>
              .
            </p>
          </Section>

          <Section title="9. Contato">
            <p>
              Dúvidas sobre privacidade ou exercício de direitos:{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="font-semibold text-fg underline-offset-4 hover:underline"
              >
                {CONTACT_EMAIL}
              </a>
            </p>
          </Section>
        </div>
      </main>

      <footer className="mx-auto max-w-3xl px-6 py-12 text-sm text-fg-muted sm:px-8">
        <div className="border-t border-border pt-6 text-center italic">
          Studio Baires — feito no Brasil.
        </div>
      </footer>
    </div>
  );
}

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# GeoAster — contexto do projeto

Sistema interno de gestão agrária para uma empresa de georreferenciamento. Controla clientes, propriedades rurais, processos (serviços executados), orçamentos, documentos e usuários. O público é um time pequeno operando internamente; há também uma página pública de consulta de protocolo.

## Stack

- **Next.js 16** (App Router) — breaking changes vs. versões anteriores: `middleware.ts` virou `proxy.ts`, `params` em rotas dinâmicas é `Promise`, etc. Sempre consulte `node_modules/next/dist/docs/` antes de assumir.
- **React 19** + **TypeScript** + **Tailwind CSS** (shadcn-style primitives em `src/components/ui/`)
- **Prisma 7** + **PostgreSQL** (migrações em `prisma/migrations/`)
- **JWT** em cookie httpOnly para sessão (`jose`); hash de senha com `bcryptjs`
- **jsPDF** para geração programática de PDFs (ex.: orçamentos)
- Deploy planejado: servidor local + **Cloudflare Tunnel** (ver `DEPLOY.md` se existir)

## Estrutura principal

```
src/
  app/
    (public)           → login, consulta pública de protocolo
    dashboard/         → área autenticada; cada módulo é uma pasta
      clientes/ propriedades/ processos/ orcamentos/
      documentos/ usuarios/ auditoria/
    api/               → rotas REST espelhando os módulos
  components/          → ui/ (primitives) + componentes compartilhados
  lib/
    auth.ts            → getSession(), criar/validar JWT
    prisma.ts          → singleton do PrismaClient
    permissoes.ts      → PerfilAcesso + Permissoes + PERMISSOES_PADRAO/ADMIN
    auditoria.ts       → registrarLog({ acao, entidade, ... })
    protocolo.ts       → gerarProtocolo() — sequencial, race-safe
    orcamento-pdf.ts   → gerarOrcamentoPdf(dados)
prisma/
  schema.prisma
  migrations/
```

## Convenções de domínio (não-óbvias)

- **Protocolo unificado** `GEO-AAAA-NNNNNN`, **sequencial** por ano, compartilhado entre `Processo` e `Orcamento`. Gerado por `gerarProtocolo()` usando a tabela `SequenciaProtocolo` com upsert + increment atômico. Na primeira geração do ano, faz backfill escaneando o maior número já usado em ambas as tabelas.
- **Orçamento → Processo**: aprovar um orçamento (`POST /api/orcamentos/:id/aprovar`) cria o processo dentro de `prisma.$transaction`, **transferindo o mesmo protocolo**. Documentos da propriedade são vinculados automaticamente ao novo processo. Orçamento aprovado fica travado (não pode editar/excluir).
- **Status de orçamento**: `PENDENTE` / `APROVADO` / `REJEITADO`. Rejeitar **exige** `motivoRejeicao` (validado no PUT e no formulário).
- **Permissões**: combinação de `PerfilAcesso` (`ADMIN` / `USUARIO`) + objeto `Permissoes` granular por usuário. Use `getPermissoesEfetivas(perfil, permissoes)` — admin tem tudo; usuário comum começa com `PERMISSOES_PADRAO`. Rotas protegidas checam a permissão específica (ex.: `verOrcamentos`, `cadastrarOrcamentos`).
- **Auditoria**: toda ação relevante chama `registrarLog({ usuarioId, acao, entidade, entidadeId, descricao })`. `AcaoLog` = `CRIAR | EDITAR | EXCLUIR | LOGIN | LOGOUT | APROVAR`.
- **Atribuição de criador**: orçamentos têm `usuarioId` com `onDelete: SetNull` — o registro sobrevive à exclusão do usuário, mantendo histórico.
- **Dashboard home** exibe card de **orçamentos vencendo em ≤ 7 dias** (PENDENTE com `validadeAte` no intervalo).
- **WhatsApp**: integração futura. Há comentários `// TODO: integrar envio via WhatsApp` nos pontos de envio de orçamento.

## Convenções de código

- **Idioma**: português em labels UI, mensagens de erro, descrições de log, nomes de entidades no schema (`Cliente`, `Propriedade`, `Processo`, `Orcamento`). Código (variáveis, funções, tipos) em inglês/português conforme já está no arquivo — siga o padrão local.
- **Respostas de API**: `Response.json({ ... })` com status apropriado. Erros: `{ error: "mensagem em português" }` + status 400/401/403/404/500. Sempre envolver em `try/catch` com `console.error("[VERBO /rota]", error)` no catch.
- **Rotas dinâmicas**: `{ params }: { params: Promise<{ id: string }> }` — lembre do `await params`.
- **Formulários**: validação client-side feedback no campo (border-red + mensagem) + toast para erros de servidor.
- **Commits**: mensagens em português, objetivas (ex.: `feat: módulo de orçamentos ...`, `fix: ...`). **Não** adicionar `Co-Authored-By: Claude` ou linhas de crédito a ferramentas de IA. Seguir o estilo do `git log` recente.

## Como rodar

```bash
npm install
npx prisma migrate dev        # aplica migrações locais
npx prisma generate           # (geralmente automático)
npm run dev                   # http://localhost:3000
```

Variáveis em `.env` (não commitado): `DATABASE_URL`, `JWT_SECRET`.

## Checagem antes de declarar pronto

- `npm run build` passa sem erro de tipos
- Testar manualmente o fluxo afetado no browser
- Conferir console do browser e terminal do Next
- Para mudanças de schema: `prisma migrate dev --name <descricao>` e commitar a migração gerada

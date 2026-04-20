# PostFlow / MktManager — Ponto de Partida (20/04/2026)

## URLs Ativas
- **Frontend:** https://frontend-six-lemon-74.vercel.app
- **Backend:** https://gerenciador-marketing-backend.onrender.com
- **GitHub:** https://github.com/nfejonas-create/gerenciador-marketing (branch: master)

## Login Admin
- Email: `nfe.jonas@gmail.com`
- Senha: `203015`

## Infra
- Frontend: Vercel (deploy via `vercel deploy --prod -y`)
- Backend: Render (deploy automático via push no GitHub master)
- Banco: PostgreSQL no Render

## Usuários no Sistema
| Nome | Email | Role |
|------|-------|------|
| Jonas dimes | nfe.jonas@gmail.com | ADMIN |
| Niulaine Regina Kleber | niulanereginakleber@gmail.com | USER |
| Jonas Admin | admin@teste.com | USER |
| Teste Codex | teste.codex.20260414@example.com | USER |

## IDs Importantes
- Jonas: `cmngl3fih0000s797oupx2jdy`
- Niulaine: `cmnw96a8y0000kz0w4zfp6jti`

## Contas Sociais Conectadas
- **Niulaine → LinkedIn:** Niulane Kleber (`JNGtmfZHkl`) — token ativo até ~jun/2026

## Credenciais LinkedIn App (Niulaine)
- Client ID: `78g1p6gmn1z5a1`
- Client Secret: (salvo localmente — não commitado)

## Endpoints Temporários (setup)
- `POST /setup/make-admin` — promove usuário a admin (secret: `setup-secret-2026`)
- `POST /setup/set-password` — define senha para conta OAuth (secret: `setup-secret-2026`)

## Funcionalidades Implementadas
- [x] Multi-usuário: Jonas (admin) alterna entre usuários via dropdown no sidebar
- [x] AdminModeBanner: banner amarelo quando gerenciando outro usuário
- [x] Página /admin/users: CRUD completo de usuários
- [x] Isolamento de dados: cada usuário tem seus posts/contas/configurações separados
- [x] LinkedIn da Niulaine conectado e testado
- [x] Nicho Niulaine: RH e Gestão de Pessoas — prompt de IA completo

## Arquivos Chave (Frontend)
- `frontend/src/contexts/AuthContext.tsx` — multi-user state
- `frontend/src/services/api.ts` — header X-Impersonate-User-Id
- `frontend/src/components/Sidebar.tsx` — UserSwitcher + link admin roxo
- `frontend/src/components/UserSwitcher.tsx` — dropdown de usuários
- `frontend/src/components/AdminModeBanner.tsx` — banner amarelo
- `frontend/src/components/Layout.tsx` — AdminModeBanner no topo
- `frontend/src/pages/admin/Users.tsx` — gestão de usuários
- `frontend/src/pages/Conteudo.tsx` — geração de conteúdo (PRÓXIMO: carrossel)

## Arquivos Chave (Backend)
- `backend/src/middleware/authGuard.ts` — impersonação via header
- `backend/src/controllers/authController.ts` — impersonate/stop endpoints
- `backend/src/controllers/adminController.ts` — CRUD usuários
- `backend/src/controllers/socialController.ts` — conectar LinkedIn/Facebook
- `backend/prisma/schema.prisma` — User com role/isActive + AdminSession

## Próximo: Carrossel
- Gerar slides de carrossel (JSON com título + texto + emoji por slide)
- Preview visual no frontend (navegação entre slides)
- Exportar como PDF ou imagens para postar no LinkedIn
- Agendar carrossel como post

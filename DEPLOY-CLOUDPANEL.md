# Deploy no CloudPanel

## Stack recomendada

- Aplicacao: `Node.js`
- Banco de dados: `MySQL` gerenciado no proprio servidor
- Process manager: `PM2`
- Proxy: `Nginx` do CloudPanel apontando para a porta interna `3000`

## 1. Preparar o servidor

- Criar uma `Node.js Site` no CloudPanel
- Definir a pasta da aplicacao
- Apontar o dominio/subdominio final
- Habilitar SSL no dominio antes de colocar em producao

## 2. Banco de dados

- Criar um banco MySQL no CloudPanel
- Criar usuario e senha fortes
- Liberar acesso apenas para o host local quando possivel

## 3. Variaveis de ambiente

Use o arquivo `.env.example` como base e configure no servidor:

```env
NODE_ENV=production
PORT=3000
APP_URL=https://app.seudominio.com
TRUST_PROXY=1
SESSION_SECRET=um-segredo-forte
SESSION_COOKIE_SECURE=1
JWT_SECRET=outro-segredo-forte
JWT_EXPIRE=7d
DB_DIALECT=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=app_consultoria
DB_USER=app_consultoria
DB_PASSWORD=sua-senha
DB_LOGGING=0
DB_SYNC_ALTER=0
DB_SYNC_FORCE=0
```

## 4. Instalar e subir

```bash
npm install
npm run build-css-once
node scripts/createAdmin.js
pm2 start src/app.js --name app-consutoria
pm2 save
```

No ambiente de desenvolvimento, o comando `npm run dev` usa `node --watch` para subir a aplicacao e o watch do CSS juntos.
Em producao, mantenha apenas o processo `app-consutoria` no PM2 e gere o CSS antes de reiniciar.

Se preferir, o start manual por comando tambem funciona:

```bash
pm2 start src/app.js --name app-consutoria
```

## 5. Healthcheck

Depois de subir a aplicacao, valide:

```bash
curl http://127.0.0.1:3000/health
```

Resposta esperada:

```json
{"status":"ok"}
```

## 6. Cuidados importantes

- Em producao, use `MySQL`; nao use `SQLite` para este deploy
- Deixe `DB_SYNC_ALTER=0` em producao para evitar alteracoes automaticas de schema
- O app agora respeita `APP_URL`, o que ajuda links de e-mail e certificados atras do proxy
- `TRUST_PROXY=1` e `SESSION_COOKIE_SECURE=1` sao importantes para cookies funcionarem corretamente com HTTPS no CloudPanel
- A pasta `src/public/uploads` precisa ser preservada entre deploys se voces publicarem novas imagens, logos, assinaturas e anexos

## 7. Atualizacao de versao

Fluxo seguro de atualizacao:

```bash
git pull
npm install
npm run build-css-once
pm2 restart app-consutoria
```

Se a instancia ja estiver cadastrada no PM2, basta reiniciar o processo:

```bash
pm2 restart app-consutoria
pm2 save
```

Observacao: em desenvolvimento, o `npm run dev` tambem sobe o watcher do PostCSS. Em producao, gere o CSS com `npm run build-css-once` antes do restart.

## 8. Primeiro acesso

Se o banco estiver vazio, rode:

```bash
node scripts/createAdmin.js
```

Depois acesse `/login` ou a tela de primeiro administrador.

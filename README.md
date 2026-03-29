# Consultoria Educativa

Plataforma web para divulgacao de cursos, matriculas, gestao administrativa, certificados, loja, conteudo de blog e area do aluno.

## Visao Geral

O projeto foi construido com Node.js e Express 5, EJS no frontend server-side e Sequelize para persistencia. A aplicacao atende tanto a operacao interna da consultoria quanto a experiencia publica dos alunos e visitantes, seguindo uma arquitetura em camadas orientada por dominio.

### Principais recursos

- Site institucional com listagem publica de cursos
- Fluxo de inscricao em cursos
- Area administrativa para cursos, inscricoes, usuarios, vendas e configuracoes
- Area do aluno com cursos e certificados
- Validacao publica de certificados
- Loja com produtos e redirecionamento para compra
- Blog com categorias, capa e imagens no corpo do artigo
- Upload de imagens e arquivos com `multer`
- Sessao autenticada com suporte a JWT
- Banco MySQL em producao e SQLite como opcao local

## Stack

- Node.js
- Express 5
- EJS + `express-ejs-layouts`
- Sequelize
- MySQL / SQLite
- Tailwind CSS 4 + PostCSS
- JWT, `express-session` e `bcryptjs`
- Nodemailer
- Testes com `node --test`

## Estrutura

```text
.
|-- docs/
|-- images/
|-- migrations/
|-- scripts/
|-- seeders/
|-- src/
|   |-- config/
|   |-- handlers/
|   |   |-- admin/
|   |   |-- auth/
|   |   |-- public/
|   |   `-- student/
|   |-- lib/
|   |-- middleware/
|   |-- models/
|   |-- public/
|   |   |-- css/
|   |   |-- js/
|   |   `-- uploads/
|   |-- routes/
|   |-- services/
|   |   |-- admin/
|   |   |-- auth/
|   |   |-- public/
|   |   |-- shared/
|   |   `-- student/
|   |-- utils/
|   `-- views/
|-- tests/
|-- .env.example
`-- package.json
```

## Arquitetura

Fluxo principal:

```text
request -> route -> middleware -> handler -> service -> model
                                      |
                                      -> view / json / redirect
```

Responsabilidades:

- `routes`: definem endpoints e encadeiam middleware
- `handlers`: tratam HTTP e escolhem `render`, `redirect` ou `json`
- `services`: concentram regra de negocio, persistencia e integracoes
- `models`: mapeiam entidades com Sequelize
- `views`: renderizam a camada server-side com EJS

Dominios organizados em `handlers` e `services`:

- `admin`
- `auth`
- `public`
- `student`
- `shared` para recursos transversais

## Modulos do sistema

- Publico: home, cursos, detalhes do curso, inscricao, contato, politica de privacidade, blog, loja e validacao de certificados
- Admin: dashboard, cursos, inscricoes, usuarios, configuracoes, vendas, certidoes, certificados e blog
- Aluno: dashboard, meus cursos, meus certificados e comprovantes
- Autenticacao: login, logout, primeiro administrador, confirmacao de conta e recuperacao de senha

## Galeria do projeto

As imagens abaixo sao carregadas diretamente da pasta [`images`](images).

### Tela 1

![Tela 1](images/0%20%281%29.png)

### Tela 2

![Tela 2](images/0%20%282%29.png)

### Tela 3

![Tela 3](images/0%20%283%29.png)

### Tela 4

![Tela 4](images/0%20%284%29.png)

### Tela 5

![Tela 5](images/0%20%285%29.png)

### Tela 6

![Tela 6](images/0%20%286%29.png)

## Como rodar localmente

### Pre-requisitos

- Node.js 18+ recomendado
- npm
- MySQL, se quiser usar o mesmo dialeto de producao

### Instalar dependencias

```bash
npm install
```

### Configurar ambiente

Use o arquivo `.env.example` como base:

```bash
cp .env.example .env
```

Ajuste principalmente:

- `APP_URL`
- `SESSION_SECRET`
- `JWT_SECRET`
- `UPLOADS_DIR`
- `DB_DIALECT`
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `DB_SYNC_ON_START`

Para desenvolvimento local com SQLite, habilite:

```env
DB_DIALECT=sqlite
DB_STORAGE=./database.sqlite
```

Uploads mutaveis de usuario podem ficar fora de `src/public`. O padrao atual e `./storage/uploads`, mantendo a URL publica `/uploads/...`.
Arquivos estaticos do sistema como `uploads/icons` e `uploads/templete-certificados` continuam dentro de `src/public/uploads`.

### Migrations do Sequelize

O projeto agora possui estrutura para migrations versionadas com `sequelize-cli`.

Em banco novo, o fluxo recomendado e:

```bash
npm run db:migrate
```

Em banco existente, criado historicamente por `sequelize.sync()`, o primeiro passo seguro e registrar a migration inicial como baseline:

```bash
npm run db:migrate:baseline
```

Depois disso, as proximas alteracoes de schema devem ser feitas com migrations novas.

Para impedir sincronizacao automatica no boot da aplicacao:

```env
DB_SYNC_ON_START=0
```

Se voce ainda quiser manter `sync` no desenvolvimento local:

```env
DB_SYNC_ON_START=1
```

### Executar em desenvolvimento

```bash
npm run dev
```

Esse comando sobe o servidor com `node --watch` e recompila o CSS em modo watch.

### Executar em producao

```bash
npm start
```

## Scripts uteis

```bash
npm start
npm run dev
npm run db:migrate
npm run db:migrate:status
npm run db:migrate:baseline
npm run build-css
npm run build-css-once
npm run seed
npm run migrate:course-prices-decimal
npm test
```

Scripts auxiliares em [`scripts/`](scripts):

- `CreateAdmin.js`: cria o primeiro administrador
- `SeedCourses.js`: popula cursos de exemplo
- `MigrateCoursePricesToDecimal.js`: ajusta valores de cursos
- `CleanupBackupTables.js`: limpeza de tabelas auxiliares
- `FixSqliteBackup.js`: manutencao de backup em SQLite

## Rotas principais

- `/`
- `/cursos`
- `/curso/:id`
- `/inscrever/:id`
- `/blog`
- `/loja`
- `/certificado/:code`
- `/validar-certificado`
- `/admin/dashboard`
- `/aluno/dashboard`

## Testes

Os testes atuais ficam centralizados em `tests/` e cobrem partes de middleware, servicos, utilitarios e helpers de apoio.

```bash
npm test
```

## Documentacao relacionada

- [DEPLOY-CLOUDPANEL.md](DEPLOY-CLOUDPANEL.md)
- [docs/Aplicacao.md](docs/Aplicacao.md)

## Contribuicao

As orientacoes para colaborar com o projeto estao em [CONTRIBUTING.md](CONTRIBUTING.md).

## Licenca

Este projeto esta licenciado sob a Licenca MIT. Consulte [LICENSE](LICENSE).

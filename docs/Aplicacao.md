# Estrutura implementada

- Framework: Express.js 5
- Arquitetura: `routes -> handlers -> services -> models -> views`
- Banco de dados: SQLite para desenvolvimento e MySQL para producao
- Autenticacao: sessao + JWT
- Niveis de acesso: admin e aluno
- Auto-reload local: `node --watch`

## Organizacao

- `src/routes`: composicao dos modulos HTTP
- `src/handlers`: camada HTTP por dominio
- `src/services`: regra de negocio e persistencia
- `src/models`: entidades Sequelize
- `src/views`: templates EJS

## Dominios

- `admin`: dashboard, cursos, inscricoes, usuarios, vendas, configuracoes, blog, certificados e certidoes
- `public`: home, catalogo, blog, loja, certidoes e validacao publica
- `student`: dashboard, perfil, cursos, certificados e comprovantes
- `auth`: login, cadastro, confirmacao e recuperacao

## Para rodar a aplicacao

```bash
npm run dev
```

A aplicacao estara rodando em `http://localhost:3000`, salvo se `PORT` estiver definido no ambiente.

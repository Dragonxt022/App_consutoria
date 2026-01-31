# 📚 Consultoria Educativa - Sistema de Gestão

Uma aplicação web completa para gestão de consultoria educacional, desenvolvida em Node.js com arquitetura MVC, autenticação de usuários e dashboards diferenciados para administradores e alunos.

## 🚀 Funcionalidades

- **Sistema de Autenticação** com JWT e gerenciamento de sessões
- **Dois Níveis de Acesso**: Administrador e Aluno
- **Dashboards Específicos** para cada perfil de usuário
- **Site Institucional** com página inicial moderna
- **Banco de Dados Flexível**: SQLite para desenvolvimento, MySQL para produção
- **Interface Responsiva** com Bootstrap 5
- **Sistema em Tempo Real** com Nodemon para desenvolvimento

## 🛠️ Stack Tecnológico

- **Backend**: Node.js + Express.js
- **Banco de Dados**: Sequelize ORM + SQLite/MySQL
- **Autenticação**: JWT + bcryptjs
- **Templates**: EJS
- **Frontend**: Bootstrap 5
- **Desenvolvimento**: Nodemon
- **Ambiente**: dotenv

## 📁 Estrutura do Projeto

```
├── src/
│   ├── controllers/     # Controladores da aplicação
│   ├── models/         # Modelos de dados (Sequelize)
│   ├── routes/         # Rotas da aplicação
│   ├── views/          # Templates EJS
│   │   ├── admin/      # Views do administrador
│   │   ├── aluno/      # Views do aluno
│   │   └── public/     # Views públicas
│   ├── middleware/     # Middlewares personalizados
│   ├── config/         # Configurações do banco
│   └── app.js          # Arquivo principal da aplicação
├── scripts/            # Scripts utilitários
├── .env               # Variáveis de ambiente
├── .gitignore         # Arquivos ignorados pelo Git
└── package.json       # Dependências e scripts
```

## 🚀 Instalação e Configuração

### Pré-requisitos
- Node.js (versão 16+)
- npm ou yarn

### 1. Clone o repositório
```bash
git clone <url-do-repositorio>
cd app_consutoria
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure as variáveis de ambiente
Copie o arquivo `.env` e ajuste conforme necessário:

```env
NODE_ENV=development
PORT=3000

# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=app_consultoria

# JWT
JWT_SECRET=your_secret_key_here
JWT_EXPIRE=7d
```

### 4. Crie o banco de dados e usuário admin
```bash
node scripts/createAdmin.js
```

### 5. Inicie a aplicação em modo desenvolvimento
```bash
npm run dev
```

Ou para produção:
```bash
npm start
```

## 🔐 Acessos Padrão

### Administrador
- **Email**: `admin@consultoria.com`
- **Senha**: `admin123`
- **Acesso**: [`/admin/login`](http://localhost:3000/admin/login)

### Aluno
- **Acesso**: [`/aluno/login`](http://localhost:3000/aluno/login)
- *(Necessário cadastro prévio)*

## 🌐 URLs da Aplicação

- **Página Inicial**: [`http://localhost:3000`](http://localhost:3000)
- **Login Administrador**: [`http://localhost:3000/admin/login`](http://localhost:3000/admin/login)
- **Login Aluno**: [`http://localhost:3000/aluno/login`](http://localhost:3000/aluno/login)
- **Dashboard Admin**: [`http://localhost:3000/admin/dashboard`](http://localhost:3000/admin/dashboard)
- **Dashboard Aluno**: [`http://localhost:3000/aluno/dashboard`](http://localhost:3000/aluno/dashboard)

## 🗄️ Banco de Dados

### Desenvolvimento (SQLite)
- Arquivo: `database.sqlite`
- Criado automaticamente no primeiro uso
- Ideal para desenvolvimento local

### Produção (MySQL)
- Configure as variáveis de ambiente no arquivo `.env`
- Crie o banco de dados manualmente antes de iniciar
- Recomendado para ambiente de produção

## 📝 Scripts Disponíveis

```bash
npm start          # Inicia aplicação em modo produção
npm run dev        # Inicia com Nodemon (auto-reload)
npm test           # Executa testes (a implementar)
```

## 🔧 Desenvolvimento

### Criar Novo Usuário
```bash
node scripts/createUser.js email nome senha role(admin|aluno)
```

### Sincronizar Banco de Dados
O banco é sincronizado automaticamente ao iniciar a aplicação. Para forçar recriação das tabelas, altere `sync({ force: false })` para `sync({ force: true })` em `src/app.js`.

## 🎯 Próximos Passos

- [ ] Implementar sistema de cadastro de alunos
- [ ] Criar módulo de cursos e disciplinas
- [ ] Adicionar sistema de progresso e certificados
- [ ] Implementar API REST para integração mobile
- [ ] Adicionar testes unitários e de integração
- [ ] Configurar CI/CD
- [ ] Deploy em ambiente de produção

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 👨‍💻 Autor

Desenvolvido com ❤️ para gestão educacional

---

**Status do Projeto**: 🚧 Em Desenvolvimento  
**Versão**: 1.0.0  
**Última Atualização**: Janeiro 2026
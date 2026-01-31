# Estrutura implementada:

✅ Framework: Express.js com MVC  
✅ Banco de dados: SQLite para desenvolvimento, MySQL para produção  
✅ Autenticação: JWT com sessões  
✅ Níveis de acesso: Admin e Aluno  
✅ Auto-reload: Nodemon configurado  

## Acessos criados:

### Administrador:
- Email: admin@consultoria.com
- Senha: admin123
- Acesso: /admin/login

### Para rodar a aplicação:

``npm run dev``
A aplicação estará rodando em http://localhost:3000

### Páginas disponíveis:

- Homepage (/) - Site institucional com opções de login

- Login Admin (/admin/login) - Acesso para 
administradores

- Login Aluno (/aluno/login) - Acesso para alunos

- Dashboard Admin (/admin/dashboard) - Painel administrativo

- Dashboard Aluno (/aluno/dashboard) - Painel do aluno
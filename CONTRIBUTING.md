# Guia de Contribuicao

Obrigado por contribuir com este projeto.

## Antes de comecar

- Verifique se existe uma issue, tarefa ou contexto definido para a mudanca
- Trabalhe sempre a partir da branch mais atualizada
- Evite misturar refactor amplo com correcao funcional sem necessidade

## Fluxo recomendado

1. Crie uma branch descritiva, por exemplo `feature/blog-admin` ou `fix/login-session`.
2. Implemente a mudanca mantendo o padrao atual do projeto.
3. Rode os testes automatizados com `npm test`.
4. Se houver alteracao visual, revise as telas impactadas localmente.
5. Envie um Pull Request com contexto suficiente para revisao.

## Padroes esperados

- Preserve a organizacao MVC existente em `src/`
- Prefira mudancas pequenas e objetivas
- Atualize a documentacao quando a alteracao mudar setup, fluxo ou comportamento
- Nao inclua segredos, tokens, credenciais reais ou dados sensiveis
- Mantenha nomes de arquivos, rotas e variaveis claros e consistentes

## Commits

Prefira mensagens de commit curtas e descritivas. Exemplos:

- `feat: adiciona listagem publica do blog`
- `fix: corrige expiracao de sessao no login`
- `docs: atualiza instrucoes do ambiente local`

## Pull Requests

Ao abrir um PR, inclua:

- objetivo da mudanca
- impacto esperado para usuario e administracao
- passos para validacao
- capturas de tela, quando houver alteracao visual

## Checklist rapido

- [ ] O codigo segue o padrao atual do projeto
- [ ] A documentacao relevante foi atualizada
- [ ] Os testes foram executados
- [ ] Nao foram adicionados segredos ao repositorio
- [ ] As mudancas foram revisadas antes do envio

## Licenciamento

Ao contribuir com este repositorio, voce concorda que sua contribuicao sera disponibilizada sob a mesma licenca do projeto, descrita em [LICENSE](LICENSE).

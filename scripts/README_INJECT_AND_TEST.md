# Teste rápido do Dashboard (injeção de token)

Este guia rápido descreve como injetar o JWT de teste no `localStorage` do frontend e validar o dashboard em `http://localhost:3000`.

Pré-requisitos

- Serviços rodando localmente:

```bash
# na raiz do monorepo
pnpm install
pnpm dev:web   # Next.js (porta 3000)
pnpm dev:api   # NestJS (porta 4000)
# em outra janela, se necessário (kairos Python)
cd apps/kairos
python -m pip install -r requirements.txt
uvicorn src.api.routes:app --reload --port 8000
```

Gerar snippet de injeção

- Execute (já criado) o script que imprime o snippet:

```bash
node scripts/generate_inject_snippet.js
```

- O script exibirá um snippet semelhante a:

```javascript
(function(){
  localStorage.setItem('disciplina_token', "<JWT_AQUI>");
  localStorage.setItem('disciplina_user', "{...json do usuário...}");
  window.location.href = '/';
})();
```

Injetando no navegador

1. Abra `http://localhost:3000` no seu navegador.
2. Abra o DevTools (F12) → Console.
3. Cole o snippet gerado pelo script e pressione Enter.
4. A página será recarregada como usuário autenticado; verifique o dashboard principal.

O que verificar no dashboard

- Hábitos: deve mostrar o hábito "Ler Bíblia" com o log do dia.
- Metas: deve aparecer a meta "Ler 10 capítulos".
- Livros: deve listar "O Pequeno Príncipe".

Observações

- O token tem validade (JWT). Se o snippet expirar, reexecute `generate_inject_snippet.js`.
- Se os serviços não estiverem ativos, inicie `web` e `api` antes de injetar.

Arquivos úteis

- `scripts/generate_inject_snippet.js` — gera o snippet com token e usuário.
- `scripts/populate_data.js` — populou dados de exemplo no banco.

Fim.

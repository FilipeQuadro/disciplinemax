Auto-label PRs and auto-reviewers
=================================

Este workflow adiciona automaticamente labels a pull requests e solicita reviewers com base no conteúdo do PR.

Como funciona:
- O workflow é acionado em eventos `pull_request` (opened, edited, reopened, synchronize).
- Se o título ou corpo do PR contiver palavras-chave como `chore(scripts)`, `seed`, `e2e`, `ci` ou `scripts`, serão adicionadas as labels `chore`, `ci` e `docs`.
- Se o arquivo `.github/auto_reviewers.txt` existir e contiver nomes de usuário GitHub (um por linha), esses usuários serão solicitados como reviewers automaticamente.

Como personalizar:
- Para mudar os reviewers automáticos, edite `.github/auto_reviewers.txt` e adicione/remova usernames (um por linha).
- Para ajustar as heurísticas de labels, edite `.github/workflows/auto-label-pr.yml` e altere a expressão regular usada para detectar palavras-chave.

Segurança:
- O workflow usa `GITHUB_TOKEN` (permissões mínimas definidas no arquivo) e não requer PATs adicionais.

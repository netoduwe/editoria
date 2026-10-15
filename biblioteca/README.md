# Biblioteca

Um feed só com as referências da turma e os projetos que você já fez. Tudo roda no seu computador.

## Abrir

Peça ao agente "abre a biblioteca" ou rode, na pasta do kit:

```sh
node scripts/biblioteca.mjs
```

e abra http://127.0.0.1:9127/. Deixe o comando aberto enquanto usa. Se a porta estiver ocupada: `node scripts/biblioteca.mjs --port 9128`. Abrir a biblioteca não roda o setup, não instala nada e não mexe em `marca/design.md`.

## Usar

- **Assistir**: clique na capa. O vídeo toca no próprio card; ao dar play em outro, o anterior para. Referências de outros criadores tocam no player oficial do Instagram (nada é copiado).
- **Usar como referência**: copia um pedido pronto para colar no Claude Code ou no Codex. O pedido muda conforme o card:
  - referência com estilo pronto → "edita o meu vídeo no estilo X…";
  - referência sem estilo → "copia o estilo da referência…";
  - motion → "faz um motion usando como referência… O motion é sobre: " (complete com o assunto);
  - projeto seu → "usa o meu projeto… como base".
- **Meus projetos**: ao terminar cada edição, o agente guarda o projeto com capa e uma prévia leve (540 px). O vídeo final continua em `saida/`.
- **Pastas**: "＋ Pasta" cria; o menu ⋯ de cada card coloca ou tira de qualquer pasta. Um card pode estar em várias pastas.
- **Avaliar**: "Boa referência" ou "Não curti" no menu ⋯; o filtro "Só as que marquei como boas" junta as favoritas.
- **Remover**: referências da turma ficam ocultas só para você. Projetos seus vão para a lixeira (`projetos/.lixeira/`), com a opção de levar junto o vídeo final. Em "Removidos e lixeira" dá para restaurar ou apagar de vez. O vídeo bruto em `entrada/` nunca é apagado.

Tudo isso também funciona pedindo ao agente ("guarda na pasta Anúncios", "tira essa referência da minha biblioteca", "apaga o projeto teste"). Pastas, avaliações e itens ocultos ficam em `biblioteca/local/preferencias.json`, só no seu computador.

### Espaço em disco
Cada projeto guardado ocupa pouco (composição, capa e prévia). Os arquivos pesados de trabalho (corte, recorte da pessoa, render) ficam até você pedir "libera espaço do projeto X": o agente roda `node scripts/biblioteca.mjs compactar projetos/<nome>`, que apaga só o que dá para gerar de novo.

## Comandos (para o agente)

```sh
node scripts/biblioteca.mjs listar [--json]
node scripts/biblioteca.mjs guardar projetos/<nome> --titulo "…" [--estilo nome] [--referencia ID] [--pasta "…"] [--notas "a; b"] [--compactar]
node scripts/biblioteca.mjs compactar projetos/<nome>
node scripts/biblioteca.mjs excluir <nome> [--com-video] · restaurar <nome> · esvaziar-lixeira
node scripts/biblioteca.mjs ocultar <ID> · mostrar <ID>
node scripts/biblioteca.mjs pasta "<nome>" <ID ou projeto:nome>... [--remover]
```

## Para o professor

- `catalogo.json`: um item por referência, na ordem de destaque, com `titulo`, `categoria` (`edicao` ou `motion`), `estilo` (receita em `estilos/`, se existir), `aprender` (2–3 traços), `formato`, `duracao` e `poster`. Referência de outro criador leva `autor` e `link_original` em vez de vídeo no Drive.
- `videos.json`: o link do Drive de cada vídeo da turma (um link por arquivo, compartilhado como leitor). Para trocar: `node scripts/biblioteca.mjs vincular <ID-ou-arquivo.mp4> "<link do arquivo no Drive>"`.
- Trazer vídeos novos da curadoria: `node scripts/exportar-biblioteca.mjs <feed.json>`. Ele mantém títulos e textos já escritos, copia só as capas e nunca copia vídeos; complete o `aprender` dos novos.
- O servidor só atende `127.0.0.1`, transmite do Drive apenas os vídeos do catálogo e só aceita alterações vindas da própria página (token da sessão + mesma origem).
- Testes: `node --test scripts/biblioteca.test.mjs`.

# Biblioteca de referências

O feed mostra referências finais de vídeo e motion, capas e fontes de ferramentas. Os vídeos ficam hospedados no Google Drive e são reproduzidos dentro da biblioteca quando você clicar. O kit não baixa o acervo inteiro.

A reprodução usa o player do navegador, com transmissão pelo servidor local e suporte a avançar/voltar. Somente o vídeo escolhido é carregado; não há cópia permanente dos vídeos no kit. Mantenha o servidor da biblioteca aberto enquanto assiste.

Os 27 vídeos selecionados estão vinculados aos cards. [Abrir a pasta de referências no Drive](https://drive.google.com/drive/folders/1mZuTPGsSfmNWfz6D_Rd3dly7nujfhSaQ).

Há uma versão por edição: variações apenas de proporção (9:16/4:5), música ou mixagem não repetem cards. A curadoria prioriza a final aprovada/confirmada, a revisão mais recente, o formato 9:16 e a mixagem completa. Referências com conteúdo ou linguagem diferentes continuam separadas.

## Abrir

Na pasta do kit, rode:

```sh
node scripts/biblioteca.mjs
```

Abra http://127.0.0.1:9127/. Isso usa apenas o Node já instalado: não roda o setup, não instala dependências e não altera `marca/design.md`. Se essa porta estiver ocupada, use `node scripts/biblioteca.mjs --port 9128`.

## Usar uma referência

1. Clique na capa de um vídeo para reproduzir no próprio card, mantendo seu tamanho e sua posição no feed. Use os controles do vídeo para pausar e avançar. Ao iniciar outro card, a reprodução anterior é interrompida. O acesso depende das permissões que o professor configurou no Drive.
2. Clique em **Usar referência** e cole o pedido no Claude Code/Codex junto do caminho do seu bruto.
3. O agente estuda a linguagem de edição e aplica a sua marca. Para analisar movimento, cortes e áudio, pode ser necessário baixar somente o vídeo escolhido para `referencias/estilos/`. Se o Drive pedir acesso, forneça o arquivo ao agente.

As imagens do feed são capas, não projetos editáveis. Vídeos de terceiros são referências de estudo: seus trechos, áudio e assets não entram no vídeo do aluno.

O menu **⋯** de cada card reúne detalhes, avaliações e **Remover da minha biblioteca**. **Removidos por mim** permite restaurar um card. Essas escolhas ficam no navegador do aluno e não alteram o catálogo da turma, os arquivos do Drive ou a marca. O menu **⋯** do topo permite exportar/importar as avaliações entre navegadores; os cards removidos permanecem no navegador em que foram removidos.

## Configuração do professor

Suba os vídeos no Drive e configure acesso de visualizador para os alunos. Cada vídeo precisa de seu próprio link de compartilhamento; o link de uma pasta não identifica qual vídeo pertence a cada card. O vídeo pode precisar terminar de ser processado no Drive antes de ficar disponível para a turma.

O arquivo `videos.json` lista o ID de cada card, o nome original do vídeo e seu link. Um link vazio mostra **Link do vídeo em preparação**. Não há links inventados nem downloads automáticos.

Para vincular um vídeo:

```sh
node scripts/biblioteca.mjs vincular "NOME_DO_VIDEO.mp4" "https://drive.google.com/file/d/ID_DO_ARQUIVO/view"
```

Também é possível editar `biblioteca/videos.json` diretamente. Use o ID do card se houver nomes de arquivo repetidos. Recarregue o feed após atualizar os links. Publique as alterações por branch/PR.

Para atualizar metadados e capas a partir de uma curadoria já selecionada:

```sh
node scripts/exportar-biblioteca.mjs /caminho/da/curadoria/feed.json
```

O exportador preserva links já configurados, exclui rejeitados/removidos, copia somente as capas e remove caminhos pessoais e histórico. Ele não copia MP4s nem instala skills. `catalogo.json` é o catálogo para o agente; `videos.json` contém os links por ID.

Documentação do Drive: [armazenar e assistir vídeos](https://support.google.com/drive/answer/2423694?hl=pt-BR), [compartilhar arquivos](https://support.google.com/drive/answer/2494822?hl=pt-BR).

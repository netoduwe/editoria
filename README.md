# Editor IA — seu editor de vídeo com Claude/Codex

Você joga um vídeo, escolhe um estilo e recebe o vídeo editado: cortado, legendado, com animações e áudio nivelado. E ainda copia o estilo de edição de qualquer criador que você admira.

## Começar (uma vez)
1. Instale o **Claude Code** ou o **Codex** (visto na aula).
2. Crie uma pasta vazia, por exemplo `Documentos/EditorIA`, e abra essa pasta no Claude Code ou no Codex.
3. Abra o arquivo [SETUP-PROMPT.md](SETUP-PROMPT.md), copie o prompt e cole como primeira mensagem. O agente baixa este kit para a pasta, instala tudo, testa e faz as perguntas da sua marca.

Prefere baixar na mão? Botão verde **Code → Download ZIP** nesta página, extraia, abra a pasta extraída no Claude Code/Codex e cole o mesmo prompt (ele percebe que o kit já está lá).

## Usar (sempre)
1. Coloque o vídeo em `entrada/`.
2. Peça: **"edita entrada/meu-video.mp4"** (ou "… no estilo editorial-tech").
3. Pegue o resultado em `saida/`. Assista **com som** antes de postar.

Quer ajustar? Peça em português: *"troca a cor da legenda para amarelo"*, *"tira o card dos 12 segundos"*, *"deixa mais rápido"*.

## Biblioteca de referências

Rode `node scripts/biblioteca.mjs` e abra http://127.0.0.1:9127/. Clique na capa para reproduzir o vídeo no próprio card, mantendo o tamanho e a posição. Clique em **Usar referência** para copiar o pedido ao agente. Os vídeos ficam hospedados no Drive e os MP4s não acompanham o repositório. Suas avaliações e cards removidos ficam no navegador. Veja [como usar e configurar os links](biblioteca/README.md).

## Estilos prontos
| Estilo | Para quê |
|---|---|
| `legenda-viral` | Reels falado: rosto, legenda grande e rápida, zooms nas ênfases |
| `editorial-tech` | Conteúdo premium: layouts que mudam com a fala, cards, cabeça saindo do painel |
| `aula-split` | Cortes de aula/live: slide em cima, você embaixo |
| `minimalista` | Podcast, entrevista, depoimento: limpo e elegante |

Crie o seu: copie um arquivo de `estilos/`, mude o que quiser e peça "usa o estilo <nome>".

## Copiar o estilo de um criador
Peça: **"copia o estilo deste vídeo: <link>"** (Reels, YouTube, Shorts ou TikTok). Melhor ainda: mande 2–3 vídeos do mesmo criador, porque o estilo é o que se repete entre eles.

O agente baixa o vídeo, mede o ritmo (cortes, pausas, animações), as cores e o áudio, olha quadro a quadro (legenda, fontes, layouts, gancho) e escreve uma receita nova em `estilos/`. Depois ele **prova**: edita um vídeo seu nesse estilo, compara com a referência e ajusta até bater. A partir daí é só pedir "edita entrada/x.mp4 no estilo <nome>".

Ele copia a **linguagem** da edição, não a identidade: as cores e a logo continuam as da sua marca, e nada do vídeo do criador entra no seu. O vídeo baixado é só para estudo. Se o Instagram pedir login, o agente explica as opções; a mais simples é salvar o vídeo no celular e arrastar o arquivo para `referencias/`.

## Motion design
Peça: *"faz um motion de 10 s anunciando X"*. Antes, coloque prints e vídeos que você gosta em `referencias/`. O agente mostra um **storyboard** primeiro; só depois de você aprovar ele anima e renderiza.

## Pastas
`entrada/` seus brutos (nunca alterados) · `saida/` vídeos prontos · `projetos/` bastidores de cada edição · `marca/` sua identidade · `estilos/` receitas · `referencias/` inspirações e vídeos de referência · `fontes/` fontes livres · `scripts/` ferramentas.

Seus vídeos, projetos, referências e logo ficam fora do Git (veja `.gitignore`): nada disso sobe se você usar o kit num repositório.

## Atualizar o kit
Se você baixou com Git, peça ao agente: *"atualiza o kit sem perder minha marca e meus estilos"*. Ele roda `git pull` e resolve conflitos em `marca/design.md` mantendo as suas respostas.

---
Fontes incluídas: Inter e Instrument Serif (SIL Open Font License, veja `fontes/OFL-*.txt`). Motor de vídeo: [HyperFrames](https://hyperframes.heygen.com). Download de referências: [yt-dlp](https://github.com/yt-dlp/yt-dlp).

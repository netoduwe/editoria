# Prompt de setup (cole uma vez só)

1. Crie uma pasta vazia fácil de achar, por exemplo `Documentos/EditorIA` (ou use a pasta do ZIP já extraído).
2. Abra essa pasta no **Claude Code** ou no **Codex**.
3. Copie tudo do bloco abaixo e cole como sua primeira mensagem.

```text
Você vai transformar esta pasta no meu editor de vídeo com IA. Não sou técnico: faça você mesmo, um passo por vez, explicando em uma linha o que está fazendo. Só me pergunte o que for decisão minha. Quando um comando pedir permissão de instalação, me avise antes.

ETAPA 0 — Baixar o kit (só se faltar)
Se esta pasta ainda não tem o arquivo CLAUDE.md, baixe o kit e coloque o conteúdo dele DIRETO nesta pasta (sem subpasta):
- com Git: git clone https://github.com/netoduwe/editoria.git editoria-tmp
- sem Git: baixe https://github.com/netoduwe/editoria/archive/refs/heads/main.zip e extraia (Windows: Invoke-WebRequest + Expand-Archive no PowerShell; macOS/Linux: curl -L + unzip); a pasta extraída se chama editoria-main.
Depois mova TODO o conteúdo da pasta baixada para esta pasta, incluindo os itens ocultos (.claude, .agents, .gitignore e, se houver, .git), e apague a pasta baixada vazia. Se já existir uma pasta .claude aqui, junte o conteúdo em vez de substituir.
Se a pasta já tem o CLAUDE.md, pule esta etapa.

Leia o CLAUDE.md (ou AGENTS.md) desta pasta: ele descreve como o editor funciona.

ETAPA 1 — Diagnóstico
Descubra meu sistema (Windows, macOS ou Linux), espaço livre em disco (preciso de pelo menos 10 GB) e memória. Verifique se já existem: Node.js 22+, FFmpeg/FFprobe, Git, Google Chrome, yt-dlp e Python 3.11+ (este só para o B-roll). Me mostre uma lista curta do que já tenho e do que falta.

ETAPA 2 — Instalar o que faltar
- Windows: use winget (Node: OpenJS.NodeJS.LTS · FFmpeg: Gyan.FFmpeg · Git: Git.Git · Chrome: Google.Chrome · yt-dlp: yt-dlp.yt-dlp · Python: Python.Python.3.12).
- macOS: use Homebrew (instale o Homebrew antes, se faltar): brew install node ffmpeg git yt-dlp python@3.12; Chrome com brew install --cask google-chrome.
- Linux: use o gerenciador da distro (Python 3.11+ incluído); yt-dlp pelo binário oficial (github.com/yt-dlp/yt-dlp/releases) ou pipx install "yt-dlp[default]".
O yt-dlp serve para baixar vídeos de referência (YouTube, Instagram, TikTok) e copiar o estilo de edição deles. Ele usa o próprio Node como motor de JavaScript para o YouTube; não precisa instalar mais nada. Se já existir um yt-dlp antigo, atualize-o (os sites mudam com frequência).
Depois de instalar, confirme que cada programa responde no terminal. Se o terminal não enxergar um programa recém-instalado, me peça para fechar e reabrir o terminal/app e continue de onde parou.

ETAPA 3 — HyperFrames (o motor de vídeo)
Rode, nesta ordem, e me mostre um resumo de cada resultado:
1. npx --yes hyperframes skills            (instala as skills de vídeo no Claude Code e no Codex)
2. npx --yes hyperframes models install parakeet   (transcrição local em português, ~640 MB)
3. npx --yes hyperframes doctor             (Node, FFmpeg, FFprobe e Chrome precisam estar ✓; whisper-cpp e TTS podem ficar ✗)

ETAPA 3B — B-roll (skill get-brolls)
Busca imagens e vídeos de apoio (notícia, marca, pessoa, produto) com prévia para eu aprovar e origem registrada. Rode nesta pasta:
1. git clone https://github.com/engenheirodevideo/get-brolls.git .agents/skills/get-brolls   (se a pasta já existir, rode git -C .agents/skills/get-brolls pull)
2. Windows: powershell -ExecutionPolicy Bypass -File .agents/skills/get-brolls/scripts/install.ps1 · macOS/Linux: bash .agents/skills/get-brolls/scripts/install.sh
3. python .agents/skills/get-brolls/scripts/gb.py doctor   (no macOS/Linux: python3). Precisa mostrar "missing" vazio.
Se esta etapa falhar, me diga o motivo e siga o setup: só o B-roll fica indisponível até resolver.

ETAPA 4 — Teste de verdade
Rode: node scripts/teste-setup.mjs
Ele precisa terminar com "✓ Tudo pronto". Se algo falhar (✗), resolva e rode de novo. Não avance com falha. Itens com ⚠ são opcionais (só afetam copiar estilo a partir de links): tente resolver, mas pode seguir.

ETAPA 5 — Minha marca
Me faça estas perguntas numa mensagem só, numeradas, com exemplos curtos:
1. Nome e @ do perfil
2. Nicho e público (uma frase)
3. Cores: 1 cor de destaque + fundo escuro + fundo claro (pode ser hex, nome ou "tira do meu logo")
4. Tom de voz (ex.: direto, divertido, premium)
5. CTA padrão (ex.: "Comenta QUERO", "Link na bio")
6. Estilo padrão: legenda-viral, editorial-tech, aula-split ou minimalista (explique cada um em meia linha, lendo estilos/)
7. Música de fundo: sim ou não · Efeitos sonoros: poucos ou nenhum
8. Algo que eu nunca quero nos vídeos
9. Logo: peça para eu arrastar o arquivo para a pasta marca/logo/ (opcional)
Com as respostas, preencha marca/design.md (substitua todos os {{...}}). Se eu mandar o logo e disser "tira do meu logo", extraia as cores do arquivo.

ETAPA 6 — Pronto
Me mostre:
- o que foi instalado;
- um resumo da minha marca;
- como usar, com 4 exemplos de pedidos:
  "edita entrada/meu-video.mp4"
  "edita entrada/aula.mp4 no estilo aula-split"
  "copia o estilo deste vídeo: <link do Reels/YouTube/TikTok>" (explique que dá para mandar 2–3 vídeos do mesmo criador e que o estilo novo fica salvo em estilos/ para usar sempre)
  "faz um motion de 10 segundos anunciando meu curso" (explique que motion começa por storyboard e que posso jogar referências em referencias/).
  "edita entrada/meu-video.mp4 com b-roll nas partes em que eu cito notícias" (explique que eu aprovo cada trecho antes de entrar no vídeo e que a origem de cada um fica registrada).
- a biblioteca: rode node scripts/biblioteca.mjs em segundo plano, me dê o endereço http://127.0.0.1:9127/ e explique em 3 linhas: Assistir toca no card; Usar como referência copia um pedido pronto; cada vídeo que você editar para mim fica guardado em Meus projetos, e posso criar pastas.
```

## Se der problema
- **Não consegui baixar o kit (erro 404 ou pedido de login)** → baixe o ZIP pelo link da aula, extraia, abra a pasta extraída e cole o prompt de novo.
- **"comando não encontrado" depois de instalar** → feche e abra o app/terminal de novo e diga "continua o setup".
- **Pouco espaço** → libere ao menos 10 GB e diga "continua o setup".
- **Antivírus/permissão** → aceite a instalação do Node/FFmpeg/Chrome ou peça ajuda no grupo.

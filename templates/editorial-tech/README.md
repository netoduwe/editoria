# Template editorial-tech

Monta um vídeo falado no estilo `editorial-tech` (veja `estilos/editorial-tech.md`) a partir de um roteiro de cenas. O agente decide **o que** aparece em cada trecho da fala; o template cuida de **como** (tipografia, cores da marca, animações, legendas, efeitos sonoros e encerramento).

## Como usar (agente)
1. Siga a skill `editar-video` até ter `projetos/<nome>/corte.mp4` e `corte-transcricao/transcript.json`.
2. (Opcional, recomendado) Recorte a pessoa para o split com cabeça sobre o painel:
   `npx hyperframes remove-background projetos/<nome>/composicao/assets/corte.mp4 -o projetos/<nome>/composicao/assets/pessoa.webm` (~15 s por segundo de vídeo; rode em segundo plano). Sem ele o split funciona, só sem a cabeça passando por cima.
3. Escreva `projetos/<nome>/cenas.json` (formato abaixo). Exemplo completo: [exemplo-cenas.json](exemplo-cenas.json).
4. `node templates/editorial-tech/montar.mjs projetos/<nome>` → gera `composicao/index.html` em segundos.
5. **Prancha para o aluno aprovar** antes de qualquer render: `npx hyperframes snapshot --at <meio de cada cena> --describe false -o ../prancha` (dentro de `composicao/`) e mostre a `contact-sheet.jpg` com 1 linha por cena. Ajuste o `cenas.json` até o ok.
6. Revise com a skill `revisar-video` (o `check` com `--sem-cabeca`, veja abaixo) e renderize como sempre. Para mudar algo, edite `cenas.json` e rode o passo 4 de novo — nunca edite o `index.html` gerado.

`--sem-cabeca`: monta sem a camada da pessoa recortada; use só para o `npx hyperframes check`, que trava com vídeo transparente. Depois monte de novo sem a opção.

## Ritmo
- Um plano a cada ~2 s (o estilo pede 1,5–2,6 s); troque de layout na palavra que muda de assunto.
- Nunca mais de 2 planos seguidos sem a pessoa (`tela` conta como sem pessoa; `split` e `rosto` têm a pessoa).
- Cenas cobrem o vídeo inteiro, sem buraco: o `fim` de uma é o `inicio` da próxima. O `encerramento` vem depois do fim da fala (1–1,5 s).
- Texto na tela só com o que foi dito (regra 4 do kit).

## cenas.json
```json
{
  "video": "corte.mp4",
  "transcricao": "corte-transcricao/transcript.json",
  "corrigir": { "11 do 11,": "11 de 11," },
  "legenda": { "palavras_por_vez": 2, "destaques": ["nutricionista", "20 horas"] },
  "cenas": [ { "tipo": "rosto", "inicio": 0, "fim": 3.87, "legenda": true } ]
}
```
- `musica` (opcional, só se o aluno pedir trilha): `{ "arquivo": "caminho/da/musica.mp3" }` (opcionais: `inicio`, `nivel_db`, `carve`, `encaixar`). O template:
  - detecta as batidas (`npx hyperframes beats`) e escolhe, perto do começo da música, o ponto em que ela entra para que as trocas de cena que escondem emendas caiam na batida (`inicio` força um ponto, em segundos da música);
  - move até 0,22 s as trocas que acontecem no meio de uma fala contínua para cair na batida (`"encaixar": false` desliga);
  - pulsa a imagem de leve nas batidas fortes (a legenda fica parada para continuar legível), dá um punch com flash curto nas trocas que caem na batida e faz o brilho das telas respirar no tempo;
  - abre espaço para a voz com o **carve** do HyperFrames (mergulhos nas frequências da voz que seguem a fala + nivelamento lento; instala `@hyperframes/core` uma vez em `node_modules/` do kit). Sem a skill `hyperframes-audio`, usa uma reserva de volume simples nos trechos de fala;
  - mede a loudness da voz e do trecho da música e começa a música no nível da voz (`nivel_db: 0`; música de artista vem masterizada perto de −9 LUFS e engoliria a voz bruta, perto de −24). Com o carve (`carve: 0.6`), a voz fica cerca de 10–18 dB acima da música;
  - faz fade de entrada, sobe a música +6 dB no encerramento (depois da fala) e faz fade no fim; tira o efeito de passagem e baixa os outros efeitos.
  Para conferir a mistura sem ouvir: renderize a versão sem música e a com música e rode `node scripts/voz-musica.mjs saida/<nome>-trilha.mp4 saida/<nome>.mp4 --ate <fim da fala>` — ele subtrai uma da outra (a voz é a mesma), o que sobra é a trilha, e mostra quanto a voz fica acima dela em cada trecho.
  Música comercial (de artista) tem direitos: em **anúncio pago** a plataforma costuma reprovar ou silenciar; no orgânico, prefira postar sem trilha e escolher a música no próprio Instagram. Entregue também a versão sem música.
- `corrigir`: troca palavras que a transcrição errou (mesmo número de palavras).
- `destaques`: palavras da legenda na cor de destaque da marca (1 por frase, no máximo).
- Tempos em segundos da **timeline** (do corte). Onde se pede `em`, use a palavra falada (ex.: `"em": "acesso"`) — o elemento entra no início dela; ou um número em segundos.

### Tipos de cena
| tipo | o que é | campos |
|---|---|---|
| `rosto` | câmera cheia com push lento e legenda | `legenda` (true/false), `legenda_desde` (palavra), `legenda_y` (px; padrão 1300 — use ~865 quando a pessoa segura uma placa no peito), `selo` (texto curto no topo) |
| `split` | visual em cima, pessoa no painel arredondado embaixo, cabeça por cima | `visual` (componente). Calibre o enquadramento no topo do arquivo: `"split": { "painel_topo": 1400, "deslocamento": 580, "visual_altura": 400 }` — a linha do painel deve passar no queixo (pessoa perto da câmera: 1400/580/400; mais longe: 1240/690/500) |
| `tela` | tela cheia gráfica | `fundo` (`claro`, `escuro`, `alerta`, `preto`), `fade` (true ao entrar em tela clara), `visual` (componente), `som` (false para tirar o efeito de passagem) |
| `encerramento` | logo da marca + botão de CTA, depois da fala | `cta` (texto do botão) |

### Componentes (`visual`)
| tipo | uso | campos |
|---|---|---|
| `titulo` | fala vira título (serifa itálica) | `linhas: [{partes:[{texto, em}], estilo: serif\|sans, cor: texto\|destaque\|alerta, tamanho}]`, `rotulo`, `rotulo_em`, `icone` (`check`, `x`, `infinito`), `icone_em` |
| `calendario` | data que importa | `rotulo`, `rotulo_em`, `sub: {texto, em}`, `data` ("11/11"), `em`, `extra: {texto, em}` (ex.: "20h" que carimba) |
| `botao` | "clique no botão" com dedo e toque | `rotulo`, `rotulo_em`, `texto`, `em` (momento do toque), `seta_em` |
| `chat` | grupo/WhatsApp com mensagens | `nome`, `sub`, `em`, `antes: {texto, em}`, `mensagens: [{texto, em}]` |
| `grade` | "todos os cursos/produtos" | `rotulo`, `rotulo_em`, `em`, `quantidade`, `linhas` |
| `oferta` | 2 cards de condição (ex.: ∞ vitalício · 1× pague uma vez) | `itens: [{simbolo: "infinito"\|texto, titulo, sub, em}]` |

Cores, fontes e logo vêm de `marca/design.md`. Efeitos sonoros (pop, toque, passagem, sino) são gerados pelo próprio template, graves e baixos.

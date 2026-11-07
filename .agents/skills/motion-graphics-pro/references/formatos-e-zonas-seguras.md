# Formatos, zonas seguras e especificações de exportação

Valores em pixels do quadro final. "Zona segura" = onde texto, logo, preço e CTA devem ficar inteiros.

| Destino | Tamanho | Proporção | Zona segura (texto/CTA) | Observações |
|---|---|---|---|---|
| Instagram Reels / Stories | 1080×1920 | 9:16 | x 90–990, y 290–1500 | Topo: barra/ícones; base: legenda, @, áudio; direita (y>1000): botões curtir/comentar. Grade do perfil recorta 3:4 central; feed recorta 4:5 (y 285–1635). |
| TikTok | 1080×1920 | 9:16 | x 90–940, y 260–1480 | Coluna de ícones à direita é mais larga; legenda sobe mais. |
| YouTube Shorts | 1080×1920 | 9:16 | x 90–960, y 260–1440 | Título e botão de inscrever na base. |
| Anúncio Meta 9:16 (Reels/Stories Ads) | 1080×1920 | 9:16 | x 65–1015, y 270–1250 | Meta pede 14% topo e 35% base livres (CTA do anúncio cobre a base). |
| Feed Instagram/Facebook | 1080×1350 | 4:5 | margem 60 em todos os lados | Para vídeo 9:16, mantenha a mensagem no 4:5 central. |
| Feed quadrado | 1080×1080 | 1:1 | margem 60 | |
| YouTube / horizontal | 1920×1080 | 16:9 | title-safe 90% central (x 96–1824, y 54–1026) | Action-safe 93%. |

Ajuste `SAFE` no `index.html` conforme o destino; o `--audit` usa esse objeto.

## Tamanhos mínimos de texto (1080 de largura)
- Texto de leitura principal: ≥ 56 px (Oswald/Inter) — no celular vira ~15–17 pt.
- Rótulos de apoio com tracking: ≥ 30 px, nunca mais de 6 palavras.
- Título/hero: 150–330 px; largura máxima 820 px (com extrusão) em 9:16.
- Nada abaixo de 26 px.

## Exportação
- Vídeo: H.264 (`libx264`), `-pix_fmt yuv420p`, `-crf 18–20`, `-preset slow`, `-movflags +faststart`, 30 fps (ou 60 fps para conteúdo muito rápido), CFR.
- Áudio: AAC 192 kbps, 48 kHz, estéreo. Loudness alvo **−14 LUFS integrado, true peak ≤ −1 dBTP** (redes sociais). Normalizar:
  `ffmpeg -i in.wav -af loudnorm=I=-14:TP=-1:LRA=11 out.wav`
- Tamanho: ideal < 100 MB; 30 s ≈ 15–30 MB.
- Duração: Reels até 90 s (ads 15–30 s rendem melhor); hook nos 3 primeiros segundos.
- Capa (cover): exporte um quadro de leitura forte (`--stills`) como JPG 1080×1920 com o título dentro do 3:4 central.
- Entregue também versão **sem texto/sem CTA** (clean) se o cliente for legendar na plataforma, e uma versão **muda com legendas** se houver locução.

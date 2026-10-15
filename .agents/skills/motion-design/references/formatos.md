# Formatos e faixas seguras

**Padrão do kit:** 1080×1920 com texto, logo, preço e CTA em **x 110–930, y 470–1430**. Essa faixa sobrevive à interface do Reels e ao recorte 4:5 do feed. Use os valores abaixo só quando o aluno pedir outro destino (px do quadro final).

| Destino | Tamanho | Texto e CTA dentro de | Observação |
|---|---|---|---|
| Reels / Stories (+ feed) | 1080×1920 | x 110–930, y 470–1430 | padrão do kit; a grade do perfil recorta 3:4 |
| TikTok | 1080×1920 | x 90–940, y 260–1480 | a coluna de ícones à direita é mais larga |
| YouTube Shorts | 1080×1920 | x 90–960, y 260–1440 | título e botão de inscrever na base |
| Anúncio Meta 9:16 | 1080×1920 | x 65–1015, y 270–1250 | o CTA do anúncio cobre a base |
| Feed 4:5 | 1080×1350 | margem de 60 px | |
| Quadrado | 1080×1080 | margem de 60 px | |
| YouTube 16:9 | 1920×1080 | x 96–1824, y 54–1026 | |

Se o vídeo vai para Reels **e** feed, fique na faixa do kit.

## Tamanhos mínimos (largura 1080)
- Texto principal ≥ 56 px; rótulos ≥ 30 px e com até 6 palavras; nada abaixo de 26 px.
- Título com extrusão ou efeito: até ~820 px de largura em 9:16.

## Exportação
H.264 `yuv420p`, 30 fps constantes (60 só para conteúdo muito rápido), AAC 48 kHz, −14 LUFS / −1 dBTP (`masterizar.mjs`), `+faststart`. Ideal abaixo de 100 MB (30 s ≈ 15–30 MB).

## Extras que o aluno pode pedir
- **Capa:** um quadro de leitura forte (`npx hyperframes snapshot --at <t> --describe false`) com o título dentro do 3:4 central.
- **Versão sem texto** (para legendar na plataforma) e **versão sem música** (mesmo ganho de efeitos da versão com música).

---
name: motion-design
description: Cria motion design (vinheta, abertura, anúncio animado, kinetic typography, explicação animada, encerramento com CTA) no HyperFrames — referência → direção em batidas → storyboard aprovado pelo aluno → componentes animados → revisão quadro a quadro — com a marca de marca/ e referências de referencias/ ou da biblioteca. Use quando o aluno pedir "motion", "animação", "vinheta", "vídeo animado", "intro", "logo animada", enviar referências visuais ou colar um pedido de motion da biblioteca.
---

# Motion design (referência → direção → storyboard → vídeo)

Motion bom nasce de direção, não de improviso. **Nada é construído antes do aluno aprovar o storyboard.**

## 1. Brief em uma mensagem
Leia `marca/design.md` e as referências: arquivos em `referencias/` e, se o pedido veio da biblioteca, o item citado (ID em `biblioteca/catalogo.json`; links com `node scripts/biblioteca.mjs listar --json`). Para estudar um vídeo de referência, baixe só ele — `node scripts/baixar-referencia.mjs "<link do Drive ou do post original>" <nome>` — e veja a folha com `node scripts/verificar.mjs <video> --rapido`. Escreva em 3 linhas o que torna a referência boa (ritmo, tipografia, transições, áudio), usando o [vocabulário de movimento](references/vocabulario.md).

Pergunte numa mensagem só o que faltar:
- objetivo e onde vai rodar (Reels, anúncio, Stories, YouTube, abertura de aula) — define formato e faixa segura ([formatos](references/formatos.md));
- texto exato, com a grafia final (acentos, maiúsculas), e o CTA;
- duração (padrão: 8–15 s) e se tem narração ou música;
- referências que gostou e que **não** gostou;
- entregáveis extras (versão sem texto, 4:5, 16:9).
Se faltar algo que não muda o resultado, siga com um padrão e diga qual escolheu.

## 2. Direção (antes de qualquer código)
- Divida o texto em **batidas de leitura**: uma ideia por batida; 1–2 palavras-chave por batida ganham tamanho, cor ou efeito; conectores ficam menores.
- Para cada cena: tempo, **entrada → leitura → saída**, a ideia visual e o efeito sonoro.
- **Uma metáfora visual por ideia** e um **fio condutor** que liga as transições (uma fita que varre a tela, o card que vira o próximo quadro, a câmera que atravessa um objeto).
- Arco de anúncio (15–30 s): gancho (0–3 s) → promessa → oferta → prova/benefícios → virada → CTA com pausa.
- Tempos de leitura: título do gancho legível desde o quadro 0 e por ≥ 1,3 s; palavra em foco ≥ 0,25 s; frase de 6–8 palavras ≥ 1,5 s; CTA parado ≥ 1 s. Alterne momentos cheios e respiros.
- Com música: marque as batidas (`npx hyperframes beats`) e ponha cortes e impactos nelas. Com narração, a voz manda no tempo.
- Sistema visual: cores da marca como variáveis (1 destaque + neutros), no máximo 3 famílias de fonte (display, ênfase, apoio), uma direção de luz e os mesmos materiais em todas as cenas.

## 3. Storyboard e aprovação
Crie `projetos/<nome>/` com `npx hyperframes init projetos/<nome> --non-interactive --example=blank --skill=general-video`, copie `marca/design.md` para lá como `design.md` e escreva o `BRIEF.md` com `storyboard: yes` e a direção do passo 2. Carregue a skill `hyperframes` e siga o fluxo de storyboard do `general-video`: plano de cenas com o blueprint/regras de animação citados por nome e a folha `storyboard.html` com os quadros-chave desenhados.

Antes de planejar qualquer efeito com nome (glitch, grão, brilho, confete, gráfico, mockup de celular), busque no catálogo: `npx hyperframes catalog --query "<efeito em português ou inglês>" --json`. Use bloco pronto quando existir.

Mostre ao aluno a folha do storyboard aberta no navegador + 1 linha por cena (o que aparece, quanto tempo, como entra e como sai). **Pare e espere** "aprovado" ou ajustes. Ajuste até aprovar.

## 4. Construir
Siga o storyboard aprovado à risca. Regras de ouro:
1. Nada de imagem parada "dando zoom": tudo é componente real (texto, card com espessura, ícone, número, botão) e cada parte anima sozinha.
2. Uma ação dominante por vez; o resto fica parado, esmaecido ou desfocado.
3. Toda transição é motivada por um objeto ou movimento (o fio condutor).
4. Anime o significado: "nunca mais" → risco na palavra; "atualizado" → barra de progresso; "pular de curso em curso" → bolinha que pula de palavra em palavra.
5. Cada palavra aparece uma vez, na hora certa: nada de letreiro repetido para encher.
6. Quadro 0 com conteúdo; blocos de leitura centrados perto de y≈950, dentro da faixa segura (x 110–930, y 470–1430).
7. Profundidade: fundo com textura ou brilho suave, plano médio com a mensagem, primeiro plano com detalhes. Nada parado por mais de ~1,5 s.

Como animar: [vocabulário de movimento](references/vocabulario.md) (curvas por papel, máscaras, impacto, odômetro, câmera) e a skill `hyperframes-animation`. Antes de depurar algo estranho, veja as [armadilhas conhecidas](references/armadilhas.md).

Áudio: cada efeito sonoro é ligado a um evento da timeline, com o pico no quadro do evento; poucos e discretos (busque com a skill `media-use`). Versão sem música usa o mesmo ganho de efeitos da versão com música.

## 5. Revisar, renderizar e entregar
Siga a skill `revisar-video` (composição, transições, leitura, arquivo, áudio). Depois: render `--quality delivery` → `node scripts/masterizar.mjs` (se houver áudio) → `node scripts/verificar.mjs saida/<nome>.mp4 --guias` → `saida/<nome>.mp4`.

Acabamento opcional, só para motion sem câmera: renderize a 60 fps e junte os quadros dois a dois (motion blur real; o render leva o dobro):
```bash
ffmpeg -i render60.mp4 -vf "tmix=frames=2,fps=30" -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a copy -movflags +faststart saida/<nome>.mp4
```
Abra o preview (`npx hyperframes preview --background`) e diga ao aluno que ele pode ajustar texto e tempo direto ali. Mudanças depois da entrega: versão nova (`<nome>-v2`) e a anterior fica até ele aprovar.

## 6. Guardar na biblioteca
```bash
node scripts/biblioteca.mjs guardar projetos/<nome> --titulo "<o que o motion anuncia>" --categoria motion --notas "<traço 1>; <traço 2>" [--referencia <ID da biblioteca>] [--pasta "<pasta que o aluno pediu>"]
```
Gera capa e prévia leve e o motion aparece em **Meus projetos** no feed. Rode de novo a cada versão aprovada.

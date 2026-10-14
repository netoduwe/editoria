---
name: motion-design
description: Cria motion design (vinheta, abertura, anúncio animado, kinetic typography, explicação animada, encerramento com CTA) no HyperFrames sempre a partir de um storyboard aprovado pelo aluno, usando a marca de marca/ e as referências de referencias/. Use quando o aluno pedir "motion", "animação", "vinheta", "vídeo animado", "intro", "logo animada" ou enviar referências visuais.
---

# Motion design (referência → storyboard → vídeo)

Motion bom nasce de direção, não de improviso. **Nada é construído antes do aluno aprovar o storyboard.**

## 1. Brief em uma mensagem
Leia `marca/design.md` e olhe tudo em `referencias/` (imagens: descreva o que tem de bom — tipografia, ritmo, cor, transições; vídeos: tire quadros com `node scripts/verificar.mjs <video> --rapido` e veja a folha). Depois pergunte, numa mensagem só, o que faltar:
- objetivo e onde vai rodar (Reels, anúncio, YouTube, abertura de aula);
- duração (padrão: 8–15 s) e formato (padrão: 1080×1920);
- texto exato que deve aparecer e o CTA;
- se tem narração/música ou é só motion com SFX.

## 2. Storyboard primeiro
Crie `projetos/<nome>/` com `npx hyperframes init projetos/<nome> --non-interactive --example=blank --skill=general-video`, copie `marca/design.md` para lá como `design.md` e escreva o `BRIEF.md` com `storyboard: yes`. Carregue a skill `hyperframes` e siga o fluxo de storyboard do `general-video`: plano de cenas com o blueprint/regras de animação citados por nome, e a folha `storyboard.html` com os quadros-chave desenhados.

Antes de planejar qualquer efeito com nome (glitch, grão, brilho, confete, gráfico, mockup de celular), busque no catálogo: `npx hyperframes catalog --query "<efeito em português ou inglês>" --json`. Use bloco pronto quando existir.

Mostre ao aluno: a folha do storyboard aberta no navegador + 1 linha por cena (o que aparece, quanto tempo, como entra). **Pare e espere** "aprovado" ou ajustes. Ajuste até aprovar.

## 3. Construir
Siga o storyboard aprovado à risca. Padrão de qualidade:
- tudo é elemento real e animável (texto, ícone, card, UI), nunca imagem estática "dando zoom";
- 2–3 eases diferentes por cena, entradas em cascata de 0,05–0,12 s, nada parado por mais de ~1,5 s;
- profundidade: fundo com textura/brilho suave, plano médio com a mensagem, primeiro plano com detalhes;
- título legível desde o primeiro quadro e por pelo menos 1,3 s; texto na faixa segura (x 110–930, y 470–1430);
- SFX curtos e discretos marcando entradas importantes (skill `media-use`).

## 4. Revisar e entregar
`npx hyperframes check` sem erros → snapshots no meio de cada cena → olhe e corrija → render `--quality delivery` → `node scripts/masterizar.mjs` (se houver áudio) → `node scripts/verificar.mjs` → `saida/<nome>.mp4`. Abra o preview (`npx hyperframes preview --background`) e diga ao aluno que ele pode ajustar texto e tempo direto ali.

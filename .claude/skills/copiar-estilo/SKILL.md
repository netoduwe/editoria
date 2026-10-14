---
name: copiar-estilo
description: Aprende o estilo de edição de um vídeo de referência (link do YouTube, Shorts, Instagram, TikTok ou arquivo) e o transforma numa receita reutilizável em estilos/<nome>.md — baixa, mede ritmo/cor/áudio, olha quadro a quadro, extrai tipografia, layouts, motion e gancho, e prova a cópia reproduzindo num vídeo do aluno e comparando. Use quando o aluno disser "copia esse estilo", "quero editar igual a esse vídeo", "faz no estilo desse criador" ou mandar um link de referência.
---

# Copiar estilo de edição (referência → receita → prova)

O objetivo não é "parecido": é uma receita com números que reproduz a **linguagem** da edição em qualquer vídeo do aluno, com a **identidade** do aluno. Cada parâmetro da receita precisa de uma fonte: **medido** (script), **observado** (quadro + tempo), **estimado** (medida aproximada na grade) ou **proposto** (lacuna preenchida por você). Nunca escreva "medido" sem medição.

Trabalhe em `referencias/estilos/<nome>/` (bastidores, fora do Git) e entregue `estilos/<nome>.md`.

## 1. Combinar o pedido (uma mensagem, só se faltar)
- 1 a 3 links. **Recomende 2–3 vídeos do mesmo criador/formato**: estilo é o que se repete; o que aparece em um só vídeo é conteúdo.
- Nome do estilo (padrão: `<perfil>-<formato>`, ex.: `nick-reels`).
- Foco, se o aluno quiser só uma parte: legenda, ritmo/cortes, motion/gráficos, cor, áudio. Padrão: tudo.

## 2. Baixar
```bash
node scripts/baixar-referencia.mjs "<link>" <nome>          # um por vídeo; nomes <nome>, <nome>-2, <nome>-3
```
Instagram/TikTok pedindo login → `--cookies-de firefox` **só com autorização do aluno** (dá acesso à conta dele; nunca mostre nem copie o conteúdo dos cookies). Plano B: o aluno salva o vídeo ou grava a tela, arrasta para `referencias/` e você roda o mesmo script com o caminho do arquivo. Em gravação de tela, ignore a interface do app (curtidas, legenda do post, barra).

## 3. Medir
```bash
node scripts/analisar-referencia.mjs referencias/estilos/<nome>/video.mp4 [--idioma pt]
```
Leia `analise/analise.md`: ritmo (cortes/min, plano médio, cortes no gancho), movimento (picos de animação/zoom), cor (brilho, contraste, saturação, temperatura, paleta, **destaques saturados**), áudio (loudness, pausas, trilha, batidas sonoras nos cortes), fala (ppm). Esses números já são **medidos**. Se a trilha der "inconclusivo", peça ao aluno para ouvir e dizer: tem música? que clima? tem whoosh/pop nas trocas? (você não ouve áudio).

## 4. Olhar como editor (nesta ordem)
Leia [references/olhar-de-editor.md](references/olhar-de-editor.md) e siga o checklist. Abra as folhas em `analise/folhas/`:
1. `gancho_0-3s_10qps.jpg` — o que existe no quadro 0, quando entra o primeiro texto, quantas mudanças até 3 s, qual a promessa.
2. `planos_*.jpg` — classifique **cada plano** (tabela `planos` do analise.json) num layout: rosto, split, card, print/evidência, gráfico, b-roll, texto cheio… Calcule % do tempo por layout e o padrão de alternância (ex.: "2 gráficos e volta ao rosto").
3. `cortes_*.jpg` — tipo de cada transição (seco, punch-in, whip, flash, fade, slide, máscara) e o que entra animado logo depois.
4. `legendas_*.jpg` + palavras listadas no analise.md — palavras por vez, sincronia, caixa, destaque, entrada/saída.
5. **De perto** com `quadro.mjs`, em 3–6 instantes representativos (legenda no rosto, legenda no split/gráfico, título, card, final):
   ```bash
   node scripts/quadro.mjs <video> <t> --grade --cor "x,y;x,y" --recorte x,y,l,a --seq 0.5
   ```
   `--grade` → posição e tamanho (converta com as fórmulas do checklist) · `--cor` → hex do texto, destaque, fundo · `--recorte` → identificar a fonte, contorno, sombra · `--seq` → contar quadros de uma entrada (duração e ease).
6. Transcrição (`analise/transcript.json`) — fórmula do gancho (pergunta, proibição, número, promessa), frases curtas ou longas, CTA.

Registre cada achado em `referencias/estilos/<nome>/evidencias.md`: `[observado] legenda Inter-like 800, caixa normal, y≈1350 no rosto — quadro_8s20_grade.png`.

Com 2–3 referências: analise todas e mantenha na receita **o que se repete** (invariantes); o que muda vira faixa (ex.: plano médio 1,8–2,4 s) ou fica de fora.

## 5. Separar estilo × conteúdo × identidade
| Copiar (estilo) | Não copiar (conteúdo) | Trocar pela do aluno (identidade) |
|---|---|---|
| ritmo, tamanho dos planos, corte de silêncio · gramática de layouts · anatomia da legenda · hierarquia tipográfica · tipos e tempos de animação · transições · uso de SFX · tratamento de imagem (claro/escuro, contraste) · fórmula de gancho e de CTA | assunto, falas, dados, número de itens da lista, prints e produtos citados | logo, @, mascote, rosto, bordões, música e SFX da referência, ícones/ilustrações próprios dele, cores de marca (mantenha o **papel** da cor, use a cor do aluno), fontes pagas (→ equivalente livre) |

Nunca coloque imagem, áudio, música ou asset da referência no vídeo do aluno. A referência é só estudo.

## 6. Escrever a receita
Copie [references/modelo-estilo.md](references/modelo-estilo.md) para `estilos/<nome>.md` e preencha **todos** os campos: bloco YAML com os números (é o que o `editar-video` executa) + texto com as regras de decisão (quando usar cada layout, o que nunca fazer).
- Fontes: identifique pela anatomia ([references/fontes-equivalentes.md](references/fontes-equivalentes.md)) e baixe a equivalente: `node scripts/baixar-fonte.mjs "Montserrat" 800,900`.
- Cores: registre o hex **medido** de cada papel (fundo claro, fundo escuro, texto, destaque 1/2) e diga qual papel da `marca/design.md` substitui cada um.
- Tempos em segundos; posições e tamanhos em px de 1080×1920 (converta se a referência for 16:9 e o aluno quiser vertical, explicando a adaptação).

## 7. Provar (obrigatório antes de dizer "pronto")
1. Peça um vídeo curto do aluno (10–30 s falando) em `entrada/`. Sem vídeo, entregue a receita marcada como **não validada**.
2. Edite com a skill `editar-video` no estilo novo, em `projetos/<nome>-teste/`.
3. Meça o teste e compare:
   ```bash
   node scripts/analisar-referencia.mjs projetos/<nome>-teste/render.mp4
   node scripts/comparar-analises.mjs referencias/estilos/<nome>/analise/analise.json projetos/<nome>-teste/analise/analise.json
   node scripts/lado-a-lado.mjs referencias/estilos/<nome>/video.mp4 projetos/<nome>-teste/render.mp4 "<tRef:tTeste,...>" projetos/<nome>-teste/lado-a-lado.jpg
   ```
   Escolha pares equivalentes: gancho, legenda no rosto, cada layout, um card/gráfico, o final.
4. Para cada ✗ e cada diferença visível: **erro de reprodução** → corrija a receita e/ou a composição; **adaptação intencional** (marca do aluno, material diferente, ex.: gravação noturna, sem prints) → registre em "Adaptações". Repita até 3 rodadas.
5. Critério de pronto: ritmo (plano médio, cortes/min, gancho, animações/min) dentro da tolerância; anatomia da legenda igual no lado a lado; todos os layouts principais presentes; cores nos papéis certos. Registre a tabela final na seção "Validação" da receita.

## 8. Entregar
Diga ao aluno, curto: o DNA do estilo em 5 linhas, o vídeo de teste (`projetos/<nome>-teste/` → copie o MP4 final para `saida/`), o placar da comparação, o que foi adaptado e por quê, e como usar: **"edita entrada/x.mp4 no estilo <nome>"**.

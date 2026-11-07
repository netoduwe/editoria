# Solução de problemas (bugs reais já encontrados)

| Sintoma | Causa | Correção |
|---|---|---|
| Objeto deslocado/cortado na lateral | `xPercent:-50` **e** `margin-left:-w/2` juntos | Use só um; liste exceções em `gsap.set([...],{xPercent:0})` |
| Palavra "saiu" mas aparece na borda | Saída com `y:+900` ainda dentro dos 1920 px | Saia além da tela **e** `opacity:0` |
| Faixa do objeto visível antes da entrada | Estado inicial fora da tela, mas projeção 3D invade a borda | `tl.set(el,{opacity:0},0)` até o início da entrada |
| Texto medido errado / layout pula | Medição antes das fontes carregarem | `await document.fonts.load(...)` antes de `build()`; renderer espera `window.__ready` |
| Camada de brilho desalinhada das letras | Letras divididas em spans perdem kerning | Camada de brilho com `font-kerning:none` (mesmo avanço) |
| Faixa escura cortando placa 3D | Plano 3D intersectando piso/glow na mesma cena `preserve-3d` | Cena `transform-style:flat` com `perspective` própria; 3D só dentro do objeto |
| 3D achatado | `filter`/`opacity<1` em pai com filhos 3D | Aplique filtro/opacidade em elementos sem filhos 3D |
| Odômetro mostra dígitos fora | Animando o container que recorta | Recorte (`.odo`) fixo; anime a coluna interna (`.col`) com `yPercent` |
| Camada de cor travada após cena | Propriedade setada dentro de função de cena que só roda quando a cena está visível | Lógica global (fora do `if` da cena) no `renderAt` |
| Texto itálico cortado no clip/máscara | `mask-image`/`background-clip` usam a border-box | `padding:.1em .18em .24em` no elemento |
| Render lento | Muitos filtros/blur grandes | Limite blur a elementos pequenos; 60 fps × 30 s ≈ 20 min é normal |
| `pgrep` nunca termina espera | O próprio comando casa com o padrão | Use marcador `echo done >> log` e `grep -q done` |
| Push recusado | Branch remoto avançou (PR mergeado) | `git fetch` + `git merge` (sem rebase/force) e push |
| Bolinha parada antes de um traço ser desenhado | `stroke-linecap:round` com dash de comprimento zero | `opacity:0` até o início do desenho |
| Alça do cadeado some/voa ao girar | `transformOrigin` em px num elemento SVG | `svgOrigin` em coordenadas do viewBox |
| Texto do bloco anterior aparece na borda após rolagem | Container rolou mas o bloco ficou visível | Fade-out do bloco junto com a rolagem |
| Tela vazia logo depois da fita | Entrada da cena começa depois do corte | Comece a entrada antes do corte (sob a transição) |
| Tracking enorme no fim da animação | `letterSpacing` em `em` no tween | Use px |
| SFX exagerados / sem música fica alto | Ganhos altos, estalos, saturação, normalizar SFX isolado | SFX suaves, ganho fixo, mesmo ganho da mixagem |
| Push recusado com erro de LFS | `.zip` vai para Git LFS e o servidor LFS recusa | Não versione o zip (`.gitignore`); a pasta já está no git |

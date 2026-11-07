# Acessibilidade, segurança e QA final

## Segurança visual
- **Flashes:** no máximo 3 flashes por segundo (WCAG 2.3.1). Flash forte cobre ≤ 25% da tela ou usa opacidade ≤ 0,5. Evite vermelho saturado piscando.
- Tremor de câmera: ≤ 25 px, decaimento ≤ 0,5 s, só em impacto.
- Sem padrões listrados finos piscando (efeito moiré/estroboscópico).

## Legibilidade
- Contraste ≥ 4.5:1 (texto ≥ 4.5; títulos grandes ≥ 3:1). Texto sobre metal claro usa tinta escura (#06131C).
- Texto em foco nunca com blur, nunca girando durante a leitura, nunca abaixo de 26 px.
- Se houver locução: legendas queimadas (burn-in) com fundo/contorno, dentro da zona segura, sincronizadas palavra a palavra.
- Revise como "som desligado": a mensagem precisa ser entendida só com o texto (85% assiste mudo).

## Ortografia e copy
- Compare caractere a caractere com a copy aprovada (acentos: ç, ã, é, í; maiúsculas; ponto final).
- Números/datas conferidos (11/11, 2028).

## Checklist técnico
- [ ] `node render.mjs --audit` → só transições < 0,2 s
- [ ] Folha de quadros com guias revisada em 270 px de largura (escala celular)
- [ ] Sequências de 0,1 s em toda transição: sem sobreposição indevida, pulo, cintilação, texto cortado
- [ ] Nenhum elemento "esquecido" fora de cena (saídas com `opacity:0`)
- [ ] Primeiro quadro não é preto puro por mais de 0,2 s
- [ ] Último quadro é um quadro de leitura (loop do Reels recomeça bem)
- [ ] Áudio −14 LUFS / −1 dBTP, sem clipping, SFX alinhados ao quadro do evento
- [ ] `ffprobe`: 1080×1920, 30 fps, duração exata, faixa de áudio presente
- [ ] Arquivos pesados fora do git (`out/`)

## Iteração com o cliente
- Entregue v1 → colete feedback → registre o que mudou (changelog curto na resposta).
- Mudanças pedidas para "uma cena" não podem quebrar as outras: refaça o `--audit` e a folha completa a cada versão.
- Nomeie versões (`motion-v2.mp4`) e guarde a anterior até a aprovação.

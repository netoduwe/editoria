'use strict';
// Local preferences never change the shared catalog or its files on Drive.
const HIDDEN_KEY=KEY+':ocultos';
let hiddenIds=new Set();
try{hiddenIds=new Set(JSON.parse(localStorage.getItem(HIDDEN_KEY)||'[]').filter(id=>byId.has(id)));}catch(error){}
state.situacao='ativo';
const studentCard=card,studentRender=render,studentDetail=fillDetail;
const style=document.createElement('style');
style.textContent='.poster{display:block;text-align:inherit}.library-extra{display:block;text-align:center;width:100%;font-size:11px;margin-top:8px;padding:8px;color:var(--muted);background:transparent}.drive-label{position:absolute;right:10px;bottom:10px;background:var(--lime);color:var(--bg);padding:7px 9px;border-radius:20px;font-size:10px;font-weight:700}.library-status{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin:0 0 20px;font-size:11px;color:var(--muted)}.library-status select{background:var(--surface);color:var(--ink);padding:8px;border:1px solid var(--line);border-radius:8px}.library-status a{color:var(--lime)}';
document.head.appendChild(style);
const libraryToolbar=document.createElement('section');libraryToolbar.className='library-status';
libraryToolbar.innerHTML='<span>Suas avaliações ficam neste navegador.</span><select id="library-situation" aria-label="Minha biblioteca"><option value="ativo">Minha biblioteca</option><option value="removidos">Removidos por mim</option></select><a href="README.md" target="_blank" rel="noopener">Como usar ↗</a>';
document.querySelector('.toolbar').after(libraryToolbar);
function externalLink(item){return item.video_url||item.metadados?.url||null;}
card=function(raw){
 let html=studentCard(raw);const item=effective(raw),url=externalLink(item),hidden=hiddenIds.has(item.id);
 if(item.tipo==='video'){
  if(url)html=html.replace(/<button class="poster"[^>]*>([\s\S]*?)<\/button>/,'<a class="poster" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer" aria-label="Assistir '+esc(item.nome)+' no Drive">$1<span class="drive-label">▶ Assistir no Drive</span></a>');
  else html=html.replace('</h2>','</h2><p class="small-muted">Link do vídeo em preparação.</p>');
 }
 const actions=hidden?'<button class="library-extra" data-restore="'+item.id+'">Restaurar na minha biblioteca</button>':
  '<button class="library-extra" data-reference="'+item.id+'">Usar como referência ↗</button><button class="library-extra" data-hide="'+item.id+'">Remover da minha biblioteca</button>';
 return html.replace(/<\/div><\/article>$/,actions+'<button class="library-extra" data-open="'+item.id+'">Ver detalhes ↗</button></div></article>');
};
render=function(){
 for(const row of rows)row.situacao=hiddenIds.has(row.id)?'oculto':'ativo';
 studentRender();
 const visible=rows.filter(i=>!hiddenIds.has(i.id));
 document.querySelectorAll('.tab').forEach(button=>{const count=button.querySelector('small');if(count)count.textContent=(button.dataset.type?visible.filter(i=>i.tipo===button.dataset.type).length:visible.length).toLocaleString('pt-BR');});
};
fillDetail=function(id){
 studentDetail(id);const item=effective(byId.get(id)),url=externalLink(item);
 const panel=document.createElement('div');panel.className='detail-controls';panel.style.marginBottom='18px';
 panel.innerHTML=(url?'<a class="detail-link" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+(item.tipo==='video'?'Assistir no Drive':'Abrir fonte')+' ↗</a>':'')+'<button data-reference="'+id+'">Usar como referência ↗</button>';
 if(item.poster){const image=document.createElement('img');image.className='preview-media';image.src=item.poster;image.alt=item.nome;$('#detail-body').prepend(image);}
 $('#detail-body').prepend(panel);
};
document.querySelector('#library-situation').onchange=event=>{state.situacao=event.target.value;state.limit=48;render();};
document.addEventListener('click',async event=>{
 const hide=event.target.closest('[data-hide]'),restore=event.target.closest('[data-restore]'),reference=event.target.closest('[data-reference]');
 if(hide||restore){const id=hide?.dataset.hide||restore.dataset.restore;if(hide)hiddenIds.add(id);else hiddenIds.delete(id);try{localStorage.setItem(HIDDEN_KEY,JSON.stringify([...hiddenIds]));}catch(error){toast('O navegador não conseguiu guardar essa alteração.');}render();return;}
 if(!reference)return;
 const item=effective(byId.get(reference.dataset.reference)),url=externalLink(item);
 const request='Use como referência de edição e motion: '+item.nome+'. Catálogo: biblioteca/catalogo.json; ID: '+item.id+'.'+
  (url?' Fonte: '+url+'.':' Link do vídeo ainda não configurado; confira a capa e peça o arquivo de referência se precisar analisar o movimento.')+
  ' Estude o ritmo, tipografia, layouts, transições e áudio. Preserve a minha marca em marca/design.md.'+
  (item.tipo==='video'&&url?' Se precisar analisar quadro a quadro, baixe somente esta referência para referencias/estilos/. Se o Drive pedir acesso, solicite o arquivo ao aluno.':'')+
  ' Use a referência só para estudar o estilo; não reutilize imagem, áudio ou assets dela no meu vídeo.';
 try{await navigator.clipboard.writeText(request);toast('Pedido copiado. Cole no Claude Code ou Codex junto do seu vídeo.');}
 catch(error){toast('Não foi possível copiar. Abra os detalhes e copie o link da referência.');}
});
render();

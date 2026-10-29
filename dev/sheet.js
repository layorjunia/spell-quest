// node dev/sheet.js allies   -> .work/sheet-allies.html ; then screenshot with headless Chrome
// A contact sheet is how art gets checked here: render it and LOOK (see memory verify-generated-art).
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const kind = process.argv[2] || 'allies';
const files = ['art.js', 'data-allies.js'].concat(fs.existsSync(path.join(root, 'art-more.js')) ? ['art-more.js'] : []);
const html = (body, w) => `<!doctype html><meta charset=utf-8><style>body{margin:0;background:#2a1f55;font:12px system-ui;color:#fff}
.g{display:grid;grid-template-columns:repeat(${w},1fr);gap:6px;padding:8px}.c{background:#3a2e72;border-radius:10px;padding:4px;text-align:center}
.c svg{width:100%;display:block}.c b{display:block;font-size:11px}</style>` +
  files.map(f => `<script>${fs.readFileSync(path.join(root, f), 'utf8').replace(/<\/script/g, '<\\/script')}</script>`).join('') + body;
let body = '';
if (kind === 'heroes') {
  body = `<div class=g id=g></div><script>
    const g=document.getElementById('g');
    for(const h of Art.HEROES){ const c=document.createElement('div');c.className='c';c.innerHTML=Art.hero(h)+'<b>'+h.n+' · '+h.cls+'</b>';g.appendChild(c);}
    for(let i=0;i<6;i++){ const c=document.createElement('div');c.className='c';c.innerHTML=Art.hero(Art.HEROES[0],{skin:i})+'<b>skin '+i+'</b>';g.appendChild(c);}
    for(const [i,h] of [[0,Art.HEROES[3]],[4,Art.HEROES[7]],[5,Art.HEROES[1]],[3,Art.HEROES[9]],[1,Art.HEROES[5]],[2,Art.HEROES[10]]]){ const c=document.createElement('div');c.className='c';c.innerHTML=Art.hero(h,{skin:i})+'<b>'+h.n+' skin '+i+'</b>';g.appendChild(c);}
  </script>`;
  fs.writeFileSync(path.join(root, '.work/sheet-heroes.html'), html(body, 6));
}
if (kind === 'bosses') {
  body = `<div class=g id=g></div><script>
    const g=document.getElementById('g');
    for(const b of Art.BOSSES){ const c=document.createElement('div');c.className='c';c.innerHTML=Art.boss(b.k)+'<b>'+b.n+'</b>';g.appendChild(c);}
  </script>`;
  fs.writeFileSync(path.join(root, '.work/sheet-bosses.html'), html(body, 4));
}
if (kind === 'misc') {
  body = `<div class=g id=g></div><script>
    const g=document.getElementById('g');
    for(const n of ['coin','gem','flame','xp','heart','key','lock','trophy','shield','book','bolt','check','speaker','hint','sword']){ const c=document.createElement('div');c.className='c';c.innerHTML='<div style="width:64px;margin:auto">'+Art.icon(n)+'</div><b>'+n+'</b>';g.appendChild(c);}
    for(const t of ['bronze','silver','gold']){ const c=document.createElement('div');c.className='c';c.innerHTML=Art.crate(t)+'<b>'+t+'</b>';g.appendChild(c);}
    for(let i=1;i<=8;i++){ const c=document.createElement('div');c.className='c';c.innerHTML='<div style="width:72px;margin:auto">'+Art.world(i)+'</div><b>world '+i+'</b>';g.appendChild(c);}
    const gears=[['cap','shades','cape'],['crown','goggles',null],['wizard','shades',null],['headphones',null,'cape']];
    const D=ALLIES; let i=0; for(const [hat,eyes,back] of gears){ for(const d of [D[0],D[3],D[6],D[9],D[12]]){ if(i++>=19)break; const c=document.createElement('div');c.className='c';c.innerHTML=Art.ally(d,1,{hat,eyes,back})+'<b>'+d.n+' '+hat+(eyes?'+'+eyes:'')+(back?'+'+back:'')+'</b>';g.appendChild(c);}}
  </script>`;
  fs.writeFileSync(path.join(root, '.work/sheet-misc.html'), html(body, 8));
}
if (kind === 'allies') {
  body = `<div class=g id=g></div><script>
    const g=document.getElementById('g');
    for(const d of ALLIES){ for(const f of [1,2,3]){ const c=document.createElement('div');c.className='c';
      c.innerHTML=Art.ally(d,f)+'<b>'+d.n+' '+f+' · '+d.r+'</b>'; g.appendChild(c);} }
  </script>`;
  fs.writeFileSync(path.join(root, '.work/sheet-allies.html'), html(body, 9));
}
console.log('ok');

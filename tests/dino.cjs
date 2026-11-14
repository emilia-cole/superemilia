const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(process.argv[2]||'public/dino/index.html','utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
// Load the game's logic without a browser: the page skips its screen code when there is no document.
function load(storage={}){const sandbox={console,Math,Number,JSON,Array,Object,String,Set,localStorage:{getItem:k=>storage[k]??null,setItem:(k,v)=>storage[k]=v}};vm.createContext(sandbox);vm.runInContext(script,sandbox);return code=>vm.runInContext(code,sandbox)}
let checks=0;const test=(name,fn)=>{fn();console.log('✓ '+name);checks++};

test('There are 12 animals in 4 dig sites, 3 in each',()=>{
 const run=load();assert.equal(run('CREATURES.length'),12);assert.equal(run('SITES.length'),4);assert(run('SITES.every(s=>CREATURES.filter(c=>c.site===s.id).length===3)'));
 assert.equal(run('new Set(CREATURES.map(c=>c.id)).size'),12);assert(run('SITES.every((s,i)=>i===0||s.price>SITES[i-1].price)'));
});
test('A dig hides every bone piece and some treasures in different spots, with a few rocks',()=>{
 const run=load();for(const s of ['desert','ice','sea','volcano'])for(let k=0;k<30;k++){run(`var d=makeDig('${s}')`);const g=run(`site('${s}').grid[0]*site('${s}').grid[1]`);
  assert.equal(run('d.pieces.length'),g);assert(run('d.treasures.length>=2&&d.treasures.length<=3'));const cells=run('[...d.pieces,...d.treasures].map(x=>x.cell)');assert.equal(new Set(cells).size,cells.length,'all in different cells');
  assert.equal(run('d.cells.filter(c=>c.rock).length'),run('ROCKS'));assert(run('d.treasures.every(t=>!d.cells[t.cell].rock)'),'treasures are never under rocks')}
});
test('The brush clears dirt but not rocks; the pickaxe breaks rocks',()=>{
 const run=load();run('var d=makeDig("desert");d.cells.forEach(c=>{c.rock=false;c.hp=DIRT_HP});d.cells[0].rock=true;d.cells[0].hp=ROCK_HP');
 let r=run('digAt(d,.9,.5,1,"brush")');assert(r.blocked);assert.equal(run('d.cells[0].hp'),run('ROCK_HP'));assert(run('d.cells[1].hp<DIRT_HP'),'dirt next to the rock wears away');
 run('for(let i=0;i<5;i++)digAt(d,1.5,.5,1,"brush")');assert(run('isFree(d,1)'));
 run('for(let i=0;i<5;i++)digAt(d,.5,.5,1,"pick")');assert(run('isFree(d,0)&&!d.cells[0].rock'));assert(run('d.cells[55].hp===DIRT_HP'),'far away dirt is untouched');
});
test('Pieces snap only near their own spot',()=>{
 const run=load();assert(run('snapOK(50,50,52,49,20,20)'));assert(!run('snapOK(50,50,62,50,20,20)'));assert(run('snapOK(40,30,40,30+7,10,15)'));
});
test('Finishing pays more for a new animal, treasures pay coins, and digs prefer new animals',()=>{
 const run=load();run('var s=defaultSave()');assert.deepEqual({...run("finishDig(s,'trex')")},{coins:15,isNew:true});assert.deepEqual({...run("finishDig(s,'trex')")},{coins:8,isNew:false});
 assert(run('s.coins===23&&s.digs===2&&s.found.trex===2&&foundCount(s)===1'));assert.equal(run("addTreasure(s,'gem')"),5);assert(run('s.treasures===1&&s.coins===28'));
 let fresh=0;for(let k=0;k<400;k++)if(run("pickCreature(s,'desert')")!=='trex')fresh++;assert(fresh>300,'mostly new animals');
 assert(run("CREATURES.filter(c=>c.site==='ice').map(c=>c.id).includes(pickCreature(s,'ice'))"));
});
test('Dig sites cost coins, and saves ignore broken or unknown data',()=>{
 const run=load();run('var s=defaultSave();s.coins=50');assert(run("siteOpen(s,'desert')&&!siteOpen(s,'ice')"));assert(!run("buySite(s,'sea')"));assert(run("buySite(s,'ice')&&s.coins===10&&siteOpen(s,'ice')"));assert(!run("buySite(s,'ice')"));
 const r2=load({superEmiliaDino:JSON.stringify({coins:12,digs:3,found:{trex:2,yeti:1,bronto:-1},sites:['ice','ice','moon','desert'],here:'volcano',sound:false})});r2('var t=loadSave()');
 assert(r2("t.coins===12&&t.digs===3&&t.found.trex===2&&!('yeti' in t.found)&&!('bronto' in t.found)&&t.here==='desert'&&t.sound===false"));assert.deepEqual([...r2('t.sites')],['ice']);
 assert(load({superEmiliaDino:'{oops'})('loadSave().coins===0'));
});
console.log(checks+' dino checks passed.');

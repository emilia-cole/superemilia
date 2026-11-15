const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(process.argv[2]||'public/paint/index.html','utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
// Load the game's logic without a browser: the page skips its screen code when there is no document.
function load(storage={}){const sandbox={console,Math,Number,JSON,Array,Object,String,Set,localStorage:{getItem:k=>storage[k]??null,setItem:(k,v)=>storage[k]=v}};vm.createContext(sandbox);vm.runInContext(script,sandbox);return code=>vm.runInContext(code,sandbox)}
let checks=0;const test=(name,fn)=>{fn();console.log('✓ '+name);checks++};

test('There are 10 pictures, 15 paints, and 22 stickers',()=>{
 const run=load();assert.equal(run('PICTURES.length'),10);assert.equal(run('COLORS.length'),15);assert.equal(run('STICKERS.length'),22);
 assert(run('PICTURES.every(p=>regionCount(p)>=8)'),'every picture has plenty to color');assert.equal(run('new Set(PICTURES.map(p=>p.id)).size'),10);
});
test('Every picture draws as SVG with one paintable part per region',()=>{
 const run=load();for(let i=0;i<10;i++){const svg=run(`svgMarkup(blankPainting(PICTURES[${i}].id),'t')`);assert(svg.startsWith('<svg viewBox="0 0 400 300"'));
  assert.equal((svg.match(/class="region"/g)||[]).length,run(`regionCount(PICTURES[${i}])`));assert(!svg.includes('NaN')&&!svg.includes('undefined'))}
});
test('Painting fills parts with colors, glitter, and rainbow paint',()=>{
 const run=load();run('var pt=blankPainting("rainbow")');assert(run('fillRegion(pt,0,7,false)'));assert(!run('fillRegion(pt,0,7,false)'),'same paint again changes nothing');
 assert(run('fillRegion(pt,0,7,true)'));assert(!run('fillRegion(pt,99,1,false)')&&!run('fillRegion(pt,1,99,false)'));
 run('fillRegion(pt,1,14,false)');const svg=run('svgMarkup(pt,"x")');assert(svg.includes('fill="#3b82f6"')&&svg.includes('url(#sp-x)')&&svg.includes('url(#rb-x)'));
 assert(!run('isDone(pt)'));run('pt.fills.forEach((_,i)=>fillRegion(pt,i,2,false))');assert(run('isDone(pt)'));
});
test('Stickers go on the picture, up to 30',()=>{
 const run=load();run('var pt=blankPainting("cat")');assert(run('addSticker(pt,"⭐",100.4,50.6)'));assert.deepEqual({...run('pt.stickers[0]')},{e:'⭐',x:100,y:51});
 for(let i=0;i<29;i++)run('addSticker(pt,"💖",10,10)');assert(!run('addSticker(pt,"💖",10,10)'));assert(run('svgMarkup(pt).includes(">⭐</text>")'));
});
test('Hanging a painting fills the gallery and unlocks pictures and stickers',()=>{
 const run=load();run('var s=defaultSave()');assert.equal(run('picturesOpen(0).length'),4);assert.equal(run('stickersOpen(0).length'),10);assert.equal(run('hangPainting(s)'),null,'nothing painted yet');
 run('s.current.fills.forEach((_,i)=>fillRegion(s.current,i,14,false));addSticker(s.current,"⭐",5,5)');const r=run('hangPainting(s)');
 assert.equal(r.newPic,'cat');assert.deepEqual([...r.newStickers],['🦄','🐶']);assert(r.done);assert(run('s.hung===1&&s.gallery.length===1&&s.finished[0]==="rainbow"&&s.rainbow===1&&s.stickersUsed===1'));
 assert(run('isEmpty(s.current)&&s.current.pic==="rainbow"'),'a fresh page after hanging');run('fillRegion(s.current,0,1,false)');assert(run('hangPainting(s).done===false&&s.finished.length===1'));
 assert.equal(run('picturesOpen(99).length'),10);assert.equal(run('stickersOpen(99).length'),22);
});
test('Saves keep paintings and ignore broken or unknown data',()=>{
 const run=load({superEmiliaPaint:JSON.stringify({hung:2,finished:['rainbow','moon','rainbow'],stickersUsed:3,gallery:[{pic:'cat',fills:[{c:3,g:true},{c:99},null],stickers:[{e:'⭐',x:500,y:-4},{e:'💩',x:1,y:1}]},{pic:'yeti'}],current:{pic:'castle',fills:[]},sound:false})});
 run('var s=loadSave()');assert(run('s.hung===2&&s.stickersUsed===3&&s.sound===false&&s.finished.length===1&&s.gallery.length===1'));
 assert(run('s.gallery[0].fills[0].c===3&&s.gallery[0].fills[0].g&&s.gallery[0].fills[1]===null&&s.gallery[0].stickers.length===1&&s.gallery[0].stickers[0].x===400&&s.gallery[0].stickers[0].y===0'));
 assert(run('s.current.pic==="rainbow"'),'a locked picture is not kept as the current one');assert(load({superEmiliaPaint:'{oops'})('loadSave().hung===0'));
});
console.log(checks+' paint checks passed.');

const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(process.argv[2]||'public/studio/index.html','utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
// Load the game's logic without a browser: the page skips its screen code when there is no document.
function load(storage={}){const sandbox={console,Math,Number,JSON,Array,Object,String,Set,parseInt,localStorage:{getItem:k=>storage[k]??null,setItem:(k,v)=>storage[k]=v}};vm.createContext(sandbox);vm.runInContext(script,sandbox);return code=>vm.runInContext(code,sandbox)}
let checks=0;const test=(name,fn)=>{fn();console.log('✓ '+name);checks++};

test('Every show theme has things in the wardrobe the judges love, and you start with a full outfit',()=>{
 const run=load();
 assert(run('THEMES.every(t=>t.tags.every(tag=>Object.values(CATS).some(list=>list.some(it=>it.tags&&it.tags.includes(tag)))))'));
 assert(run('THEMES.every(t=>[HATS,TOPS,SHOES,ACCS,COLORS].every(list=>list.some(it=>it.tags.some(x=>t.tags.includes(x)))))'),'each theme has a matching hat, top, shoes, extra and color');
 run('var s=defaultSave()');assert(run("Object.entries({model:'model',hat:'hat',top:'top',bottom:'bottom',shoes:'shoes',acc:'acc',topColor:'color',bottomColor:'color',shoesColor:'color',pattern:'pattern'}).every(([k,cat])=>owns(s,cat,s.outfit[k]))"));
 assert(run("owns(s,'hat','bow')&&!owns(s,'hat','crown')"));
});
test('Dressing for the theme earns high scores from the judges',()=>{
 const run=load(),mid=()=>0.6;
 run("var royal=THEMES.find(t=>t.id==='royal'),beach=THEMES.find(t=>t.id==='beach')");
 run("var fancy={model:'unicorn',hat:'crown',top:'gown',topColor:'gold',bottom:'pants',bottomColor:'blue',shoes:'fancy',shoesColor:'gold',acc:'wand',pattern:'sparkle'}");
 const great=run('scoreOutfit(fancy,royal,()=>0.6)');assert(great.every(n=>n>=8),'royal outfit at the royal ball: '+great);assert.equal(run('starsFor('+great.reduce((a,b)=>a+b)+')'),3);
 const offTheme=run('scoreOutfit(fancy,beach,()=>0.6)');assert(offTheme[0]<great[0],'the theme judge notices');
 run("var plain={model:'kitty',hat:'none',top:'tee',topColor:'red',bottom:'pants',bottomColor:'green',shoes:'sneakers',shoesColor:'yellow',acc:'none',pattern:'plain'}");
 const meh=run('scoreOutfit(plain,royal,()=>0.1)');assert(meh.reduce((a,b)=>a+b)<19,'a plain off-theme outfit gets 1 star: '+meh);
 assert(run("goesWith('pink','purple')&&goesWith('purple','pink')&&goesWith('red','red')&&!goesWith('red','green')"));
 for(let k=0;k<200;k++){const sc=run('scoreOutfit({...fancy,top:TOPS[Math.floor(Math.random()*8)].id,hat:HATS[Math.floor(Math.random()*9)].id},THEMES[Math.floor(Math.random()*9)])');assert(sc.length===3&&sc.every(n=>n>=3&&n<=10))}
 assert(run("themeMatches({...fancy,top:'tee',bottom:'shorts'},royal).some(m=>m.cat==='bottom')===false&&themeMatches({...fancy,top:'tee'},royal).some(m=>m.cat==='bottom')"),'pants are fancy but shorts are not');
 assert(run("themeMatches(fancy,royal).every(m=>m.cat!=='bottom')"),'a gown hides the bottoms from the judges');
});
test('Shows pay coins, remember the best stars, and coins buy new clothes',()=>{
 const run=load();run('var s=defaultSave()');
 let r=run("recordShow(s,'royal',[9,9,9])");assert(r.stars===3&&r.coins===37&&r.better);assert(run("s.coins===52&&s.shows===1&&s.best.royal===3"));
 r=run("recordShow(s,'royal',[5,6,6])");assert(r.stars===1&&!r.better&&r.coins===17);assert.equal(run('s.best.royal'),3);
 assert.equal(run('starsFor(19)'),2);assert.equal(run('starsFor(18)'),1);assert.equal(run('starsFor(25)'),3);
 assert(run("buy(s,'hat','crown')"));assert(run("owns(s,'hat','crown')&&s.coins===29"));assert(!run("buy(s,'hat','crown')"),'only once');assert(!run("buy(s,'model','unicorn')"),'not enough coins');assert(!run("buy(s,'hat','bow')"),'free things are already yours');
 for(let k=0;k<20;k++)assert.notEqual(run("nextTheme('royal')"),'royal');
});
test('The buddy can be drawn in every outfit without errors',()=>{
 const run=load();
 const n=run(`(()=>{let n=0;for(const m of MODELS)for(const t of TOPS)for(const b of BOTTOMS)for(const sh of SHOES)for(const p of PATTERNS){const svg=dollSVG({model:m.id,hat:HATS[n%HATS.length].id,top:t.id,topColor:COLORS[n%COLORS.length].id,bottom:b.id,bottomColor:COLORS[(n+3)%COLORS.length].id,shoes:sh.id,shoesColor:COLORS[(n+5)%COLORS.length].id,acc:ACCS[n%ACCS.length].id,pattern:p.id},'t'+n);if(!svg.startsWith('<svg')||svg.includes('undefined')||svg.includes('NaN'))throw new Error('bad drawing '+n);n++}return n})()`);
 assert(n>5000);
});
test('Saves keep coins, clothes and the outfit, and ignore broken or unknown data',()=>{
 const good={coins:88,shows:7,owned:['hat:crown','top:gown','color:gold','hat:jetpack','nope'],outfit:{model:'kitty',hat:'crown',top:'gown',topColor:'gold',acc:'wand'},theme:'space',best:{royal:3,space:9},sound:false};
 const run=load({superEmiliaStudio:JSON.stringify(good)});run('var s=loadSave()');
 assert(run("s.coins===88&&s.shows===7&&s.theme==='space'&&s.best.royal===3&&!s.best.space&&s.sound===false"));
 assert.deepEqual([...run('s.owned')],['hat:crown','top:gown','color:gold']);
 assert(run("s.outfit.hat==='crown'&&s.outfit.top==='gown'&&s.outfit.topColor==='gold'&&s.outfit.acc==='balloon'"),'a wand you do not own is not worn');
 const bad=load({superEmiliaStudio:'{oops'});assert(bad("(()=>{const s=loadSave();return s.coins===15&&s.outfit.model==='kitty'})()"));
 const weird=load({superEmiliaStudio:JSON.stringify({coins:'lots',theme:'moon',owned:'all',outfit:{model:'unicorn'}})});assert(weird("(()=>{const s=loadSave();return s.coins===15&&s.theme==='birthday'&&s.owned.length===0&&s.outfit.model==='kitty'})()"));
});
console.log(checks+' studio checks passed.');

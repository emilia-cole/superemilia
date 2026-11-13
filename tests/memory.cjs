const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(process.argv[2]||'public/memory/index.html','utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
// Load the game's logic without a browser: the page skips its screen code when there is no document.
function load(storage={}){const sandbox={console,Math,Number,JSON,Array,Object,String,Set,localStorage:{getItem:k=>storage[k]??null,setItem:(k,v)=>storage[k]=v}};vm.createContext(sandbox);vm.runInContext(script,sandbox);return code=>vm.runInContext(code,sandbox)}
let checks=0;const test=(name,fn)=>{fn();console.log('✓ '+name);checks++};

test('Twelve levels grow from 6 cards to 36, and every deck has enough different cards',()=>{
 const run=load();
 assert.equal(run('LEVELS.length'),12);assert.equal(run('LEVELS[0].pairs*2'),6);assert.equal(run('LEVELS[11].pairs*2'),36);
 assert(run('LEVELS.every((L,i)=>i===0||L.pairs>=LEVELS[i-1].pairs)'));assert(run('LEVELS.every(L=>(L.rows*L.cols)%2===0)'));
 for(const deck of ['buddies','treats','pets','lands'])assert.equal(run(`new Set(DECKS.${deck}.cards).size`),18,deck+' has 18 different cards');
});
test('Each board has exactly two of every card it uses',()=>{
 const run=load();
 for(let level=0;level<12;level++)for(let t=0;t<5;t++){const deck=run(`makeDeck(${level})`),counts={};for(const c of deck)counts[c]=(counts[c]||0)+1;assert.equal(deck.length,run(`LEVELS[${level}].pairs*2`));assert(Object.values(counts).every(n=>n===2));assert(deck.every(c=>run(`DECKS[LEVELS[${level}].deck].cards.includes(${JSON.stringify(c)})`)))}
 const a=JSON.stringify(run('makeDeck(11)')),b=JSON.stringify(run('makeDeck(11)'));assert.notEqual(a,b,'boards are shuffled');
});
test('Fewer turns earn more stars',()=>{
 const run=load();
 assert.equal(run('starsFor(3,3)'),3);assert.equal(run('starsFor(5,3)'),3);assert.equal(run('starsFor(6,3)'),2);assert.equal(run('starsFor(7,3)'),2);assert.equal(run('starsFor(8,3)'),1);
 assert.equal(run('starsFor(27,18)'),3);assert.equal(run('starsFor(40,18)'),2);assert.equal(run('starsFor(41,18)'),1);
});
test('Levels unlock one at a time, and replays keep the best result',()=>{
 const run=load();run('var s=normalizeSave(null)');
 assert(run('levelOpen(0,s.stars)&&!levelOpen(1,s.stars)'));
 assert.deepEqual(run('({...recordWin(s,0,9)})'),{stars:1,firstTime:true,better:true,unlockedNext:true});assert(run('levelOpen(1,s.stars)&&!levelOpen(2,s.stars)'));
 run('recordWin(s,0,3)');assert(run('s.stars[0]===3&&s.best[0]===3'));run('recordWin(s,0,12)');assert(run('s.stars[0]===3&&s.best[0]===3'));
 assert.equal(run('totalStars(s.stars)'),3);
 assert.equal(run('recordWin(s,11,30).unlockedNext'),false);
});
test('Saves keep stars and ignore broken or skipped-ahead data',()=>{
 const run=load({superEmiliaMemory:JSON.stringify({stars:[3,2,1],best:[3,9,20]})});assert(run('(()=>{const s=loadSave();return s.stars[0]===3&&s.stars[2]===1&&s.best[1]===9&&!s.stars[3]&&levelOpen(3,s.stars)&&!levelOpen(4,s.stars)})()'));
 const skip=load({superEmiliaMemory:JSON.stringify({stars:[3,0,3,3,3,3,3,3,3,3,3,3]})});assert(skip('(()=>{const s=loadSave();return totalStars(s.stars)===3&&!levelOpen(2,s.stars)})()'));
 const bad=load({superEmiliaMemory:JSON.stringify({stars:[9,'x',-1],best:'no'})});assert(bad('(()=>{const s=loadSave();return totalStars(s.stars)===0&&s.best.every(b=>b===0)})()'));
 const broken=load({superEmiliaMemory:'{oops'});assert(broken('totalStars(loadSave().stars)===0'));
});
test('Winning a level gives its prize, 3 stars turns it gold, and finishing everything gives grand prizes',()=>{
 const run=load();
 assert.equal(run('PRIZES.length'),12);assert.equal(run('new Set(PRIZES.map(p=>p.icon)).size'),12);
 run('var s=normalizeSave(null)');
 let before=run('JSON.stringify(s.stars)');run('recordWin(s,0,9)');let got=run(`newPrizes(${before},s.stars)`);
 assert.equal(got.length,1);assert.equal(got[0].kind,'prize');assert.equal(got[0].name,'Ribbon');assert.equal(got[0].gold,false);
 before=run('JSON.stringify(s.stars)');run('recordWin(s,0,9)');assert.equal(run(`newPrizes(${before},s.stars).length`),0,'no prize twice');
 before=run('JSON.stringify(s.stars)');run('recordWin(s,0,3)');got=run(`newPrizes(${before},s.stars)`);assert.equal(got.length,1);assert.equal(got[0].kind,'gold');
 before=run('JSON.stringify(s.stars)');run('recordWin(s,1,6)');got=run(`newPrizes(${before},s.stars)`);assert(got.length===1&&got[0].kind==='prize'&&got[0].gold);
 run('for(let i=2;i<11;i++)recordWin(s,i,999)');before=run('JSON.stringify(s.stars)');run('recordWin(s,11,999)');got=run(`newPrizes(${before},s.stars).map(g=>g.kind)`);assert.deepEqual([...got],['prize','trophy']);
 run('for(let i=2;i<11;i++)recordWin(s,i,1)');before=run('JSON.stringify(s.stars)');run('recordWin(s,11,1)');got=run(`newPrizes(${before},s.stars).map(g=>g.kind)`);assert.deepEqual([...got],['gold','crown']);
 assert(run('(()=>{const p=prizesFor(s.stars);return p.won.length===12&&p.gold.length===12&&p.trophy&&p.crown})()'));
});
console.log(checks+' memory checks passed.');

const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(process.argv[2]||'public/garden/index.html','utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
// Load the game's logic without a browser: the page skips its screen code when there is no document.
function load(storage={}){const sandbox={console,Math,Number,JSON,Array,Object,String,Set,Infinity,localStorage:{getItem:k=>storage[k]??null,setItem:(k,v)=>storage[k]=v}};vm.createContext(sandbox);vm.runInContext(script,sandbox);return code=>vm.runInContext(code,sandbox)}
let checks=0;const test=(name,fn)=>{fn();console.log('✓ '+name);checks++};

test('A new garden starts with 6 plots, some coins and 3 sunflower seeds',()=>{
 const run=load();run('var s=loadSave()');
 assert(run('s.plots.length===6&&s.plots.every(p=>p===null)&&s.coins===20&&s.seeds.sunflower===3&&s.harvests===0'));
 assert(run("seedUnlocked(seedById('sunflower'),0)&&!seedUnlocked(seedById('tulip'),2)&&seedUnlocked(seedById('tulip'),3)"));
 assert(run('SEEDS.every((x,i)=>i===0||x.unlock>=SEEDS[i-1].unlock)'));assert(run('SEEDS.filter(x=>!x.mystery).every(x=>x.reward>x.cost)'),'every plant earns more than its seed costs');
});
test('A plant needs water 3 times, growing a step each time, before it can be picked',()=>{
 const run=load();run('var s=defaultSave()');
 assert(run("plant(s,0,'sunflower')"));assert(!run("plant(s,0,'sunflower')"),'one plant per plot');assert.equal(run('s.seeds.sunflower'),2);
 assert(!run("plant(s,1,'tulip')"),'needs a seed to plant');
 assert(run('needsWater(s.plots[0])'));assert.equal(run('harvest(s,0)'),null);
 let t=1000;for(let step=0;step<3;step++){assert(run(`water(s,0,${t})`));assert(!run(`water(s,0,${t})`),'no double watering');assert.equal(run(`grow(s,${t+4000}).length`),0,'still growing');assert.deepEqual([...run(`grow(s,${t+5000})`)],[0]);assert.equal(run('s.plots[0].stage'),step+1);t+=10000}
 assert(!run('needsWater(s.plots[0])'));assert(!run('water(s,0,99999)'));
 const r=run('harvest(s,0)');assert.equal(r.coins,6);assert.equal(run('s.coins'),26);assert(run('s.plots[0]===null&&s.harvests===1&&s.grown.sunflower===1'));
 run("s.upgrades.push('soil')");assert.equal(run("growTime(seedById('sunflower'),s)"),3750,'magic soil grows faster');
});
test('Mystery seeds grow buddies, and every buddy adds a coin to each harvest',()=>{
 const run=load();run("var s=defaultSave();s.seeds.mystery=20;s.seeds.sunflower=5;var ready=i=>{s.plots[i].stage=3}");
 run("plant(s,0,'mystery');ready(0)");let r=run('harvest(s,0,()=>0.99)');assert.notEqual(r.buddy,null,'the first mystery seed is always a buddy');assert.equal(run('s.buddies.length'),1);
 assert.equal(r.coins,run('seedById("mystery").reward'),'the new buddy helps from the next harvest');
 run("plant(s,1,'sunflower');ready(1)");assert.equal(run('harvest(s,1).coins'),7);
 run("plant(s,2,'mystery');ready(2)");r=run('harvest(s,2,()=>0.9)');assert.equal(r.buddy,null);assert.equal(r.item.id,'hibiscus');assert.equal(r.coins,41);
 run('for(let k=0;k<30;k++){plant(s,3,"mystery")||(s.seeds.mystery=5,plant(s,3,"mystery"));ready(3);harvest(s,3,()=>0.1)}');
 assert.equal(run('s.buddies.length'),12);assert.equal(run('new Set(s.buddies).size'),12,'no buddy twice');
 run("plant(s,4,'mystery');ready(4)");assert.equal(run('harvest(s,4,()=>0).item.id'),'hibiscus','after all buddies only lucky flowers grow');
});
test('The shop sells unlocked seeds, more plots, upgrades and decorations',()=>{
 const run=load();run('var s=defaultSave()');
 assert(run("buySeed(s,'sunflower',5)"));assert(run('s.coins===5&&s.seeds.sunflower===8'));assert(!run("buySeed(s,'sunflower',5)"),'not enough coins');
 run('s.coins=500');assert(!run("buySeed(s,'rose',1)"),'locked seed');run('s.harvests=30');assert(run("buySeed(s,'rose',1)"));
 assert.equal(run('plotPrice(6)'),30);assert(run('buyPlot(s)&&s.plots.length===7'));run('s.coins=9999;for(let k=0;k<10;k++)buyPlot(s)');assert.equal(run('s.plots.length'),12);
 assert(run("buyThing(s,'decor','fountain')"));assert(!run("buyThing(s,'decor','fountain')"),'only once');assert(run("buyThing(s,'upgrade','can')&&s.upgrades.includes('can')"));
 run('s.plots[0]={weed:true}');const c=run('s.coins');assert(run('pullWeed(s,0)'));assert.equal(run('s.coins'),c+1);
});
test('Saves keep the garden and ignore broken or unknown data',()=>{
 const good={coins:77,harvests:12,seeds:{tulip:4,nope:9},plots:[{seed:'tulip',stage:2,watered:true,readyAt:5},{weed:true},{seed:'fake',stage:1},null,null,null,{seed:'rose',stage:9}],grown:{tulip:5,sunflower:'x'},buddies:[0,3,3,99,'2'],decor:['bench','castle'],upgrades:['can','rocket'],sound:false};
 const run=load({superEmiliaGarden:JSON.stringify(good)});run('var s=loadSave()');
 assert(run("s.coins===77&&s.harvests===12&&s.seeds.tulip===4&&!('nope' in s.seeds)&&s.sound===false"));
 assert(run("s.plots.length===7&&s.plots[0].stage===2&&s.plots[0].watered&&s.plots[1].weed&&s.plots[2]===null&&s.plots[6].stage===3&&!s.plots[6].watered"));
 assert.deepEqual([...run('s.buddies')],[0,3,2]);assert.deepEqual([...run('s.decor')],['bench']);assert.deepEqual([...run('s.upgrades')],['can']);assert(run('s.grown.tulip===5&&!s.grown.sunflower'));
 const bad=load({superEmiliaGarden:'{oops'});assert(bad('(()=>{const s=loadSave();return s.coins===20&&s.plots.length===6})()'));
 const weird=load({superEmiliaGarden:JSON.stringify({coins:-5,plots:Array(40).fill(null),buddies:'all'})});assert(weird('(()=>{const s=loadSave();return s.coins===20&&s.plots.length===12&&s.buddies.length===0})()'));
});
console.log(checks+' garden checks passed.');

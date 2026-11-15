const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(process.argv[2]||'public/lemonade/index.html','utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
// Load the game's logic without a browser: the page skips its screen code when there is no document.
function load(storage={}){const sandbox={console,Math,Number,JSON,Array,Object,String,Set,localStorage:{getItem:k=>storage[k]??null,setItem:(k,v)=>storage[k]=v}};vm.createContext(sandbox);vm.runInContext(script,sandbox);return code=>vm.runInContext(code,sandbox)}
let checks=0;const test=(name,fn)=>{fn();console.log('✓ '+name);checks++};

test('Orders ask for 1 to 3 sugar and ice and only extras you own',()=>{
 const run=load();run('var s=defaultSave()');for(let i=0;i<300;i++){const o=run('makeOrder(s)');assert(o.sugar>=1&&o.sugar<=3&&o.ice>=1&&o.ice<=3);assert(o.extras.length<=1,'first orders are simple');assert(o.extras.every(id=>['straw','slice'].includes(id)));assert(!o.vip)}
 run("s.served=10;s.owned=['cherry']");const seen=new Set();let vip=0;for(let i=0;i<500;i++){const o=run('makeOrder(s)');o.extras.forEach(x=>seen.add(x));if(o.vip)vip++;assert(o.extras.length<=2&&new Set(o.extras).size===o.extras.length)}
 assert(seen.has('cherry')&&!seen.has('mint'));assert(vip>20&&vip<120,'VIPs are rare');
});
test('A cup that matches everything is perfect and pays the most',()=>{
 const run=load();run('var o={buddy:"🐶",sugar:2,ice:1,extras:["straw","strawberry"],vip:false}');
 const r=run('scoreCup(o,{fill:92,sugar:2,ice:1,extras:["straw","strawberry"],spilled:false})');assert(r.perfect);assert.equal(r.coins,4+2+2+2+4+3);assert.equal(r.hits,5);
 const r2=run('scoreCup(o,{fill:70,sugar:3,ice:1,extras:["straw"],spilled:false})');assert(!r2.perfect&&!r2.fill&&!r2.sugar&&r2.ice);assert.equal(r2.coins,4+2+2);
 assert(!run('scoreCup(o,{fill:100,sugar:2,ice:1,extras:["straw","strawberry"],spilled:true}).fill'),'a spilled cup is not a good pour');
 assert.equal(run('scoreCup({...o,vip:true},{fill:92,sugar:2,ice:1,extras:["straw","strawberry"],spilled:false}).coins'),34,'VIPs pay double');
 assert(run('isPink({extras:["strawberry"]})&&!isPink({extras:["mint"]})'));
});
test('Serving pays, needs lemonade in the cup, and ends the day every 6 customers',()=>{
 const run=load();run('var s=defaultSave(),o={buddy:"🐱",sugar:1,ice:1,extras:[],vip:false}');assert.equal(run('serve(s,o,{fill:20,sugar:1,ice:1,extras:[]})'),null,'almost empty');
 for(let i=1;i<=5;i++){const r=run('serve(s,o,{fill:90,sugar:1,ice:1,extras:[],spilled:false})');assert(!r.dayDone);assert.equal(r.coins,13)}
 const r=run('serve(s,o,{fill:90,sugar:1,ice:1,extras:[],spilled:false})');assert(r.dayDone&&r.day===1&&r.dayCoins===78);assert(run('s.day===2&&s.today===0&&s.served===6&&s.perfect===6&&s.coins===78&&s.total===78'));
});
test('The shop sells extras, upgrades, and stand colors once each',()=>{
 const run=load();run('var s=defaultSave();s.coins=100');assert(run("owns(s,'straw')&&owns(s,'classic')&&!owns(s,'mint')"));assert.equal(run('pitcherCap(s)'),3);assert.equal(run('squeezeNeeded(s)'),28);
 assert(run("buy(s,'bigjug')&&s.coins===40&&pitcherCap(s)===5"));assert(!run("buy(s,'bigjug')"));assert(run("buy(s,'squeezer')&&s.coins===0&&squeezeNeeded(s)===14"));assert(!run("buy(s,'cherry')"));assert(!run("buy(s,'straw')"));
});
test('Saves keep progress and ignore broken or unknown data',()=>{
 const run=load({superEmiliaLemon:JSON.stringify({coins:50,total:90,served:8,perfect:99,day:2,owned:['mint','mint','straw','jetpack','pink'],look:'pink',sound:false})});run('var s=loadSave()');
 assert(run("s.coins===50&&s.total===90&&s.served===8&&s.perfect===8&&s.day===2&&s.look==='pink'&&s.sound===false"));assert.deepEqual([...run('s.owned')],['mint','pink']);
 assert(load({superEmiliaLemon:JSON.stringify({look:'rainbow'})})("loadSave().look==='classic'"),'cannot use a color you do not own');assert(load({superEmiliaLemon:'{oops'})('loadSave().day===1'));
});
console.log(checks+' lemonade checks passed.');

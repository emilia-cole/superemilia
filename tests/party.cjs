const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(process.argv[2]||'public/party/index.html','utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
// Load the game's logic without a browser: the page skips its screen code when there is no document.
function load(storage={}){const sandbox={console,Math,Number,JSON,Array,Object,String,Set,localStorage:{getItem:k=>storage[k]??null,setItem:(k,v)=>storage[k]=v}};vm.createContext(sandbox);vm.runInContext(script,sandbox);return code=>vm.runInContext(code,sandbox)}
let checks=0;const test=(name,fn)=>{fn();console.log('✓ '+name);checks++};

test('Invitations only wish for flavors and colors you own',()=>{
 const run=load();run('var s=defaultSave()');for(let i=0;i<300;i++){const g=run('makeGuest(s)');assert(['chocolate','vanilla'].includes(g.flavor));assert(['pink','blue','yellow','red'].includes(g.color));assert(g.age>=3&&g.age<=9);assert(run(`TOYS.some(t=>t.id==='${g.toy}')`))}
 run("s.owned=['rainbow','white','purple']");const seen=new Set();for(let i=0;i<400;i++){const g=run('makeGuest(s)');seen.add(g.flavor);seen.add(g.color)}assert(seen.has('rainbow')&&seen.has('purple')&&!seen.has('white'),'white is never a favorite color');
});
test('Each step needs the right things before you can go on',()=>{
 const run=load();run('var p=newParty()');assert(!run('stepReady.cake(p)'));run('p.cake.layers.push("vanilla")');assert(!run('stepReady.cake(p)'));run('p.cake.frost="pink"');assert(run('stepReady.cake(p)'));
 assert(!run('stepReady.balloons(p)'));run('p.balloons.push({c:"pink",x:40,y:20})');assert(run('stepReady.balloons(p)'));
 run('p.gift.toy="dino";p.gift.paper="pink"');assert(!run('stepReady.gift(p)'),'needs the bow');run('p.gift.bow=true');assert(run('stepReady.gift(p)'));
});
test('A party scores one star per wish and pays more for more stars',()=>{
 const run=load();run('var s=defaultSave(),g={buddy:"🐰",name:"Clover",age:5,flavor:"chocolate",color:"blue",toy:"teddy"},p=newParty()');
 run('p.cake={layers:["vanilla","chocolate"],frost:"blue",sprinkles:10,candles:5,topper:null};p.balloons=[{c:"blue"},{c:"blue"},{c:"red"},{c:"blue"}];p.gift={toy:"teddy",paper:"blue",bow:true}');
 let r=run('scoreParty(g,p,s)');assert.equal(r.stars,6);assert.equal(r.coins,6+18+6);
 run('p.cake.candles=4;p.balloons.pop()');r=run('scoreParty(g,p,s)');assert.equal(r.stars,4);assert.deepEqual([...r.checks.filter(c=>!c.ok).map(c=>c.id)],['candles','balloons']);assert.equal(r.coins,18);
 run('p.cake.topper="star";s.owned=["streamers","hats"]');assert.equal(run('scoreParty(g,p,s).coins'),18+2+2,'toppers and decorations pay a little extra');
});
test('Finishing a party pays, counts it, and saves a photo',()=>{
 const run=load();run('var s=defaultSave(),g={buddy:"🐶",name:"Biscuit",age:4,flavor:"vanilla",color:"pink",toy:"ball"},p=newParty();p.cake={layers:["vanilla"],frost:"pink",sprinkles:3,candles:4,topper:null};p.balloons=[{c:"pink"},{c:"pink"},{c:"pink"}];p.gift={toy:"ball",paper:"pink",bow:true}');
 const r=run('finishParty(s,g,p)');assert.equal(r.stars,6);assert(run('s.parties===1&&s.perfect===1&&s.balloons===3&&s.coins===30&&s.album.length===1&&s.album[0].name==="Biscuit"&&s.album[0].balloons.length===3'));
 for(let i=0;i<30;i++)run('finishParty(s,g,newParty())');assert.equal(run('s.album.length'),24);
 assert(run('cakeHTML(s.album[24-1].cake,30,false).includes("cakebox")&&!cakeHTML(p.cake,18,true).includes("NaN")&&cakeHTML(p.cake,18,true).includes("flame")'));
});
test('The shop sells flavors, colors, toppers, and decorations once each',()=>{
 const run=load();run('var s=defaultSave();s.coins=60');assert(!run("buy(s,'vanilla')"));assert(run("buy(s,'rainbow')&&s.coins===20&&owns(s,'rainbow')"));assert(!run("buy(s,'rainbow')"));assert(!run("buy(s,'disco')"));assert(run("buy(s,'purple')&&s.coins===8"));assert(!run("buy(s,'pony')"));
});
test('Saves keep progress and ignore broken or unknown data',()=>{
 const run=load({superEmiliaParty:JSON.stringify({coins:44,parties:3,perfect:9,balloons:12,owned:['rainbow','rainbow','pink','jetpack'],album:[{buddy:'🐰',name:'Clover',age:5,stars:9,cake:{layers:['vanilla','moon'],frost:'blue',sprinkles:99,candles:50,topper:'star'},balloons:['pink','plaid']},{buddy:'🦖'}],sound:false})});
 run('var s=loadSave()');assert(run('s.coins===44&&s.parties===3&&s.perfect===3&&s.balloons===12&&s.sound===false'));assert.deepEqual([...run('s.owned')],['rainbow']);
 assert(run('s.album.length===1&&s.album[0].stars===6&&s.album[0].cake.layers.length===1&&s.album[0].cake.candles===10&&s.album[0].cake.sprinkles===40&&s.album[0].balloons.length===1'));
 assert(load({superEmiliaParty:'{oops'})('loadSave().parties===0'));
});
console.log(checks+' party checks passed.');

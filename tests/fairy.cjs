const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(process.argv[2]||'public/fairy/index.html','utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
// Load the game's logic without a browser: the page skips its screen code when there is no document.
function load(storage={}){const sandbox={console,Math,Number,JSON,Array,Object,String,Set,localStorage:{getItem:k=>storage[k]??null,setItem:(k,v)=>storage[k]=v}};vm.createContext(sandbox);vm.runInContext(script,sandbox);return code=>vm.runInContext(code,sandbox)}
let checks=0;const test=(name,fn)=>{fn();console.log('✓ '+name);checks++};

test('There are 14 garden things and 8 fairies, and you start with 20 fairy dust',()=>{
 const run=load();assert.equal(run('ITEMS.length'),14);assert.equal(run('FAIRIES.length'),8);assert.equal(run('defaultSave().dust'),20);assert(run('ITEMS.every((it,i)=>it.price>0)'));
});
test('Buying a thing puts it in the garden and taking it back refunds it',()=>{
 const run=load();run('var s=defaultSave()');assert(run('placeThing(s,"tulip",20,50)&&s.dust===16&&s.things.length===1'));assert(!run('placeThing(s,"fountain",20,50)'),'not enough dust');
 assert(!run('placeThing(s,"tulip",90,50)'),'not on the tray');assert(!run('placeThing(s,"dragon",20,50)'));assert.equal(run('removeThing(s,0)'),4);assert(run('s.dust===20&&s.things.length===0'));
 run('s.dust=9999');for(let i=0;i<40;i++)run('placeThing(s,"stone",30,60)');assert(!run('placeThing(s,"stone",30,60)'),'at most 40 things');
});
test('Fairies move in when the garden has what they love, and stay',()=>{
 const run=load();run('var s=defaultSave();s.dust=9999');run('placeThing(s,"tulip",10,50);placeThing(s,"blossom",12,50)');assert.deepEqual([...run('checkFairies(s)')],[]);
 run('placeThing(s,"sunflower",14,50)');assert.deepEqual([...run('checkFairies(s)')],['petal']);assert.deepEqual([...run('checkFairies(s)')],[],'only once');
 run('placeThing(s,"tree",30,40)');assert(!run('checkFairies(s).includes("breeze")'));run('placeThing(s,"nest",32,40)');assert(run('checkFairies(s).includes("breeze")'));
 run('placeThing(s,"candle",40,40);placeThing(s,"lantern",42,40);placeThing(s,"lantern",44,40);placeThing(s,"fountain",50,60);placeThing(s,"mushroom",50,70);placeThing(s,"mushroom",52,70)');assert.deepEqual([...run('checkFairies(s)')].sort(),['glow','moss','ripple']);
 run('placeThing(s,"rainbow",60,30)');assert(!run('checkFairies(s).includes("rainbow")'),'needs 15 things too');run('placeThing(s,"stone",10,90);placeThing(s,"stone",12,90);placeThing(s,"stone",14,90)');assert(run('checkFairies(s).includes("rainbow")'));
 run('removeThing(s,0)');assert(run('s.fairies.includes("petal")'),'fairies stay');
});
test('Blooming sprouts and catching fireflies give fairy dust',()=>{
 const run=load();run('var s=defaultSave()');assert.equal(run('bloomSprout(s)'),3);assert.equal(run('catchFly(s)'),2);assert(run('s.dust===25&&s.bloomed===1&&s.caught===1'));
 for(let i=0;i<200;i++){const p=run('randomSpot()');assert(run(`inGarden(${p.x},${p.y})`))}
});
test('Saves keep the garden and ignore broken or unknown data',()=>{
 const run=load({superEmiliaFairy:JSON.stringify({dust:77,caught:5,things:[{id:'tulip',x:20,y:50},{id:'tulip',x:200,y:-9},{id:'unicorn',x:1,y:1},{id:'hut'}],fairies:['petal','petal','queen'],night:true,sound:false})});
 run('var s=loadSave()');assert(run('s.dust===77&&s.caught===5&&s.night===true&&s.sound===false&&s.things.length===2&&s.things[1].x===AREA.x1&&s.things[1].y===AREA.y0'));assert.deepEqual([...run('s.fairies')],['petal']);
 assert(load({superEmiliaFairy:'{oops'})('loadSave().dust===20'));
});
console.log(checks+' fairy checks passed.');

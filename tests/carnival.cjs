const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(process.argv[2]||'public/carnival/index.html','utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
// Load the game's logic without a browser: the page skips its screen code when there is no document.
function load(storage={}){const sandbox={console,Math,Number,JSON,Array,Object,String,Set,localStorage:{getItem:k=>storage[k]??null,setItem:(k,v)=>storage[k]=v}};vm.createContext(sandbox);vm.runInContext(script,sandbox);return code=>vm.runInContext(code,sandbox)}
let checks=0;const test=(name,fn)=>{fn();console.log('✓ '+name);checks++};

test('The carnival has five games and a prize booth with twelve prizes',()=>{
 const run=load();assert.deepEqual([...run('GAMES.map(g=>g.id)')],['ring','whack','balloon','duck','wheel']);
 assert.equal(run('PRIZES.length'),12);assert(run('PRIZES.every((p,i)=>i===0||p.price>=PRIZES[i-1].price)'));assert.equal(run('new Set(PRIZES.map(p=>p.id)).size'),12);
});
test('Ring toss: a ring lands on the closest bottle when it is close enough',()=>{
 const run=load();assert.equal(run('ringLands(50,[22,36,50,64,78])'),2);assert.equal(run('ringLands(50+RING_HIT-0.1,[22,36,50,64,78])'),2);assert.equal(run('ringLands(43,[22,36,50,64,78])'),-1,'between two bottles is a miss');
 assert.equal(run('ringLands(50,[22,36,50,64,78],[2])'),-1,'a taken bottle can be left out');
 for(let t=0;t<20;t+=.7){const xs=run(`bottleXs(${t})`);assert(xs.every(x=>x>8&&x<92),'bottles stay on the counter');assert(xs[1]-xs[0]>13)}
});
test('Tickets: more points win more tickets, and a perfect ring toss gets a bonus',()=>{
 const run=load();assert.equal(run("ticketsFor('ring',0)"),0);assert.equal(run("ticketsFor('ring',4)"),12);assert.equal(run("ticketsFor('ring',5)"),20);
 assert.equal(run("ticketsFor('whack',21)"),10);assert.equal(run("ticketsFor('balloon',9)"),4);assert.equal(run("ticketsFor('wheel',99)"),0,'the ferris wheel is just for fun');
 const ducks={};for(let k=0;k<2000;k++){const d=run('duckPrize()');ducks[d]=(ducks[d]||0)+1}assert(ducks[2]>ducks[15]&&ducks[15]>0,'big duck prizes are rare but possible');
});
test('Finishing games gives tickets and duck tokens; the duck pond uses a token',()=>{
 const run=load();run('var s=defaultSave()');assert.equal(run('s.ducks'),1,'start with one duck token');
 let r=run("finishGame(s,'whack',20)");assert(r.tickets===10&&r.better);assert(run('s.tickets===10&&s.ducks===2&&s.best.whack===20&&s.plays===1'));
 r=run("finishGame(s,'whack',8)");assert(!r.better&&run('s.best.whack===20'));
 run("finishGame(s,'duck',5)");assert(run('s.ducks===2&&s.tickets===19'));run("finishGame(s,'wheel',0)");assert(run('s.rides===1&&s.ducks===2'));
 run('s.tickets=45');assert(run("buyPrize(s,'unicorn')&&s.tickets===5&&s.prizes.includes('unicorn')"));assert(!run("buyPrize(s,'unicorn')"));assert(!run("buyPrize(s,'trophy')"));
});
test('Saves keep tickets and prizes, and ignore broken or unknown data',()=>{
 const run=load({superEmiliaCarnival:JSON.stringify({tickets:40,total:90,plays:7,ducks:3,rides:2,best:{ring:4,whack:30,moon:9},prizes:['teddy','teddy','yacht'],sound:false})});run('var s=loadSave()');
 assert(run("s.tickets===40&&s.total===90&&s.plays===7&&s.ducks===3&&s.rides===2&&s.best.ring===4&&s.best.whack===30&&!s.best.moon&&s.sound===false"));assert.deepEqual([...run('s.prizes')],['teddy']);
 const bad=load({superEmiliaCarnival:'{oops'});assert(bad('loadSave().tickets===0&&loadSave().ducks===1'));
});
console.log(checks+' carnival checks passed.');

const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(process.argv[2]||'public/math/index.html','utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
// Load the game's logic without a browser: the page skips its screen code when there is no document.
function load(storage={}){const sandbox={console,Math,Number,JSON,Array,Object,String,Set,localStorage:{getItem:k=>storage[k]??null,setItem:(k,v)=>storage[k]=v}};vm.createContext(sandbox);vm.runInContext(script,sandbox);return code=>vm.runInContext(code,sandbox)}
let checks=0;const test=(name,fn)=>{fn();console.log('✓ '+name);checks++};

test('Easy problems stay within 10 and are never below zero',()=>{
 const run=load();for(let i=0;i<500;i++){const p=run("makeProblem('easy')");assert(['+','−'].includes(p.op));assert(p.answer>=0&&p.answer<=10,JSON.stringify(p));assert(p.a<=10&&p.b<=10);assert.equal(p.answer,p.op==='+'?p.a+p.b:p.a-p.b)}
});
test('Medium problems stay within 20, and hard ones within 100 with times tables',()=>{
 const run=load();for(let i=0;i<500;i++){const p=run("makeProblem('medium')");assert(p.answer>=0&&p.answer<=20&&p.a<=20,JSON.stringify(p))}
 let times=0;for(let i=0;i<800;i++){const p=run("makeProblem('hard')");assert(p.answer>=0&&p.answer<=100,JSON.stringify(p));if(p.op==='×'){times++;assert([2,3,4,5,10].includes(p.a)||[2,3,4,5,10].includes(p.b));assert.equal(p.answer,p.a*p.b)}}assert(times>100,'times tables show up');
});
test('There are always 4 different cookies, one is the answer, and none are below zero',()=>{
 const run=load();for(const lv of ['easy','medium','hard'])for(let i=0;i<300;i++){run(`var p=makeProblem('${lv}')`);const c=run('choicesFor(p)');assert.equal(c.length,4);assert.equal(new Set(c).size,4);assert(c.includes(run('p.answer')));assert(c.every(n=>n>=0&&Number.isInteger(n)))}
 const z=run("choicesFor({a:0,b:0,op:'+',answer:0,text:''})");assert(z.includes(0)&&z.length===4&&z.every(n=>n>=0));
});
test('Stars come from first-try answers, and every finished game brings a new monster',()=>{
 const run=load();assert.deepEqual([0,4,5,7,8,9,10].map(n=>run(`starsFor(${n})`)),[0,0,1,1,2,2,3]);run('var s=defaultSave()');assert.equal(run('s.monsters'),1);
 let r=run("finishGame(s,'easy',10,10)");assert(r.stars===3&&r.newMon[1]==='Inky');assert(run("s.best.easy===3&&s.games===1&&s.correct===10&&s.monsters===2"));
 run("finishGame(s,'easy',6,10)");assert.equal(run('s.best.easy'),3,'best stars stay');for(let i=0;i<20;i++)run("finishGame(s,'hard',2,10)");assert(run('s.monsters===12&&s.best.hard===0'));assert.equal(run("finishGame(s,'hard',9,10).newMon"),null);
});
test('Saves keep progress and ignore broken data',()=>{
 const run=load({superEmiliaMath:JSON.stringify({best:{easy:3,medium:9,hard:-1,crazy:3},games:4,correct:37,monsters:99,sound:false})});run('var s=loadSave()');
 assert(run('s.best.easy===3&&s.best.medium===3&&s.best.hard===0&&s.games===4&&s.correct===37&&s.monsters===12&&s.sound===false'));assert(load({superEmiliaMath:'{oops'})('loadSave().monsters===1'));
});
console.log(checks+' math checks passed.');

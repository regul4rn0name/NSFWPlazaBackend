const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const root = require('node:path').join(__dirname, '..');
const routes = {};
let database;
function makeApp() { return { use() {}, get(path, ...handlers) {routes['GET '+path]=handlers.at(-1)}, post(path, ...handlers) {routes['POST '+path]=handlers.at(-1)}, listen() {} }; }
const express = Object.assign(makeApp, {json:()=>()=>{}, static:()=>()=>{}});
class ObjectId {constructor(id) {this.id=id} toString(){return this.id}}
const approved = {_id:new ObjectId('new'), name:'accepted.zip', collection:'themes', date:new Date(), tags:['tag']};
let queued = [approved];
const published = [{_id:new ObjectId('old'), name:'old.zip', date:'21.09.2025 12:00'}];
let lastSort;
database={collection(name) {return name==='moderate' ? {findOne:async()=>queued[0],deleteOne:async()=>{queued=[]}} : {insertOne:async(record)=>published.push(record),find(query) {let rows=published.filter(x=>!query.name || query.name.test(x.name)); return {sort(order){lastSort=order;if(order._id===-1 && Object.keys(order)[0]==='_id') rows.reverse();return this}, skip(n){rows=rows.slice(n);return this},limit(n){rows=rows.slice(0,n);return this},async toArray(){return rows}}}}}};
const mocks={dotenv:{config(){}},express,mongodb:{ObjectId,MongoClient:class {async connect(){} db(){return database}}},cors:()=>()=>{},multer:Object.assign(()=>({single:()=>()=>{}}),{diskStorage:()=>({})}), 'adm-zip':class {}};
vm.runInNewContext(fs.readFileSync(root+'/server.js','utf8'),{require:name=>mocks[name]||require(name),process:{env:{MONGO_URI:'mock'}},console:{log(){},error:console.error},Buffer});
function response(){return {statusCode:200,status(n){this.statusCode=n;return this},json(data){this.body=data;return this},sendStatus(n){this.statusCode=n}}}
(async()=>{
await new Promise(resolve=>setImmediate(resolve));
const acceptance=response();await routes['POST /moderate/accept/:id']({params:{id:'new'}},acceptance);
assert.equal(acceptance.statusCode,200);assert.equal(queued.length,0);assert.equal(published.length,2);
for(const query of [{sort:'default'},{}]) {const res=response();await routes['GET /:type/:page']({params:{type:'themes',page:'1'},query},res);assert.equal(res.statusCode,200);assert.equal(res.body[0].filename,'accepted.zip');assert.deepEqual(JSON.parse(JSON.stringify(lastSort)),{_id:-1});}
for(const sort of ['name','date','downloads']) {for(const order of ['asc','desc']){const res=response();await routes['GET /:type/:page']({params:{type:'themes',page:'1'},query:{sort,order}},res);assert.equal(lastSort[sort],order==='asc'?1:-1)}}
const searched=response();await routes['GET /:type/:page']({params:{type:'themes',page:'1'},query:{sort:'default',search:'accepted'}},searched);assert.equal(searched.body.length,1);assert.equal(searched.body[0].url,'accepted');
console.log('PASS: accept → default listing; omitted sort; all explicit sorts; search; queue removal and preview mapping');
})().catch(error=>{console.error(error);process.exitCode=1});

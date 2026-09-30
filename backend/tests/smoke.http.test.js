process.env.JWT_SECRET='teste'; process.env.PORT='4555'; process.env.NODE_ENV='test';
const Module=require('module'); const path=require('path').join(__dirname,'..')+'/';
const jwt=require(path+'node_modules/jsonwebtoken');

const tenant={id:'t1',active:true,plan:{name:'TOP'}};
const users={
  adm:{id:'adm',tenantId:'t1',role:'ADMIN',active:true,name:'Adm',email:'a@a',passwordHash:'x',tenant},
  col:{id:'col',tenantId:'t1',role:'COLLABORATOR',active:true,name:'Col',email:'c@c',passwordHash:'x',tenant},
  blk:{id:'blk',tenantId:'t1',role:'COLLABORATOR',active:false,name:'Blk',email:'b@b',passwordHash:'x',tenant},
  sup:{id:'sup',tenantId:'t1',role:'SUPER_ADMIN',active:true,name:'Sup',email:'s@s',passwordHash:'x',tenant},
};
class FakePrisma{
  constructor(){
    this.user={
      findUnique:async({where})=>users[where.id]||null,
      // isolamento: só enxerga usuários do tenant t1
      findFirst:async({where})=>{const u=users[where.id]; return u&&u.tenantId===where.tenantId?u:null;},
      findMany:async()=>Object.values(users),
    };
    this.userPermissionOverride={findUnique:async()=>null,findMany:async()=>[]};
    this.rolePermissionOverride={findUnique:async()=>null};
    this.infraConfig={findMany:async()=>[{id:'i1',name:'API'}],findFirst:async({where})=>where.tenantId==='t1'&&where.id==='i1'?{id:'i1',url:'https://x.com'}:null};
    this.product={findMany:async()=>[{name:'Pão',price:2,stockQty:1,minStock:5}]};
    this.stockMovement={findMany:async()=>[{type:'OUT',qty:10,createdAt:new Date(),product:{name:'Pão',price:2}}]};
    this.kanbanCard={findMany:async()=>[{column:{name:'Novo Pedido'}}],findFirst:async()=>null};
  }
}
const orig=Module._load;
Module._load=function(req,...a){ if(req==='@prisma/client') return {PrismaClient:FakePrisma}; return orig.call(this,req,...a); };
require(path+'src/server.js');

const tok=id=>'Bearer '+jwt.sign({userId:id},'teste');
const call=async(m,url,id,body)=>{const r=await fetch('http://localhost:4555/api'+url,{method:m,headers:{'Content-Type':'application/json',...(id?{Authorization:tok(id)}:{})},body:body?JSON.stringify(body):undefined});let j=null;try{j=await r.json()}catch{};return {s:r.status,j};};
const assert=require('assert');
setTimeout(async()=>{
  try{
    assert.strictEqual((await call('GET','/health')).s,200);
    assert.strictEqual((await call('GET','/infra')).s,401,'sem token');
    assert.strictEqual((await call('GET','/infra','blk')).s,401,'usuário bloqueado');
    assert.strictEqual((await call('GET','/infra','col')).s,403,'colaborador não gerencia infra');
    assert.strictEqual((await call('GET','/infra','adm')).s,200,'admin gerencia infra');
    assert.strictEqual((await call('GET','/users','col')).s,403,'colaborador não lista usuários');
    assert.strictEqual((await call('GET','/users','adm')).s,200);
    const dc=await call('GET','/dashboard/summary','col'); assert.strictEqual(dc.s,200);
    assert.ok(!('faturamentoTotal30d' in dc.j),'colaborador NÃO vê faturamento');
    const da=await call('GET','/dashboard/summary','adm');
    assert.strictEqual(da.j.faturamentoTotal30d,20,'admin vê faturamento'); assert.strictEqual(da.j.estoqueBaixoCount,1);
    assert.strictEqual((await call('PATCH','/users/inexistente/status','adm',{active:false})).s,404,'isolamento tenant em usuários');
    assert.strictEqual((await call('PATCH','/users/sup/status','adm',{active:false})).s,403,'admin não mexe no Super Admin');
    assert.strictEqual((await call('PATCH','/users/sup/status','sup',{active:false})).s,400,'não bloquear a si mesmo');
    // resiliência: update inexistente no stub => erro interno vira 500, servidor continua de pé
    assert.strictEqual((await call('PATCH','/users/col/status','adm',{active:false})).s,500,'erro async vira 500');
    assert.strictEqual((await call('GET','/health')).s,200,'servidor continua vivo após erro');
    assert.strictEqual((await call('DELETE','/infra/outro-tenant','adm')).s,404,'isolamento tenant em infra');
    assert.strictEqual((await call('POST','/infra','adm',{name:'x',type:'API',url:'ftp://x'})).s,400,'URL inválida');
    assert.strictEqual((await call('PUT','/kanban/cards/x','col',{title:'a'})).s,404,'isolamento tenant em kanban');
    assert.strictEqual((await call('PUT','/users/col/permissions/MANAGE_INFRA','adm',{allowed:true})).s,403,'só Super Admin altera permissões');
    console.log('SMOKE TEST HTTP: TODOS OS CENÁRIOS PASSARAM');
  }catch(e){console.error('FALHOU:',e.message);process.exitCode=1;}
  process.exit();
},800);

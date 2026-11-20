import express,{Request,Response,NextFunction} from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import bcrypt from 'bcryptjs';
import {Server} from 'socket.io';
import {z,ZodError} from 'zod';
import jwt from 'jsonwebtoken';
import {prisma,cached,invalidateWorkspace,secret} from './config';
import {AuthRequest,requireAuth,token,workspaceRole,canAccessIssue} from './auth';
import {canManageMembers,canWriteIssues,canDeleteIssues} from './permissions';
const app=express();const server=http.createServer(app);
const origin=process.env.WEB_ORIGIN||'http://localhost:3000';
const io=new Server(server,{cors:{origin}});
app.use(helmet());app.use(cors({origin}));app.use(compression());app.use(express.json({limit:'1mb'}));app.use(pinoHttp());
app.use('/api', (req,res,next)=>{res.setHeader('X-Content-Type-Options','nosniff');next()});
app.use('/api', rateLimit({windowMs:60*1000,limit:300,standardHeaders:'draft-7',legacyHeaders:false}));
app.use('/api/auth',rateLimit({windowMs:15*60*1000,limit:60,standardHeaders:'draft-7',legacyHeaders:false}));
const route=(fn:(req:AuthRequest,res:Response)=>Promise<any>)=>(req:AuthRequest,res:Response,next:NextFunction)=>{Promise.resolve(fn(req,res)).catch(next)};
const fail=(res:Response,message:string,status=400)=>res.status(status).json({error:message});
const userView={id:true,name:true,email:true,avatarColor:true} as const;
const issueInclude={assignee:{select:userView},reporter:{select:userView},project:{select:{id:true,key:true,name:true,color:true,workspaceId:true}},_count:{select:{comments:true}}} as const;
const credentials=z.object({email:z.string().email(),password:z.string().min(8)});
app.get('/api/openapi.json',(_req,res)=>res.json(require('../openapi.json')));
app.get('/api/health',(_req,res)=>res.json({status:'ok',service:'sprintforge-api',timestamp:new Date().toISOString()}));
app.post('/api/auth/register',route(async(req,res)=>{
 const v=credentials.extend({name:z.string().min(2).max(80)}).parse(req.body);
 if(await prisma.user.findUnique({where:{email:v.email.toLowerCase()}}))return fail(res,'Email already registered',409);
 const user=await prisma.user.create({data:{name:v.name,email:v.email.toLowerCase(),passwordHash:await bcrypt.hash(v.password,12)},select:userView});
 const ws=await prisma.workspace.create({data:{name:`${v.name.split(' ')[0]}'s Workspace`,slug:`team-${user.id.slice(-10)}`,memberships:{create:{userId:user.id,role:'OWNER'}}}});
 await prisma.project.create({data:{name:'Getting Started',key:'START',workspaceId:ws.id,description:'Your first SprintForge project'}});
 res.status(201).json({token:token(user.id),user});
}));
app.post('/api/auth/login',route(async(req,res)=>{
 const v=credentials.parse(req.body);const user=await prisma.user.findUnique({where:{email:v.email.toLowerCase()}});
 if(!user||!(await bcrypt.compare(v.password,user.passwordHash)))return fail(res,'Invalid email or password',401);
 res.json({token:token(user.id),user:{id:user.id,name:user.name,email:user.email,avatarColor:user.avatarColor}});
}));
app.post('/api/auth/refresh',requireAuth,route(async(req,res)=>res.json({token:token(req.userId!)})));
app.get('/api/me',requireAuth,route(async(req,res)=>res.json(await prisma.user.findUnique({where:{id:req.userId},select:userView}))));
app.get('/api/workspaces',requireAuth,route(async(req,res)=>res.json(await prisma.workspace.findMany({where:{memberships:{some:{userId:req.userId}}},include:{_count:{select:{projects:true,memberships:true}}},orderBy:{createdAt:'asc'}}))));
app.get('/api/workspaces/:id/members',requireAuth,route(async(req,res)=>{
 if(!await workspaceRole(req.userId!,req.params.id))return fail(res,'Forbidden',403);
 res.json(await prisma.membership.findMany({where:{workspaceId:req.params.id},include:{user:{select:userView}}}));
}));
app.post('/api/workspaces/:id/members',requireAuth,route(async(req,res)=>{
 const m=await workspaceRole(req.userId!,req.params.id);if(!m||!canManageMembers(m.role))return fail(res,'Admin role required',403);
 const v=z.object({email:z.string().email(),role:z.enum(['ADMIN','MEMBER','VIEWER']).default('MEMBER')}).parse(req.body);
 const user=await prisma.user.findUnique({where:{email:v.email.toLowerCase()}});if(!user)return fail(res,'User must register first',404);
 const member=await prisma.membership.upsert({where:{userId_workspaceId:{userId:user.id,workspaceId:req.params.id}},create:{userId:user.id,workspaceId:req.params.id,role:v.role},update:{role:v.role}});
 res.json(member);
}));
app.get('/api/projects',requireAuth,route(async(req,res)=>{
 const workspaceId=z.string().parse(req.query.workspaceId);
 if(!await workspaceRole(req.userId!,workspaceId))return fail(res,'Forbidden',403);
 res.json(await prisma.project.findMany({where:{workspaceId},include:{_count:{select:{issues:true}}},orderBy:{createdAt:'asc'}}));
}));
app.post('/api/projects',requireAuth,route(async(req,res)=>{
 const v=z.object({workspaceId:z.string(),name:z.string().min(2).max(80),key:z.string().regex(/^[A-Z][A-Z0-9]{1,7}$/),description:z.string().max(1000).optional(),color:z.string().regex(/^#[0-9a-fA-F]{6}$/).optional()}).parse(req.body);
 const m=await workspaceRole(req.userId!,v.workspaceId);if(!m||!canManageMembers(m.role))return fail(res,'Admin role required',403);
 res.status(201).json(await prisma.project.create({data:v}));
}));
app.get('/api/issues',requireAuth,route(async(req,res)=>{
 const q=z.object({workspaceId:z.string(),projectId:z.string().optional(),status:z.enum(['BACKLOG','TODO','IN_PROGRESS','IN_REVIEW','DONE']).optional(),priority:z.enum(['LOW','MEDIUM','HIGH','URGENT']).optional(),search:z.string().max(100).optional(),assigneeId:z.string().optional(),page:z.coerce.number().int().min(1).default(1),limit:z.coerce.number().int().min(1).max(100).default(20)}).parse(req.query);
 if(!await workspaceRole(req.userId!,q.workspaceId))return fail(res,'Forbidden',403);
 const where={project:{workspaceId:q.workspaceId,...(q.projectId?{id:q.projectId}:{})},...(q.status?{status:q.status}:{}),...(q.priority?{priority:q.priority}:{}),...(q.assigneeId?{assigneeId:q.assigneeId}:{}),...(q.search?{OR:[{title:{contains:q.search,mode:'insensitive' as const}},{description:{contains:q.search,mode:'insensitive' as const}}]}:{})};
 const [items,total]=await prisma.$transaction([prisma.issue.findMany({where,include:issueInclude,orderBy:{updatedAt:'desc'},skip:(q.page-1)*q.limit,take:q.limit}),prisma.issue.count({where})]);
 res.json({items,total,page:q.page,pages:Math.ceil(total/q.limit)});
}));
app.post('/api/issues',requireAuth,route(async(req,res)=>{
 const v=z.object({projectId:z.string(),title:z.string().min(3).max(180),description:z.string().max(10000).default(''),status:z.enum(['BACKLOG','TODO','IN_PROGRESS','IN_REVIEW','DONE']).default('TODO'),priority:z.enum(['LOW','MEDIUM','HIGH','URGENT']).default('MEDIUM'),assigneeId:z.string().nullable().optional(),labels:z.array(z.string().max(30)).max(10).default([])}).parse(req.body);
 const project=await prisma.project.findUnique({where:{id:v.projectId}});if(!project)return fail(res,'Project not found',404);
 const m=await workspaceRole(req.userId!,project.workspaceId);if(!m||!canWriteIssues(m.role))return fail(res,'Forbidden',403);
 if(v.assigneeId&&!await workspaceRole(v.assigneeId,project.workspaceId))return fail(res,'Assignee is not a workspace member');
 const issue=await prisma.issue.create({data:{...v,reporterId:req.userId!},include:issueInclude});
 await prisma.activity.create({data:{issueId:issue.id,actorId:req.userId!,action:'created',detail:'Issue created'}});await invalidateWorkspace(project.workspaceId);io.to(`workspace:${project.workspaceId}`).emit('issue:created',issue);res.status(201).json(issue);
}));
app.get('/api/issues/:id',requireAuth,route(async(req,res)=>{
 const access=await canAccessIssue(req.userId!,req.params.id);if(!access)return fail(res,'Not found',404);
 res.json(await prisma.issue.findUnique({where:{id:req.params.id},include:{...issueInclude,comments:{include:{author:{select:userView}},orderBy:{createdAt:'asc'}},activities:{orderBy:{createdAt:'desc'},take:30}}}));
}));
app.patch('/api/issues/:id',requireAuth,route(async(req,res)=>{
 const access=await canAccessIssue(req.userId!,req.params.id);if(!access)return fail(res,'Not found',404);
 if(!canWriteIssues(access.membership.role))return fail(res,'Forbidden',403);
 const v=z.object({title:z.string().min(3).max(180).optional(),description:z.string().max(10000).optional(),status:z.enum(['BACKLOG','TODO','IN_PROGRESS','IN_REVIEW','DONE']).optional(),priority:z.enum(['LOW','MEDIUM','HIGH','URGENT']).optional(),assigneeId:z.string().nullable().optional(),labels:z.array(z.string()).max(10).optional()}).strict().parse(req.body);
 if(v.assigneeId&&!await workspaceRole(v.assigneeId,access.issue.project.workspaceId))return fail(res,'Assignee is not a workspace member');
 const issue=await prisma.$transaction(async tx=>{
  const updated=await tx.issue.update({where:{id:req.params.id},data:v,include:issueInclude});
  await tx.activity.create({data:{issueId:updated.id,actorId:req.userId!,action:'updated',detail:Object.entries(v).map(([key,value])=>`${key}: ${String((access.issue as any)[key]??'none')} → ${String(value??'none')}`).join(' | ').slice(0,2000)}});return updated;
 });
 await invalidateWorkspace(access.issue.project.workspaceId);io.to(`workspace:${access.issue.project.workspaceId}`).emit('issue:updated',issue);res.json(issue);
}));
app.delete('/api/issues/:id',requireAuth,route(async(req,res)=>{
 const access=await canAccessIssue(req.userId!,req.params.id);if(!access)return fail(res,'Not found',404);
 if(!canDeleteIssues(access.membership.role))return fail(res,'Admin role required',403);
 await prisma.issue.delete({where:{id:req.params.id}});await invalidateWorkspace(access.issue.project.workspaceId);
 io.to(`workspace:${access.issue.project.workspaceId}`).emit('issue:deleted',{id:req.params.id});res.status(204).end();
}));
app.post('/api/issues/:id/comments',requireAuth,route(async(req,res)=>{
 const access=await canAccessIssue(req.userId!,req.params.id);if(!access)return fail(res,'Not found',404);
 if(!canWriteIssues(access.membership.role))return fail(res,'Forbidden',403);
 const {body}=z.object({body:z.string().min(1).max(5000)}).parse(req.body);
 const comment=await prisma.comment.create({data:{body,issueId:req.params.id,authorId:req.userId!},include:{author:{select:userView}}});
 await prisma.activity.create({data:{issueId:req.params.id,actorId:req.userId!,action:'commented',detail:'Added a comment'}});io.to(`workspace:${access.issue.project.workspaceId}`).emit('comment:created',{issueId:req.params.id,comment});res.status(201).json(comment);
}));

// Audit activity is scoped to the requester's workspace, never globally accessible.
app.get('/api/activity',requireAuth,route(async(req,res)=>{
 const q=z.object({workspaceId:z.string(),limit:z.coerce.number().int().min(1).max(100).default(40)}).parse(req.query);
 if(!await workspaceRole(req.userId!,q.workspaceId))return fail(res,'Forbidden',403);
 const activities=await prisma.activity.findMany({where:{issue:{project:{workspaceId:q.workspaceId}}},orderBy:{createdAt:'desc'},take:q.limit,include:{issue:{select:{number:true,title:true,project:{select:{key:true,name:true}}}},}});
 const userIds=[...new Set(activities.map(a=>a.actorId))];
 const people=await prisma.user.findMany({where:{id:{in:userIds}},select:userView});
 const byId=new Map(people.map(u=>[u.id,u]));
 res.json(activities.map(a=>({...a,actor:byId.get(a.actorId)||null})));
}));
// A bounded, workspace-scoped cycle-time metric. Uses issue creation-to-completion
// as a demo proxy; production systems should record the first in-progress transition.
app.get('/api/analytics/engineering',requireAuth,route(async(req,res)=>{
 const workspaceId=z.string().parse(req.query.workspaceId);
 if(!await workspaceRole(req.userId!,workspaceId))return fail(res,'Forbidden',403);
 const issues=await prisma.issue.findMany({where:{project:{workspaceId}},select:{id:true,status:true,priority:true,createdAt:true,updatedAt:true,assigneeId:true,projectId:true}});
 const done=issues.filter(i=>i.status==='DONE');
 const averageDays=done.length?Number((done.reduce((sum,i)=>sum+Math.max(0,i.updatedAt.getTime()-i.createdAt.getTime())/86400000,0)/done.length).toFixed(2)):0;
 const workload:Record<string,number>={};for(const issue of issues.filter(i=>i.status!=='DONE'&&i.assigneeId))workload[issue.assigneeId!]=(workload[issue.assigneeId!]||0)+1;
 const people=await prisma.user.findMany({where:{id:{in:Object.keys(workload)}},select:userView});
 res.json({averageResolutionDays:averageDays,completed:done.length,open:issues.length-done.length,workload:people.map(u=>({name:u.name,count:workload[u.id]})),note:'Resolution proxy is creation-to-last-update for completed issues; not a measured cycle time.'});
}));
// Provides visibility into caching without exposing keys or sensitive data.
app.get('/api/diagnostics/cache',requireAuth,route(async(req,res)=>{
 const workspaceId=z.string().parse(req.query.workspaceId);
 const m=await workspaceRole(req.userId!,workspaceId);if(!m||!canManageMembers(m.role))return fail(res,'Admin role required',403);
 const {cacheMetrics}=await import('./config');res.json({...cacheMetrics});
}));
app.get('/api/analytics',requireAuth,route(async(req,res)=>{
 const workspaceId=z.string().parse(req.query.workspaceId);if(!await workspaceRole(req.userId!,workspaceId))return fail(res,'Forbidden',403);
 res.json(await cached(`analytics:${workspaceId}`,30,async()=>{
  const where={project:{workspaceId}};
  const [total,byStatus,byPriority,projects,recent]=await Promise.all([
   prisma.issue.count({where}),prisma.issue.groupBy({by:['status'],where,_count:{_all:true}}),prisma.issue.groupBy({by:['priority'],where,_count:{_all:true}}),
   prisma.project.findMany({where:{workspaceId},include:{_count:{select:{issues:true}}}}),
   prisma.issue.findMany({where,orderBy:{createdAt:'desc'},take:8,include:issueInclude})]);
  const done=byStatus.find(s=>s.status==='DONE')?._count._all||0;
  return {total,done,completionRate:total?Math.round(done/total*100):0,active:total-done,byStatus:byStatus.map(s=>({name:s.status,count:s._count._all})),byPriority:byPriority.map(s=>({name:s.priority,count:s._count._all})),projects:projects.map(p=>({id:p.id,name:p.name,key:p.key,count:p._count.issues,color:p.color})),recent};
 }));
}));
io.use(async(socket,next)=>{
 try{const bearer=socket.handshake.auth?.token;if(typeof bearer!=='string')throw Error();const payload=jwt.verify(bearer,secret) as jwt.JwtPayload;if(typeof payload.sub!=='string')throw Error();socket.data.userId=payload.sub;next();}catch{next(new Error('Unauthorized'));}
});
io.on('connection',socket=>{socket.on('workspace:join',async(id:string,ack?:Function)=>{
  if(typeof id!=='string')return;
  try{if(await workspaceRole(socket.data.userId,id)){socket.join(`workspace:${id}`);ack?.({ok:true});}else ack?.({ok:false});}catch{ack?.({ok:false});}
 });});
app.use((err:Error,req:Request,res:Response,_next:NextFunction)=>{
 req.log?.error({err},'request failed');if(err instanceof ZodError){res.status(400).json({error:'Validation failed',details:err.flatten()});return;}
 if((err as any).code==='P2002'){res.status(409).json({error:'Record already exists'});return;}
 res.status(500).json({error:'Internal server error'});
});
const port=Number(process.env.PORT||4000);server.listen(port,()=>console.log(`SprintForge API listening on ${port}`));
process.on('SIGTERM',async()=>{server.close();await prisma.$disconnect();process.exit(0)});

import 'dotenv/config';
import {PrismaClient} from '@prisma/client';import bcrypt from 'bcryptjs';
const db=new PrismaClient();
async function main(){
 const passwordHash=await bcrypt.hash('Demo12345!',12);
 const names=[['Alex Morgan','alex@sprintforge.dev'],['Jordan Lee','jordan@sprintforge.dev'],['Taylor Kim','taylor@sprintforge.dev'],['Sam Rivera','sam@sprintforge.dev']];
 const users=[];
 for(const [name,email] of names)users.push(await db.user.upsert({where:{email},create:{name,email,passwordHash},update:{passwordHash}}));
 let ws=await db.workspace.findUnique({where:{slug:'acme-engineering'}});
 if(!ws)ws=await db.workspace.create({data:{name:'Acme Engineering',slug:'acme-engineering'}});
 for(let i=0;i<users.length;i++)await db.membership.upsert({where:{userId_workspaceId:{userId:users[i].id,workspaceId:ws.id}},create:{userId:users[i].id,workspaceId:ws.id,role:i===0?'OWNER':i===1?'ADMIN':'MEMBER'},update:{}});
 const defs=[['PLAT','Platform Infrastructure','#6366f1'],['WEB','Web Experience','#0ea5e9'],['MOB','Mobile Application','#f59e0b']];
 const projects=[];
 for(const [key,name,color] of defs)projects.push(await db.project.upsert({where:{workspaceId_key:{workspaceId:ws.id,key}},create:{workspaceId:ws.id,key,name,color,description:`${name} roadmap and delivery`},update:{}}));
 const titles=['Implement OAuth sign-in flow','Optimize dashboard SQL queries','Build notification preferences','Add keyboard shortcuts','Design sprint velocity chart','Fix mobile navigation overflow','Create audit log endpoints','Improve API error handling','Add dark mode preferences','Build reusable issue filters','Implement WebSocket reconnection','Add export to CSV feature','Write integration tests for RBAC','Set up CI pipeline checks','Build user profile settings','Improve accessibility labels','Add issue comment mentions','Create release overview page','Cache analytics aggregates','Review dependency vulnerabilities','Add workspace invitations','Improve pagination UX','Build activity timeline','Refactor project settings','Document REST API endpoints','Implement search debouncing','Add due date reminders','Improve empty states','Add team workload chart','Test concurrent issue edits','Create dashboard onboarding','Add project color picker','Fix status transition bug','Implement assignee search','Improve loading skeletons','Add priority quick edit'];
 const statuses=['BACKLOG','TODO','IN_PROGRESS','IN_REVIEW','DONE'] as const;const priorities=['LOW','MEDIUM','HIGH','URGENT'] as const;
 for(let i=0;i<titles.length;i++){
  const project=projects[i%projects.length];
  const existing=await db.issue.findFirst({where:{projectId:project.id,title:titles[i]}});if(existing)continue;
  const issue=await db.issue.create({data:{title:titles[i],description:`Deliver ${titles[i].toLowerCase()} with test coverage, documentation, and acceptance criteria.`,projectId:project.id,reporterId:users[0].id,assigneeId:users[(i%3)+1].id,status:statuses[(i*3)%5],priority:priorities[(i*7)%4],labels:[i%2?'frontend':'backend',i%3?'feature':'improvement']}});
  if(i%4===0)await db.comment.create({data:{issueId:issue.id,authorId:users[1].id,body:'Looks good. Please include a regression test before merging.'}});
 }
 console.log('Seed complete. Demo login: alex@sprintforge.dev / Demo12345!');
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>db.$disconnect());

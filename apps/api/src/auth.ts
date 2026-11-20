import {Request,Response,NextFunction} from 'express';
import jwt from 'jsonwebtoken';
import {prisma,secret} from './config';
export type AuthRequest=Request & {userId?:string};
export function token(id:string){return jwt.sign({sub:id},secret,{expiresIn:'2h'});}
export function requireAuth(req:AuthRequest,res:Response,next:NextFunction){
 const bearer=req.headers.authorization?.match(/^Bearer (.+)$/);
 if(!bearer){res.status(401).json({error:'Authentication required'});return;}
 try{const payload=jwt.verify(bearer[1],secret) as jwt.JwtPayload;if(typeof payload.sub!=='string')throw Error();req.userId=payload.sub;next();}catch{res.status(401).json({error:'Invalid or expired token'});}
}
export async function workspaceRole(userId:string,workspaceId:string){return prisma.membership.findUnique({where:{userId_workspaceId:{userId,workspaceId}}});}
export async function canAccessIssue(userId:string,issueId:string){const issue=await prisma.issue.findUnique({where:{id:issueId},include:{project:true}});if(!issue)return null;const membership=await workspaceRole(userId,issue.project.workspaceId);return membership?{issue,membership}:null;}

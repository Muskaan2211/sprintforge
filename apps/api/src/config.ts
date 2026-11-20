import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
export const prisma = new PrismaClient();
export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {lazyConnect:true,maxRetriesPerRequest:1});
redis.on('error',()=>{});
export const secret = process.env.JWT_SECRET || 'local-development-secret-change-before-deploying-123456';
if(process.env.NODE_ENV==='production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length<32)) throw new Error('Set a strong JWT_SECRET');
export const cacheMetrics={hits:0,misses:0,writeFailures:0};
export async function cached<T>(key:string,ttl:number,load:()=>Promise<T>):Promise<T>{
 try {if(redis.status==='wait') await redis.connect(); const v=await redis.get(key);if(v){cacheMetrics.hits++;return JSON.parse(v) as T;}}catch{}
 cacheMetrics.misses++;const value=await load();try{if(redis.status==='wait')await redis.connect();await redis.set(key,JSON.stringify(value),'EX',ttl);}catch{cacheMetrics.writeFailures++}return value;
}
export async function invalidateWorkspace(id:string){try{await redis.del(`analytics:${id}`)}catch{}}

export const API=process.env.NEXT_PUBLIC_API_URL||'http://localhost:4000';
export type User={id:string;name:string;email:string;avatarColor:string};
export type Workspace={id:string;name:string;slug:string};
export type Project={id:string;name:string;key:string;color:string;description:string;_count?:{issues:number}};
export type Issue={id:string;number:number;title:string;description:string;status:string;priority:string;labels:string[];updatedAt:string;createdAt:string;assignee:User|null;assigneeId:string|null;reporter:User;project:Project;_count?:{comments:number}};
export type Analytics={total:number;done:number;active:number;completionRate:number;byStatus:{name:string;count:number}[];byPriority:{name:string;count:number}[];projects:{id:string;name:string;key:string;count:number;color:string}[];recent:Issue[]};
export function getToken(){return typeof window!=='undefined'?localStorage.getItem('sf_token'):null}
export async function api<T>(path:string,options:RequestInit={}):Promise<T>{
 const token=getToken();const response=await fetch(`${API}/api${path}`,{...options,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`} :{}),...options.headers},cache:'no-store'});
 if(!response.ok){let message='Request failed';try{message=(await response.json()).error||message}catch{}if(response.status===401&&typeof window!=='undefined'&&!path.startsWith('/auth/')){localStorage.removeItem('sf_token');window.location.href='/login'}throw new Error(message)}
 if(response.status===204)return undefined as T;return response.json() as Promise<T>;
}
export const statuses=['BACKLOG','TODO','IN_PROGRESS','IN_REVIEW','DONE'];
export const priorities=['LOW','MEDIUM','HIGH','URGENT'];
export const nice=(v:string)=>v.replaceAll('_',' ').toLowerCase().replace(/\b\w/g,s=>s.toUpperCase());
export const statusColors:Record<string,string>={BACKLOG:'bg-slate-100 text-slate-600',TODO:'bg-sky-50 text-sky-700',IN_PROGRESS:'bg-indigo-50 text-indigo-700',IN_REVIEW:'bg-amber-50 text-amber-700',DONE:'bg-emerald-50 text-emerald-700'};
export const priorityColors:Record<string,string>={LOW:'text-slate-500',MEDIUM:'text-blue-600',HIGH:'text-orange-600',URGENT:'text-rose-600'};

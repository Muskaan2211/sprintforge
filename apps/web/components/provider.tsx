"use client";
import React,{createContext,useContext,useEffect,useState,useCallback} from 'react';
import {useRouter,usePathname} from 'next/navigation';
import {io,Socket} from 'socket.io-client';
import {Toaster} from 'sonner';
import {api,getToken,User,Workspace} from '@/lib/api';
type Ctx={user:User|null;workspace:Workspace|null;workspaces:Workspace[];loading:boolean;refresh:()=>Promise<void>;logout:()=>void;socket:Socket|null};
const Context=createContext<Ctx>({user:null,workspace:null,workspaces:[],loading:true,refresh:async()=>{},logout:()=>{},socket:null});
export const useApp=()=>useContext(Context);
export function Provider({children}:{children:React.ReactNode}){
 const [user,setUser]=useState<User|null>(null),[workspaces,setWorkspaces]=useState<Workspace[]>([]),[workspace,setWorkspace]=useState<Workspace|null>(null),[loading,setLoading]=useState(true),[socket,setSocket]=useState<Socket|null>(null);
 const router=useRouter(),path=usePathname();
 const refresh=useCallback(async()=>{
  if(!getToken()){setLoading(false);return;}
  try{const [u,ws]=await Promise.all([api<User>('/me'),api<Workspace[]>('/workspaces')]);setUser(u);setWorkspaces(ws);setWorkspace(current=>ws.find(x=>x.id===current?.id)||ws[0]||null)}catch{setUser(null)}finally{setLoading(false)}
 },[]);
 useEffect(()=>{refresh()},[refresh]);
 useEffect(()=>{if(!loading&&!user&&path!=='/login')router.replace('/login')},[loading,user,path,router]);
 useEffect(()=>{if(!user||!workspace)return;const s=io(process.env.NEXT_PUBLIC_SOCKET_URL||'http://localhost:4000',{auth:{token:getToken()},transports:['websocket','polling']});s.on('connect',()=>s.emit('workspace:join',workspace.id));setSocket(s);return()=>{s.disconnect();setSocket(null)}},[user,workspace]);
 const logout=()=>{localStorage.removeItem('sf_token');setUser(null);setWorkspace(null);router.push('/login')};
 return <Context.Provider value={{user,workspace,workspaces,loading,refresh,logout,socket}}>{children}<Toaster richColors position="bottom-right"/></Context.Provider>;
}

import type {MemberInfo} from './member-properties';
type Save=(info:MemberInfo)=>Promise<{error?:string;message?:string}>;
const same=(a:MemberInfo,b:MemberInfo)=>JSON.stringify(a)===JSON.stringify(b);
export class MemberInfoAutosave{
 private snapshot:{info:MemberInfo;saved:MemberInfo;pending:boolean;error:string};
 private listeners=new Set<()=>void>();
 private timer:ReturnType<typeof setTimeout>|undefined;
 private request:Promise<boolean>|null=null;
 constructor(initial:MemberInfo,private save:Save,private delay=700){this.snapshot={info:initial,saved:initial,pending:false,error:''};}
 getSnapshot=()=>this.snapshot;
 subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener);};};
 get dirty(){return !same(this.snapshot.info,this.snapshot.saved);}
 private emit(patch:Partial<typeof this.snapshot>){this.snapshot={...this.snapshot,...patch};this.listeners.forEach(fn=>fn());}
 cancel(){if(this.timer!==undefined)clearTimeout(this.timer);this.timer=undefined;}
 edit(info:MemberInfo){this.cancel();this.emit({info,error:''});if(this.dirty)this.timer=setTimeout(()=>{void this.flush();},this.delay);}
 async flush():Promise<boolean>{
  this.cancel();
  if(this.request&&!await this.request)return false;
  while(this.dirty){
   if(this.request){if(!await this.request)return false;continue;}
   const info=this.snapshot.info;this.emit({pending:true,error:''});
   this.request=Promise.resolve().then(()=>this.save(info)).then(result=>{
    if(result.error){this.cancel();this.emit({error:result.error});return false;}
    this.emit({saved:info});return true;
   }).catch(()=>{this.cancel();this.emit({error:'Unable to save. Your edits are still here. Please retry.'});return false;}).finally(()=>{this.request=null;this.emit({pending:false});});
   if(!await this.request)return false;
  }
  this.cancel();return true;
 }
}

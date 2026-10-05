import type {PropertyDraft,PropertyRecord} from './schema';
type SaveResult={ok:true;record:PropertyRecord}|{ok:false;error:string};
export type SaveDraft=(id:string,version:number,draft:PropertyDraft)=>Promise<SaveResult>;
type Snapshot={record:PropertyRecord;draft:PropertyDraft;saving:boolean;error:string};
const same=(a:PropertyDraft,b:PropertyDraft)=>JSON.stringify(a)===JSON.stringify(b);

// One request at a time, always using the version returned by the previous save.
export class PropertyAutosave {
 private snapshot:Snapshot;
 private listeners=new Set<()=>void>();
 private timer:ReturnType<typeof setTimeout>|undefined;
 private inFlight:Promise<boolean>|null=null;
 private paused=false;
 private active=true;
 constructor(initial:PropertyRecord,private save:SaveDraft,private delay=800){this.snapshot={record:initial,draft:initial.draft,saving:false,error:''};}
 getSnapshot=()=>this.snapshot;
 subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener);};};
 get dirty(){return !same(this.snapshot.draft,this.snapshot.record.draft);}
 private emit(patch:Partial<Snapshot>){this.snapshot={...this.snapshot,...patch};this.listeners.forEach(fn=>fn());}
 private cancel(){if(this.timer!==undefined)clearTimeout(this.timer);this.timer=undefined;}
 private schedule(){this.cancel();if(this.active&&!this.paused&&this.dirty)this.timer=setTimeout(()=>{void this.flush();},this.delay);}
 start(){this.active=true;this.schedule();}
 stop(){this.active=false;this.cancel();}
 setPaused(value:boolean){this.paused=value;if(value)this.cancel();else if(!this.snapshot.error)this.schedule();}
 edit(update:(draft:PropertyDraft)=>PropertyDraft){this.emit({draft:update(this.snapshot.draft),error:''});this.schedule();}
 accept(record:PropertyRecord){this.cancel();this.emit({record,draft:record.draft,error:''});}
 private saveOne():Promise<boolean>{
  if(this.inFlight)return this.inFlight;
  const {record,draft}=this.snapshot;
  this.emit({saving:true,error:''});
  this.inFlight=(async()=>{
   try{
    const result=await Promise.resolve().then(()=>this.save(record.id,record.version,draft));
    if(!result.ok){this.cancel();this.emit({error:result.error});return false;}
    // A slow response must never replace characters typed after this request began.
    this.emit({record:result.record,draft:same(this.snapshot.draft,draft)?result.record.draft:this.snapshot.draft});
    return true;
   }catch{this.cancel();this.emit({error:'Unable to save your draft. Your edits are still here. Check your connection and retry.'});return false;}
   finally{this.inFlight=null;this.emit({saving:false});}
  })();
  return this.inFlight;
 }
 async flush():Promise<boolean>{
  this.cancel();
  if(this.paused)return !this.dirty&&!this.snapshot.saving;
  if(this.inFlight&&!await this.inFlight)return false;
  while(this.dirty){
   if(this.paused||!this.active)return false;
   if(!await this.saveOne())return false;
  }
  this.cancel();return true;
 }
}

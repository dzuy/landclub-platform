import {z} from 'zod';
import {notionRowSchema} from './notion-property-import';
export class NotionSyncError extends Error{}
const rich=z.array(z.object({plain_text:z.string()}));
const textProperty=z.object({type:z.literal('rich_text'),rich_text:rich});
const selections=z.object({type:z.literal('multi_select'),multi_select:z.array(z.object({name:z.string()}))});
const pageSchema=z.object({object:z.literal('page'),id:z.string(),url:z.url(),last_edited_time:z.string(),archived:z.boolean().optional(),in_trash:z.boolean().optional(),properties:z.object({Name:z.object({type:z.literal('title'),title:rich}),Location:textProperty,Acreage:textProperty,Status:selections,Tags:selections,'Existing Structures':selections})});
const responseSchema=z.object({object:z.literal('list'),results:z.array(pageSchema),has_more:z.boolean(),next_cursor:z.string().nullable()});
export type LiveNotionRow=z.infer<typeof notionRowSchema>&{lastEditedAt:string};
export async function fetchNotionProperties({token=process.env.NOTION_TOKEN,dataSourceId=process.env.NOTION_DATA_SOURCE_ID,request=fetch}:{token?:string;dataSourceId?:string;request?:typeof fetch}={}){
 if(!token)throw new NotionSyncError('Notion sync is not connected. Set the server-only NOTION_TOKEN and grant that connection read access to the Properties database.');
 if(!dataSourceId)throw new NotionSyncError('Notion sync is not connected. Set the server-only NOTION_DATA_SOURCE_ID for the Properties database.');
 if(!/^[a-f0-9-]{32,36}$/i.test(dataSourceId))throw new NotionSyncError('NOTION_DATA_SOURCE_ID is invalid.');
 const rows:LiveNotionRow[]=[],cursors=new Set<string>(),ids=new Set<string>();let cursor:string|undefined;
 // Complete and validate every page before the caller is allowed to mutate records.
 do{
  let response:Response;
  try{response=await request(`https://api.notion.com/v1/data_sources/${dataSourceId}/query`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Notion-Version':'2025-09-03','Content-Type':'application/json'},body:JSON.stringify({page_size:100,...(cursor?{start_cursor:cursor}:{})}),cache:'no-store',signal:AbortSignal.timeout(15000),redirect:'error'});}catch{throw new NotionSyncError('Could not reach Notion. No property data was changed; try again.');}
  if(!response.ok)throw new NotionSyncError(response.status===429?'Notion is rate limiting requests. Wait a moment and try again. No property data was changed.':response.status===401||response.status===403||response.status===404?'Notion access failed. Check the server token, data source ID and database connection permissions. No property data was changed.':'Notion returned an error. No property data was changed; try again.');
  const parsed=responseSchema.safeParse(await response.json().catch(()=>null));
  if(!parsed.success)throw new NotionSyncError('Notion’s property fields differ from the configured mapping. No data was changed. Expected Name, Location, Acreage, Status, Tags and Existing Structures.');
  for(const p of parsed.data.results){
   const id=p.id.replaceAll('-','').toLowerCase();if(ids.has(id))throw new NotionSyncError('Notion returned duplicate page IDs. No data was changed; retry the sync.');ids.add(id);
   const props=p.properties,name=props.Name.title.map(v=>v.plain_text).join('');
   if(p.archived||p.in_trash||/^Template(?:\s|—|-)/i.test(name))continue;
   const row=notionRowSchema.safeParse({pageId:id,url:p.url,name,location:props.Location.rich_text.map(v=>v.plain_text).join(''),acreage:props.Acreage.rich_text.map(v=>v.plain_text).join(''),status:props.Status.multi_select.map(v=>v.name),tags:props.Tags.multi_select.map(v=>v.name),existingStructures:props['Existing Structures'].multi_select.map(v=>v.name)});
   if(!row.success)throw new NotionSyncError('A Notion property has an invalid ID or missing name. No data was changed.');
   rows.push({...row.data,lastEditedAt:p.last_edited_time});
  }
  if(!parsed.data.has_more)break;
  if(!parsed.data.next_cursor||cursors.has(parsed.data.next_cursor)||cursors.size>=100)throw new NotionSyncError('Notion pagination could not complete. No data was changed.');
  cursor=parsed.data.next_cursor;cursors.add(cursor);
 }while(true);
 return {rows,dataSourceId:dataSourceId.replaceAll('-','').toLowerCase()};
}

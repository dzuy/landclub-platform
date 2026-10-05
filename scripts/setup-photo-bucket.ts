import {photoSupabaseClient} from '../src/lib/photo-object-storage';
import {MAX_PHOTO_BYTES,PHOTO_SIZE_LABEL,PHOTO_MIME_TYPES,photoBucketIssues} from '../src/lib/photo-policy';
// Explicit project identity; never provision a similarly named or newly selected project.
const verifiedProject='sfrdfzxxbhcmvjgxbshp';
async function main(){
 if(process.env.SUPABASE_URL!==`https://${verifiedProject}.supabase.co`)throw new Error('Expected the verified Land Club project.');
 const client=photoSupabaseClient(),name='property-photos';
 const {data:buckets,error}=await client.storage.listBuckets();
 if(error)throw new Error('Bucket inspection failed.');
 const existing=buckets.find(b=>b.id===name);
 if(existing){
  const {data:bucket,error:readError}=await client.storage.getBucket(name);
  if(readError||!bucket)throw new Error('Bucket configuration inspection failed.');
  const issues=photoBucketIssues(bucket);
  if(issues.length){console.error('Existing bucket configuration needs review. '+issues.join(' ')+' No configuration changed.');process.exitCode=1;return;}
  console.log(`Verified existing private property-photos bucket: ${MAX_PHOTO_BYTES} bytes (${PHOTO_SIZE_LABEL}), JPG/PNG/GIF/WebP. No configuration changed.`);return;
 }
 if(!process.argv.includes('--apply')){console.log(`Dry run: would create private property-photos bucket (${MAX_PHOTO_BYTES} bytes / ${PHOTO_SIZE_LABEL}, JPG/PNG/GIF/WebP).`);return;}
 const {error:createError}=await client.storage.createBucket(name,{public:false,fileSizeLimit:MAX_PHOTO_BYTES,allowedMimeTypes:PHOTO_MIME_TYPES});
 if(createError)throw new Error('Bucket creation failed.');
 const {data:created,error:verifyError}=await client.storage.getBucket(name);
 if(verifyError||!created)throw new Error('Bucket creation could not be verified.');
 const issues=photoBucketIssues(created);
 if(issues.length){console.error('Created bucket configuration needs review. '+issues.join(' '));process.exitCode=1;return;}
 console.log(`Created and verified private property-photos bucket: ${MAX_PHOTO_BYTES} bytes (${PHOTO_SIZE_LABEL}), JPG/PNG/GIF/WebP. No public access policies added.`);
}
main().catch(()=>{console.error('Bucket setup blocked. Verify approved server-side access and Land Club project configuration.');process.exitCode=1;});

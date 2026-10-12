// Use curated messages instead of forwarding provider errors that may contain credentials.
export function imageGenerationError(status:number,body:unknown){
 const error=body&&typeof body==='object'&&'error' in body?body.error:null;
 const code=error&&typeof error==='object'&&'code' in error?error.code:null;
 const type=error&&typeof error==='object'&&'type' in error?error.type:null;
 if(code==='credit_balance_exhausted')return 'The OpenAI API account has no credits remaining. Add credits in OpenAI billing, then try again.';
 if(code==='billing_hard_limit_reached'||code==='organization_spend_limit_exceeded'||code==='project_spend_limit_exceeded')return 'The OpenAI API spending limit has been reached. Check the project and organization billing limits before trying again.';
 if(type==='insufficient_quota'||code==='insufficient_quota'||code==='organization_usage_limit_exceeded')return 'The OpenAI API account has insufficient quota. Check its credits and usage limits before trying again.';
 if(status===401)return 'OpenAI rejected the API key. Check the server’s OPENAI_API_KEY setting.';
 if(status===403)return 'This OpenAI API project cannot generate images with the configured model. Check model access and organization verification.';
 if(code==='content_policy_violation'||code==='moderation_blocked')return 'OpenAI could not generate this image under its content policy. Revise the image description and try again.';
 if(status===429)return 'OpenAI is receiving too many requests. Wait a moment, then try again.';
 if(status>=500)return 'OpenAI image generation is temporarily unavailable. Try again shortly.';
 return 'OpenAI could not generate the image. Check the image description and configured model, or upload a photo.';
}

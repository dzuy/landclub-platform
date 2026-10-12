import test from 'node:test';
import assert from 'node:assert/strict';
import {imageGenerationError} from '../src/lib/image-generation-error';

test('exhausted credits and spending limits are distinguished from retryable rate limits',()=>{
 assert.match(imageGenerationError(429,{error:{code:'credit_balance_exhausted',type:'insufficient_quota'}}),/no credits remaining/);
 assert.match(imageGenerationError(429,{error:{code:'project_spend_limit_exceeded',type:'insufficient_quota'}}),/spending limit/);
 assert.match(imageGenerationError(429,{error:{code:'rate_limit_exceeded'}}),/Wait a moment/);
});
test('provider error text is never exposed, even for malformed responses',()=>{
 const secret='sk-secret-example';
 assert.doesNotMatch(imageGenerationError(401,{error:{message:secret}}),new RegExp(secret));
 assert.match(imageGenerationError(503,null),/temporarily unavailable/);
 assert.match(imageGenerationError(400,'invalid JSON'),/could not generate/);
});

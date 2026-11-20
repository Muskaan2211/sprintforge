import {describe,it,expect} from 'vitest';
import jwt from 'jsonwebtoken';
import {token} from './auth';import {secret} from './config';
describe('JWT helper',()=>{
 it('signs a token with the correct subject and expiry',()=>{
  const payload=jwt.verify(token('test-user'),secret) as jwt.JwtPayload;
  expect(payload.sub).toBe('test-user');expect(payload.exp).toBeGreaterThan(payload.iat||0);
 });
 it('rejects a modified signature',()=>{
  const value=token('test-user');expect(()=>jwt.verify(value+'extra',secret)).toThrow();
 });
});

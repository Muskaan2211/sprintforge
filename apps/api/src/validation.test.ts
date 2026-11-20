import {describe,it,expect} from 'vitest';
import {z} from 'zod';
describe('issue input constraints',()=>{const schema=z.object({title:z.string().min(3).max(180),priority:z.enum(['LOW','MEDIUM','HIGH','URGENT'])});it('accepts a valid issue',()=>expect(schema.safeParse({title:'Fix navigation',priority:'HIGH'}).success).toBe(true));it('rejects invalid priority',()=>expect(schema.safeParse({title:'Fix navigation',priority:'CRITICAL'}).success).toBe(false));it('rejects empty title',()=>expect(schema.safeParse({title:'',priority:'LOW'}).success).toBe(false));});

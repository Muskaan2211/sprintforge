import {describe,it,expect} from 'vitest';
import {canManageMembers,canWriteIssues,canDeleteIssues,hasWorkspaceAccess} from './permissions';
describe('workspace permission matrix',()=>{
 it.each(['OWNER','ADMIN'] as const)('%s can administer workspace and delete issues',role=>{
   expect(canManageMembers(role)).toBe(true);expect(canDeleteIssues(role)).toBe(true);expect(canWriteIssues(role)).toBe(true);
 });
 it('MEMBER can write, not administer or delete',()=>{
  expect(canWriteIssues('MEMBER')).toBe(true);expect(canManageMembers('MEMBER')).toBe(false);expect(canDeleteIssues('MEMBER')).toBe(false);
 });
 it('VIEWER is read only',()=>{
  expect(canWriteIssues('VIEWER')).toBe(false);expect(canManageMembers('VIEWER')).toBe(false);expect(canDeleteIssues('VIEWER')).toBe(false);
 });
 it('nonmembers cannot access workspaces',()=>{expect(hasWorkspaceAccess(null)).toBe(false);expect(hasWorkspaceAccess(undefined)).toBe(false)});
});

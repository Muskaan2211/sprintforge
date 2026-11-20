import type {Role} from '@prisma/client';
export function canManageMembers(role:Role){return role==='OWNER'||role==='ADMIN'}
export function canWriteIssues(role:Role){return role!=='VIEWER'}
export function canDeleteIssues(role:Role){return role==='OWNER'||role==='ADMIN'}
export function hasWorkspaceAccess(role:Role|null|undefined){return role!==null&&role!==undefined}

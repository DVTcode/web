//Còn lib/authz.ts hiện tại là file “nặng”, gắn với:
//session
//auth
//database
//nên không phù hợp để unit test trực tiếp nếu chưa mock hết.
export type ProjectRole = 'MANAGER' | 'LEAD' | 'MEMBER' | 'REVIEWER' | 'VIEWER';

const ROLE_RANK: Record<ProjectRole, number> = {
    MANAGER: 50,
    LEAD: 40,
    MEMBER: 30,
    REVIEWER: 20,
    VIEWER: 10,
};

export function expandAllowed(allowed: ProjectRole[]): ProjectRole[] {
    const min = Math.min(...allowed.map((r) => ROLE_RANK[r]));
    return (Object.keys(ROLE_RANK) as ProjectRole[]).filter((r) => ROLE_RANK[r] >= min);
}
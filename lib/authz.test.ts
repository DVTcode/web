import { describe, it, expect } from 'vitest';
import { expandAllowed, type ProjectRole } from './authz-utils';

describe('Authz Module: expandAllowed', () => {
    it('nên mở rộng quyền VIEWER ra tất cả các quyền phía trên', () => {
        const input: ProjectRole[] = ['VIEWER'];
        const result = expandAllowed(input);

        expect(result).toEqual(['MANAGER', 'LEAD', 'MEMBER', 'REVIEWER', 'VIEWER']);
        expect(result.length).toBe(5);
    });

    it('nên mở rộng quyền MEMBER ra các quyền quản lý và MEMBER', () => {
        const input: ProjectRole[] = ['MEMBER'];
        const result = expandAllowed(input);

        expect(result).toEqual(['MANAGER', 'LEAD', 'MEMBER']);
        expect(result).not.toContain('VIEWER');
        expect(result).not.toContain('REVIEWER');
    });

    it('nên chỉ trả ra MANAGER nếu truyền vào đúng MANAGER', () => {
        const input: ProjectRole[] = ['MANAGER'];
        const result = expandAllowed(input);

        expect(result).toEqual(['MANAGER']);
        expect(result.length).toBe(1);
    });

    it('nên lấy theo quyền thấp nhất nếu truyền mảng nhiều quyền', () => {
        const input: ProjectRole[] = ['LEAD', 'REVIEWER'];
        const result = expandAllowed(input);

        expect(result).toContain('MANAGER');
        expect(result).toContain('LEAD');
        expect(result).toContain('MEMBER');
        expect(result).toContain('REVIEWER');
        expect(result).not.toContain('VIEWER');
    });
});
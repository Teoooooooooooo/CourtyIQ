/**
 * openChallenges store unit tests — no DB, no HTTP required
 */

const oc = require('../src/utils/openChallenges');

const FUTURE = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(); // tomorrow
const PAST   = new Date(Date.now() - 1000 * 60 * 60).toISOString();      // 1hr ago

beforeEach(() => oc._reset());

describe('create', () => {
    it('returns a challenge with status "open"', () => {
        const c = oc.create('user-1', 'Alice', FUTURE, 'Looking for a game!');
        expect(c.id).toBeTruthy();
        expect(c.fromUserId).toBe('user-1');
        expect(c.fromUserName).toBe('Alice');
        expect(c.status).toBe('open');
        expect(c.message).toBe('Looking for a game!');
    });

    it('defaults message to empty string', () => {
        const c = oc.create('user-1', 'Alice', FUTURE);
        expect(c.message).toBe('');
    });
});

describe('list', () => {
    it('returns open future challenges', () => {
        oc.create('user-1', 'Alice', FUTURE);
        expect(oc.list()).toHaveLength(1);
    });

    it('filters out past challenges', () => {
        oc.create('user-1', 'Alice', PAST);
        expect(oc.list()).toHaveLength(0);
    });

    it('filters out accepted challenges', () => {
        const c = oc.create('user-1', 'Alice', FUTURE);
        oc.accept(c.id, 'user-2', 'Bob');
        expect(oc.list()).toHaveLength(0);
    });

    it('sorts by proposedTime ascending', () => {
        const later  = new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString();
        const sooner = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
        oc.create('user-1', 'Alice', later);
        oc.create('user-2', 'Bob', sooner);
        const list = oc.list();
        expect(new Date(list[0].proposedTime) <= new Date(list[1].proposedTime)).toBe(true);
    });
});

describe('accept', () => {
    it('marks challenge as accepted', () => {
        const c = oc.create('user-1', 'Alice', FUTURE);
        const result = oc.accept(c.id, 'user-2', 'Bob');
        expect(result.ok).toBe(true);
        expect(result.challenge.status).toBe('accepted');
        expect(result.challenge.acceptedBy).toBe('user-2');
        expect(result.challenge.acceptedByName).toBe('Bob');
    });

    it('rejects if challenge not found', () => {
        const result = oc.accept('nonexistent-id', 'user-2', 'Bob');
        expect(result.ok).toBe(false);
        expect(result.error).toMatch(/not found/i);
    });

    it('rejects if creator tries to accept own challenge', () => {
        const c = oc.create('user-1', 'Alice', FUTURE);
        const result = oc.accept(c.id, 'user-1', 'Alice');
        expect(result.ok).toBe(false);
        expect(result.error).toMatch(/own challenge/i);
    });

    it('rejects if already accepted', () => {
        const c = oc.create('user-1', 'Alice', FUTURE);
        oc.accept(c.id, 'user-2', 'Bob');
        const result = oc.accept(c.id, 'user-3', 'Carol');
        expect(result.ok).toBe(false);
        expect(result.error).toMatch(/already accepted/i);
    });

    it('rejects expired challenge', () => {
        const c = oc.create('user-1', 'Alice', PAST);
        const result = oc.accept(c.id, 'user-2', 'Bob');
        expect(result.ok).toBe(false);
        expect(result.error).toMatch(/expired/i);
    });
});

describe('cancel', () => {
    it('removes the challenge', () => {
        const c = oc.create('user-1', 'Alice', FUTURE);
        const result = oc.cancel(c.id, 'user-1');
        expect(result.ok).toBe(true);
        expect(oc.get(c.id)).toBeUndefined();
    });

    it('rejects if not the creator', () => {
        const c = oc.create('user-1', 'Alice', FUTURE);
        const result = oc.cancel(c.id, 'user-2');
        expect(result.ok).toBe(false);
        expect(result.error).toMatch(/creator/i);
    });

    it('rejects if challenge not found', () => {
        const result = oc.cancel('nonexistent-id', 'user-1');
        expect(result.ok).toBe(false);
        expect(result.error).toMatch(/not found/i);
    });

    it('rejects cancelling an already accepted challenge', () => {
        const c = oc.create('user-1', 'Alice', FUTURE);
        oc.accept(c.id, 'user-2', 'Bob');
        const result = oc.cancel(c.id, 'user-1');
        expect(result.ok).toBe(false);
        expect(result.error).toMatch(/already accepted/i);
    });
});

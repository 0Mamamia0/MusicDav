const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCookie, readBoolean, readPositiveInteger } = require('../src/config.js');

test('parseCookie parses a raw Cookie header without JSON', () => {
    assert.deepEqual(
        parseCookie('MUSIC_U=abc%20123; __csrf=token; empty='),
        { MUSIC_U: 'abc 123', __csrf: 'token', empty: '' }
    );
});

test('configuration parsers accept valid values', () => {
    const previous = process.env.TEST_MUSICDAV_VALUE;
    process.env.TEST_MUSICDAV_VALUE = 'true';
    assert.equal(readBoolean('TEST_MUSICDAV_VALUE', false), true);

    process.env.TEST_MUSICDAV_VALUE = '42';
    assert.equal(readPositiveInteger('TEST_MUSICDAV_VALUE', 1), 42);

    if (previous === undefined) delete process.env.TEST_MUSICDAV_VALUE;
    else process.env.TEST_MUSICDAV_VALUE = previous;
});

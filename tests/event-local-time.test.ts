import test from 'node:test';
import assert from 'node:assert/strict';
import {eventLocalDate,eventLocalInstant} from '../src/lib/event-local-time';
test('event picker preserves local date/time and rejects rollover or incomplete inputs',()=>{
 for(const value of ['2028-02-29T09:45','2026-12-31T23:59','2027-01-01T00:00'])assert.equal(eventLocalDate(eventLocalInstant(value)),value);
 for(const value of ['2026-02-29T09:45','2026-04-31T10:00','2026-13-01T00:00','2026-01-01T24:00','2026-01-01T','T10:30',''])assert.throws(()=>eventLocalInstant(value));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {formatPhone} from '../src/lib/phone-format';
test('phone presentation preserves international prefixes, extensions and already formatted values',()=>{
 assert.equal(formatPhone('4155550123'),'(415) 555-0123');
 assert.equal(formatPhone('+14155550123 ext 45'),'+1 (415) 555-0123 ext 45');
 for(const original of ['+442079460958','+81312345678','5551234x99'])assert.equal(formatPhone(original).replace(/[ ()-]/g,''),original.replace(/[ ()-]/g,''));
 assert.equal(formatPhone('+44 (0)20 7946 0958 ext. 5'),'+44 (0)20 7946 0958 ext. 5');
});

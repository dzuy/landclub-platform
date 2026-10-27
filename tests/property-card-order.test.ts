import test from 'node:test';
import assert from 'node:assert/strict';
import {propertyCardOrder} from '../src/lib/property-card-order';

test('restores saved order, excludes removed properties and appends new ones',()=>{
 assert.deepEqual(propertyCardOrder(['a','b','c'],['b','removed','a']),['b','a','c']);
});
test('invalid and duplicate saved values cannot hide or duplicate cards',()=>{
 for(const saved of [null,{},'invalid',42])assert.deepEqual(propertyCardOrder(['a','b'],saved),['a','b']);
 assert.deepEqual(propertyCardOrder(['a','b'],['b','b',null,{},'a']),['b','a']);
 assert.deepEqual(propertyCardOrder([],['a']),[]);
});

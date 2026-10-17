import { describe, expect, it } from 'vitest';
import { fill, isFilled, missingSlots, numberWord, pick, slotsOf } from './fill';

describe('fill', () => {
  it('fills slots and leaves unknown ones visible', () => {
    expect(fill('Armour is at {region}, costs {cost}.', { region: 'Lintel', cost: 12 })).toBe('Armour is at Lintel, costs 12.');
    expect(fill('Armour is at {region}.', {})).toBe('Armour is at {region}.');
    expect(missingSlots('{region} and {other}', { region: 'Shoal' })).toEqual(['other']);
    expect(isFilled('done')).toBe(true);
    expect(isFilled('{region}')).toBe(false);
  });

  it('capitalises a slot that starts the text or a sentence', () => {
    expect(fill('{crosser} crossed it.', { crosser: 'our brigade' })).toBe('Our brigade crossed it.');
    expect(fill('Nothing moved. {crosser} crossed it. Then {crosser} left.', { crosser: 'your promise to Lintel' })).toBe(
      'Nothing moved. Your promise to Lintel crossed it. Then your promise to Lintel left.',
    );
    expect(fill('move the {piece} up', { piece: 'brigade' })).toBe('move the brigade up');
  });

  it('lists distinct slots in order', () => {
    expect(slotsOf('{region} fell. {other} is listening. {region} again.')).toEqual(['region', 'other']);
  });

  it('picks a variant deterministically and words a number', () => {
    expect(pick(['a', 'b', 'c'], 4)).toBe('b');
    expect(pick(['a', 'b', 'c'], -1)).toBe('b');
    expect(pick([], 3)).toBeUndefined();
    const numbers = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
    expect(numberWord(numbers, 0)).toBe('no');
    expect(numberWord(numbers, 12)).toBe('twelve');
    expect(numberWord(numbers, 13)).toBe('13');
  });
});

/**
 * The last turn's receipt, typed on a torn linen slip in the shop (SPEC 9: 16,729,358,28):
 * 'LAST TURN · WIN 2 · +◆2', and 'WAR SPREAD TO MARRAM' beside it when war spread by itself.
 */
import type { JSX } from 'preact';
import type { ShopView } from '../../engine';
import { Rich } from '../common/text';

export function ReceiptPaper({ receipt }: { receipt: NonNullable<ShopView['receipt']> }): JSX.Element {
  return (
    <div class="receipt abs" role="note" aria-label={[receipt.line, receipt.spread].filter(Boolean).join('. ')}>
      <span class="r-line">
        <Rich text={receipt.line} size={8} />
      </span>
      {receipt.spread && <span class="r-spread">{receipt.spread}</span>}
    </div>
  );
}

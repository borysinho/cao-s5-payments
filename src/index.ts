import type { Pool } from 'pg';
import type { Api } from './lib/api.ts';
import type { PaymentInput } from './lib/contracts.ts';
import { createHash } from 'node:crypto';
import { ApiError, conflict } from './lib/api.ts';

interface PaymentRow {
  order_id: string;
  amount_minor: string;
  currency: 'BOB';
  request_hash: string;
  processed_at: Date;
  status: 'approved' | 'declined';
}

export function mount(api: Api, { pool }: { pool: Pool }) {
  api.route<PaymentInput>('processPayment', { token: 'PAYMENTS_ORDERS_TOKEN' }, async (req, res) => {
    const orderId = req.params.orderId.toLowerCase();
    const { amountMinor, currency, paymentCode } = req.body;
    if (!Number.isSafeInteger(amountMinor)) throw new ApiError(400, 'INVALID_REQUEST', 'Monto inválido.');
    const hash = createHash('sha256').update(JSON.stringify([amountMinor, currency, paymentCode])).digest('hex');
    const { rows: [created] } = await pool.query<PaymentRow>(
      `INSERT INTO payments (order_id, amount_minor, currency, request_hash, status)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT (order_id) DO NOTHING
       RETURNING *`,
      [orderId, amountMinor, currency, hash, paymentCode === '0000' ? 'declined' : 'approved'],
    );
    const record = created ?? (await pool.query<PaymentRow>(
      'SELECT * FROM payments WHERE order_id=$1', [orderId],
    )).rows[0];
    if (record.request_hash !== hash) throw conflict('PAYMENT_CONFLICT', 'El pago ya tiene otros datos.');
    res.json({
      orderId: record.order_id, amountMinor: Number(record.amount_minor), currency: record.currency,
      status: record.status, processedAt: record.processed_at.toISOString(),
    });
  });
}

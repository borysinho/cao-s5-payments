CREATE TABLE payments (
  order_id uuid PRIMARY KEY,
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  currency text NOT NULL CHECK (currency = 'BOB'),
  request_hash text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL CHECK (status IN ('approved', 'declined'))
);

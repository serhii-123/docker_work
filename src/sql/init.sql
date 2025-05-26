CREATE TABLE orders (
    id             SERIAL         PRIMARY KEY,
    customer_email TEXT           NOT NULL,
    item           TEXT           NOT NULL,
    qty            INTEGER        NOT NULL CHECK (qty > 0),
    unit_price     NUMERIC(10, 2) NOT NULL CHECK (unit_price > 0),
    status         TEXT           NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'PAID', 'CANCELLED')),
    created_at     TIMESTAMPTZ    NOT NULL DEFAULT now()
);
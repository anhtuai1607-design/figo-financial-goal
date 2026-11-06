# FiGo UI conventions

- Use the shared app shell for navigation and shared finance primitives for page headings and panels, so financial screens remain consistent.
- FiGo is a pure spending ledger: no payments, transfers, QR pay or bank links, because real money movement needs a licensed provider.
- Transactions are entered only via the TransactionSheet form (explicit account choice avoids wrong-source entries); mobile header keeps an empty center column for the iPhone Dynamic Island. The AI assistant runs in a server function that receives a compact text summary of the user's data.

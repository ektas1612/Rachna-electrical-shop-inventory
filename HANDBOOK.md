# Rachna Electricals — Shop Management

## Daily Use

1. Double-click `shop-start.command` (Mac) or `shop-start.bat` (Windows).
2. A terminal window opens, then your browser opens to http://localhost:8000
3. Use the app normally.
4. When you're done for the day, close the terminal window.

## Tips

- **New Sale**: blue button in the sidebar (bottom) — one click.
- **Purchase List**: write down items to order as you remember them. Send the list to your wholesaler by clicking "Copy list" and pasting into WhatsApp.
- **Backups**: click "Download Backup" at the bottom of the sidebar at least once a week. Save the downloaded `.db` file somewhere safe (email it to yourself, or drop it in Google Drive).

## Common Actions

- **Adding new stock without a purchase bill** (e.g. you found extra units): Products → find the product → "Adjust" → Add stock → enter quantity and cost.
- **Correcting stock** (e.g. miscounted): Products → "Adjust" → Remove stock → reason "Correction".
- **Recording a purchase from a wholesaler**: Purchases → New Purchase → fill in receipt, items, price, and payment.
- **Recording a sale**: New Sale → add items → choose paid-in-full or partial → save.
- **For credit customers**: When a sale is partial/unpaid, attach the customer. Later, go to Customers → click their name → Record Payment.

## What to Do If Something Goes Wrong

1. Close the terminal window.
2. Double-click `shop-start.command` again.
3. If the app still doesn't open, try opening http://localhost:8000 manually in your browser.

## Backup Location

By default, downloaded backups go to your browser's Downloads folder:
- Filename: `rachna-shop-backup-YYYYMMDD-HHMMSS.db`
- Contains everything: products, stock, sales, purchases, customers, wholesalers.

To restore from a backup (advanced — ask your developer): rename the backup file to `shop.db` and place it in the `backend/` folder, replacing the current one.
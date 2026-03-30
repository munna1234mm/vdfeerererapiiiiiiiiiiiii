# Stripe Checkout Info API

This is a Node.js API that extracts information (name and amount) from Stripe Checkout/Billing URLs.

## Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start the Server**:
   ```bash
   npm start
   ```

3. **API Endpoint**:
   - URL: `http://localhost:3000/api/extract`
   - Method: `POST`
   - Body:
     ```json
     {
       "url": "YOUR_STRIPE_URL_HERE"
     }
     ```

## Example Usage with cURL

```bash
curl -X POST http://localhost:3000/api/extract \
     -H "Content-Type: application/json" \
     -d '{"url":"https://billing.gamma.app/c/pay/..."}'
```

## Testing UI
Open your browser and navigate to `http://localhost:3000/` to use the built-in tester.

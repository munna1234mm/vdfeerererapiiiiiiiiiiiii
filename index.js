const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const cors = require('cors');
const fs = require('fs');

puppeteer.use(StealthPlugin());

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// List of Chrome paths for both Windows and Linux (Render)
const findChrome = () => {
    const paths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
        '/usr/bin/google-chrome-stable',
        '/usr/bin/google-chrome',
        '/usr/bin/chromium-browser'
    ];
    for (const path of paths) {
        if (fs.existsSync(path)) return path;
    }
    return null;
};

// Main API Logic
app.post('/api/extract', async (req, res) => {
    // Clean URL: Remove whitespace and any accidental characters like 'v' before http
    let cleanUrl = (url || '').trim();
    if (cleanUrl.match(/^[^h]*http/)) {
        cleanUrl = cleanUrl.replace(/^[^h]*/, '');
    }

    if (!cleanUrl) return res.status(400).json({ success: false, error: 'URL is required' });
    if (!chromePath) return res.status(500).json({ success: false, error: 'Google Chrome not found.' });

    let browser;
    try {
        browser = await puppeteer.launch({
            executablePath: chromePath,
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.goto(cleanUrl, { waitUntil: 'networkidle2', timeout: 30000 });

        // Better Extraction logic
        const extractedData = await page.evaluate(() => {
            const amountSelectors = ['span#ProductSummary-totalAmount', '.ProductSummary-totalAmount', '[data-testid*="amount"]', '.Checkout-totalAmount', '.TotalAmount', 'h2.Price', '.ProductSummary-totalAmount span'];
            const merchantSelectors = ['a.Link.NTVCZeIn__BusinessLink', '.BusinessName', 'h1', '.MerchantHeader-name', 'a[title="Gamma"]', '.BusinessLink--primary'];

            const findText = (selectors) => {
                for (const s of selectors) {
                    const el = document.querySelector(s);
                    if (el && el.innerText.trim()) return el.innerText.trim();
                }
                return null;
            };

            let name = findText(merchantSelectors);
            let priceText = findText(amountSelectors);

            // Clean Name: Remove "Back to " if it exists
            if (name && name.toLowerCase().includes('back to')) {
                name = name.replace(/back to /i, '').trim();
            }

            // Fallback for Name from title attribute
            if (!name || name.toLowerCase() === 'back') {
                const backLink = document.querySelector('a[title]');
                if (backLink && backLink.title && backLink.title.toLowerCase().includes('back to')) {
                    name = backLink.title.replace(/back to /i, '').trim();
                } else if (backLink && backLink.title) {
                    name = backLink.title.trim();
                }
            }

            // Clean Price: Extract only the amount (e.g., $25.00)
            let price = priceText;
            if (priceText) {
                const match = priceText.match(/\$[0-9,.]+/);
                price = match ? match[0] : priceText.split('\n')[0].trim();
            }

            return { 
                name: name || 'Unknown', 
                price: price || 'Unknown' 
            };
        });

        await browser.close();
        res.json({ success: true, ...extractedData });
    } catch (error) {
        if (browser) await browser.close();
        res.status(500).json({ success: false, error: error.message });
    }
});

// API Documentation Page
app.get('/docs', (req, res) => {
    res.send(`
        <html>
            <head>
                <title>API Documentation - Stripe Scraper</title>
                <style>
                    body { font-family: 'Inter', sans-serif; line-height: 1.6; color: #333; max-width: 900px; margin: 0 auto; padding: 40px; background: #f9fafb; }
                    .header { text-align: center; margin-bottom: 50px; }
                    .section { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); margin-bottom: 30px; }
                    h2 { color: #6772e5; border-bottom: 2px solid #eef2f7; padding-bottom: 10px; }
                    code { font-family: 'JetBrains Mono', monospace; font-size: 0.95em; color: #38bdf8; }
                    pre { background: #0f172a; color: #e2e8f0; padding: 20px; border-radius: 8px; overflow-x: auto; position: relative; border: 1px solid #334155; }
                    .method { color: #10b981; font-weight: bold; margin-right: 10px; }
                    .endpoint { color: #6b7280; }
                    .copy-btn { position: absolute; top: 10px; right: 10px; background: #475569; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 0.8em; }
                    .copy-btn:hover { background: #64748b; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Stripe Scraper API Documentation</h1>
                    <p>Integrate Stripe information extraction into your apps easily.</p>
                </div>

                <div class="section">
                    <h2>Authentication</h2>
                    <p>Currently, the API is open and does not require an API Key for local use. <code>(Status: Public)</code></p>
                </div>

                <div class="section">
                    <h2>Extract Information</h2>
                    <p>Use this endpoint to extract Merchant and Price from a Stripe URL.</p>
                    <p><span class="method">POST</span> <span class="endpoint">/api/extract</span></p>
                    
                    <h4>Request Body (JSON)</h4>
                    <pre><code>{
  "url": "https://billing.gamma.app/c/pay/..."
}</code></pre>

                    <h4>Response (JSON)</h4>
                    <pre><code>{
  "success": true,
  "name": "Gamma",
  "price": "$25.00"
}</code></pre>
                </div>

                <div class="section">
                    <h2>Code Examples</h2>
                    
                    <h4>JavaScript (Fetch)</h4>
                    <pre><code>fetch('http://localhost:3000/api/extract', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: 'YOUR_STRIPE_URL' })
})
.then(res => res.json())
.then(data => console.log(data));</code></pre>

                    <h4>Python (Requests)</h4>
                    <pre><code>import requests

url = "http://localhost:3000/api/extract"
payload = {"url": "YOUR_STRIPE_URL"}
response = requests.post(url, json=payload)
print(response.json())</code></pre>

                    <h4>cURL</h4>
                    <pre><code>curl -X POST http://localhost:3000/api/extract \\
     -H "Content-Type: application/json" \\
     -d '{"url":"YOUR_STRIPE_URL"}'</code></pre>
                </div>
            </body>
        </html>
    `);
});

// Welcome/Test page with UI
app.get('/', (req, res) => {
    res.send(`
        <html>
            <head>
                <title>Stripe Scraper API</title>
                <style>
                    body { font-family: sans-serif; padding: 40px; background: #f4f7f6; }
                    .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 600px; margin: auto; }
                    input { width: 80%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
                    button { padding: 10px 20px; background: #6772e5; color: white; border: none; border-radius: 4px; cursor: pointer; }
                    #result { margin-top: 20px; padding: 15px; background: #eee; border-radius: 4px; white-space: pre-wrap; font-family: monospace; }
                    .docs-link { display: block; text-align: center; margin-top: 20px; color: #6772e5; text-decoration: none; font-weight: bold; }
                </style>
            </head>
            <body>
                <div class="card">
                    <h2>Stripe Link Info Extractor</h2>
                    <p>Paste the Stripe Billing/Checkout link below:</p>
                    <input type="text" id="link" placeholder="https://billing.gamma.app/c/pay/...">
                    <button onclick="extract()">Extract</button>
                    <div id="result">Result will appear here...</div>
                    <a href="/docs" class="docs-link">View API Documentation &rarr;</a>
                </div>
                <script>
                    async function extract() {
                        const url = document.getElementById('link').value;
                        const resultDiv = document.getElementById('result');
                        resultDiv.innerHTML = 'Extracting... (Using Local Chrome)';
                        try {
                            const response = await fetch('/api/extract', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ url })
                            });
                            const data = await response.json();
                            resultDiv.innerHTML = JSON.stringify(data, null, 2);
                        } catch (error) {
                            resultDiv.innerHTML = 'Error: ' + error.message;
                        }
                    }
                </script>
            </body>
        </html>
    `);
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));

import express from 'express';
import fetch from 'node-fetch';
import { URL } from 'url';

const app = express();
const PORT = process.env.PORT || 3000;

// Target website (Exodus Privacy)
const TARGET_URL = 'https://reports.exodus-privacy.eu.org';

// Helper to fetch & stream any URL
async function proxyRequest(req, res, targetBase, pathPrefix = '') {
  try {
    const targetUrl = `${targetBase}${req.originalUrl.replace(pathPrefix, '')}`;
    console.log(`Proxying: ${targetUrl}`);

    const response = await fetch(targetUrl, { method: req.method, headers: req.headers });
    res.set('Content-Type', response.headers.get('Content-Type') || '');
    res.status(response.status);
    response.body.pipe(res);
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).send('Proxy Error');
  }
}

// Proxy for static assets (CSS, JS, images, fonts, etc.)
app.use('/static', (req, res) => proxyRequest(req, res, TARGET_URL));

// Proxy for API requests
app.use('/api', (req, res) => proxyRequest(req, res, TARGET_URL));

// Main route — fetches homepage and injects intent script
app.get('/', async (req, res) => {
  try {
    const response = await fetch(`${TARGET_URL}/en/reports/`);
    let html = await response.text();

    // Inject the intent-triggering script
    const intentScript = `
      <script>
        document.addEventListener('click', function(event) {
          const link = event.target.closest('a');
          if (link && link.href.includes('/reports/') && link.href.endsWith('/latest')) {
            event.preventDefault();
            const match = link.href.match(/\\/reports\\/(.*?)\\/latest/);
            if (match) {
              const packageId = match[1];
              const intentUrl = 'intent://details?id=' + packageId + '#Intent;scheme=market;package=com.aurora.store.nightly;component=com.aurora.store.nightly/com.aurora.store.MainActivity;end;;';
              window.location.href = intentUrl;
            }
          }
        }, true);
      </script>
      <p style="padding:10px;background:#fffae6;border:1px solid #ccc;">⚠️ Note: Styles & Search may not work. This proxy is for browsing & Aurora Store intent links only.</p>
    `;

    html = html.replace('</body>', `${intentScript}</body>`);
    res.send(html);
  } catch (err) {
    console.error('Error fetching homepage:', err);
    res.status(500).send('Error loading page');
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});

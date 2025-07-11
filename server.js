import express from 'express';
import fetch from 'node-fetch';
import { URL } from 'url';

const app = express();
const TARGET_URL = 'https://reports.exodus-privacy.eu.org';

// Helper to rewrite relative links
function rewriteRelativeUrls(html) {
  return html.replace(/(href|src)="\/([^"]*)"/g, (match, attr, path) => {
    return `${attr}="/proxy/${path}"`;
  });
}

app.get('/proxy/*', async (req, res) => {
  const targetPath = req.originalUrl.replace('/proxy', '');
  const url = TARGET_URL + targetPath;

  try {
    const response = await fetch(url);
    let body = await response.text();

    // Rewrite relative URLs
    body = rewriteRelativeUrls(body);

    // Inject custom script
    const injection = `
      <script>
        document.addEventListener('click', function(event) {
          const link = event.target.closest('a');
          if (link) {
            const url = new URL(link.href, window.location.origin);
            const match = url.pathname.match(/^\\/proxy\\/reports\\/([^\\/]+)\\/latest$/);
            if (match) {
              const packageId = match[1];
              const intentUrl = \`intent://details?id=\${packageId}#Intent;scheme=market;package=com.aurora.store.nightly;component=com.aurora.store.nightly/com.aurora.store.MainActivity;end;;\`;
              window.location.href = intentUrl;
              event.preventDefault();
            }
          }
        });
      </script>
    `;
    body = body.replace('</body>', injection + '</body>');

    res.send(body);
  } catch (err) {
    res.status(500).send('Error fetching page: ' + err.message);
  }
});

// Redirect root to proxied main page
app.get('/', (req, res) => {
  res.redirect('/proxy/en/reports/');
});

app.listen(3000, () => {
  console.log('Proxy running at http://localhost:3000');
});

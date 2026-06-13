// Zero-dependency health check - Vercel'in serverless çalıştığını test etmek için
export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).end(JSON.stringify({
    status: 'ok',
    message: 'API çalışıyor',
    timestamp: new Date().toISOString()
  }));
}

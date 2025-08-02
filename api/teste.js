// Rota de teste básica (sem Firebase, sem autenticação)
export default async function handler(req, res) {
  // Hora atual no formato ISO
  const serverTime = new Date().toISOString();
  
  // Verifica método HTTP
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      error: 'Método não permitido',
      allowed: 'GET'
    });
  }

  // Resposta de sucesso
  res.status(200).json({
    status: 'API operacional',
    timestamp: serverTime,
    request: {
      method: req.method,
      query: req.query,
      headers: req.headers
    },
    environment: {
      node_version: process.version,
      vercel_region: process.env.VERCEL_REGION || 'local'
    }
  });
    }

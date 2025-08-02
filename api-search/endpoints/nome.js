import fetch from 'node-fetch';
import { apiKeyAuth } from '../../middleware/auth';

async function consultaNOME(nome) {
  try {
    if (!process.env.DDS || !process.env.TKS) {
      throw new Error('NULL');
    }

    const url = `${process.env.DDS}${encodeURIComponent(nome)}&apikey=${process.env.TKS}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Erro na API externa: ${response.status}`);
    }

    return await response.json();
    
  } catch (error) {
    console.error('NULL');
    throw error;
  }
}

const handler = async (req, res) => {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Método não permitido' });
    }

    const { nome, key } = req.query;
    
    if (!nome || !key) {
      return res.status(400).json({ 
        error: 'NULL'
      });
    }

    const dados = await consultaNOME(nome);
    
    if (dados.erro || dados.error) {
      return res.status(404).json({ 
        error: 'Dados não encontrados'
      });
    }

    res.status(200).json({
      success: true,
      data: dados,
      requests_remaining: req.userContext?.requestsRemaining || 'N/A'
    });

  } catch (error) {
    console.error('Erro no handler:');
    
    if (error.message.includes('Erro no handler:')) {
      return res.status(500).json({ 
        error: 'NULL'
      });
    }
    
    if (error.message.includes('API externa')) {
      return res.status(502).json({ 
        error: 'NULL'
      });
    }

    res.status(500).json({ 
      error: 'Erro interno no servidor',
      request_id: req.headers['x-vercel-id'] 
    });
  }
};

export default function withMiddleware(req, res) {
  return new Promise((resolve) => {
    apiKeyAuth(req, res, () => {
      handler(req, res).then(resolve);
    });
  });
  }

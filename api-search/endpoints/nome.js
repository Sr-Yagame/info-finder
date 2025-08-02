import fetch from 'node-fetch';
import { apiKeyAuth } from '../../middleware/auth';

const handler = async (req, res) => {
  console.log('[Nome] Nova requisição:', req.query);
  
  try {
    const { nome } = req.query;
    
    if (!nome) {
      console.error('[Nome] Parâmetro faltando');
      return res.status(400).json({ error: 'Parâmetro "nome" obrigatório' });
    }

    console.log('[Nome] Consultando API externa para:', nome);
    const response = await fetch(`${process.env.DDS}${encodeURIComponent(nome)}&apikey=${process.env.TKS}`);
    
    if (!response.ok) {
      throw new Error(`API externa retornou ${response.status}`);
    }

    const dados = await response.json();
    console.log('[Nome] Dados recebidos:', Object.keys(dados));

    res.json({
      ...dados,
      requests_remaining: req.userContext?.requestsRemaining
    });

  } catch (error) {
    console.error('[Nome] Erro:', error.message);
    res.status(500).json({ 
      error: 'Erro na consulta',
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
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

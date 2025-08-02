import fetch from 'node-fetch';
import { apiKeyAuth } from '../../middleware/auth';

const handler = async (req, res) => {
  try {
    const { nome } = req.query;
    
    if (!nome) {
      return res.status(400).json({ error: 'Parâmetro "nome" obrigatório' });
    }
    
    const response = await fetch(`${process.env.DDS}${encodeURIComponent(nome)}&apikey=${process.env.TKS}`);
    const data = await response.json();

    res.json({
      ...data,
      requests_remaining: req.userContext.requestsRemaining
    });

  } catch (error) {
    console.error('Erro no endpoint:', error);
    res.status(500).json({ 
      error: 'Erro na consulta',
      details: process.env.NODE_ENV === 'development' ? error.message : null
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

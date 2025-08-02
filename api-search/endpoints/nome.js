import fetch from 'node-fetch';
import { apiKeyAuth } from '../middleware/auth';

// Configuração de debug (remova depois)
const DEBUG = true;

export default async (req, res) => {
  if (DEBUG) console.log('Requisição recebida:', req.query);

  try {
    // Verificação do método
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Método não permitido' });
    }

    // Autenticação
    await new Promise((resolve) => {
      apiKeyAuth(req, res, resolve);
    });

    if (res.headersSent) return; // Se o middleware já respondeu

    const { nome } = req.query;
    
    if (!nome) {
      return res.status(400).json({ error: 'Parâmetro "nome" obrigatório' });
    }

    if (DEBUG) console.log('Variáveis DDS:', process.env.DDS, 'TKS:', !!process.env.TKS);

    const response = await fetch(`${process.env.DDS}${encodeURIComponent(nome)}&apikey=${process.env.TKS}`);
    const data = await response.json();

    if (DEBUG) console.log('Resposta da API:', data);

    res.json({
      ...data,
      requests_remaining: req.userContext?.requestsRemaining || 0
    });

  } catch (error) {
    if (DEBUG) console.error('Erro completo:', error);
    
    res.status(500).json({
      error: 'Erro interno',
      details: DEBUG ? error.message : 'Contate o administrador'
    });
  }
};

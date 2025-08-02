import fetch from 'node-fetch';
import { apiKeyAuth } from '../../middleware/auth';

async function consultaNOME(nome) {
  nome = nome;
  const dds = process.env.DDS;
  const tks = process.env.TKS;
  const response = await fetch(`${dds}${nome}&apikey=${tks}`);
  return await response.json();
}

const handler = async (req, res) => {
  try {
    const { nome } = req.query;
    
    if (!nome) {
      return res.status(400).json({ error: '400' });
    }

    const dados = await consultaNOME(nome);
    
    if (dados.erro) {
      return res.status(404).json({ error: '404' });
    }

    res.json({
      ...dados,
      requests_remaining: req.userContext.requestsRemaining
    });

  } catch (error) {
    res.status(500).json({ error: '500' });
  }
};

export default function withMiddleware(req, res) {
  return new Promise((resolve) => {
    apiKeyAuth(req, res, () => {
      handler(req, res).then(resolve);
    });
  });
    }

import fetch from 'node-fetch';
import { ref, get, runTransaction } from 'firebase/database';
import { db } from '../utils/firebase';

// Configuração de debug (defina como false em produção)
const DEBUG = false;

// Middleware de autenticação integrado diretamente
async function authenticateRequest(req, res) {
  try {
    const apiKey = req.query.key;
    const endpoint = req.path.split('/').pop();

    if (DEBUG) console.log('Iniciando autenticação para key:', apiKey);

    if (!apiKey) {
      return { error: { status: 400, message: 'Parâmetro "key" obrigatório' } };
    }

    const usersRef = ref(db, 'usuarios');
    const snapshot = await get(usersRef);
    const users = snapshot.val();

    if (DEBUG) console.log('Usuários no banco:', Object.keys(users || {}));

    const [userId, userData] = Object.entries(users || {}).find(
      ([_, user]) => user?.api_key === apiKey
    ) || [];

    if (!userId) {
      return { error: { status: 403, message: 'Chave API inválida' } };
    }

    if (DEBUG) console.log('Usuário autenticado:', userId);

    const counterPath = `usuarios/${userId}/contadores/${endpoint}`;
    const { snapshot: counterSnap } = await runTransaction(ref(db, counterPath), (current) => {
      if (current === null) return 0;
      if (current <= 0) throw new Error('LIMITE_ATINGIDO');
      return current - 1;
    });

    return {
      success: true,
      requestsRemaining: counterSnap.val()
    };

  } catch (error) {
    if (error.message === 'LIMITE_ATINGIDO') {
      return { error: { status: 429, message: `Limite de requests atingido` } };
    }
    console.error('Erro na autenticação:', error);
    return { error: { status: 500, message: 'Erro na autenticação' } };
  }
}

// Função de consulta à API externa
async function consultaNOME(nome) {
  try {
    if (!process.env.DDS || !process.env.TKS) {
      throw new Error('Variáveis DDS ou TKS não configuradas');
    }

    const url = `${process.env.DDS}${encodeURIComponent(nome)}&apikey=${process.env.TKS}`;
    
    if (DEBUG) console.log('URL da API externa:', url.replace(process.env.TKS, '***'));

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API externa retornou status ${response.status}`);
    }

    return await response.json();

  } catch (error) {
    console.error('Erro na consultaNOME:', error);
    throw error;
  }
}

// Handler principal
export default async function handler(req, res) {
  try {
    // Verificação do método HTTP
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Método não permitido' });
    }

    if (DEBUG) console.log('\n--- NOVA REQUISIÇÃO ---');
    if (DEBUG) console.log('Query params:', req.query);
    if (DEBUG) console.log('Variáveis de ambiente:', {
      DDS: !!process.env.DDS,
      TKS: !!process.env.TKS,
      FIREBASE: !!process.env.FIREBASE_DB_URL
    });

    // Autenticação
    const authResult = await authenticateRequest(req, res);
    if (authResult.error) {
      return res.status(authResult.error.status).json({ error: authResult.error.message });
    }

    const { nome } = req.query;
    
    // Validação do parâmetro
    if (!nome) {
      return res.status(400).json({ error: 'Parâmetro "nome" obrigatório' });
    }

    if (DEBUG) console.log('Consultando nome:', nome);

    // Consulta à API externa
    const dados = await consultaNOME(nome);
    
    if (dados.erro || dados.error) {
      return res.status(404).json({ 
        error: 'Dados não encontrados',
        details: dados.erro || dados.error
      });
    }

    if (DEBUG) console.log('Dados retornados:', dados);

    // Resposta de sucesso
    res.status(200).json({
      success: true,
      data: dados,
      requests_remaining: authResult.requestsRemaining
    });

  } catch (error) {
    console.error('Erro no handler principal:', error);
    
    // Tratamento de erros específicos
    if (error.message.includes('Variáveis')) {
      return res.status(500).json({ 
        error: 'Erro de configuração do servidor',
        solution: 'Verifique as variáveis de ambiente DDS e TKS'
      });
    }

    // Erro genérico
    res.status(500).json({ 
      error: 'Erro interno no servidor',
      ...(DEBUG && { 
        details: error.message,
        stack: error.stack
      })
    });
  }
                       }

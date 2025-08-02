// Importação usando ESM (necessário para node-fetch v3+)
import fetch from 'node-fetch';
import { ref, get, runTransaction } from 'firebase/database';
import { db } from '../utils/firebase.js'; // Note a extensão .js explícita

// Configuração de debug
const DEBUG = true;

export default async function handler(req, res) {
  if (DEBUG) console.log('\n--- NOVA REQUISIÇÃO ---', req.query);

  try {
    // 1. Verificação do método HTTP
    if (req.method !== 'GET') {
      if (DEBUG) console.log('⚠️ Método não permitido:', req.method);
      return res.status(405).json({ error: 'Método não permitido' });
    }

    // 2. Validação dos parâmetros
    const { nome, key } = req.query;
    if (!nome || !key) {
      if (DEBUG) console.log('⚠️ Parâmetros faltando:', { nome, key });
      return res.status(400).json({ error: 'Parâmetros "nome" e "key" são obrigatórios' });
    }

    // 3. Autenticação
    if (DEBUG) console.log('🔑 Validando API Key...');
    const usersRef = ref(db, 'usuarios');
    const snapshot = await get(usersRef);
    const users = snapshot.val() || {};

    const [userId, userData] = Object.entries(users).find(
      ([_, user]) => user?.api_key === key
    ) || [];

    if (!userId) {
      if (DEBUG) console.log('❌ Chave API inválida:', key);
      return res.status(403).json({ error: 'Chave API inválida' });
    }

    // 4. Atualização do contador
    const endpoint = 'nome'; // Nome fixo do endpoint
    const counterPath = `usuarios/${userId}/contadores/${endpoint}`;
    
    if (DEBUG) console.log('🧮 Atualizando contador...');
    const { snapshot: counterSnap } = await runTransaction(ref(db, counterPath), (current) => {
      const newValue = (current || 0) - 1;
      if (newValue < 0) throw new Error('LIMITE_ATINGIDO');
      return newValue;
    });

    // 5. Consulta à API externa
    if (DEBUG) console.log('🌐 Chamando API externa...');
    if (!process.env.DDS || !process.env.TKS) {
      throw new Error('Variáveis DDS ou TKS não configuradas');
    }

    const url = `${process.env.DDS}${encodeURIComponent(nome)}&apikey=${process.env.TKS}`;
    if (DEBUG) console.log('🔗 URL (chave ocultada):', url.replace(process.env.TKS, '***'));

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API externa retornou status ${response.status}`);
    }

    const dados = await response.json();
    if (DEBUG) console.log('📦 Dados recebidos:', Object.keys(dados));

    // 6. Resposta de sucesso
    return res.status(200).json({
      success: true,
      data: dados,
      requests_remaining: counterSnap.val()
    });

  } catch (error) {
    console.error('💥 ERRO:', error.message);
    
    // Tratamento específico para limites
    if (error.message === 'LIMITE_ATINGIDO') {
      return res.status(429).json({ error: 'Limite de requests atingido' });
    }

    // Erros de configuração
    if (error.message.includes('Variáveis')) {
      return res.status(500).json({ 
        error: 'Erro de configuração do servidor',
        solution: 'Verifique as variáveis DDS e TKS'
      });
    }

    // Erro genérico
    return res.status(500).json({
      error: 'Erro interno',
      ...(DEBUG && { details: error.message })
    });
  }
                                   }

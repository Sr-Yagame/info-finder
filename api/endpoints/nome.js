import fetch from 'node-fetch';
import { ref, get, runTransaction, set } from 'firebase/database';
import { db } from '../utils/firebase.js';

// Configurações
const EXTERNAL_API_TIMEOUT = 25000; // 25 segundos
const CACHE_EXPIRATION = 3600 * 1000; // 1 hora em milissegundos
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

    // 4. Verificação de cache
    const cacheRef = ref(db, `cache/${encodeURIComponent(nome)}`);
    const cachedData = await get(cacheRef);
    
    if (cachedData.exists() && (Date.now() - cachedData.val().timestamp < CACHE_EXPIRATION)) {
      if (DEBUG) console.log('📦 Retornando dados do cache');
      return res.status(200).json({
        ...cachedData.val().data,
        cached: true,
        requests_remaining: userData.contadores?.nome || 0
      });
    }

    // 5. Atualização do contador
    const endpoint = 'nome';
    const counterPath = `usuarios/${userId}/contadores/${endpoint}`;
    
    if (DEBUG) console.log('🧮 Atualizando contador...');
    const { snapshot: counterSnap } = await runTransaction(ref(db, counterPath), (current) => {
      const newValue = (current || 0) - 1;
      if (newValue < 0) throw new Error('LIMITE_ATINGIDO');
      return newValue;
    });

    // 6. Consulta à API externa com timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), EXTERNAL_API_TIMEOUT);

    const url = `${process.env.DDS}${encodeURIComponent(nome)}&apikey=${process.env.TKS}`;
    if (DEBUG) console.log('🔗 URL (chave ocultada):', url.replace(process.env.TKS, '***'));

    try {
      const response = await fetch(url, {
        signal: controller.signal
      }).finally(() => clearTimeout(timeout));

      if (!response.ok) {
        throw new Error(`API externa retornou status ${response.status}`);
      }

      const dados = await response.json();
      if (DEBUG) console.log('📦 Dados recebidos:', Object.keys(dados));

      // 7. Armazenar em cache
      await set(cacheRef, {
        data: dados.resultado,
        timestamp: Date.now()
      });

      // 8. Resposta de sucesso
      return res.status(200).json({
        ...dados.resultado,
        cached: false,
        requests_remaining: counterSnap.val()
      });

    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Timeout: A API externa demorou muito para responder');
      }
      throw error;
    }

  } catch (error) {
    console.error('💥 ERRO:', error.message);
    
    // Tratamento específico para limites
    if (error.message === 'LIMITE_ATINGIDO') {
      return res.status(429).json({ error: 'Limite de requests atingido' });
    }

    // Timeout personalizado
    if (error.message.includes('Timeout')) {
      return res.status(504).json({ 
        error: 'Timeout',
        message: error.message
      });
    }

    // Erros de configuração
    if (error.message.includes('Variáveis')) {
      return res.status(500).json({ 
        error: 'Erro de configuração',
        details: 'Verifique as variáveis DDS e TKS'
      });
    }

    // Erro genérico
    return res.status(500).json({
      error: 'Erro interno',
      ...(DEBUG && { 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    });
  }
        }

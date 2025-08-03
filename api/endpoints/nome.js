import fetch from 'node-fetch';
import { ref, get, runTransaction, set } from 'firebase/database';
import { db } from '../utils/firebase.js';

const EXTERNAL_API_TIMEOUT = 25000;
const CACHE_EXPIRATION = 3600 * 1000;
const DEBUG = true;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.UL || '');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (DEBUG) console.log('\n--- NOVA REQUISIÇÃO ---', req.query);

  try {
    const allowedOrigin = process.env.UL;
    if (!allowedOrigin) {
      console.error('Variável UL não definida');
      return res.status(500).json({ status: false });
    }

    const requestOrigin = req.headers.origin;
    if (requestOrigin && !requestOrigin.includes(allowedOrigin)) {
      if (DEBUG) console.log('Origem não permitida:', requestOrigin);
      return res.status(403).json({ status: false });
    }

    if (req.method !== 'GET') {
      return res.status(405).json({ status: false });
    }

    const { nome, key } = req.query;
    if (!nome || !key) {
      return res.status(400).json({ status: false });
    }

    const usersRef = ref(db, 'usuarios');
    const snapshot = await get(usersRef);
    const users = snapshot.val() || {};

    const userEntry = Object.entries(users).find(([_, user]) => user?.api_key === key);
    if (!userEntry) {
      return res.status(403).json({ status: false });
    }
    const [userId, userData] = userEntry;

    const cacheRef = ref(db, `cache/${encodeURIComponent(nome)}`);
    const cachedData = await get(cacheRef);
    
    if (cachedData.exists() && (Date.now() - cachedData.val().timestamp < CACHE_EXPIRATION)) {
      if (DEBUG) console.log('Retornando dados do cache');
      return res.status(200).json({
        status: true,
        owner: '@sr_yagame',
        data: cachedData.val().data.resultado,
        cached: true,
        requests_remaining: userData.contadores?.nome || 0
      });
    }

    const endpoint = 'nome';
    const counterPath = `usuarios/${userId}/contadores/${endpoint}`;
    
    const { snapshot: counterSnap } = await runTransaction(ref(db, counterPath), (current) => {
      const newValue = (current || 0) - 1;
      if (newValue < 0) throw new Error('LIMITE_ATINGIDO');
      return newValue;
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), EXTERNAL_API_TIMEOUT);

    const url = `${process.env.DDS}${encodeURIComponent(nome)}&apikey=${process.env.TKS}`;
    if (DEBUG) console.log('URL da API externa:', url.replace(process.env.TKS, '***'));

    try {
      const response = await fetch(url, {
        signal: controller.signal
      }).finally(() => clearTimeout(timeout));

      if (!response.ok) {
        throw new Error(`API externa retornou ${response.status}`);
      }

      const dados = await response.json();

      await set(cacheRef, {
        data: {
          resultado: dados.resultado
        },
        timestamp: Date.now()
      });

      return res.status(200).json({
        status: true,
        owner: '@sr_yagame',
        data: dados.resultado,
        cached: false,
        requests_remaining: counterSnap.val()
      });

    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Timeout na API externa');
      }
      throw error;
    }

  } catch (error) {
    console.error('Erro no handler:', error.message);
    
    if (error.message === 'LIMITE_ATINGIDO') {
      return res.status(429).json({ status: false });
    }

    if (error.message.includes('Timeout')) {
      return res.status(504).json({ status: false });
    }

    return res.status(500).json({ status: false });
  }
  }

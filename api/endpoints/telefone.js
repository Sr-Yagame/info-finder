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

  const allowedOrigin = process.env.UL;
  if (!allowedOrigin) {
    return res.status(500).json({ status: false });
  }

  const requestOrigin = req.headers.origin || req.headers.referer;
  if (!requestOrigin || !requestOrigin.includes(allowedOrigin)) {
    return res.status(403).json({ status: false });
  }

  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ status: false });
    }

    const { telefone, key } = req.query;
    if (!telefone || !key) {
      return res.status(400).json({ status: false });
    }

    const usersRef = ref(db, 'usuarios');
    const snapshot = await get(usersRef);
    const users = snapshot.val() || {};

    const [userId, userData] = Object.entries(users).find(
      ([_, user]) => user?.api_key === key
    ) || [];

    if (!userId) {
      return res.status(403).json({ status: false });
    }

    const cacheRef = ref(db, `cache/${encodeURIComponent(telefone)}`);
    const cachedData = await get(cacheRef);
    
    if (cachedData.exists() && (Date.now() - cachedData.val().timestamp < CACHE_EXPIRATION)) {
      const { data } = cachedData.val();
      return res.status(200).json({
        status: true,
        owner: '@sr_yagame',
        resultado: data.resultado,
        cached: true,
        requests_remaining: userData.contadores?.telefone || 0
      });
    }

    const endpoint = 'tel';
    const counterPath = `usuarios/${userId}/contadores/${endpoint}`;
    
    const { snapshot: counterSnap } = await runTransaction(ref(db, counterPath), (current) => {
      const newValue = (current || 0) - 1;
      if (newValue < 0) throw new Error('LIMITE_ATINGIDO');
      return newValue;
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), EXTERNAL_API_TIMEOUT);

    const url = `${process.env.DDS}${endpoint}&query=${encodeURIComponent(telefone)}&apikey=${process.env.TKS}`;

    const response = await fetch(url, {
      signal: controller.signal
    }).finally(() => clearTimeout(timeout));

    if (!response.ok) {
      return res.status(response.status).json({ status: false });
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
    if (error.message === 'LIMITE_ATINGIDO') {
      return res.status(429).json({ status: false });
    }
    return res.status(500).json({ status: false });
  }
  }

import { ref, get, runTransaction } from 'firebase/database';
import { db } from '../utils/firebase';

export async function apiKeyAuth(req, res, next) {
  const apiKey = req.query.key;
  const endpoint = req.path.split('/').pop();

  if (!apiKey) {
    return res.status(400).json({ error: 'Parâmetro "key" obrigatório' });
  }

  try {
    const usersRef = ref(db, 'usuarios');
    const snapshot = await get(usersRef);
    const users = snapshot.val();
    
    const [userId, userData] = Object.entries(users).find(
      ([_, user]) => user.api_key === apiKey
    ) || [];

    if (!userId) {
      return res.status(403).json({ error: 'Chave API inválida' });
    }

    const counterPath = `usuarios/${userId}/contadores/${endpoint}`;
    const { snapshot: counterSnap } = await runTransaction(ref(db, counterPath), (current) => {
      if (current === null) return 0;
      if (current <= 0) throw new Error('LIMITE_ATINGIDO');
      return current - 1;
    });

    req.userContext = {
      userId,
      requestsRemaining: counterSnap.val()
    };

    next();
  } catch (error) {
    if (error.message === 'LIMITE_ATINGIDO') {
      return res.status(429).json({ error: `Limite de requests atingido para ${endpoint}` });
    }
    return res.status(500).json({ error: 'Erro no servidor' });
  }
      }

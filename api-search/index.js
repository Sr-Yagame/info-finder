export default async function handler(req, res) {
  const allowedOrigin = process.env.UL;
  
  if (!allowedOrigin) {
    return res.status(500).json({
      STATUS: false,
      erro: "Access denied."
    });
  }

  const requestOrigin = req.headers.origin || 
                      req.headers.referer || 
                      req.headers.host && `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;

  const normalizeUrl = (url) => {
    if (!url) return null;
    return new URL(url).hostname.replace('www.', '').toLowerCase();
  };

  if (normalizeUrl(requestOrigin) !== normalizeUrl(allowedOrigin)) {
    return res.status(403).json({
      STATUS: false,
      erro: "Access denied."
    });
  }

  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { cpf } = req.query;
  const DB = process.env.DB;
  const TK = process.env.TK;

  if (!DB || !TK) {
    return res.status(500).json({
      STATUS: false,
      erro: "db not found"
    });
  }

  if (!cpf || cpf.length !== 11 || isNaN(cpf)) {
    return res.status(400).json({
      STATUS: false,
      erro: "cpf is not valid."
    });
  }

  try {
    const response = await fetch(`${DB}${cpf}&token=${TK}`);
    const data = await response.json();

    const calcularIdade = (dataNasc) => {
      const [dia, mes, ano] = dataNasc.split('/').map(Number);
      const diffAnos = new Date().getFullYear() - ano;
      const fezAniversario = (new Date().getMonth() > mes - 1) || 
                           (new Date().getMonth() === mes - 1 && new Date().getDate() >= dia);
      return fezAniversario ? diffAnos : diffAnos - 1;
    };

    res.status(200).json({
      STATUS: true,
      CPF: data.cpf,
      NOME: data.nome,
      IDADE: `${calcularIdade(data.nascimento)} Anos`,
      NASC: data.nascimento,
      SEXO: data.sexo,
      MAE: data.mae
    });

  } catch (error) {
    res.status(500).json({
      STATUS: false,
      erro: "Access denied."
    });
  }
      }

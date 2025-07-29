export default async function handler(req, res) {
  const allowedOrigin = process.env.UL;
  const requestOrigin = req.headers.origin || req.headers.referer;

  if (allowedOrigin && requestOrigin && !requestOrigin.includes(allowedOrigin)) {
    return res.status(403).json({
      STATUS: false,
      erro: "Access denied."
    });
  }

  if (allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Vary', 'Origin');
  }

  const { cpf } = req.query;
  const DB = process.env.DB;
  const TK = process.env.TK;
  
  if (!DB) {
    return res.status(500).json({
      STATUS: false,
      erro: "db not found."
    });
  }

  if (!cpf || cpf.length !== 11 || isNaN(cpf)) {
    return res.status(400).json({
      STATUS: false,
      erro: "cpf is not valid ."
    });
  }
  
  try {
    const response = await fetch(`${DB}${cpf}&token=${TK}`);
    const data = await response.json();

    res.status(200).json({
      STATUS: true,
      CPF: data.cpf,
      NOME: data.nome,
      NASC: data.nascimento,
      SEXO: data.sexo,
      MAE: data.mae
    });

  } catch (error) {
    res.status(500).json({
      STATUS: false,
      erro: error.message
    });
  }
      }

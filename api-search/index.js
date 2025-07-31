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
    const response = await fetch(`${DB}${cpf}&apikey=${TK}`);
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
      CPF: data.cpf || null,
      PIS: data.pis || null,
      TITULO_ELEITOR: data.tituloEleitor || null,
      RG: data.rg || null,
      RG_EMISSAO: data.dataExpedicao || null,
      RG_ORGAO: data.orgaoExpedidor || null,
      RG_UF: data.ufRg || null,
      NOME: data.nome || null,
      NASC: data.nascimento || null,
      IDADE: data.idade || calcularIdade(data.nascimento) || null,
      SIGNO: data.signo || null,
      MAE: data.mae || null,
      PAI: data.pai || null,
      NACIONALIDADE: data.nacionalidade || null,
      ESCOLARIDADE: data.escolaridade || null,
      ESTADO_CIVIL: data.estadoCivil || null,
      PROFISSAO: data.profissao || null,
      RENDA: data.renda || null,
      STATUS_RF: data.statusRF || null,
      SCORE: data.score || null,
      FAIXA_RISCO: data.faixaRisco || null,
      EMAILS: data.emails || null,
      TELEFONES: data.telefones || null,
      ENDERECOS: data.enderecos || null,
      PARENTES: data.parentes || null,
      SOCIOS: data.societario || null,
      EMPREGOS: data.vinculosEmpregaticios || null
    });

  } catch (error) {
    res.status(500).json({
      STATUS: false,
      erro: "Access denied."
    });
  }
  }

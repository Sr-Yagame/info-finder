export default async function handler(req, res) {
  // 1. Verificação de Origem
  const allowedOrigin = process.env.UL;
  if (!allowedOrigin) {
    console.error("Variável UL não definida");
    return res.status(500).json({ STATUS: false, erro: "Configuração incompleta" });
  }

  // 2. Validação de CORS
  const requestOrigin = req.headers.origin || req.headers.referer;
  if (!requestOrigin?.includes(allowedOrigin)) {
    return res.status(403).json({ STATUS: false, erro: "Origem não autorizada" });
  }

  // 3. Validação de CPF
  const { cpf } = req.query;
  if (!cpf || !/^\d{11}$/.test(cpf)) {
    return res.status(400).json({ STATUS: false, erro: "CPF inválido" });
  }

  // 4. Consulta à API Externa
  try {
    const DB = process.env.DB;
    const TK = process.env.TK;
    
    if (!DB || !TK) {
      console.error("DB ou TK não definidos");
      return res.status(500).json({ STATUS: false, erro: "Configuração faltando" });
    }

    const apiUrl = `${DB}${cpf}&apikey=${TK}`;
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`API externa retornou ${response.status}`);
    }

    const data = await response.json();
    
    // 5. Resposta Simplificada (apenas documentos)
    res.status(200).json({
      STATUS: true,
      CPF: data.cpf || null,
      PIS: data.pis || null,
      TITULO_ELEITOR: data.tituloEleitor || null,
      RG: data.rg || null
    });

  } catch (error) {
    console.error("Erro na consulta:", error);
    res.status(500).json({ 
      STATUS: false,
      erro: "Falha ao acessar dados"
    });
  }
}

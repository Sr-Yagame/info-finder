export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

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

    const rsp = {
      STATUS: true,
      CPF: data.cpf,
      NOME: data.nome,
      NASC: data.nascimento,
      SEXO: data.sexo,
      MÃE: data.mae
    };

    res.status(200).json(rsp);

  } catch (error) {
    res.status(500).json({
      STATUS: false,
      erro: ""
    });
  }
      }

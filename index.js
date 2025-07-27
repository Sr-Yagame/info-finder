export default async (req, res) => {
  const ALLOWED_ORIGIN = "https://info-finder-yg.netlify.app";
  const ALLOWED_METHODS = "POST, OPTIONS";
  const ALLOWED_HEADERS = "Content-Type, Authorization";

  if (req.headers.origin !== ALLOWED_ORIGIN) {
    return res.status(403).json({ error: "Access denied" });
  }

  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", ALLOWED_METHODS);
  res.setHeader("Access-Control-Allow-Headers", ALLOWED_HEADERS);

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { cpf } = req.query;
    const S1 = `${process.env.DB}${cpf}&token=${process.env.TK}`;

    const response = await fetch(S1);
    if (!response.ok) throw new Error("Unknown error");

    const data = await response.json();
    if (!data?.cpf) throw new Error("Invalid data");

    return res.status(200).json({
      status: true,
      data: {
        cpf: data.cpf || null,
        nome: data.nome || null,
        nascimento: data.nascimento || null,
        sexo: data.sexo || null,
        mae: data.mae || null
      }
    });

  } catch (error) {
    console.error("Erro:", error.message);
    return res.status(500).json({ 
      status: false,
      error: "Query error"
    });
  }
};

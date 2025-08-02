export default (req, res) => {
  res.status(200).json({ 
    status: "online",
    message: "API funcionando",
    time: new Date().toISOString()
  });
}

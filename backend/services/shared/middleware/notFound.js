module.exports = function notFound() {
  return (req, res) => {
    res.status(404).json({ code: 'not_found', message: 'Route not found', requestId: req.requestId || null, timestamp: new Date().toISOString() });
  };
};

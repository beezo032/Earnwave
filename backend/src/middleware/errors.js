function notFound(req, res) {
  res.status(404).json({ message: "Not found" });
}

function errorHandler(error, req, res, next) {
  console.error(error);
  res.status(error.status || 500).json({
    message: error.message || "Internal server error"
  });
}

module.exports = { notFound, errorHandler };

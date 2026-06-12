function notFound(req, res) {
  res.status(404).json({ message: "Not found" });
}

function errorHandler(error, req, res, next) {
  console.error(error);
  if (error.code === "EBADCSRFTOKEN") {
    return res.status(403).json({ message: "Invalid CSRF token" });
  }
  res.status(error.status || 500).json({
    message: error.message || "Internal server error",
    compliance: error.compliance
  });
}

module.exports = { notFound, errorHandler };

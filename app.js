let points = 0;

document.getElementById("addPoints").addEventListener("click", () => {
  points += 50;
  document.getElementById("points").textContent = points;
  localStorage.setItem("points", points);
});

window.onload = () => {
  let saved = localStorage.getItem("points");
  if (saved) {
    points = parseInt(saved);
    document.getElementById("points").textContent = points;
  }
};

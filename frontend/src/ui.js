// src/ui.js
export function showPage(pageId) {
  // Step A: Find EVERY div with the class "page"
  document.querySelectorAll(".page").forEach(page => {
    // Step B: Hide all of them
    page.classList.add("hidden");
  });

  // Step C: Find the specific page we want to see and un-hide it
  document.getElementById(pageId).classList.remove("hidden");
}

export function displayError(errorElement, errorMessage) {
  const display = document.getElementById(errorElement);
  display.textContent = errorMessage;
  display.classList.remove("hidden");
}

export function hideError(errorElement) {
  const display = document.getElementById(errorElement);
  display.classList.add("hidden");
}




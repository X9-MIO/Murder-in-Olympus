
// Hides all pages, then shows only the requested page ID.
export function showPage(pageId) {

  document.querySelectorAll(".page").forEach(page => {

    page.classList.add("hidden");
  });

  document.getElementById(pageId).classList.remove("hidden");
}

// Renders inline error text and reveals the target error element.
export function displayError(errorElement, errorMessage) {
  const display = document.getElementById(errorElement);
  display.textContent = errorMessage;
  display.classList.remove("hidden");
}

// Hides an error element without mutating existing text.
export function hideError(errorElement) {
  const display = document.getElementById(errorElement);
  display.classList.add("hidden");
}




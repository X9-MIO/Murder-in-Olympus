
export function showPage(pageId) {

  document.querySelectorAll(".page").forEach(page => {

    page.classList.add("hidden");
  });

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




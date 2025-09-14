// utils/eventListeners.js

export function setupCommonEventListeners({
  filterForm,
  onFilterSubmit,
  onFilterReset,
  deleteModal,
  onConfirmDelete,
  onCancelDelete,
  onCloseModal,
  tableBody,
  rowActionHandler,
}) {
  if (filterForm) {
    filterForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (typeof onFilterSubmit === "function") onFilterSubmit();
    });
    filterForm.addEventListener("reset", () => {
      setTimeout(() => {
        if (typeof onFilterReset === "function") onFilterReset();
      }, 0);
    });
  }
  if (deleteModal) {
    document.getElementById("confirmDelete").addEventListener("click", () => {
      if (typeof onConfirmDelete === "function") onConfirmDelete();
    });
    document.getElementById("cancelDelete").addEventListener("click", () => {
      if (typeof onCancelDelete === "function") onCancelDelete();
    });
    const closeBtn = document.querySelector(".modal-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        if (typeof onCloseModal === "function") onCloseModal();
      });
    }
    window.addEventListener("click", (e) => {
      if (e.target === deleteModal) {
        if (typeof onCloseModal === "function") onCloseModal();
      }
    });
  }
  if (tableBody) {
    tableBody.addEventListener("click", (e) => {
      const button = e.target.closest("button");
      if (!button) return;
      const row = button.closest(".table-row");
      if (typeof rowActionHandler === "function") rowActionHandler(button, row);
    });
  }
}

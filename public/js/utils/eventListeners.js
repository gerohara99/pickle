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
  // Filter form listeners
  if (filterForm) {
    filterForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (onFilterSubmit) onFilterSubmit();
    });

    filterForm.addEventListener("reset", (e) => {
      e.preventDefault();
      if (onFilterReset) onFilterReset();
    });
  }

  // Delete modal listeners
  if (deleteModal) {
    const confirmBtn = deleteModal.querySelector("#confirmDelete");
    const cancelBtn = deleteModal.querySelector("#cancelDelete");
    const closeBtn = deleteModal.querySelector(".modal-close");

    if (confirmBtn && onConfirmDelete) {
      confirmBtn.addEventListener("click", onConfirmDelete);
    }

    if (cancelBtn && onCancelDelete) {
      cancelBtn.addEventListener("click", onCancelDelete);
    }

    if (closeBtn && onCloseModal) {
      closeBtn.addEventListener("click", onCloseModal);
    }

    // Close modal when clicking outside
    deleteModal.addEventListener("click", (e) => {
      if (e.target === deleteModal && onCloseModal) {
        onCloseModal();
      }
    });
  }

  // Table row action listeners (event delegation)
  if (tableBody && rowActionHandler) {
    tableBody.addEventListener("click", (e) => {
      const button = e.target.closest(".btn-icon");
      if (button) {
        const row = button.closest(".table-row");
        if (row) {
          rowActionHandler(button, row);
        }
      }
    });
  }
}

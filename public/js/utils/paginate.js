export function paginate(array, page = 1, limit = 10) {
  const offset = (page - 1) * limit;
  return array.slice(offset, offset + limit);
}

// Client-side pagination UI renderer
export function renderPagination(
  container,
  currentPage,
  totalPages,
  goToPageCallback
) {
  container.innerHTML = "";
  if (totalPages <= 1) return;
  const paginationList = document.createElement("ul");
  paginationList.className = "pagination-list";
  // Previous button
  const prevItem = document.createElement("li");
  const prevLink = document.createElement("a");
  prevLink.href = "#";
  prevLink.innerHTML = '<i class="fas fa-chevron-left"></i>';
  prevLink.className = "pagination-link";
  if (currentPage === 1) {
    prevItem.className = "pagination-item disabled";
  } else {
    prevItem.className = "pagination-item";
    prevLink.addEventListener("click", (e) => {
      e.preventDefault();
      goToPageCallback(currentPage - 1);
    });
  }
  prevItem.appendChild(prevLink);
  paginationList.appendChild(prevItem);
  // Page numbers
  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, startPage + 4);
  for (let i = startPage; i <= endPage; i++) {
    const pageItem = document.createElement("li");
    pageItem.className = "pagination-item";
    const pageLink = document.createElement("a");
    pageLink.href = "#";
    pageLink.textContent = i.toString();
    pageLink.className = "pagination-link";
    if (i === currentPage) {
      pageLink.className += " active";
    } else {
      pageLink.addEventListener("click", (e) => {
        e.preventDefault();
        goToPageCallback(i);
      });
    }
    pageItem.appendChild(pageLink);
    paginationList.appendChild(pageItem);
  }
  // Next button
  const nextItem = document.createElement("li");
  const nextLink = document.createElement("a");
  nextLink.href = "#";
  nextLink.innerHTML = '<i class="fas fa-chevron-right"></i>';
  nextLink.className = "pagination-link";
  if (currentPage === totalPages) {
    nextItem.className = "pagination-item disabled";
  } else {
    nextItem.className = "pagination-item";
    nextLink.addEventListener("click", (e) => {
      e.preventDefault();
      goToPageCallback(currentPage + 1);
    });
  }
  nextItem.appendChild(nextLink);
  paginationList.appendChild(nextItem);
  container.appendChild(paginationList);
}

// Sidebar toggle
function initSidebar() {
    const sidebar = document.getElementById("sidebar");
    const toggleBtn = document.getElementById("sidebarToggle");

    if (sidebar && toggleBtn) {
        toggleBtn.addEventListener("click", () => {
            sidebar.classList.toggle("closed");
        });
    }
}

// Modal controls
function initModal() {
    const modal = document.getElementById("instructions-modal");
    const openBtn = document.getElementById("open-instructions-modal");
    const closeBtn = modal?.querySelector(".close-button");

    if (modal && openBtn && closeBtn) {
        openBtn.addEventListener('click', () => {
            modal.classList.add("is-visible");
        });

        closeBtn.addEventListener('click', () => {
            modal.classList.remove("is-visible");
        });

        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.classList.remove("is-visible");
            }
        });
    }
}

// Disable right-click context menu
document.addEventListener('contextmenu', event => event.preventDefault());

// Initialize on DOM ready
document.addEventListener("DOMContentLoaded", function() {
    initSidebar();
    initModal();
});
// Sidebar toggle
/**
 * UI Controls Module
 * ------------------
 * Handles basic user interface interactions for the application.
 *
 * Responsibilities:
 * - Toggle the sidebar navigation panel
 * - Manage the instructions modal dialog
 * - Disable the browser right-click context menu
 * - Initialize UI components when the DOM is ready
 *
 * This module focuses only on lightweight UI behavior and
 * does not interact with the annotation or viewer systems.
 *
 * Workflow:
 * Page Load → DOM Ready → UI Components Initialized
 */


/**
 * Initializes sidebar toggle behavior.
 *
 * Purpose:
 * Allows users to open or collapse the sidebar navigation
 * panel by clicking the sidebar toggle button.
 *
 * Behavior:
 * - Locates the sidebar container and toggle button
 * - Attaches a click event listener
 * - Toggles a CSS class that controls sidebar visibility
 *
 * If the required elements are not present in the DOM,
 * the function safely exits without performing any action.
 */
function initSidebar() {
    const sidebar = document.getElementById("sidebar");
    const toggleBtn = document.getElementById("sidebarToggle");

    if (sidebar && toggleBtn) {
        toggleBtn.addEventListener("click", () => {
            sidebar.classList.toggle("closed");
        });
    }
}

/**
 * Initializes modal dialog behavior for instructions.
 *
 * Purpose:
 * Controls opening and closing of the instructions modal.
 *
 * Supported Interactions:
 * - Open modal using the instructions button
 * - Close modal using the close button
 * - Close modal by clicking outside the modal content
 *
 * The modal visibility is controlled through CSS classes
 * that toggle its display state.
 *
 * If any required elements are missing from the DOM,
 * the modal logic is skipped safely.
 */
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

/**
 * Disables the browser right-click context menu.
 *
 * Purpose:
 * Prevents users from accessing the default browser
 * context menu, which may interfere with custom
 * interactions inside the viewer or annotation interface.
 *
 * This ensures that right-click actions can be reserved
 * for custom application behavior if needed.
 */
document.addEventListener('contextmenu', event => event.preventDefault());

/**
 * Initializes UI components when the DOM is fully loaded.
 *
 * Purpose:
 * Ensures that required HTML elements exist before
 * attaching event listeners for UI interactions.
 *
 * Initialization Steps:
 * 1. Activate sidebar toggle functionality
 * 2. Initialize modal controls
 */
document.addEventListener("DOMContentLoaded", function() {
    initSidebar();
    initModal();
});
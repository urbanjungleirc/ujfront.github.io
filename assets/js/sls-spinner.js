/**
 * SLS SPINNER UTILITY
 * Reusable loading spinner system for Summer Lead Series pages
 *
 * Usage:
 * 1. Include spinner-animations.css in your HTML
 * 2. Include this JS file after Bootstrap
 * 3. Call SLSSpinner.show() for random animation
 * 4. Call SLSSpinner.show('geometric') to force specific animation
 * 5. Call SLSSpinner.hide() to close
 *
 * Customize:
 * - Edit SPINNER_SLOGANS array to update slogans
 * - Edit animationTemplates object to update animations
 */

const SLSSpinner = (function() {
    'use strict';

    // ================================
    // CONFIGURATION (Easy to customize)
    // ================================

    /**
     * Climbing-themed loading slogans
     * Add/remove slogans here as needed
     */
    const SPINNER_SLOGANS = [
        "Chalking up...",
        "Finding the beta...",
        "Checking holds...",
        "Tying in...",
        "Belaying...",
        "Setting the route...",
        "Brushing holds...",
        "Reading the wall...",
        "Crimping data...",
        "Flagging delays...",
        "Heel hooking...",
        "Toe jamming...",
        "Dynoing to the finish...",
        "Stemming the gap...",
        "Smearing the cache..."
    ];

    /**
     * Animation HTML templates
     * Edit these to modify animation structures
     */
    const animationTemplates = {
        geometric: `
            <div class="spinner-geometric">
                <div class="shape shape-1"></div>
                <div class="shape shape-2"></div>
                <div class="shape shape-3"></div>
                <div class="shape shape-4"></div>
            </div>
        `,
        pulse: `
            <div class="spinner-pulse">
                <div class="ring ring-1"></div>
                <div class="ring ring-2"></div>
                <div class="ring ring-3"></div>
            </div>
        `,
        wave: `
            <div class="spinner-wave">
                <!-- Empty -->
                <div class="tick-icon tick-1">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="bi bi-file" viewBox="0 0 16 16">
                        <path d="M4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H4zm0 1h8a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"/>
                    </svg>
                </div>
                <!-- Zone 1 -->
                <div class="tick-icon tick-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="bi bi-file" viewBox="0 0 16 16">
                        <path d="M4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H4zm0 1h8a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"/>
                        <rect style="stroke:none" width="10.508" height="4.264" x="2.876" y="10.75"/>
                    </svg>
                </div>
                <!-- Zone 2 -->
                <div class="tick-icon tick-3">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="bi bi-file" viewBox="0 0 16 16">
                        <path d="M4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H4zm0 1h8a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"/>
                        <rect style="stroke:none" width="10.508" height="9.106" x="2.876" y="5.908"/>
                    </svg>
                </div>
                <!-- Top -->
                <div class="tick-icon tick-4">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="bi bi-file-fill" viewBox="0 0 16 16">
                        <path d="M4 0h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2z"/>
                    </svg>
                </div>
                <!-- Flash (center) -->
                <div class="tick-icon tick-5">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="bi bi-lightning-fill" viewBox="0 0 16 16">
                        <path d="M5.52.359A.5.5 0 0 1 6 0h4a.5.5 0 0 1 .474.658L8.694 6H12.5a.5.5 0 0 1 .395.807l-7 9a.5.5 0 0 1-.873-.454L6.823 9.5H3.5a.5.5 0 0 1-.48-.641l2.5-8.5z"/>
                    </svg>
                </div>
                <!-- Top (reverse) -->
                <div class="tick-icon tick-6">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="bi bi-file-fill" viewBox="0 0 16 16">
                        <path d="M4 0h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2z"/>
                    </svg>
                </div>
                <!-- Zone 2 (reverse) -->
                <div class="tick-icon tick-7">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="bi bi-file" viewBox="0 0 16 16">
                        <path d="M4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H4zm0 1h8a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"/>
                        <rect style="stroke:none" width="10.508" height="9.106" x="2.876" y="5.908"/>
                    </svg>
                </div>
                <!-- Zone 1 (reverse) -->
                <div class="tick-icon tick-8">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="bi bi-file" viewBox="0 0 16 16">
                        <path d="M4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H4zm0 1h8a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"/>
                        <rect style="stroke:none" width="10.508" height="4.264" x="2.876" y="10.75"/>
                    </svg>
                </div>
                <!-- Empty (reverse) -->
                <div class="tick-icon tick-9">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="bi bi-file" viewBox="0 0 16 16">
                        <path d="M4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H4zm0 1h8a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"/>
                    </svg>
                </div>
            </div>
        `
    };

    // ================================
    // PRIVATE FUNCTIONS
    // ================================

    /**
     * Get random slogan from the array
     */
    function getRandomSlogan() {
        return SPINNER_SLOGANS[Math.floor(Math.random() * SPINNER_SLOGANS.length)];
    }

    /**
     * Get random animation type
     */
    function getRandomAnimation() {
        const animations = ['geometric', 'pulse', 'wave'];
        return animations[Math.floor(Math.random() * animations.length)];
    }

    /**
     * Get animation HTML and slogan
     * @param {string|null} animationType - Optional: 'geometric', 'pulse', or 'wave'. If null, picks random.
     */
    function getSpinnerContent(animationType = null) {
        const animation = animationType || getRandomAnimation();
        const slogan = getRandomSlogan();

        if (!animationTemplates[animation]) {
            console.warn(`SLSSpinner: Unknown animation type "${animation}". Using random.`);
            return getSpinnerContent(); // Retry with random
        }

        return {
            html: `
                ${animationTemplates[animation]}
                <p class="spinner-slogan">${slogan}</p>
            `,
            type: animation,
            slogan: slogan
        };
    }

    // ================================
    // PUBLIC API
    // ================================

    let modalInstance = null;
    let containerElement = null;

    /**
     * Initialize the spinner (called automatically on first show)
     */
    function init() {
        if (modalInstance) return; // Already initialized

        // Find or create modal element
        let modalElement = document.getElementById('modalSpinner');

        if (!modalElement) {
            console.error('SLSSpinner: Modal element #modalSpinner not found. Please add it to your HTML.');
            return false;
        }

        // Find container for dynamic content
        containerElement = modalElement.querySelector('.spinner-container');

        if (!containerElement) {
            console.error('SLSSpinner: Container element .spinner-container not found inside #modalSpinner.');
            return false;
        }

        // Create Bootstrap modal instance
        modalInstance = new bootstrap.Modal(modalElement, {
            backdrop: 'static',
            keyboard: false
        });

        return true;
    }

    /**
     * Show spinner with optional forced animation type
     * @param {string|null} animationType - Optional: 'geometric', 'pulse', or 'wave'
     * @example
     * SLSSpinner.show();              // Random animation
     * SLSSpinner.show('geometric');   // Force geometric hexagons
     * SLSSpinner.show('pulse');       // Force pulse rings
     * SLSSpinner.show('wave');        // Force tick wave
     */
    function show(animationType = null) {
        if (!init()) return;

        // Get spinner content (random or specified)
        const content = getSpinnerContent(animationType);

        // ALWAYS inject new HTML into container (even if modal is already showing)
        // This ensures we get a fresh random animation each time
        containerElement.innerHTML = content.html;

        // Check if modal is already visible
        const modalElement = document.getElementById('modalSpinner');
        const isAlreadyVisible = modalElement && modalElement.classList.contains('show');

        // Show modal (Bootstrap won't re-show if already visible, but content is updated)
        if (!isAlreadyVisible) {
            modalInstance.show();
        }

        // Log for debugging (optional, can be removed in production)
        console.log(`SLSSpinner: ${isAlreadyVisible ? 'Updating' : 'Showing'} "${content.type}" with slogan "${content.slogan}"`);
    }

    /**
     * Hide spinner
     */
    function hide() {
        if (modalInstance) {
            modalInstance.hide();
        }
    }

    /**
     * Check if spinner is currently visible
     */
    function isVisible() {
        const modalElement = document.getElementById('modalSpinner');
        return modalElement && modalElement.classList.contains('show');
    }

    // ================================
    // EXPORT PUBLIC API
    // ================================

    return {
        show: show,
        hide: hide,
        isVisible: isVisible,
        // Expose slogans for external customization if needed
        getSlogans: () => [...SPINNER_SLOGANS],
        getAnimationTypes: () => Object.keys(animationTemplates)
    };

})();

// ================================
// LEGACY COMPATIBILITY
// ================================

/**
 * Legacy support for old mySpinner.show() / mySpinner.hide() pattern
 * This allows existing code to work without changes
 *
 * IMPORTANT: Always override mySpinner to ensure compatibility
 * even if other scripts try to define it
 */
window.mySpinner = {
    show: function() {
        console.log('mySpinner.show() called (legacy compatibility)');
        return SLSSpinner.show();
    },
    hide: function() {
        console.log('mySpinner.hide() called (legacy compatibility)');
        return SLSSpinner.hide();
    },
    isVisible: function() {
        return SLSSpinner.isVisible();
    }
};

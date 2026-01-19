/**
 * SLS SPINNER UTILITY
 * Simple loading spinner system for Summer Lead Series pages
 *
 * Usage:
 * - SLSSpinner.show() - Show random animation
 * - SLSSpinner.show('geometric') - Force specific animation
 * - SLSSpinner.hide() - Hide spinner
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
        "Checking holds...",
        "Tying in...",
        "Brushing holds...",
        "Crimping data...",
        "Flagging delays...",
        "Stemming the gap...",
        "Smearing the cache...",
        "Loading the crux...",
        "Caching the route...",
        "Indexing holds...",
        "Dreaming of SLS...",
        "Visualising the moves...",
        "Trusting the smear...",
        "Mapping the overhang...",
        "Finding the balance...",
        "Hugging the wall...",
        "Beta loading...",
        "Compiling beta...", 
        "Hanging on...", 
        "Sending soon...", 
        "Unlocking the knee bar..."
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
        hexagon: `
            <div class="spinner-hexagon">
                <div class="triangle tri-1"></div>
                <div class="triangle tri-2"></div>
                <div class="triangle tri-3"></div>
                <div class="triangle tri-4"></div>
                <div class="triangle tri-5"></div>
                <div class="triangle tri-6"></div>
                <div class="hexagon-glow"></div>
            </div>
        `,
        logo: `
            <div class="spinner-logo">
                <img src="https://tools.urbanjungleirc.com/assets/img/sls_logo.png" alt="SLS" class="logo-spin">
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
    // PRIVATE VARIABLES
    // ================================

    let modalInstance = null;
    let containerElement = null;

    // ================================
    // PRIVATE FUNCTIONS
    // ================================

    function getRandomSlogan() {
        return SPINNER_SLOGANS[Math.floor(Math.random() * SPINNER_SLOGANS.length)];
    }

    function getRandomAnimation() {
        const animations = ['geometric', 'pulse', 'wave', 'hexagon', 'logo'];
        return animations[Math.floor(Math.random() * animations.length)];
    }

    function getSpinnerContent(animationType = null) {
        const animation = animationType || getRandomAnimation();
        const slogan = getRandomSlogan();

        if (!animationTemplates[animation]) {
            console.warn(`SLSSpinner: Unknown animation "${animation}". Using random.`);
            return getSpinnerContent();
        }

        return {
            html: `${animationTemplates[animation]}<p class="spinner-slogan">${slogan}</p>`,
            type: animation,
            slogan: slogan
        };
    }

    function init() {
        if (modalInstance) return true;

        const modalElement = document.getElementById('modalSpinner');
        if (!modalElement) {
            console.error('SLSSpinner: #modalSpinner not found');
            return false;
        }

        containerElement = modalElement.querySelector('.spinner-container');
        if (!containerElement) {
            console.error('SLSSpinner: .spinner-container not found');
            return false;
        }

        modalInstance = new bootstrap.Modal(modalElement, {
            backdrop: 'static',
            keyboard: false
        });

        return true;
    }

    // ================================
    // PUBLIC API
    // ================================

    function show(animationType = null) {
        if (!init()) return;

        const content = getSpinnerContent(animationType);
        containerElement.innerHTML = content.html;

        const modalElement = document.getElementById('modalSpinner');
        const isVisible = modalElement && modalElement.classList.contains('show');

        if (!isVisible) {
            modalInstance.show();
        }
    }

    function hide() {
        if (modalInstance) {
            modalInstance.hide();
        }
    }

    function isVisible() {
        const modalElement = document.getElementById('modalSpinner');
        return modalElement && modalElement.classList.contains('show');
    }

    return {
        show: show,
        hide: hide,
        isVisible: isVisible
    };

})();

// Create global mySpinner object for compatibility with existing code
window.mySpinner = {
    show: function() { SLSSpinner.show(); },
    hide: function() { SLSSpinner.hide(); }
};

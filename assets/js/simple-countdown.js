/*  Simple Countdown Timer - Replacement for timezz
    No external dependencies, reliable and lightweight
*/

class SimpleCountdown {
    constructor(element, options = {}) {
        this.element = element;
        this.targetDate = new Date(options.date);
        this.stopOnZero = options.stopOnZero || false;
        this.onUpdate = options.update || (() => {});
        this.beforeUpdate = options.beforeUpdate || (() => {});
        this.interval = null;
        this.isRunning = false;
        
        this.start();
    }
    
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.interval = setInterval(() => {
            this.updateDisplay();
        }, 1000);
        
        // Initial update
        this.updateDisplay();
    }
    
    updateDisplay() {
        const now = new Date().getTime();
        const targetTime = this.targetDate.getTime();
        const difference = targetTime - now;
        
        if (difference <= 0) {
            // Time is up
            this.displayTime(0, 0, 0, 0);
            
            if (this.stopOnZero) {
                this.stop();
            }
            
            // Call update callback with zero values
            this.onUpdate({
                days: 0,
                hours: 0,
                minutes: 0,
                seconds: 0,
                distance: 0
            });
            
            return;
        }
        
        // Calculate time components
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        
        // Call beforeUpdate callback
        this.beforeUpdate({
            days: days,
            hours: hours,
            minutes: minutes,
            seconds: seconds,
            distance: difference
        });
        
        // Update display
        this.displayTime(days, hours, minutes, seconds);
        
        // Call update callback
        this.onUpdate({
            days: days,
            hours: hours,
            minutes: minutes,
            seconds: seconds,
            distance: difference
        });
    }
    
    displayTime(days, hours, minutes, seconds) {
        if (!this.element) return;
        
        // Find and update time elements
        const hoursElement = this.element.querySelector('[data-hours]');
        const minutesElement = this.element.querySelector('[data-minutes]');
        const secondsElement = this.element.querySelector('[data-seconds]');
        const daysElement = this.element.querySelector('[data-days]');
        
        if (hoursElement) hoursElement.textContent = hours;
        if (minutesElement) minutesElement.textContent = minutes.toString().padStart(2, '0');
        if (secondsElement) secondsElement.textContent = seconds.toString().padStart(2, '0');
        if (daysElement) daysElement.textContent = days;
    }
    
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.isRunning = false;
    }
    
    destroy() {
        this.stop();
        this.element = null;
        this.onUpdate = null;
        this.beforeUpdate = null;
    }
    
    // Update the target date
    setDate(newDate) {
        this.targetDate = new Date(newDate);
        if (!this.isRunning) {
            this.start();
        }
    }
}

// Create a global function to mimic timezz API
function createCountdown(element, options) {
    return new SimpleCountdown(element, options);
}
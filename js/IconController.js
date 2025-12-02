
class IconController {
    constructor(options = {}) {
        this.options = {
            preferredFormat: options.preferredFormat || 'auto',
            reducedMotion: this.detectReducedMotion(),
            container: options.container || document.body,
            svgSpritePath: options.svgSpritePath || '/assets/icons/weather-icons.svg',
            lottiePath: options.lottiePath || '/assets/lottie/',
            debug: options.debug || false,
            ...options
        };

        this.loadedIcons = new Map();
        this.lottieInstances = new Map();
        this.svgSprite = null;
        
        this.init();
    }

    async init() {
        this.log('Initializing IconController...');
        
        if (this.options.preferredFormat === 'svg' || this.options.preferredFormat === 'auto') {
            await this.loadSVGSprite();
        }
        
        this.watchReducedMotion();
        
        this.log('✅ IconController initialized');
    }

    detectReducedMotion() {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    watchReducedMotion() {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        mediaQuery.addEventListener('change', (e) => {
            this.options.reducedMotion = e.matches;
            this.log(`Reduced motion: ${e.matches ? 'ON' : 'OFF'}`);
            
            this.loadedIcons.forEach((icon, id) => {
                if (e.matches) {
                    this.pauseIcon(id);
                } else {
                    this.playIcon(id);
                }
            });
        });
    }

    async loadSVGSprite() {
        try {
            const response = await fetch(this.options.svgSpritePath);
            const svgText = await response.text();
            
            const div = document.createElement('div');
            div.style.display = 'none';
            div.innerHTML = svgText;
            document.body.insertBefore(div, document.body.firstChild);
            
            this.svgSprite = div.querySelector('svg');
            this.log('✅ SVG sprite loaded');
        } catch (error) {
            console.error('Failed to load SVG sprite:', error);
        }
    }

    createIcon(iconName, options = {}) {
        const {
            size = '48',
            format = this.options.preferredFormat,
            className = '',
            animated = true,
            intensity = 'moderate',
            id = this.generateId()
        } = options;

        let iconElement;
        const actualFormat = this.determineFormat(format);

        switch (actualFormat) {
            case 'lottie':
                iconElement = this.createLottieIcon(iconName, { size, id, intensity });
                break;
            case 'css':
                iconElement = this.createCSSIcon(iconName, { size, className, animated });
                break;
            case 'svg':
            default:
                iconElement = this.createSVGIcon(iconName, { size, className, animated });
                break;
        }

        this.loadedIcons.set(id, {
            element: iconElement,
            name: iconName,
            format: actualFormat,
            animated: animated && !this.options.reducedMotion
        });

        return iconElement;
    }

    determineFormat(format) {
        if (format !== 'auto') return format;

        if (this.options.reducedMotion) {
            return 'css';
        }

        if (this.isHighEndDevice()) {
            return 'lottie';
        }

        return 'svg';
    }

    isHighEndDevice() {
        const width = window.screen.width;
        const memory = navigator.deviceMemory || 4;
        const hardwareConcurrency = navigator.hardwareConcurrency || 4;
        
        return width >= 1024 && memory >= 4 && hardwareConcurrency >= 4;
    }

    createSVGIcon(iconName, { size, className, animated }) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.classList.add('weather-icon', iconName);
        svg.classList.add(`size-${size}`);
        if (className) svg.classList.add(className);
        if (animated && !this.options.reducedMotion) {
            svg.classList.add('animated');
        }
        
        const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
        use.setAttributeNS('http://www.w3.org/1999/xlink', 'href', `#icon-${iconName}-24`);
        svg.appendChild(use);

        return svg;
    }

    createCSSIcon(iconName, { size, className, animated }) {
        const wrapper = document.createElement('div');
        wrapper.classList.add('weather-icon', iconName, `size-${size}`);
        if (className) wrapper.classList.add(className);

        const svg = this.createSVGIcon(iconName, { size, className: '', animated });
        wrapper.appendChild(svg);

        return wrapper;
    }

    async createLottieIcon(iconName, { size, id, intensity }) {
        const container = document.createElement('div');
        container.id = id;
        container.classList.add('weather-icon', 'lottie-icon', iconName);
        container.style.width = `${size}px`;
        container.style.height = `${size}px`;

        try {
            if (typeof lottie === 'undefined') {
                await this.loadLottieScript();
            }

            const animationData = await this.loadLottieData(iconName);
            
            const animation = lottie.loadAnimation({
                container: container,
                renderer: 'svg',
                loop: true,
                autoplay: !this.options.reducedMotion,
                animationData: animationData,
                rendererSettings: {
                    progressiveLoad: true,
                    preserveAspectRatio: 'xMidYMid meet'
                }
            });

            const speed = this.getIntensitySpeed(intensity);
            animation.setSpeed(speed);

            this.lottieInstances.set(id, animation);
            
        } catch (error) {
            console.error(`Failed to load Lottie for ${iconName}:`, error);
            return this.createSVGIcon(iconName, { size, className: '', animated: true });
        }

        return container;
    }

    loadLottieScript() {
        return new Promise((resolve, reject) => {
            if (typeof lottie !== 'undefined') {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    async loadLottieData(iconName) {
        const response = await fetch(`${this.options.lottiePath}${iconName}.json`);
        return await response.json();
    }

    getIntensitySpeed(intensity) {
        const speeds = {
            light: 0.7,
            moderate: 1.0,
            heavy: 1.5
        };
        return speeds[intensity] || 1.0;
    }

    playIcon(id) {
        const icon = this.loadedIcons.get(id);
        if (!icon) return;

        if (icon.format === 'lottie') {
            const animation = this.lottieInstances.get(id);
            if (animation) animation.play();
        } else {
            icon.element.classList.add('playing');
        }
    }

    pauseIcon(id) {
        const icon = this.loadedIcons.get(id);
        if (!icon) return;

        if (icon.format === 'lottie') {
            const animation = this.lottieInstances.get(id);
            if (animation) animation.pause();
        } else {
            icon.element.classList.remove('playing');
        }
    }

    setIntensity(id, intensity) {
        const icon = this.loadedIcons.get(id);
        if (!icon) return;

        if (icon.format === 'lottie') {
            const animation = this.lottieInstances.get(id);
            if (animation) {
                const speed = this.getIntensitySpeed(intensity);
                animation.setSpeed(speed);
            }
        } else {
            icon.element.classList.remove('intensity-light', 'intensity-moderate', 'intensity-heavy');
            icon.element.classList.add(`intensity-${intensity}`);
        }
    }

    changeIcon(id, newIconName, options = {}) {
        const icon = this.loadedIcons.get(id);
        if (!icon) return;

        const newIcon = this.createIcon(newIconName, {
            ...options,
            id: id
        });

        icon.element.replaceWith(newIcon);

        if (icon.format === 'lottie') {
            const animation = this.lottieInstances.get(id);
            if (animation) {
                animation.destroy();
                this.lottieInstances.delete(id);
            }
        }
    }

    destroyIcon(id) {
        const icon = this.loadedIcons.get(id);
        if (!icon) return;

        if (icon.format === 'lottie') {
            const animation = this.lottieInstances.get(id);
            if (animation) {
                animation.destroy();
                this.lottieInstances.delete(id);
            }
        }

        icon.element.remove();

        this.loadedIcons.delete(id);
    }

    generateId() {
        return `icon-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    log(...args) {
        if (this.options.debug) {
            console.log('[IconController]', ...args);
        }
    }

    static getIconNameFromCode(weatherCode, isNight = false) {
        if (weatherCode >= 200 && weatherCode < 300) return 'thunderstorm';
        
        if (weatherCode >= 300 && weatherCode < 400) return 'drizzle';
        
        if (weatherCode >= 500 && weatherCode < 600) {
            if (weatherCode >= 502) return 'heavy-rain';
            return 'light-rain';
        }
        
        if (weatherCode >= 600 && weatherCode < 700) return 'snow';
        
        if (weatherCode >= 700 && weatherCode < 800) return 'fog';
        
        if (weatherCode === 800) {
            return isNight ? 'night-clear' : 'sunny';
        }
        
        if (weatherCode > 800) {
            if (weatherCode === 801 || weatherCode === 802) return 'partly-cloudy';
            return 'cloudy';
        }
        
        return 'sunny';
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = IconController;
}

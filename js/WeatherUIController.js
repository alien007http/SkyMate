
class WeatherUIController {
    constructor(options = {}) {
        this.options = {
            iconFormat: 'auto',
            backgroundEnabled: true,
            themeMode: 'light',
            animationIntensity: 1.0,
            reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
            ...options
        };

        this.iconController = new IconController({
            format: this.options.iconFormat,
            reducedMotion: this.options.reducedMotion
        });

        this.backgroundManager = window.backgroundManager || null;
        this.currentWeather = null;
        this.currentTimeOfDay = this.detectTimeOfDay();
        this.iconInstances = new Map();
        
        this.init();
    }

    init() {
        this.applyTheme(this.options.themeMode);
        this.setupMediaQueries();
        this.setupEventListeners();
        
        this.startTimeOfDayMonitor();
    }

    async setWeather(weatherData) {
        const { condition, temperature, humidity, windSpeed, aqi, timeOfDay } = weatherData;
        
        this.currentWeather = weatherData;
        this.currentTimeOfDay = timeOfDay || this.detectTimeOfDay();
        
        if (this.backgroundManager && this.options.backgroundEnabled) {
            await this.updateBackground(condition, this.currentTimeOfDay);
        }
        
        await this.updateMainIcon(condition, this.currentTimeOfDay);
        
        this.updateMetricsIcons({ temperature, humidity, windSpeed, aqi });
        
        this.animateTransition();
    }

    async updateMainIcon(condition, timeOfDay) {
        const container = document.querySelector('.weather-icon-main');
        if (!container) return;

        const iconName = this.getIconName(condition, timeOfDay);
        
        if (this.iconInstances.has('main')) {
            await this.fadeOutIcon(container);
            this.iconController.destroyIcon('main');
            this.iconInstances.delete('main');
        }

        const iconElement = await this.iconController.createIcon(iconName, {
            size: this.getResponsiveIconSize('main'),
            autoPlay: true,
            loop: true,
            intensity: this.options.animationIntensity
        });

        if (iconElement) {
            container.innerHTML = '';
            container.appendChild(iconElement);
            this.iconInstances.set('main', { name: iconName, element: iconElement });
            await this.fadeInIcon(container);
        }
    }

    updateMetricsIcons(metrics) {
        const metricConfigs = [
            { key: 'temperature', icon: 'temperature', selector: '.metric-temperature .metric-icon' },
            { key: 'humidity', icon: 'humidity', selector: '.metric-humidity .metric-icon' },
            { key: 'windSpeed', icon: 'wind-speed', selector: '.metric-wind .metric-icon' },
            { key: 'aqi', icon: 'aqi', selector: '.metric-aqi .metric-icon' }
        ];

        metricConfigs.forEach(async ({ key, icon, selector }) => {
            if (metrics[key] === undefined) return;

            const container = document.querySelector(selector);
            if (!container) return;

            if (!this.iconInstances.has(key)) {
                const iconElement = await this.iconController.createIcon(icon, {
                    size: 24,
                    autoPlay: true,
                    loop: true
                });

                if (iconElement) {
                    container.innerHTML = '';
                    container.appendChild(iconElement);
                    this.iconInstances.set(key, { name: icon, element: iconElement });
                }
            }
        });
    }

    async updateBackground(condition, timeOfDay) {
        if (!this.backgroundManager) return;

        const backgroundState = this.getBackgroundState(condition, timeOfDay);
        
        if (this.backgroundManager.fadeTransition) {
            await this.backgroundManager.fadeTransition(backgroundState);
        } else {
            this.backgroundManager.setBackground(backgroundState);
        }
    }

    getIconName(condition, timeOfDay) {
        const conditionMap = {
            'clear': timeOfDay === 'night' ? 'night-clear' : 'sunny',
            'partly-cloudy': 'partly-cloudy',
            'cloudy': 'cloudy',
            'light-rain': 'light-rain',
            'rain': 'heavy-rain',
            'thunderstorm': 'thunderstorm',
            'drizzle': 'drizzle',
            'snow': 'snow',
            'fog': 'fog',
            'windy': 'windy'
        };

        if (timeOfDay === 'sunrise') return 'sunrise';
        if (timeOfDay === 'sunset') return 'sunset';

        return conditionMap[condition] || 'sunny';
    }

    getBackgroundState(condition, timeOfDay) {
        if (timeOfDay === 'sunrise') return 'sunrise';
        if (timeOfDay === 'sunset') return 'sunset';
        if (timeOfDay === 'night') {
            return condition === 'clear' ? 'starry' : 'cloudy-night';
        }

        const stateMap = {
            'clear': 'clear',
            'partly-cloudy': 'partly-cloudy',
            'cloudy': 'cloudy',
            'light-rain': 'rainy',
            'rain': 'rainy',
            'thunderstorm': 'stormy',
            'drizzle': 'rainy',
            'snow': 'snowy',
            'fog': 'foggy',
            'windy': 'clear'
        };

        return stateMap[condition] || 'clear';
    }

    detectTimeOfDay() {
        const hour = new Date().getHours();
        
        if (hour >= 5 && hour < 7) return 'sunrise';
        if (hour >= 7 && hour < 18) return 'day';
        if (hour >= 18 && hour < 20) return 'sunset';
        return 'night';
    }

    startTimeOfDayMonitor() {
        setInterval(() => {
            const newTimeOfDay = this.detectTimeOfDay();
            if (newTimeOfDay !== this.currentTimeOfDay && this.currentWeather) {
                this.currentTimeOfDay = newTimeOfDay;
                this.setWeather({ ...this.currentWeather, timeOfDay: newTimeOfDay });
            }
        }, 60000);
    }

    getResponsiveIconSize(type) {
        const width = window.innerWidth;
        
        if (type === 'main') {
            if (width < 768) return 96;
            if (width < 1024) return 128;
            return 144;
        }
        
        return width < 768 ? 24 : 32;
    }

    applyTheme(mode) {
        const effectiveMode = mode === 'auto' 
            ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
            : mode;

        document.documentElement.setAttribute('data-theme', effectiveMode);
        this.options.themeMode = effectiveMode;
    }

    toggleTheme() {
        const newTheme = this.options.themeMode === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
        
        if (this.currentWeather) {
            this.updateBackground(this.currentWeather.condition, this.currentTimeOfDay);
        }
    }

    setAnimationIntensity(intensity) {
        this.options.animationIntensity = Math.max(0, Math.min(1, intensity));
        
        this.iconInstances.forEach((instance, key) => {
            this.iconController.setIntensity(key, this.options.animationIntensity);
        });
    }

    async changeIconFormat(format) {
        this.options.iconFormat = format;
        this.iconController.format = format;
        
        if (this.currentWeather) {
            await this.setWeather(this.currentWeather);
        }
    }

    pauseAnimations() {
        this.iconInstances.forEach((instance, key) => {
            this.iconController.pauseIcon(key);
        });
        
        if (this.backgroundManager && this.backgroundManager.pause) {
            this.backgroundManager.pause();
        }
    }

    playAnimations() {
        this.iconInstances.forEach((instance, key) => {
            this.iconController.playIcon(key);
        });
        
        if (this.backgroundManager && this.backgroundManager.play) {
            this.backgroundManager.play();
        }
    }

    fadeOutIcon(container) {
        return new Promise(resolve => {
            container.style.transition = 'opacity 0.3s ease-out';
            container.style.opacity = '0';
            setTimeout(resolve, 300);
        });
    }

    fadeInIcon(container) {
        return new Promise(resolve => {
            container.style.opacity = '0';
            requestAnimationFrame(() => {
                container.style.transition = 'opacity 0.3s ease-in';
                container.style.opacity = '1';
                setTimeout(resolve, 300);
            });
        });
    }

    animateTransition() {
        const cards = document.querySelectorAll('.weather-card, .forecast-card');
        cards.forEach((card, index) => {
            card.style.animation = 'none';
            requestAnimationFrame(() => {
                card.style.animation = `slideInUp 0.5s ease-out ${index * 0.1}s both`;
            });
        });
    }

    setupMediaQueries() {
        const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        reducedMotionQuery.addListener((e) => {
            this.options.reducedMotion = e.matches;
            this.iconController.reducedMotion = e.matches;
        });

        const colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
        colorSchemeQuery.addListener((e) => {
            if (this.options.themeMode === 'auto') {
                this.applyTheme('auto');
            }
        });

        window.addEventListener('resize', () => {
            if (this.currentWeather) {
                this.updateMainIcon(this.currentWeather.condition, this.currentTimeOfDay);
            }
        });
    }

    setupEventListeners() {
        const themeToggle = document.querySelector('[data-theme-toggle]');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        const playButton = document.querySelector('[data-animation-play]');
        const pauseButton = document.querySelector('[data-animation-pause]');
        
        if (playButton) {
            playButton.addEventListener('click', () => this.playAnimations());
        }
        
        if (pauseButton) {
            pauseButton.addEventListener('click', () => this.pauseAnimations());
        }

        const intensitySlider = document.querySelector('[data-intensity-slider]');
        if (intensitySlider) {
            intensitySlider.addEventListener('input', (e) => {
                this.setAnimationIntensity(e.target.value / 100);
            });
        }

        const formatSelector = document.querySelector('[data-format-selector]');
        if (formatSelector) {
            formatSelector.addEventListener('change', (e) => {
                this.changeIconFormat(e.target.value);
            });
        }
    }

    destroy() {
        this.iconInstances.forEach((instance, key) => {
            this.iconController.destroyIcon(key);
        });
        
        this.iconInstances.clear();
        this.currentWeather = null;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = WeatherUIController;
}

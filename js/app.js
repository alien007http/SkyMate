
let backgroundManager;
let weatherUIController;

document.addEventListener('DOMContentLoaded', () => {
    console.log('Weather Dashboard Initialized');
    console.log('='.repeat(50));
    console.log('🔧 CONFIGURATION CHECK:');
    console.log('API Key:', CONFIG.API_KEY ? CONFIG.API_KEY : '❌ NOT SET');
    console.log('Base URL:', CONFIG.BASE_URL);
    console.log('Geo URL:', CONFIG.GEO_URL);
    console.log('='.repeat(50));
    
    initializeWeatherUI();
    
    if (CONFIG.API_KEY === 'YOUR_API_KEY_HERE') {
        showError('⚠️ Please configure your OpenWeatherMap API key in js/config.js');
        console.error('❌ API KEY NOT CONFIGURED!');
    } else {
        console.log('✅ API Key is configured');
        
        console.log('🧪 Testing API connection...');
        testAPIConnection();
    }
    
    Theme.init();
    
    VoiceSearch.init();
    
    displayFavorites();
    
    setupEventListeners();
    const lastCity = Storage.getLastCity();
    if (lastCity) {
        Weather.fetchWeatherByCity(lastCity);
    } else {
        Weather.getCurrentLocationWeather();
    }
    
    setInterval(updateDateTime, 60000);
});


async function testAPIConnection() {
    try {
        const testUrl = `${CONFIG.BASE_URL}/weather?q=Delhi&appid=${CONFIG.API_KEY}&units=metric`;
        console.log('Testing URL:', testUrl.replace(CONFIG.API_KEY, 'API_KEY_HIDDEN'));
        
        const response = await fetch(testUrl);
        console.log('API Response Status:', response.status, response.statusText);
        
        if (response.status === 401) {
            console.error('❌ API KEY ERROR: Invalid or not activated');
            console.error('⏰ If you just created the key, wait 10-120 minutes for activation');
            const errorData = await response.json();
            console.error('API Error Details:', errorData);
            showError('API key error: Key not activated or invalid. Please wait or check your API key.');
        } else if (response.status === 429) {
            console.error('❌ RATE LIMIT: Too many requests');
            showError('API rate limit exceeded. Please wait a few minutes.');
        } else if (!response.ok) {
            console.error('❌ API ERROR:', response.status);
            const errorData = await response.text();
            console.error('Error details:', errorData);
        } else {
            const data = await response.json();
            console.log('✅ API CONNECTION SUCCESS!');
            console.log('Test City:', data.name);
            console.log('Temperature:', data.main.temp + '°C');
            console.log('Weather:', data.weather[0].description);
        }
    } catch (error) {
        console.error('❌ NETWORK ERROR:', error);
        console.error('Check internet connection or firewall settings');
    }
}


function initializeWeatherUI() {
    try {
        console.log('🎨 Initializing Weather UI Controller...');
        
        weatherUIController = new WeatherUIController({
            iconFormat: 'auto',
            backgroundEnabled: true,
            themeMode: 'light',
            animationIntensity: 1.0
        });
        
        backgroundManager = weatherUIController.backgroundManager;
        
        console.log('✅ Weather UI Controller initialized');
        
    } catch (error) {
        console.error('❌ Failed to initialize Weather UI Controller:', error);
        initializeBackgroundManager();
    }
}

function initializeBackgroundManager() {
    try {
        console.log('🎨 Initializing Background Manager...');
        
        backgroundManager = new BackgroundManager({
            container: document.body,
            technique: 'auto',
            debug: false,
            
            onStateChange: (state) => {
                console.log('🌤️ Weather background changed to:', state);
            },
            
            onTechniqueChange: (technique) => {
                console.log('🖼️ Rendering technique:', technique.toUpperCase());
            },
            
            onError: (error) => {
                console.error('❌ Background error:', error);
            }
        });
        
        console.log('✅ Background Manager initialized');
        console.log('Technique:', backgroundManager.currentTechnique);
        console.log('Capabilities:', backgroundManager.capabilities);
        
    } catch (error) {
        console.error('❌ Failed to initialize Background Manager:', error);
    }
}

function updateWeatherBackground(weatherData) {
    if (!weatherUIController && !backgroundManager) {
        console.warn('⚠️ Weather UI not initialized');
        return;
    }
    
    try {
        const currentTime = Date.now() / 1000;
        const sunrise = weatherData.sys?.sunrise || 0;
        const sunset = weatherData.sys?.sunset || 0;
        const isNight = currentTime < sunrise || currentTime > sunset;
        
        const hour = new Date().getHours();
        let timeOfDay = 'day';
        if (hour >= 5 && hour < 7) timeOfDay = 'sunrise';
        else if (hour >= 18 && hour < 20) timeOfDay = 'sunset';
        else if (isNight) timeOfDay = 'night';
        
        const weatherCode = data.weather[0].id;
        const weatherMain = weatherData.weather[0].main.toLowerCase();
        let condition = 'sunny';
        
        if (weatherCode >= 200 && weatherCode < 300) condition = 'thunderstorm';
        else if (weatherCode >= 300 && weatherCode < 400) condition = 'drizzle';
        else if (weatherCode >= 500 && weatherCode < 600) {
            condition = weatherCode >= 502 ? 'heavy-rain' : 'light-rain';
        }
        else if (weatherCode >= 600 && weatherCode < 700) condition = 'snow';
        else if (weatherCode >= 700 && weatherCode < 800) condition = 'fog';
        else if (weatherCode === 800) condition = 'clear';
        else if (weatherCode === 801 || weatherCode === 802) condition = 'partly-cloudy';
        else if (weatherCode >= 803) condition = 'cloudy';
        
        if (weatherUIController) {
            weatherUIController.setWeather({
                condition: condition,
                temperature: weatherData.main.temp,
                humidity: weatherData.main.humidity,
                windSpeed: weatherData.wind.speed,
                timeOfDay: timeOfDay
            });
            
            createMainWeatherIcon(condition, timeOfDay);
        } else if (backgroundManager) {
            backgroundManager.setWeather({
                code: weatherCode,
                main: weatherData.weather[0].main,
                description: weatherData.weather[0].description,
                isNight: isNight,
                intensity: 'moderate'
            });
        }
        
        console.log('🎨 Weather UI updated:', {
            condition,
            timeOfDay,
            isNight
        });
        
    } catch (error) {
        console.error('❌ Error updating weather UI:', error);
    }
}

async function createMainWeatherIcon(condition, timeOfDay) {
    const iconContainer = document.getElementById('weatherIcon');
    if (!iconContainer || !weatherUIController) return;
    
    try {
        let iconName = condition;
        if (timeOfDay === 'sunrise') iconName = 'sunrise';
        else if (timeOfDay === 'sunset') iconName = 'sunset';
        else if (timeOfDay === 'night' && condition === 'clear') iconName = 'night-clear';
        
        iconContainer.innerHTML = '';
        
        const icon = await weatherUIController.iconController.createIcon(iconName, {
            size: window.innerWidth < 768 ? 96 : 144,
            autoPlay: true,
            loop: true,
            intensity: 1.0
        });
        
        if (icon) {
            iconContainer.appendChild(icon);
            console.log('✅ Main weather icon created:', iconName);
        }
    } catch (error) {
        console.error('❌ Error creating main weather icon:', error);
    }
}

function setupEventListeners() {
    document.getElementById('searchBtn').addEventListener('click', () => {
        const city = document.getElementById('cityInput').value.trim();
        if (city) {
            Weather.fetchWeatherByCity(city);
        } else {
            showError('Please enter a city name');
        }
    });
    
    document.getElementById('cityInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const city = e.target.value.trim();
            if (city) {
                Weather.fetchWeatherByCity(city);
            }
        }
    });
    
    document.getElementById('cityInput').addEventListener('input', (e) => {
        const value = e.target.value.trim();
        if (value.length > 2) {
        }
    });
    
    document.getElementById('locationBtn').addEventListener('click', () => {
        Weather.getCurrentLocationWeather();
    });
    
    document.getElementById('addToFavorites').addEventListener('click', () => {
        Weather.toggleFavorite();
    });
    
    document.getElementById('themeToggle').addEventListener('click', () => {
        Theme.toggle();
        if (weatherUIController) {
            weatherUIController.toggleTheme();
        }
    });
    
    document.getElementById('voiceSearchBtn').addEventListener('click', () => {
        VoiceSearch.start();
    });
    
    document.getElementById('compareBtn').addEventListener('click', () => {
        Comparison.compareCities();
    });
    
    document.getElementById('compareCity1').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            Comparison.compareCities();
        }
    });
    
    document.getElementById('compareCity2').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            Comparison.compareCities();
        }
    });
}

function updateDateTime() {
    const dateTimeEl = document.getElementById('dateTime');
    if (dateTimeEl && Weather.currentCity) {
        dateTimeEl.textContent = new Date().toLocaleString('en-IN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('cityInput').focus();
    }
    
    if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault();
        Weather.getCurrentLocationWeather();
    }
    
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        Theme.toggle();
    }
});

window.addEventListener('error', (e) => {
    console.error('Application error:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
});

if ('serviceWorker' in navigator) {
}

console.log(`
╔══════════════════════════════════════════╗
║   Weather Dashboard v1.0                 ║
║   BCA Final Project                      ║
║   Advanced Features Enabled              ║
╚══════════════════════════════════════════╝

Features:
✅ Auto-location detection
✅ 7-day weather forecast
✅ Air Quality Index (AQI)
✅ Hourly forecast chart
✅ Favorite cities
✅ City comparison
✅ Voice search
✅ Dark/Light mode
✅ Weather alerts
✅ Dynamic backgrounds
✅ Animated weather effects (NEW!)

Keyboard Shortcuts:
• Ctrl/Cmd + K: Focus search
• Ctrl/Cmd + L: Get location
• Ctrl/Cmd + D: Toggle theme

Need help? Check README.md
`);

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        if (weatherUIController) {
            weatherUIController.pauseAnimations();
        } else if (backgroundManager) {
            backgroundManager.pause();
        }
        console.log('⏸️ Animations paused (tab hidden)');
    } else {
        if (weatherUIController) {
            weatherUIController.playAnimations();
        } else if (backgroundManager) {
            backgroundManager.resume();
        }
        console.log('▶️ Animations resumed');
    }
});

window.addEventListener('beforeunload', () => {
    if (weatherUIController) {
        weatherUIController.destroy();
        console.log('🧹 Weather UI Controller cleaned up');
    } else if (backgroundManager) {
        backgroundManager.destroy();
        console.log('🧹 Background Manager cleaned up');
    }
});

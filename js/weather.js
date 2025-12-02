const Weather = {
    currentCity: null,
    currentCoords: null,

    async fetchWeatherByCity(city) {
        try {
            showLoading(true);
            
            console.log('Fetching weather for:', city);
            console.log('API Key configured:', CONFIG.API_KEY ? 'Yes' : 'No');
            
            const geoUrl = `${CONFIG.GEO_URL}/direct?q=${encodeURIComponent(city)}&limit=1&appid=${CONFIG.API_KEY}`;
            console.log('Geocoding URL:', geoUrl.replace(CONFIG.API_KEY, 'API_KEY_HIDDEN'));
            
            const geoResponse = await fetch(geoUrl);
            
            console.log('Geocoding Response Status:', geoResponse.status);
            
            if (!geoResponse.ok) {
                const errorText = await geoResponse.text();
                console.error('Geocoding API Error:', errorText);
                throw new Error(`City not found (Status: ${geoResponse.status})`);
            }
            
            const geoData = await geoResponse.json();
            console.log('Geocoding Data:', geoData);
            
            if (geoData.length === 0) {
                throw new Error('City not found. Please check spelling.');
            }
            
            const { lat, lon, name, country } = geoData[0];
            this.currentCoords = { lat, lon };
            this.currentCity = { name, country };
            
            await this.fetchWeatherByCoords(lat, lon);
            
            Storage.setLastCity(city);
            
            showLoading(false);
        } catch (error) {
            showLoading(false);
            console.error('Weather fetch error:', error);
            
            let errorMessage = 'Unable to fetch weather data. ';
            
            if (error.message.includes('City not found')) {
                errorMessage = 'City not found. Please check the spelling and try again.';
            } else if (error.message.includes('401')) {
                errorMessage = 'API key error. Please check your OpenWeatherMap API key in config.js';
            } else if (error.message.includes('429')) {
                errorMessage = 'API rate limit exceeded. Please try again in a few minutes.';
            } else if (error.message.includes('Failed to fetch')) {
                errorMessage = 'Network error. Please check your internet connection.';
            } else {
                errorMessage += error.message || 'Please try again.';
            }
            
            showError(errorMessage);
        }
    },

    async fetchWeatherByCoords(lat, lon) {
        try {
            showLoading(true);
            
            console.log('Fetching weather for coordinates:', lat, lon);
            
            const weatherUrl = `${CONFIG.BASE_URL}/weather?lat=${lat}&lon=${lon}&units=${CONFIG.UNITS}&appid=${CONFIG.API_KEY}`;
            console.log('Weather URL:', weatherUrl.replace(CONFIG.API_KEY, 'API_KEY_HIDDEN'));
            
            const weatherResponse = await fetch(weatherUrl);
            
            console.log('Weather Response Status:', weatherResponse.status);
            
            if (!weatherResponse.ok) {
                const errorText = await weatherResponse.text();
                console.error('Weather API Error:', errorText);
                throw new Error(`Weather data unavailable (Status: ${weatherResponse.status})`);
            }
            
            const weatherData = await weatherResponse.json();
            
            if (!this.currentCity) {
                this.currentCity = {
                    name: weatherData.name,
                    country: weatherData.sys.country
                };
            }
            
            this.currentCoords = { lat, lon };
            
            this.displayCurrentWeather(weatherData);
            
            this.updateBackground(weatherData);
            
            await Promise.all([
                Forecast.fetch7DayForecast(lat, lon),
                AQI.fetchAirQuality(lat, lon),
                this.fetchWeatherAlerts(lat, lon)
            ]);
            
            showLoading(false);
        } catch (error) {
            showLoading(false);
            showError('Unable to fetch weather data. Please try again.');
            console.error('Weather fetch error:', error);
        }
    },

    async getCurrentLocationWeather() {
        if (!CONFIG.ENABLE_GEOLOCATION) {
            showError('Geolocation is disabled');
            return;
        }

        if (!navigator.geolocation) {
            showError('Geolocation is not supported by your browser');
            return;
        }

        showLoading(true);

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                await this.fetchWeatherByCoords(latitude, longitude);
            },
            (error) => {
                showLoading(false);
                let message = 'Unable to get your location. ';
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        message += 'Please allow location access.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        message += 'Location information unavailable.';
                        break;
                    case error.TIMEOUT:
                        message += 'Location request timed out.';
                        break;
                    default:
                        message += 'An unknown error occurred.';
                }
                showError(message);
            }
        );
    },

    displayCurrentWeather(data) {
        document.getElementById('cityName').textContent = 
            `${this.currentCity.name}, ${this.currentCity.country}`;
        
        document.getElementById('dateTime').textContent = 
            new Date().toLocaleString('en-IN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

        document.getElementById('temperature').textContent = 
            Math.round(data.main.temp);
        
        document.getElementById('weatherDescription').textContent = 
            data.weather[0].description;
        
        const iconCode = data.weather[0].icon;
        const weatherIconContainer = document.getElementById('weatherIcon');
        weatherIconContainer.innerHTML = '';
        
        if (window.weatherUIController) {
        } else {
            const img = document.createElement('img');
            img.src = `https://openweathermap.org/img/wn/${iconCode}@4x.png`;
            img.alt = data.weather[0].description;
            img.style.width = '100%';
            img.style.height = '100%';
            weatherIconContainer.appendChild(img);
        }

        
        const humidity = data.main.humidity;
        document.getElementById('humidity').textContent = `${humidity}%`;
        const humidityBar = document.getElementById('humidityBar');
        if (humidityBar) {
            humidityBar.style.width = `${humidity}%`;
        }
        
        const windSpeedMs = data.wind.speed;
        const windSpeedKmh = windSpeedMs * 3.6;
        document.getElementById('windSpeed').textContent = `${windSpeedKmh.toFixed(1)} km/h`;
        const windSpeedBar = document.getElementById('windBar');
        if (windSpeedBar) {
            const windPercentage = Math.min((windSpeedKmh / 100) * 100, 100);
            windSpeedBar.style.width = `${windPercentage}%`;
        }
        
        const windDirection = data.wind.deg || 0;
        document.getElementById('windDirection').textContent = this.getWindDirection(windDirection);
        const windArrow = document.getElementById('windArrow');
        if (windArrow) {
            windArrow.style.transform = `rotate(${windDirection}deg)`;
        }
        
        const pressure = data.main.pressure;
        document.getElementById('pressure').textContent = `${pressure} hPa`;
        const pressureBar = document.getElementById('pressureBar');
        if (pressureBar) {
            const pressurePercentage = ((pressure - 950) / (1050 - 950)) * 100;
            pressureBar.style.width = `${Math.max(0, Math.min(100, pressurePercentage))}%`;
        }
        
        const visibilityKm = data.visibility / 1000;
        document.getElementById('visibility').textContent = `${visibilityKm.toFixed(1)} km`;
        const visibilityBar = document.getElementById('visibilityBar');
        if (visibilityBar) {
            const visibilityPercentage = Math.min((visibilityKm / 10) * 100, 100);
            visibilityBar.style.width = `${visibilityPercentage}%`;
        }
        
        const sunrise = new Date(data.sys.sunrise * 1000);
        const sunset = new Date(data.sys.sunset * 1000);
        document.getElementById('sunrise').textContent = 
            sunrise.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        document.getElementById('sunset').textContent = 
            sunset.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

        this.fetchUVIndex(this.currentCoords.lat, this.currentCoords.lon);

        this.updateFavoriteButton();

        if (typeof updateWeatherBackground === 'function') {
            updateWeatherBackground(data);
        }

        document.getElementById('currentWeather').style.display = 'block';
    },

    async fetchWeatherAlerts(lat, lon) {
        try {
            const response = await fetch(
                `${CONFIG.BASE_URL}/onecall?lat=${lat}&lon=${lon}&exclude=current,minutely,hourly,daily&appid=${CONFIG.API_KEY}`
            );
            
            if (response.ok) {
                const data = await response.json();
                if (data.alerts && data.alerts.length > 0) {
                    this.displayWeatherAlerts(data.alerts);
                } else {
                    document.getElementById('weatherAlerts').innerHTML = '';
                }
            }
        } catch (error) {
            console.log('Weather alerts not available');
        }
    },

    displayWeatherAlerts(alerts) {
        const container = document.getElementById('weatherAlerts');
        container.innerHTML = alerts.map(alert => `
            <div class="alert">
                <i class="fas fa-exclamation-triangle"></i>
                <div>
                    <strong>${alert.event}</strong>
                    <p>${alert.description.substring(0, 150)}...</p>
                </div>
            </div>
        `).join('');
    },

    updateBackground(data) {
        const weatherMain = data.weather[0].main.toLowerCase();
        const hour = new Date().getHours();
        const isNight = hour < 6 || hour > 19;
        
        document.body.className = document.body.className
            .replace(/weather-\w+/g, '').trim();
        
        if (isNight) {
            document.body.classList.add('weather-night');
        } else if (weatherMain.includes('rain') || weatherMain.includes('drizzle')) {
            document.body.classList.add('weather-rainy');
        } else if (weatherMain.includes('cloud')) {
            document.body.classList.add('weather-cloudy');
        } else if (weatherMain.includes('clear')) {
            document.body.classList.add('weather-clear');
        } else {
            document.body.classList.add('weather-sunny');
        }
    },

    updateFavoriteButton() {
        const btn = document.getElementById('addToFavorites');
        const isFav = Storage.isFavorite(this.currentCity.name);
        
        if (isFav) {
            btn.innerHTML = '<i class="fas fa-heart"></i> Remove from Favorites';
            btn.classList.add('active');
        } else {
            btn.innerHTML = '<i class="far fa-heart"></i> Add to Favorites';
            btn.classList.remove('active');
        }
    },

    toggleFavorite() {
        if (!this.currentCity) return;
        
        const isFav = Storage.isFavorite(this.currentCity.name);
        
        if (isFav) {
            Storage.removeFavorite(this.currentCity.name);
            showNotification('Removed from favorites', 'success');
        } else {
            const temp = document.getElementById('temperature').textContent;
            const weather = document.getElementById('weatherDescription').textContent;
            const iconElement = document.getElementById('weatherIcon');
            const icon = iconElement.querySelector('img')?.src?.split('/').pop().split('@')[0] || 'default';
            
            Storage.addFavorite({
                name: this.currentCity.name,
                country: this.currentCity.country,
                lat: this.currentCoords.lat,
                lon: this.currentCoords.lon,
                temp: temp,
                weather: weather,
                icon: icon
            });
            showNotification('Added to favorites', 'success');
        }
        
        this.updateFavoriteButton();
        displayFavorites();
    },

    getWindDirection(degrees) {
        const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 
                          'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
        const index = Math.round(degrees / 22.5) % 16;
        return directions[index];
    },

    async fetchUVIndex(lat, lon) {
        try {
            const response = await fetch(
                `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&exclude=minutely,hourly,daily,alerts&appid=${CONFIG.API_KEY}`
            );
            
            if (response.ok) {
                const data = await response.json();
                const uvIndex = data.current?.uvi || 0;
                document.getElementById('uvIndex').textContent = uvIndex.toFixed(1);
                
                const uvIndicator = document.getElementById('uvIndicator');
                if (uvIndicator) {
                    const uvPercentage = Math.min((uvIndex / 11) * 100, 100);
                    uvIndicator.style.left = `${uvPercentage}%`;
                }
            } else {
                document.getElementById('uvIndex').textContent = 'N/A';
            }
        } catch (error) {
            console.log('UV Index not available:', error);
            document.getElementById('uvIndex').textContent = 'N/A';
        }
    }
};

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (show) {
        overlay.classList.add('active');
    } else {
        overlay.classList.remove('active');
    }
}

function showError(message) {
    alert(message);
    
    const errorDisplay = document.getElementById('errorDisplay');
    const errorMessage = document.getElementById('errorMessage');
    
    if (errorDisplay && errorMessage) {
        errorDisplay.style.display = 'block';
        errorMessage.textContent = '❌ ' + message + '\n\n' + 
            'Troubleshooting:\n' +
            '1. Check if API key is activated (wait 10-120 min)\n' +
            '2. Verify internet connection\n' +
            '3. Try a different city name\n' +
            '4. Check browser console (F12) for details\n\n' +
            'Open test-api.html for detailed diagnostics.';
        
        errorDisplay.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${type === 'success' ? '#22c55e' : '#f97316'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}


const Comparison = {
    city1Data: null,
    city2Data: null,

    async compareCities() {
        const city1 = document.getElementById('compareCity1').value.trim();
        const city2 = document.getElementById('compareCity2').value.trim();
        
        if (!city1 || !city2) {
            showError('Please enter both city names');
            return;
        }
        
        showLoading(true);
        
        try {
            const [data1, data2] = await Promise.all([
                this.fetchCityData(city1),
                this.fetchCityData(city2)
            ]);
            
            this.city1Data = data1;
            this.city2Data = data2;
            
            this.displayComparison();
            showLoading(false);
            
        } catch (error) {
            showLoading(false);
            showError('Unable to compare cities. Please check city names.');
            console.error('Comparison error:', error);
        }
    },

    async fetchCityData(city) {
        const geoResponse = await fetch(
            `${CONFIG.GEO_URL}/direct?q=${encodeURIComponent(city)}&limit=1&appid=${CONFIG.API_KEY}`
        );
        
        if (!geoResponse.ok) throw new Error('City not found');
        
        const geoData = await geoResponse.json();
        if (geoData.length === 0) throw new Error('City not found');
        
        const { lat, lon, name, country } = geoData[0];
        
        const weatherResponse = await fetch(
            `${CONFIG.BASE_URL}/weather?lat=${lat}&lon=${lon}&units=${CONFIG.UNITS}&appid=${CONFIG.API_KEY}`
        );
        
        if (!weatherResponse.ok) throw new Error('Weather data unavailable');
        
        const weatherData = await weatherResponse.json();
        
        let aqiData = null;
        try {
            const aqiResponse = await fetch(
                `${CONFIG.BASE_URL}/air_pollution?lat=${lat}&lon=${lon}&appid=${CONFIG.API_KEY}`
            );
            if (aqiResponse.ok) {
                const aqi = await aqiResponse.json();
                aqiData = aqi.list[0];
            }
        } catch (error) {
            console.log('AQI data unavailable for', name);
        }
        
        return {
            name,
            country,
            temp: weatherData.main.temp,
            feelsLike: weatherData.main.feels_like,
            humidity: weatherData.main.humidity,
            windSpeed: weatherData.wind.speed,
            pressure: weatherData.main.pressure,
            visibility: weatherData.visibility,
            weather: weatherData.weather[0].description,
            aqi: aqiData ? aqiData.main.aqi : null
        };
    },

    displayComparison() {
        const container = document.getElementById('comparisonResults');
        
        const html = `
            <div class="comparison-city">
                <h3>${this.city1Data.name}, ${this.city1Data.country}</h3>
                ${this.generateCityMetrics(this.city1Data, this.city2Data)}
            </div>
            
            <div class="comparison-divider"></div>
            
            <div class="comparison-city">
                <h3>${this.city2Data.name}, ${this.city2Data.country}</h3>
                ${this.generateCityMetrics(this.city2Data, this.city1Data)}
            </div>
        `;
        
        container.innerHTML = html;
    },

    generateCityMetrics(city, compareCity) {
        const metrics = [
            {
                label: 'Temperature',
                value: `${Math.round(city.temp)}°C`,
                isWinner: city.temp > compareCity.temp,
                neutral: false
            },
            {
                label: 'Feels Like',
                value: `${Math.round(city.feelsLike)}°C`,
                isWinner: city.feelsLike > compareCity.feelsLike,
                neutral: false
            },
            {
                label: 'Humidity',
                value: `${city.humidity}%`,
                isWinner: city.humidity < compareCity.humidity,
                neutral: false
            },
            {
                label: 'Wind Speed',
                value: `${(city.windSpeed * 3.6).toFixed(1)} km/h`,
                isWinner: city.windSpeed < compareCity.windSpeed,
                neutral: false
            },
            {
                label: 'Pressure',
                value: `${city.pressure} hPa`,
                isWinner: false,
                neutral: true
            },
            {
                label: 'Visibility',
                value: `${(city.visibility / 1000).toFixed(1)} km`,
                isWinner: city.visibility > compareCity.visibility,
                neutral: false
            },
            {
                label: 'AQI',
                value: city.aqi ? city.aqi : 'N/A',
                isWinner: city.aqi && compareCity.aqi && city.aqi < compareCity.aqi,
                neutral: !city.aqi || !compareCity.aqi
            }
        ];
        
        return metrics.map(metric => `
            <div class="comparison-metric">
                <span class="metric-label">${metric.label}</span>
                <span class="metric-value ${!metric.neutral && metric.isWinner ? 'metric-winner' : ''}">
                    ${metric.value}
                    ${!metric.neutral && metric.isWinner ? ' ✓' : ''}
                </span>
            </div>
        `).join('');
    }
};

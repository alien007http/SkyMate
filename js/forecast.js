
const Forecast = {
    hourlyChart: null,

    async fetch7DayForecast(lat, lon) {
        try {
            const response = await fetch(
                `${CONFIG.BASE_URL}/forecast?lat=${lat}&lon=${lon}&units=${CONFIG.UNITS}&appid=${CONFIG.API_KEY}`
            );
            
            if (!response.ok) throw new Error('Forecast data unavailable');
            
            const data = await response.json();
            
            this.display7DayForecast(data.list);
            
            this.displayHourlyChart(data.list);
            
        } catch (error) {
            console.error('Forecast fetch error:', error);
        }
    },

    display7DayForecast(forecastList) {
        const container = document.getElementById('forecastContainer');
        
        const dailyForecasts = {};
        
        forecastList.forEach(item => {
            const date = new Date(item.dt * 1000);
            const dayKey = date.toDateString();
            
            if (!dailyForecasts[dayKey]) {
                dailyForecasts[dayKey] = {
                    date: date,
                    temps: [],
                    humidity: [],
                    windSpeed: [],
                    weather: item.weather[0],
                    icon: item.weather[0].icon,
                    description: item.weather[0].description
                };
            }
            
            dailyForecasts[dayKey].temps.push(item.main.temp);
            dailyForecasts[dayKey].humidity.push(item.main.humidity);
            dailyForecasts[dayKey].windSpeed.push(item.wind.speed);
        });
        
        const daysArray = Object.values(dailyForecasts).slice(0, 7);
        
        container.innerHTML = daysArray.map(day => {
            const maxTemp = Math.round(Math.max(...day.temps));
            const minTemp = Math.round(Math.min(...day.temps));
            const avgHumidity = Math.round(
                day.humidity.reduce((a, b) => a + b) / day.humidity.length
            );
            const avgWind = (
                day.windSpeed.reduce((a, b) => a + b) / day.windSpeed.length * 3.6
            ).toFixed(1);
            
            const dayName = day.date.toLocaleDateString('en-IN', { weekday: 'short' });
            const dateStr = day.date.toLocaleDateString('en-IN', { 
                month: 'short', 
                day: 'numeric' 
            });
            
            return `
                <div class="forecast-card">
                    <div class="forecast-day">${dayName}</div>
                    <div class="forecast-date">${dateStr}</div>
                    <img 
                        src="https://openweathermap.org/img/wn/${day.icon}@2x.png" 
                        alt="${day.description}"
                        class="forecast-icon"
                    >
                    <div class="forecast-temp">${maxTemp}°C</div>
                    <div class="forecast-temp-range">${minTemp}° - ${maxTemp}°</div>
                    <div class="forecast-details">
                        <div class="forecast-detail">
                            <span><i class="fas fa-droplet"></i></span>
                            <span>${avgHumidity}%</span>
                        </div>
                        <div class="forecast-detail">
                            <span><i class="fas fa-wind"></i></span>
                            <span>${avgWind} km/h</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    displayHourlyChart(forecastList) {
        const canvas = document.getElementById('hourlyChart');
        const ctx = canvas.getContext('2d');
        
        if (this.hourlyChart) {
            this.hourlyChart.destroy();
        }
        
        const hourlyData = forecastList.slice(0, 8);
        
        const labels = hourlyData.map(item => {
            const date = new Date(item.dt * 1000);
            return date.toLocaleTimeString('en-IN', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        });
        
        const temperatures = hourlyData.map(item => Math.round(item.main.temp));
        const humidity = hourlyData.map(item => item.main.humidity);
        
        this.hourlyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Temperature (°C)',
                        data: temperatures,
                        borderColor: 'rgb(102, 126, 234)',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        borderWidth: 3,
                        tension: 0.4,
                        fill: true,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Humidity (%)',
                        data: humidity,
                        borderColor: 'rgb(118, 75, 162)',
                        backgroundColor: 'rgba(118, 75, 162, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: true,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        titleFont: { size: 14 },
                        bodyFont: { size: 13 }
                    }
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Temperature (°C)'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Humidity (%)'
                        },
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                }
            }
        });
    }
};


function displayFavorites() {
    const container = document.getElementById('favoritesContainer');
    const favorites = Storage.getFavorites();
    
    if (favorites.length === 0) {
        container.innerHTML = '<p class="no-favorites">No favorite cities yet. Add some!</p>';
        return;
    }
    
    container.innerHTML = favorites.map(city => `
        <div class="favorite-card" onclick="Weather.fetchWeatherByCity('${city.name}')">
            <button class="remove-favorite" onclick="event.stopPropagation(); removeFavorite('${city.name}')">
                <i class="fas fa-times"></i>
            </button>
            <div class="favorite-city">${city.name}</div>
            <div class="favorite-temp">${city.temp}°C</div>
            <div class="favorite-weather">${city.weather}</div>
        </div>
    `).join('');
}

function removeFavorite(cityName) {
    Storage.removeFavorite(cityName);
    displayFavorites();
    Weather.updateFavoriteButton();
    showNotification('Removed from favorites', 'success');
}

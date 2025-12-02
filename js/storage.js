
const Storage = {
    getFavorites() {
        try {
            const favorites = localStorage.getItem(CONFIG.STORAGE_KEYS.FAVORITES);
            return favorites ? JSON.parse(favorites) : [];
        } catch (error) {
            console.error('Error reading favorites:', error);
            return [];
        }
    },

    addFavorite(cityData) {
        try {
            const favorites = this.getFavorites();
            
            const exists = favorites.some(fav => 
                fav.name.toLowerCase() === cityData.name.toLowerCase()
            );
            
            if (!exists) {
                favorites.push({
                    name: cityData.name,
                    country: cityData.country,
                    lat: cityData.lat,
                    lon: cityData.lon,
                    temp: cityData.temp,
                    weather: cityData.weather,
                    icon: cityData.icon,
                    addedAt: new Date().toISOString()
                });
                
                localStorage.setItem(
                    CONFIG.STORAGE_KEYS.FAVORITES, 
                    JSON.stringify(favorites)
                );
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error adding favorite:', error);
            return false;
        }
    },

    removeFavorite(cityName) {
        try {
            let favorites = this.getFavorites();
            favorites = favorites.filter(fav => 
                fav.name.toLowerCase() !== cityName.toLowerCase()
            );
            localStorage.setItem(
                CONFIG.STORAGE_KEYS.FAVORITES, 
                JSON.stringify(favorites)
            );
            return true;
        } catch (error) {
            console.error('Error removing favorite:', error);
            return false;
        }
    },

    isFavorite(cityName) {
        const favorites = this.getFavorites();
        return favorites.some(fav => 
            fav.name.toLowerCase() === cityName.toLowerCase()
        );
    },

    getTheme() {
        return localStorage.getItem(CONFIG.STORAGE_KEYS.THEME) || 'light';
    },

    setTheme(theme) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.THEME, theme);
    },

    getLastCity() {
        return localStorage.getItem(CONFIG.STORAGE_KEYS.LAST_CITY);
    },

    setLastCity(city) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.LAST_CITY, city);
    },

    clearAll() {
        Object.values(CONFIG.STORAGE_KEYS).forEach(key => {
            localStorage.removeItem(key);
        });
    }
};

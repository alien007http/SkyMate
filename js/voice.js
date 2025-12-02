
const VoiceSearch = {
    recognition: null,
    isListening: false,

    init() {
        if (!CONFIG.ENABLE_VOICE_SEARCH) return;

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            console.log('Speech recognition not supported');
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.lang = 'en-IN';
        this.recognition.interimResults = false;
        this.recognition.maxAlternatives = 1;

        this.recognition.onstart = () => {
            this.isListening = true;
            this.updateButton(true);
            showNotification('Listening... Speak now!', 'info');
        };

        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript.toLowerCase();
            console.log('Voice input:', transcript);
            
            this.processVoiceCommand(transcript);
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.isListening = false;
            this.updateButton(false);
            
            if (event.error !== 'no-speech') {
                showError('Voice recognition error. Please try again.');
            }
        };

        this.recognition.onend = () => {
            this.isListening = false;
            this.updateButton(false);
        };
    },

    start() {
        if (!this.recognition) {
            showError('Voice search is not available in your browser');
            return;
        }

        if (this.isListening) {
            this.stop();
        } else {
            try {
                this.recognition.start();
            } catch (error) {
                console.error('Error starting recognition:', error);
            }
        }
    },

    stop() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
    },

    processVoiceCommand(transcript) {
        const patterns = [
            /weather in (.+)/i,
            /weather for (.+)/i,
            /temperature in (.+)/i,
            /temperature of (.+)/i,
            /what is the weather in (.+)/i,
            /tell me the weather in (.+)/i,
            /how is the weather in (.+)/i,
            /(.+) weather/i
        ];

        let cityName = null;

        for (const pattern of patterns) {
            const match = transcript.match(pattern);
            if (match) {
                cityName = match[1].trim();
                break;
            }
        }

        if (cityName) {
            cityName = cityName
                .replace(/^(the|a|an)\s+/i, '')
                .replace(/\s+(city|weather|temperature)$/i, '')
                .trim();
            
            document.getElementById('cityInput').value = cityName;
            Weather.fetchWeatherByCity(cityName);
            showNotification(`Searching weather for ${cityName}...`, 'success');
        } else if (transcript.includes('my location') || transcript.includes('current location')) {
            Weather.getCurrentLocationWeather();
            showNotification('Getting your location weather...', 'success');
        } else {
            showError('Could not understand city name. Please try again.');
        }
    },

    updateButton(listening) {
        const btn = document.getElementById('voiceSearchBtn');
        if (listening) {
            btn.classList.add('listening');
            btn.style.animation = 'pulse 1s infinite';
            btn.style.color = '#dc2626';
        } else {
            btn.classList.remove('listening');
            btn.style.animation = '';
            btn.style.color = '';
        }
    }
};

const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
    }
`;
document.head.appendChild(style);

const Theme = {
    currentTheme: 'light',

    init() {
        this.currentTheme = Storage.getTheme();
        this.applyTheme(this.currentTheme);
        this.updateToggleButton();
    },

    toggle() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(this.currentTheme);
        this.updateToggleButton();
        Storage.setTheme(this.currentTheme);
        
        showNotification(
            `${this.currentTheme === 'dark' ? 'Dark' : 'Light'} mode enabled`,
            'success'
        );
    },

    applyTheme(theme) {
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
    },

    updateToggleButton() {
        const btn = document.getElementById('themeToggle');
        const icon = btn.querySelector('i');
        
        if (this.currentTheme === 'dark') {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
            btn.title = 'Switch to Light Mode';
        } else {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
            btn.title = 'Switch to Dark Mode';
        }
    }
};

// Internationalization (i18n) for English and Bangla

const translations = {
    en: {
        'app-title': 'Islamic Guidance',
        'nav-home': 'Home',
        'nav-qibla': 'Qibla',
        'nav-prayer-times': 'Prayer Times',
        'nav-namaz-guide': 'Namaz Guide',
        'nav-dua': 'Dua Suggestions',
        'hero-title': 'Welcome to Islamic Guidance',
        'hero-subtitle': 'Your digital companion for spiritual support and guidance',
        'feature-qibla': 'Qibla Direction',
        'feature-qibla-desc': 'Find the direction to Mecca from anywhere',
        'feature-prayer': 'Prayer Times',
        'feature-prayer-desc': 'Accurate prayer times for your location',
        'feature-namaz': 'Namaz Guide',
        'feature-namaz-desc': 'Step-by-step guidance for prayers',
        'feature-dua': 'Dua Suggestions',
        'feature-dua-desc': 'AI-powered dua recommendations',
        'qibla-title': 'Qibla Direction',
        'qibla-subtitle': 'Find the direction to the Kaaba in Mecca',
        'qibla-location': 'Your Location',
        'qibla-location-loading': 'Loading...',
        'qibla-direction': 'Qibla Direction',
        'qibla-distance': 'Distance to Mecca',
        'qibla-get-direction': 'Get Qibla Direction',
        'prayer-title': 'Prayer Times',
        'prayer-subtitle': "Today's prayer times for your location",
        'prayer-fajr': 'Fajr',
        'prayer-dhuhr': 'Dhuhr',
        'prayer-asr': 'Asr',
        'prayer-maghrib': 'Maghrib',
        'prayer-isha': 'Isha',
        'prayer-next': 'Next Prayer',
        'prayer-get-times': 'Get Prayer Times',
        'namaz-title': 'Namaz (Salah) Guide',
        'namaz-subtitle': 'Step-by-step guidance for performing prayers',
        'namaz-fajr': 'Fajr (2 Rak\'ah)',
        'namaz-dhuhr': 'Dhuhr (4 Rak\'ah)',
        'namaz-asr': 'Asr (4 Rak\'ah)',
        'namaz-maghrib': 'Maghrib (3 Rak\'ah)',
        'namaz-isha': 'Isha (4 Rak\'ah)',
        'dua-title': 'Dua Suggestions',
        'dua-subtitle': 'AI-powered dua recommendations based on your needs',
        'dua-context-label': 'What do you need dua for?',
        'dua-context-placeholder': 'Enter your situation or need...',
        'dua-get-suggestion': 'Get Dua Suggestion',
        'dua-loading': 'Loading dua suggestions...',
        'footer-text': '© 2025 Islamic Guidance. May Allah bless you.'
    },
    bn: {
        'app-title': 'ইসলামিক গাইডেন্স',
        'nav-home': 'হোম',
        'nav-qibla': 'কিবলা',
        'nav-prayer-times': 'নামাজের সময়',
        'nav-namaz-guide': 'নামাজ গাইড',
        'nav-dua': 'দোয়া পরামর্শ',
        'hero-title': 'ইসলামিক গাইডেন্সে স্বাগতম',
        'hero-subtitle': 'আধ্যাত্মিক সহায়তা এবং নির্দেশনার জন্য আপনার ডিজিটাল সঙ্গী',
        'feature-qibla': 'কিবলা দিক',
        'feature-qibla-desc': 'যেখান থেকেই মক্কার দিক খুঁজে বের করুন',
        'feature-prayer': 'নামাজের সময়',
        'feature-prayer-desc': 'আপনার অবস্থানের জন্য সঠিক নামাজের সময়',
        'feature-namaz': 'নামাজ গাইড',
        'feature-namaz-desc': 'নামাজের জন্য ধাপে ধাপে নির্দেশনা',
        'feature-dua': 'দোয়া পরামর্শ',
        'feature-dua-desc': 'এআই-চালিত দোয়া সুপারিশ',
        'qibla-title': 'কিবলা দিক',
        'qibla-subtitle': 'মক্কার কাবা শরীফের দিক খুঁজে বের করুন',
        'qibla-location': 'আপনার অবস্থান',
        'qibla-location-loading': 'লোড হচ্ছে...',
        'qibla-direction': 'কিবলা দিক',
        'qibla-distance': 'মক্কা পর্যন্ত দূরত্ব',
        'qibla-get-direction': 'কিবলা দিক পান',
        'prayer-title': 'নামাজের সময়',
        'prayer-subtitle': 'আপনার অবস্থানের জন্য আজকের নামাজের সময়',
        'prayer-fajr': 'ফজর',
        'prayer-dhuhr': 'যোহর',
        'prayer-asr': 'আসর',
        'prayer-maghrib': 'মাগরিব',
        'prayer-isha': 'ইশা',
        'prayer-next': 'পরবর্তী নামাজ',
        'prayer-get-times': 'নামাজের সময় পান',
        'namaz-title': 'নামাজ (সালাত) গাইড',
        'namaz-subtitle': 'নামাজ পড়ার জন্য ধাপে ধাপে নির্দেশনা',
        'namaz-fajr': 'ফজর (২ রাকাত)',
        'namaz-dhuhr': 'যোহর (৪ রাকাত)',
        'namaz-asr': 'আসর (৪ রাকাত)',
        'namaz-maghrib': 'মাগরিব (৩ রাকাত)',
        'namaz-isha': 'ইশা (৪ রাকাত)',
        'dua-title': 'দোয়া পরামর্শ',
        'dua-subtitle': 'আপনার প্রয়োজনের উপর ভিত্তি করে এআই-চালিত দোয়া সুপারিশ',
        'dua-context-label': 'আপনার কী জন্য দোয়া প্রয়োজন?',
        'dua-context-placeholder': 'আপনার পরিস্থিতি বা প্রয়োজন লিখুন...',
        'dua-get-suggestion': 'দোয়া পরামর্শ পান',
        'dua-loading': 'দোয়া পরামর্শ লোড হচ্ছে...',
        'footer-text': '© ২০২৫ ইসলামিক গাইডেন্স। আল্লাহ আপনাকে বরকত দিন।'
    }
};

let currentLanguage = localStorage.getItem('language') || 'en';

// Function to translate text
function t(key) {
    return translations[currentLanguage][key] || translations['en'][key] || key;
}

// Function to update all text elements
function updateLanguage() {
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        element.textContent = t(key);
    });

    // Update placeholder text
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        element.placeholder = t(key);
    });

    // Update current language indicator
    const langIndicator = document.getElementById('current-lang');
    if (langIndicator) {
        langIndicator.textContent = currentLanguage.toUpperCase();
    }

    // Save language preference
    localStorage.setItem('language', currentLanguage);
}

// Toggle language
function toggleLanguage() {
    currentLanguage = currentLanguage === 'en' ? 'bn' : 'en';
    updateLanguage();
    
    // Update namaz guide if it's active
    if (document.getElementById('namaz-guide').classList.contains('active')) {
        const activeNamaz = document.querySelector('.namaz-btn.active')?.getAttribute('data-namaz');
        if (activeNamaz) {
            loadNamazGuide(activeNamaz);
        }
    }
}

// Initialize language on page load
document.addEventListener('DOMContentLoaded', () => {
    updateLanguage();
    
    // Add event listener to language toggle button
    const langToggle = document.getElementById('lang-toggle');
    if (langToggle) {
        langToggle.addEventListener('click', toggleLanguage);
    }
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { t, toggleLanguage, currentLanguage };
}


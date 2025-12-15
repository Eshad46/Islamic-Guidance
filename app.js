// Main frontend logic for Islamic Guidance
// Handles navigation, Qibla calculation, prayer times, namaz guides, and dua suggestions

(function () {
    const sections = document.querySelectorAll('.section');
    const navLinks = document.querySelectorAll('.nav-link');
    const featureCards = document.querySelectorAll('.feature-card');

    const KAABA_COORDS = { lat: 21.4225, lon: 39.8262 };

    // ---------------------------
    // Helpers
    // ---------------------------
    const showSection = (id) => {
        sections.forEach((sec) => sec.classList.toggle('active', sec.id === id));
        navLinks.forEach((link) => link.classList.toggle('active', link.getAttribute('href') === `#${id}`));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const countryDefaults = [
        { name: 'Bangladesh', lat: 23.685, lon: 90.3563 },
        { name: 'Saudi Arabia', lat: 23.8859, lon: 45.0792 },
        { name: 'Pakistan', lat: 30.3753, lon: 69.3451 },
        { name: 'India', lat: 20.5937, lon: 78.9629 },
        { name: 'United Arab Emirates', lat: 23.4241, lon: 53.8478 },
        { name: 'Qatar', lat: 25.3548, lon: 51.1839 },
        { name: 'Kuwait', lat: 29.3117, lon: 47.4818 },
        { name: 'Bahrain', lat: 26.0667, lon: 50.5577 },
        { name: 'Oman', lat: 21.4735, lon: 55.9754 },
        { name: 'Malaysia', lat: 4.2105, lon: 101.9758 },
        { name: 'Indonesia', lat: -0.7893, lon: 113.9213 },
        { name: 'Turkey', lat: 38.9637, lon: 35.2433 },
        { name: 'Egypt', lat: 26.8206, lon: 30.8025 },
        { name: 'Morocco', lat: 31.7917, lon: -7.0926 },
        { name: 'United Kingdom', lat: 55.3781, lon: -3.4360 },
        { name: 'France', lat: 46.2276, lon: 2.2137 },
        { name: 'Germany', lat: 51.1657, lon: 10.4515 },
        { name: 'Canada', lat: 56.1304, lon: -106.3468 },
        { name: 'United States', lat: 37.0902, lon: -95.7129 },
        { name: 'Australia', lat: -25.2744, lon: 133.7751 },
    ];

    const populateCountrySelect = (selectId, listId) => {
        const select = document.getElementById(selectId);
        const dataList = listId ? document.getElementById(listId) : null;
        if (!select) return;
        select.innerHTML = '<option value="">Select Country</option>';
        countryDefaults.forEach((c) => {
            const opt = document.createElement('option');
            opt.value = `${c.lat},${c.lon}`;
            opt.textContent = c.name;
            select.appendChild(opt);

            if (dataList) {
                const dOpt = document.createElement('option');
                dOpt.value = c.name;
                dataList.appendChild(dOpt);
            }
        });
    };

    const getCountryByName = (name) =>
        countryDefaults.find((c) => c.name.toLowerCase() === name.toLowerCase());

    const selectCountryAndApply = (selectEl, countryName, applyFn) => {
        if (!selectEl || !applyFn) return;
        const match = getCountryByName(countryName);
        if (!match) return;
        selectEl.value = `${match.lat},${match.lon}`;
        applyFn(match.lat, match.lon);
    };

    const toRadians = (deg) => (deg * Math.PI) / 180;
    const toDegrees = (rad) => (rad * 180) / Math.PI;

    const haversineDistanceKm = (lat1, lon1, lat2, lon2) => {
        const R = 6371;
        const dLat = toRadians(lat2 - lat1);
        const dLon = toRadians(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const bearingToKaaba = (lat, lon) => {
        const dLon = toRadians(KAABA_COORDS.lon - lon);
        const y = Math.sin(dLon) * Math.cos(toRadians(KAABA_COORDS.lat));
        const x =
            Math.cos(toRadians(lat)) * Math.sin(toRadians(KAABA_COORDS.lat)) -
            Math.sin(toRadians(lat)) * Math.cos(toRadians(KAABA_COORDS.lat)) * Math.cos(dLon);
        const brng = toDegrees(Math.atan2(y, x));
        return (brng + 360) % 360;
    };

    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };

    // ---------------------------
    // Navigation bindings
    // ---------------------------
    const wireNavigation = () => {
        navLinks.forEach((link) =>
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = link.getAttribute('href')?.replace('#', '') || 'home';
                showSection(target);
            })
        );

        featureCards.forEach((card) => {
            card.addEventListener('click', () => {
                const map = {
                    'feature-qibla': 'qibla',
                    'feature-prayer': 'prayer-times',
                    'feature-namaz': 'namaz-guide',
                    'feature-dua': 'dua',
                };
                const key = card.querySelector('h3')?.getAttribute('data-i18n');
                if (key && map[key]) showSection(map[key]);
            });
        });
    };

    // ---------------------------
    // Qibla logic
    // ---------------------------
    const wireQibla = () => {
        const btn = document.getElementById('get-qibla');
        const needle = document.getElementById('qibla-needle');
        const compass = document.querySelector('.compass');
        const countrySelect = document.getElementById('country-qibla');
        if (!needle) return;

        let deviceHeading = 0; // 0 = facing true north
        let qiblaAngle = null;

        const updateNeedle = () => {
            if (qiblaAngle === null) return;
            const relativeAngle = (qiblaAngle - deviceHeading + 360) % 360;
            needle.style.transform = `translate(-50%, -50%) rotate(${relativeAngle}deg)`;
        };

        const enableCompassHeading = () => {
            if (!window.DeviceOrientationEvent) return;
            const handler = (e) => {
                const heading = typeof e.webkitCompassHeading === 'number' ? e.webkitCompassHeading : 360 - (e.alpha || 0);
                if (Number.isFinite(heading)) {
                    deviceHeading = heading;
                    if (compass) compass.style.transform = `rotate(${deviceHeading}deg)`;
                    updateNeedle();
                }
            };
            if (typeof DeviceOrientationEvent.requestPermission === 'function') {
                DeviceOrientationEvent.requestPermission()
                    .then((res) => res === 'granted' && window.addEventListener('deviceorientation', handler, true))
                    .catch(() => {});
            } else {
                window.addEventListener('deviceorientationabsolute', handler, true);
                window.addEventListener('deviceorientation', handler, true);
            }
        };

        const handleCoords = (latitude, longitude) => {
            setText('user-location', `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
            const angle = bearingToKaaba(latitude, longitude);
            const dist = haversineDistanceKm(latitude, longitude, KAABA_COORDS.lat, KAABA_COORDS.lon);
            setText('qibla-angle', `${angle.toFixed(1)}°`);
            setText('qibla-distance', `${dist.toFixed(1)} km`);
            qiblaAngle = angle;
            updateNeedle();
        };

        const useGeolocation = () => {
            if (!navigator.geolocation) {
                setText('user-location', 'Geolocation not supported. Use country selector.');
                return;
            }
            setText('user-location', t('qibla-location-loading'));
            navigator.geolocation.getCurrentPosition(
                (pos) => handleCoords(pos.coords.latitude, pos.coords.longitude),
                (err) => {
                    console.warn(err);
                    setText('user-location', 'Location blocked. Use country selection below.');
                },
                { enableHighAccuracy: true, timeout: 8000 }
            );
        };

        if (btn) btn.addEventListener('click', useGeolocation);
        enableCompassHeading();

        const searchInput = document.getElementById('country-search-qibla');
        if (searchInput) {
            searchInput.setAttribute('list', 'country-list-qibla');
            searchInput.addEventListener('change', () => {
                const match = countryDefaults.find(
                    (c) => c.name.toLowerCase() === searchInput.value.toLowerCase()
                );
                if (match) {
                    if (countrySelect) countrySelect.value = `${match.lat},${match.lon}`;
                    handleCoords(match.lat, match.lon);
                }
            });
        }

        if (countrySelect) {
            countrySelect.addEventListener('change', () => {
                if (!countrySelect.value) return;
                const [lat, lon] = countrySelect.value.split(',').map(Number);
                handleCoords(lat, lon);
            });

            if (!countrySelect.value) {
                selectCountryAndApply(countrySelect, 'Bangladesh', handleCoords);
            }
        }
    };

    // ---------------------------
    // Prayer times via Aladhan API
    // ---------------------------
    const formatTime = (timeStr) => {
        // Ensure HH:MM format; API returns "05:12"
        return timeStr?.slice(0, 5) || '--:--';
    };

    const findNextPrayer = (timings) => {
        const order = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
        const now = new Date();
        for (const name of order) {
            const [h, m] = (timings[name] || '23:59').split(':').map(Number);
            const prayerDate = new Date(now);
            prayerDate.setHours(h, m, 0, 0);
            if (prayerDate > now) {
                const diffMs = prayerDate - now;
                const hours = Math.floor(diffMs / (1000 * 60 * 60));
                const mins = Math.floor((diffMs - hours * 3600000) / 60000);
                return `${name} in ${hours}h ${mins}m`;
            }
        }
        return 'All prayers for today have passed';
    };

    const wirePrayerTimes = () => {
        const btn = document.getElementById('get-prayer-times');
        const countrySelect = document.getElementById('country-prayer');
        if (!btn && !countrySelect) return;

        const fetchTimes = async (latitude, longitude) => {
            setText('next-prayer-info', 'Fetching prayer times...');
            try {
                const url = `https://api.aladhan.com/v1/timings?latitude=${latitude}&longitude=${longitude}&method=2`;
                const res = await fetch(url);
                const json = await res.json();
                if (!json?.data?.timings) throw new Error('Invalid response');
                const timings = json.data.timings;

                setText('current-date', new Date().toDateString());
                setText('fajr-time', formatTime(timings.Fajr));
                setText('dhuhr-time', formatTime(timings.Dhuhr));
                setText('asr-time', formatTime(timings.Asr));
                setText('maghrib-time', formatTime(timings.Maghrib));
                setText('isha-time', formatTime(timings.Isha));

                const next = findNextPrayer(timings);
                setText('next-prayer-info', next);

                document.querySelectorAll('.prayer-card').forEach((card) => card.classList.remove('active'));
                const nextName = (next.split(' ')[0] || '').toLowerCase();
                const activeCard = document.querySelector(`.prayer-card[data-prayer="${nextName}"]`);
                if (activeCard) activeCard.classList.add('active');
            } catch (err) {
                console.error(err);
                setText('next-prayer-info', 'Failed to load prayer times. Check network or try country selection.');
            }
        };

        const useGeolocation = () => {
            if (!navigator.geolocation) {
                setText('next-prayer-info', 'Geolocation not supported. Try country selection.');
                return;
            }
            setText('next-prayer-info', 'Fetching your location...');
            navigator.geolocation.getCurrentPosition(
                (pos) => fetchTimes(pos.coords.latitude, pos.coords.longitude),
                (err) => {
                    console.warn(err);
                    setText('next-prayer-info', 'Location blocked. Use country selection below.');
                }
            );
        };

        if (btn) btn.addEventListener('click', useGeolocation);

        const searchInput = document.getElementById('country-search-prayer');
        if (searchInput) {
            searchInput.setAttribute('list', 'country-list-prayer');
            searchInput.addEventListener('change', () => {
                const match = countryDefaults.find(
                    (c) => c.name.toLowerCase() === searchInput.value.toLowerCase()
                );
                if (match) {
                    if (countrySelect) countrySelect.value = `${match.lat},${match.lon}`;
                    fetchTimes(match.lat, match.lon);
                }
            });
        }

        if (countrySelect) {
            countrySelect.addEventListener('change', () => {
                if (!countrySelect.value) return;
                const [lat, lon] = countrySelect.value.split(',').map(Number);
                fetchTimes(lat, lon);
            });

            if (!countrySelect.value) {
                selectCountryAndApply(countrySelect, 'Bangladesh', fetchTimes);
            }
        }
    };

    // ---------------------------
    // Namaz guide
    // ---------------------------
    const namazGuides = {
        fajr: [
            { title: 'Niyyah', text: 'Make intention for 2 Rak\'ah Fajr Salah.' },
            { title: 'Takbir', text: 'Raise hands and say Allahu Akbar.' },
            { title: 'Al-Fatihah', text: 'Recite Surah Al-Fatihah and a short surah.' },
            { title: 'Ruku', text: 'Bow and say Subhana Rabbiyal Adheem 3 times.' },
            { title: 'Sujood', text: 'Prostrate and say Subhana Rabbiyal A’la 3 times.' },
            { title: 'Tashahhud', text: 'Sit and recite At-Tahiyyat.' },
            { title: 'Tasleem', text: 'End with Salam to the right and left.' },
        ],
        dhuhr: [
            { title: 'Niyyah', text: 'Intend 4 Rak\'ah Dhuhr Salah.' },
            { title: 'First Two Rak\'ah', text: 'Recite Al-Fatihah + another surah.' },
            { title: 'Second Two Rak\'ah', text: 'Recite only Al-Fatihah.' },
            { title: 'Final Tashahhud', text: 'Complete At-Tahiyyat, Durood & Dua.' },
        ],
        asr: [
            { title: 'Niyyah', text: 'Intend 4 Rak\'ah Asr Salah.' },
            { title: 'All Rak\'ah', text: 'Recite Al-Fatihah in each, no audible surah.' },
            { title: 'Final Tashahhud', text: 'Complete At-Tahiyyat, Durood & Dua.' },
        ],
        maghrib: [
            { title: 'Niyyah', text: 'Intend 3 Rak\'ah Maghrib Salah.' },
            { title: 'First Two Rak\'ah', text: 'Al-Fatihah + another surah.' },
            { title: 'Third Rak\'ah', text: 'Recite only Al-Fatihah quietly.' },
            { title: 'Final Tashahhud', text: 'Complete At-Tahiyyat, Durood & Dua.' },
        ],
        isha: [
            { title: 'Niyyah', text: 'Intend 4 Rak\'ah Isha Salah.' },
            { title: 'First Two Rak\'ah', text: 'Al-Fatihah + another surah (audible).' },
            { title: 'Next Two Rak\'ah', text: 'Recite only Al-Fatihah quietly.' },
            { title: 'Final Tashahhud', text: 'Complete At-Tahiyyat, Durood & Dua.' },
        ],
    };

    const loadNamazGuide = (key) => {
        const stepsWrap = document.getElementById('namaz-steps');
        if (!stepsWrap) return;
        stepsWrap.innerHTML = '';
        (namazGuides[key] || []).forEach((step, idx) => {
            const div = document.createElement('div');
            div.className = 'namaz-step';
            div.innerHTML = `
                <div class="step-number">${idx + 1}</div>
                <div class="step-content">
                    <h4>${step.title}</h4>
                    <p>${step.text}</p>
                </div>
            `;
            stepsWrap.appendChild(div);
        });
    };

    const wireNamazGuide = () => {
        const buttons = document.querySelectorAll('.namaz-btn');
        buttons.forEach((btn) =>
            btn.addEventListener('click', () => {
                buttons.forEach((b) => b.classList.remove('active'));
                btn.classList.add('active');
                const key = btn.getAttribute('data-namaz') || 'fajr';
                loadNamazGuide(key);
            })
        );
        // default load
        loadNamazGuide('fajr');
    };

    // ---------------------------
    // Dua suggestions (local mock) and quick Surah answers
    // ---------------------------
    const duaList = [
        {
            title: 'Relief from Hardship',
            category: 'Patience',
            arabic: 'رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي',
            transliteration: 'Rabbi ishrah li sadri wa yassir li amri',
            translation: 'My Lord, expand for me my breast and ease for me my task.',
            meaning: 'A dua for ease during difficulties and tasks.',
            keywords: ['stress', 'hard', 'exam', 'work', 'task', 'anxiety'],
        },
        {
            title: 'Seeking Forgiveness',
            category: 'Forgiveness',
            arabic: 'أَسْتَغْفِرُ اللّٰهَ رَبِّي مِنْ كُلِّ ذَنْبٍ',
            transliteration: 'Astaghfirullaha Rabbi min kulli dhanbin',
            translation: 'I seek forgiveness from Allah, my Lord, for every sin.',
            meaning: 'A concise dua for forgiveness and repentance.',
            keywords: ['sin', 'mistake', 'guilt', 'forgive'],
        },
        {
            title: 'Healing and Health',
            category: 'Health',
            arabic: 'اللَّهُمَّ رَبَّ النَّاسِ أَذْهِبِ الْبَاسَ، اشْفِ أَنْتَ الشَّافِي',
            transliteration: 'Allahumma rabban-naasi, adhhibi al-ba’s, ishfi anta ash-Shaafi',
            translation: 'O Allah, Lord of mankind, remove the harm and heal, You are the Healer.',
            meaning: 'A dua for healing and recovery.',
            keywords: ['sick', 'ill', 'health', 'pain', 'heal'],
        },
        {
            title: 'For Pain or Headache',
            category: 'Health',
            arabic: 'أَعُوذُ بِعِزَّةِ اللَّهِ وَقُدْرَتِهِ مِنْ شَرِّ مَا أَجِدُ وَأُحَاذِرُ',
            transliteration: 'A’udhu bi’izzatillahi wa qudratihi min sharri ma ajidu wa uhadhir',
            translation: 'I seek refuge in the might and power of Allah from the evil of what I feel and fear.',
            meaning: 'Prophetic dua for pain (e.g., headache); recite and place the hand on the pain.',
            keywords: ['headache', 'head', 'migraine', 'pain', 'hurts', 'ache'],
        },
        {
            title: 'Gratitude',
            category: 'Gratitude',
            arabic: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
            transliteration: 'Alhamdu lillahi rabbil ‘alamin',
            translation: 'All praise is due to Allah, Lord of the worlds.',
            meaning: 'A reminder to express gratitude.',
            keywords: ['thanks', 'grateful', 'gratitude'],
        },
        {
            title: 'Before Eating or Drinking',
            category: 'Daily Life',
            arabic: 'بِسْمِ اللَّهِ',
            transliteration: 'Bismillah',
            translation: 'In the name of Allah.',
            meaning: 'Sunnah to begin meals and drinks with Bismillah.',
            keywords: ['eat', 'eating', 'drink', 'drinking', 'water', 'meal', 'food'],
        },
        {
            title: 'After Eating or Drinking',
            category: 'Daily Life',
            arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنَا وَسَقَانَا وَجَعَلَنَا مُسْلِمِينَ',
            transliteration: 'Alhamdu lillahil-ladhi at‘amana wa saqana wa ja‘alana muslimin',
            translation: 'All praise is for Allah who fed us, gave us drink, and made us Muslims.',
            meaning: 'Gratitude after food and drink.',
            keywords: ['after eating', 'after meal', 'after drinking', 'food', 'meal', 'water'],
        },
        {
            title: 'Before Sleeping',
            category: 'Daily Life',
            arabic: 'اللَّهُمَّ بِاسْمِكَ أَمُوتُ وَأَحْيَا',
            transliteration: 'Allahumma bismika amutu wa ahya',
            translation: 'O Allah, in Your name I die and I live.',
            meaning: 'Authentic sunnah dhikr before sleep.',
            keywords: ['sleep', 'sleeping', 'bed', 'night'],
        },
        {
            title: 'Waking Up',
            category: 'Daily Life',
            arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَمَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ',
            transliteration: 'Alhamdu lillahil-ladhi ahyana ba‘da ma amatana wa ilayhin-nushur',
            translation: 'All praise is for Allah who gave us life after causing us to die, and to Him is the resurrection.',
            meaning: 'Dhikr upon waking up.',
            keywords: ['wake', 'waking', 'morning', 'get up'],
        },
        {
            title: 'Entering the Home',
            category: 'Daily Life',
            arabic: 'بِسْمِ اللَّهِ وَلَجْنَا وَبِسْمِ اللَّهِ خَرَجْنَا وَعَلَى اللَّهِ رَبِّنَا تَوَكَّلْنَا',
            transliteration: 'Bismillahi walajna wa bismillahi kharajna wa ‘alallahi rabbina tawakkalna',
            translation: 'In the name of Allah we enter, and in the name of Allah we leave, and upon our Lord we place our trust.',
            meaning: 'Dua when entering/leaving home for protection and blessing.',
            keywords: ['home', 'house', 'enter home', 'leaving home'],
        },
        {
            title: 'Entering the Mosque',
            category: 'Daily Life',
            arabic: 'اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ',
            transliteration: 'Allahumma iftah li abwaba rahmatik',
            translation: 'O Allah, open for me the doors of Your mercy.',
            meaning: 'Dua when entering the masjid.',
            keywords: ['mosque', 'masjid', 'enter mosque', 'enter masjid'],
        },
        {
            title: 'Leaving the Mosque',
            category: 'Daily Life',
            arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ',
            transliteration: 'Allahumma inni as’aluka min fadlik',
            translation: 'O Allah, I ask You from Your bounty.',
            meaning: 'Dua when leaving the masjid.',
            keywords: ['leave mosque', 'leaving mosque', 'leave masjid', 'leaving masjid'],
        },
        {
            title: 'Entering the Bathroom',
            category: 'Daily Life',
            arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْخُبُثِ وَالْخَبَائِثِ',
            transliteration: 'Allahumma inni a‘udhu bika minal-khubthi wal-khaba’ith',
            translation: 'O Allah, I seek refuge with You from male and female devils.',
            meaning: 'Protection dua before entering restroom.',
            keywords: ['bathroom', 'restroom', 'toilet', 'washroom'],
        },
        {
            title: 'Leaving the Bathroom',
            category: 'Daily Life',
            arabic: 'غُفْرَانَكَ',
            transliteration: 'Ghufranak',
            translation: 'I seek Your forgiveness.',
            meaning: 'Dua after leaving restroom.',
            keywords: ['bathroom', 'restroom', 'toilet', 'washroom', 'leaving'],
        },
        {
            title: 'Before Travel',
            category: 'Travel',
            arabic: 'سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَٰذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ وَإِنَّا إِلَىٰ رَبِّنَا لَمُنقَلِبُونَ',
            transliteration:
                'Subhanalladhi sakhkhara lana hadha wa ma kunna lahu muqrinin wa inna ila rabbina lamunqalibun',
            translation:
                'Glory to Him Who has subjected this to us, and we could never have it by our efforts. Surely, to our Lord we will return.',
            meaning: 'Dua for riding/travel safety and gratitude.',
            keywords: ['travel', 'journey', 'ride', 'car', 'bus', 'plane', 'train'],
        },
        {
            title: 'For Knowledge',
            category: 'Knowledge',
            arabic: 'رَّبِّ زِدْنِي عِلْمًا',
            transliteration: 'Rabbi zidni ilma',
            translation: 'My Lord, increase me in knowledge.',
            meaning: 'Dua for learning and understanding.',
            keywords: ['study', 'exam', 'learn', 'knowledge', 'school', 'university'],
        },
        {
            title: 'For Parents',
            category: 'Family',
            arabic: 'رَّبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا',
            transliteration: 'Rabbi rhamhuma kama rabbayani saghira',
            translation: 'My Lord, have mercy upon them as they brought me up when I was small.',
            meaning: 'Dua for showing gratitude and mercy to parents.',
            keywords: ['parents', 'mother', 'father', 'mom', 'dad'],
        },
    ];

    const surahQuick = [
        {
            name: 'Al-Fatiha',
            number: 1,
            arabic:
                'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ ۝ الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ ۝ الرَّحْمَٰنِ الرَّحِيمِ ۝ مَالِكِ يَوْمِ الدِّينِ ۝ إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ ۝ اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ ۝ صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ',
            transliteration:
                'Bismillāhir-Raḥmānir-Raḥīm. Al-ḥamdu lillāhi rabbil-ʿālamīn. Ar-Raḥmānir-Raḥīm. Māliki yawmid-dīn. Iyyāka naʿbudu wa iyyāka nastaʿīn. Ihdina ṣ-ṣirāṭ al-mustaqīm. Ṣirāṭ al-laḏīna anʿamta ʿalayhim ġayri l-maġḍūbi ʿalayhim walā ḍ-ḍāllīn.',
            translation:
                'In the name of Allah, the Most Merciful, the Most Compassionate... and not of those who have gone astray.',
            meaning: 'Opening chapter recited in every rak\'ah; comprehensive praise and supplication.',
            keywords: ['fatiha', 'al fatiha', 'fatihah', 'surah 1', 'surah al fatiha'],
        },
        {
            name: 'Al-Baqarah Ayah 255 (Ayat al-Kursi)',
            number: 255,
            arabic:
                'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَنْ ذَا الَّذِي يَشْفَعُ عِنْدَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ',
            transliteration:
                'Allāhu lā ilāha illā huwa al-ḥayyu al-qayyūm, lā ta’khuḏuhu sinatun walā nawm, lahu mā fī s-samāwāti wa mā fī l-arḍ, man ḏā lladhī yashfaʿu ʿindahu illā bi-idhnih, yaʿlamu mā bayna aydīhim wa mā khalfahum, walā yuḥīṭūna bi-shay’in min ʿilmihī illā bimā shā’, wasiʿa kursiyyuhū s-samāwāti wal-arḍ, walā ya’ūduhu ḥifẓuhumā, wa huwa l-ʿaliyyu l-ʿaẓīm.',
            translation:
                'Allah! There is no deity except Him, the Ever-Living, the Sustainer... And He is the Most High, the Most Great.',
            meaning: 'Powerful verse for protection and remembrance of Allah’s sovereignty.',
            keywords: ['ayat al kursi', 'kursi', 'baqarah 255', 'surah 2:255', '2:255'],
        },
        {
            name: 'Al-Ikhlas',
            number: 112,
            arabic:
                'قُلْ هُوَ اللَّهُ أَحَدٌ ۝ اللَّهُ الصَّمَدُ ۝ لَمْ يَلِدْ وَلَمْ يُولَدْ ۝ وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ',
            transliteration:
                'Qul huwa Allāhu aḥad. Allāhu ṣ-ṣamad. Lam yalid wa lam yūlad. Wa lam yakun lahu kufuwan aḥad.',
            translation:
                'Say, He is Allah, One. Allah, the Eternal Refuge. He neither begets nor is born, nor is there to Him any equivalent.',
            meaning: 'Affirms pure monotheism; equal to one-third of the Qur’an in virtue.',
            keywords: ['ikhlas', 'al ikhlas', 'surah 112', '112'],
        },
        {
            name: 'Al-Falaq',
            number: 113,
            arabic:
                'قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ ۝ مِن شَرِّ مَا خَلَقَ ۝ وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ ۝ وَمِن شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ ۝ وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ',
            transliteration:
                'Qul aʿūdhu birabbi l-falaq. Min sharri mā khalaq. Wa min sharri ghāsiqin iḏā waqab. Wa min sharri n-naffāthāti fi l-ʿuqad. Wa min sharri ḥāsidin iḏā ḥasad.',
            translation:
                'Say, I seek refuge in the Lord of daybreak... and from the evil of an envier when he envies.',
            meaning: 'Protection from external harms and envy.',
            keywords: ['falaq', 'al falaq', 'surah 113', '113'],
        },
        {
            name: 'An-Nas',
            number: 114,
            arabic:
                'قُلْ أَعُوذُ بِرَبِّ النَّاسِ ۝ مَلِكِ النَّاسِ ۝ إِلَٰهِ النَّاسِ ۝ مِن شَرِّ الْوَسْوَاسِ الْخَنَّاسِ ۝ الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ ۝ مِنَ الْجِنَّةِ وَالنَّاسِ',
            transliteration:
                'Qul aʿūdhu birabbi n-nās. Maliki n-nās. Ilāhi n-nās. Min sharri l-waswāsi l-khannās. Alladhī yuwaswisu fī ṣudūri n-nās. Mina l-jinnati wa n-nās.',
            translation:
                'Say, I seek refuge in the Lord of mankind... from the jinn and mankind.',
            meaning: 'Protection from whispered evil and internal harms.',
            keywords: ['nas', 'an nas', 'surah 114', '114'],
        },
    ];

    const findSurah = (text) => {
        const lower = text.toLowerCase();
        return surahQuick.find((s) => s.keywords.some((k) => lower.includes(k)));
    };

    const renderDua = (dua) => {
        const card = document.querySelector('#dua-results .dua-card');
        if (!card) return;
        card.querySelector('.dua-title').textContent = dua.title;
        card.querySelector('.dua-category').textContent = dua.category;
        card.querySelector('.dua-arabic').textContent = dua.arabic;
        card.querySelector('.dua-transliteration').textContent = dua.transliteration;
        card.querySelector('.dua-translation').textContent = dua.translation;
        card.querySelector('.dua-meaning').textContent = dua.meaning;
        card.style.display = 'block';
    };

    const bestKeywordMatch = (list, text) => {
        let best = null;
        let bestScore = 0;
        list.forEach((item) => {
            let score = 0;
            item.keywords.forEach((k) => {
                if (text.includes(k)) {
                    score = Math.max(score, k.length); // longer keyword -> more specific
                }
            });
            if (score > bestScore) {
                bestScore = score;
                best = item;
            }
        });
        return best;
    };

    const fetchAiDua = async (text) => {
        try {
            const res = await fetch('/api/dua', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: text }),
            });
            if (!res.ok) throw new Error('Network');
            const data = await res.json();
            if (data?.dua && !data.fallback) return data.dua;
            if (data?.message) {
                return {
                    title: 'AI Suggestion',
                    category: 'AI',
                    arabic: '',
                    transliteration: '',
                    translation: data.message,
                    meaning: '',
                };
            }
            return null;
        } catch (err) {
            console.warn('AI dua fetch failed', err);
            return null;
        }
    };

    const wireDua = () => {
        const btn = document.getElementById('get-dua');
        const loading = document.getElementById('dua-loading');
        if (!btn) return;

        btn.addEventListener('click', () => {
            const text = document.getElementById('dua-context')?.value?.toLowerCase() || '';
            loading.style.display = 'block';
            setTimeout(async () => {
                const surah = findSurah(text);
                if (surah) {
                    renderDua({
                        title: surah.name,
                        category: 'Surah Reference',
                        arabic: surah.arabic,
                        transliteration: surah.transliteration,
                        translation: surah.translation,
                        meaning: surah.meaning,
                    });
                    loading.style.display = 'none';
                    return;
                }

                // Try AI first
                const aiDua = await fetchAiDua(text);
                if (aiDua) {
                    renderDua(aiDua);
                    loading.style.display = 'none';
                    return;
                }

                // Fallback to keyword/local (no random mis-match; default to healing dua)
                const match = bestKeywordMatch(duaList, text) || duaList.find((d) => d.title === 'Healing and Health');
                renderDua(match);
                loading.style.display = 'none';
            }, 300);
        });
    };

    // ---------------------------
    // Init
    // ---------------------------
    document.addEventListener('DOMContentLoaded', () => {
        wireNavigation();
        wireQibla();
        wirePrayerTimes();
        wireNamazGuide();
        wireDua();

        // populate country selects after DOM ready
        populateCountrySelect('country-qibla', 'country-list-qibla');
        populateCountrySelect('country-prayer', 'country-list-prayer');

        // default to Bangladesh if user does nothing and geolocation blocked
        const qSelect = document.getElementById('country-qibla');
        const pSelect = document.getElementById('country-prayer');
        selectCountryAndApply(qSelect, 'Bangladesh', () => {});
        selectCountryAndApply(pSelect, 'Bangladesh', () => {});
        if (qSelect) qSelect.dispatchEvent(new Event('change'));
        if (pSelect) pSelect.dispatchEvent(new Event('change'));
    });
})();


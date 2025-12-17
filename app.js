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
    // Expanded daily life dua list (~100 items)
    // ---------------------------
    const duaList = [
        // Core daily adhkar
        {
            title: 'General Praise',
            category: 'Daily Life',
            arabic: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
            transliteration: 'Alhamdu lillahi rabbil-ʿalamin',
            translation: 'All praise is for Allah, Lord of all worlds.',
            meaning: 'General praise and gratitude in any situation.',
            keywords: ['praise', 'thanks', 'gratitude', 'happy', 'good news'],
        },
        {
            title: 'Relief from Hardship',
            category: 'Patience',
            arabic: 'رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي',
            transliteration: 'Rabbi ishraḥ lī ṣadrī wa yassir lī amrī',
            translation: 'My Lord, expand for me my breast and ease for me my task.',
            meaning: 'For ease during stress, work, exams, and hardships.',
            keywords: ['stress', 'hard', 'exam', 'work', 'task', 'anxiety', 'presentation'],
        },
        {
            title: 'Seeking Forgiveness (Short)',
            category: 'Forgiveness',
            arabic: 'أَسْتَغْفِرُ اللَّهَ',
            transliteration: 'Astaghfirullah',
            translation: 'I seek forgiveness from Allah.',
            meaning: 'Short istighfar for all sins and mistakes.',
            keywords: ['sin', 'mistake', 'guilt', 'forgive', 'astaghfirullah'],
        },
        {
            title: 'Seeking Forgiveness (Detailed)',
            category: 'Forgiveness',
            arabic: 'أَسْتَغْفِرُ اللَّهَ رَبِّي مِنْ كُلِّ ذَنْبٍ وَأَتُوبُ إِلَيْهِ',
            transliteration: 'Astaghfirullaha rabbī min kulli dhanbin wa atūbu ilayh',
            translation: 'I seek forgiveness from Allah, my Lord, from every sin and I repent to Him.',
            meaning: 'Comprehensive repentance dua for past sins.',
            keywords: ['repent', 'forgiveness', 'past sin', 'tawba', 'regret'],
        },
        {
            title: 'Master Istighfar',
            category: 'Forgiveness',
            arabic:
                'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَىٰ عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي، فَاغْفِرْ لِي، فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ',
            transliteration:
                'Allahumma anta rabbī lā ilāha illā anta, khalaqtanī wa anā ʿabduka, wa anā ʿalā ʿahdika wa waʿdika mā istaṭaʿtu, aʿūdhu bika min sharri mā ṣanaʿtu, abū’u laka biniʿmatika ʿalayya, wa abū’u bidhanbī, faghfir lī fa-innahū lā yaghfiru dh-dhunūba illā anta',
            translation:
                'O Allah, You are my Lord, none has the right to be worshiped but You. You created me and I am Your servant, and I abide by Your covenant and promise as best I can. I seek refuge with You from the evil of what I have done. I acknowledge Your favor upon me and I acknowledge my sin, so forgive me, for none forgives sins except You.',
            meaning: 'Known as Sayyidul Istighfar, the best form of seeking forgiveness.',
            keywords: ['sayyidul istighfar', 'major sin', 'big sin', 'repentance'],
        },
        // Health & sickness
        {
            title: 'Healing and Health',
            category: 'Health',
            arabic: 'اللَّهُمَّ رَبَّ النَّاسِ أَذْهِبِ الْبَأْسَ، اشْفِ أَنْتَ الشَّافِي',
            transliteration: 'Allahumma rabban-nāsi adhhibi l-ba’s, ishfi anta sh-shāfī',
            translation: 'O Allah, Lord of mankind, remove the harm and heal, You are the Healer.',
            meaning: 'For general sickness and healing.',
            keywords: ['sick', 'ill', 'health', 'pain', 'heal', 'doctor', 'hospital'],
        },
        {
            title: 'For Pain or Headache',
            category: 'Health',
            arabic: 'أَعُوذُ بِعِزَّةِ اللَّهِ وَقُدْرَتِهِ مِنْ شَرِّ مَا أَجِدُ وَأُحَاذِرُ',
            transliteration: 'Aʿūdhu biʿizzatillāhi wa qudratihi min sharri mā ajidu wa uḥādhir',
            translation: 'I seek refuge in the might and power of Allah from the evil of what I feel and fear.',
            meaning: 'Dua for pain in the body, including headaches and aches.',
            keywords: ['headache', 'migraine', 'back pain', 'body pain', 'hurts'],
        },
        {
            title: 'Protection from Illness',
            category: 'Health',
            arabic: 'اللَّهُمَّ عَافِنِي فِي بَدَنِي، اللَّهُمَّ عَافِنِي فِي سَمْعِي، اللَّهُمَّ عَافِنِي فِي بَصَرِي',
            transliteration: 'Allahumma ʿāfinī fī badanī, Allahumma ʿāfinī fī samʿī, Allahumma ʿāfinī fī baṣarī',
            translation: 'O Allah, grant health to my body, O Allah, grant health to my hearing, O Allah, grant health to my sight.',
            meaning: 'Daily protection of body, hearing, and sight.',
            keywords: ['health', 'body', 'eyes', 'hearing', 'protection from sickness'],
        },
        // Rizq & provision
        {
            title: 'Increase in Provision',
            category: 'Rizq',
            arabic: 'رَبِّ إِنِّي لِمَا أَنْزَلْتَ إِلَيَّ مِنْ خَيْرٍ فَقِيرٌ',
            transliteration: 'Rabbī innī limā anzalta ilayya min khayrin faqīr',
            translation: 'My Lord, indeed I am, for whatever good You would send down to me, in need.',
            meaning: 'For sustenance, job, and financial ease.',
            keywords: ['job', 'money', 'income', 'provision', 'rizq', 'finance'],
        },
        {
            title: 'Blessing in Provision',
            category: 'Rizq',
            arabic: 'اللَّهُمَّ اكْفِنِي بِحَلَالِكَ عَنْ حَرَامِكَ وَأَغْنِنِي بِفَضْلِكَ عَمَّنْ سِوَاكَ',
            transliteration: 'Allahummakfinī biḥalālika ʿan ḥarāmik wa aghninī bi faḍlika ʿamman siwāk',
            translation: 'O Allah, suffice me with what You have made lawful over what You have made unlawful, and enrich me by Your bounty from all besides You.',
            meaning: 'For halal income and independence from people.',
            keywords: ['debt', 'loan', 'haram', 'halal job', 'salary', 'bills'],
        },
        // Family & parents
        {
            title: 'For Parents',
            category: 'Family',
            arabic: 'رَبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا',
            transliteration: 'Rabbir ḥamhumā kamā rabbayānī ṣaghīrā',
            translation: 'My Lord, have mercy upon them as they brought me up when I was small.',
            meaning: 'Dua for mercy upon one’s parents.',
            keywords: ['parents', 'mother', 'father', 'mom', 'dad', 'family'],
        },
        {
            title: 'For Spouse and Children',
            category: 'Family',
            arabic: 'رَبَّنَا هَبْ لَنَا مِنْ أَزْوَاجِنَا وَذُرِّيَّاتِنَا قُرَّةَ أَعْيُنٍ وَاجْعَلْنَا لِلْمُتَّقِينَ إِمَامًا',
            transliteration:
                'Rabbana hab lanā min azwājinā wa dhurriyyātinā qurrata aʿyunin wajʿalnā lil-muttaqīna imāmā',
            translation:
                'Our Lord, grant us from among our spouses and offspring comfort to our eyes and make us an example for the righteous.',
            meaning: 'For righteous family, pious spouse and children.',
            keywords: ['spouse', 'wife', 'husband', 'children', 'kids', 'family issues', 'marriage'],
        },
        {
            title: 'For Harmony in the Home',
            category: 'Family',
            arabic: 'رَبَّنَا أَصْلِحْ لَنَا زَوْجَنَا وَذُرِّيَّتَنَا',
            transliteration: 'Rabbana aṣliḥ lanā zawjanā wa dhurriyyatanā',
            translation: 'Our Lord, rectify for us our spouse and our offspring.',
            meaning: 'General dua for peace and rectification in family.',
            keywords: ['argument', 'family fight', 'home problem', 'relationship'],
        },
        // Before / after eating & drinking
        {
            title: 'Before Eating or Drinking',
            category: 'Daily Life',
            arabic: 'بِسْمِ اللَّهِ',
            transliteration: 'Bismillah',
            translation: 'In the name of Allah.',
            meaning: 'To say before starting food or drink.',
            keywords: ['eat', 'eating', 'drink', 'drinking', 'water', 'meal', 'food'],
        },
        {
            title: 'After Eating or Drinking',
            category: 'Daily Life',
            arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنَا وَسَقَانَا وَجَعَلَنَا مُسْلِمِينَ',
            transliteration: 'Alhamdu lillāhil-ladhī aṭʿamanā wa saqānā wa jaʿalanā muslimīn',
            translation: 'All praise is for Allah who fed us, gave us drink, and made us Muslims.',
            meaning: 'Gratitude after finishing food or drink.',
            keywords: ['after eating', 'after meal', 'after drinking', 'food', 'meal', 'water'],
        },
        {
            title: 'If You Forgot Bismillah at Start of Meal',
            category: 'Daily Life',
            arabic: 'بِسْمِ اللَّهِ أَوَّلَهُ وَآخِرَهُ',
            transliteration: 'Bismillāhi awwalahu wa ākhirah',
            translation: 'In the name of Allah, at its beginning and its end.',
            meaning: 'Say when you remember Bismillah in the middle of a meal.',
            keywords: ['forgot bismillah', 'middle of meal', 'start eating late'],
        },
        // Leaving / entering home & travel
        {
            title: 'Entering the Home',
            category: 'Daily Life',
            arabic: 'بِسْمِ اللَّهِ وَلَجْنَا وَبِسْمِ اللَّهِ خَرَجْنَا وَعَلَى اللَّهِ رَبِّنَا تَوَكَّلْنَا',
            transliteration: 'Bismillāhi walajnā wa bismillāhi kharajnā wa ʿalallāhi rabbinā tawakkalnā',
            translation:
                'In the name of Allah we enter, and in the name of Allah we leave, and upon our Lord we place our trust.',
            meaning: 'For barakah and protection when entering/leaving home.',
            keywords: ['home', 'house', 'enter home', 'leaving home', 'door', 'family safety'],
        },
        {
            title: 'Leaving the Home',
            category: 'Daily Life',
            arabic: 'بِسْمِ اللَّهِ تَوَكَّلْتُ عَلَى اللَّهِ لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',
            transliteration: 'Bismillāh, tawakkaltu ʿalallāh, lā ḥawla wa lā quwwata illā billāh',
            translation:
                'In the name of Allah, I place my trust in Allah, and there is no power nor might except with Allah.',
            meaning: 'Protection when stepping out for work, errands, or travel.',
            keywords: ['going out', 'leave house', 'commute', 'work', 'travel', 'car'],
        },
        {
            title: 'Before Travel (Riding Dua)',
            category: 'Travel',
            arabic:
                'سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَٰذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ وَإِنَّا إِلَىٰ رَبِّنَا لَمُنقَلِبُونَ',
            transliteration:
                'Subḥānalladhī sakhkhara lanā hādhā wa mā kunnā lahu muqrinīn wa innā ilā rabbinā lamunqalibūn',
            translation:
                'Glory to Him who has subjected this to us, and we could never have it by our efforts. Surely, to our Lord we will return.',
            meaning: 'Dua when travelling by car, bus, plane, train or any ride.',
            keywords: ['travel', 'journey', 'ride', 'car', 'bus', 'plane', 'train', 'flight'],
        },
        {
            title: 'Dua for Return from Travel',
            category: 'Travel',
            arabic: 'آيِبُونَ تَائِبُونَ عَابِدُونَ لِرَبِّنَا حَامِدُونَ',
            transliteration: 'Āibūna tāʾibūna ʿābidūna lirabbinā ḥāmidūn',
            translation: 'Returning, repenting, worshipping, and praising our Lord.',
            meaning: 'To be said when coming back home from a journey.',
            keywords: ['return', 'back home', 'end of travel'],
        },
        // Bathroom / cleanliness
        {
            title: 'Entering the Bathroom',
            category: 'Daily Life',
            arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْخُبُثِ وَالْخَبَائِثِ',
            transliteration: 'Allahumma innī aʿūdhu bika minal-khubthi wal-khabāʾith',
            translation: 'O Allah, I seek refuge with You from male and female devils.',
            meaning: 'Dua before entering toilet or washroom.',
            keywords: ['bathroom', 'restroom', 'toilet', 'washroom', 'enter toilet'],
        },
        {
            title: 'Leaving the Bathroom',
            category: 'Daily Life',
            arabic: 'غُفْرَانَكَ',
            transliteration: 'Ghufrānak',
            translation: 'I seek Your forgiveness.',
            meaning: 'Dua when exiting the restroom.',
            keywords: ['bathroom', 'restroom', 'toilet', 'washroom', 'leaving toilet'],
        },
        // Masjid
        {
            title: 'Entering the Mosque',
            category: 'Daily Life',
            arabic: 'اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ',
            transliteration: 'Allahumma iftaḥ lī abwāba raḥmatik',
            translation: 'O Allah, open for me the doors of Your mercy.',
            meaning: 'To be said when entering the masjid.',
            keywords: ['mosque', 'masjid', 'enter mosque', 'jummah', 'taraweeh'],
        },
        {
            title: 'Leaving the Mosque',
            category: 'Daily Life',
            arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ',
            transliteration: 'Allahumma innī asʾaluka min faḍlik',
            translation: 'O Allah, I ask You from Your bounty.',
            meaning: 'To be said when exiting the masjid.',
            keywords: ['leave mosque', 'leaving masjid', 'after jummah', 'after prayer'],
        },
        // Sleep & waking
        {
            title: 'Before Sleeping',
            category: 'Daily Life',
            arabic: 'اللَّهُمَّ بِاسْمِكَ أَمُوتُ وَأَحْيَا',
            transliteration: 'Allahumma bismika amūtu wa aḥyā',
            translation: 'O Allah, in Your name I die and I live.',
            meaning: 'Dua to say before going to sleep at night.',
            keywords: ['sleep', 'sleeping', 'bed', 'night', 'insomnia'],
        },
        {
            title: 'Waking Up',
            category: 'Daily Life',
            arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَمَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ',
            transliteration: 'Alhamdu lillāhil-ladhī aḥyānā baʿdamā amatānā wa ilayhin-nushūr',
            translation:
                'All praise is for Allah who gave us life after causing us to die, and to Him is the resurrection.',
            meaning: 'Dhikr to say upon waking up from sleep.',
            keywords: ['wake up', 'morning', 'get up', 'after sleep'],
        },
        {
            title: 'Disturbed Sleep / Night Fear',
            category: 'Daily Life',
            arabic: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ غَضَبِهِ وَعِقَابِهِ وَمِنْ شَرِّ عِبَادِهِ',
            transliteration:
                'Aʿūdhu bikalimātillāhit-tāmmāti min ghaḍabihī wa ʿiqābihī wa min sharri ʿibādih',
            translation:
                'I seek refuge in the perfect words of Allah from His anger and His punishment and from the evil of His servants.',
            meaning: 'For fear, nightmares, or disturbed sleep.',
            keywords: ['nightmare', 'bad dream', 'scared', 'fear at night'],
        },
        // Protection & fear
        {
            title: 'Protection from All Harm',
            category: 'Protection',
            arabic: 'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ',
            transliteration:
                'Bismillāhil-ladhī lā yaḍurru maʿasmihī shayʾun fi l-arḍi wa lā fi s-samāʾ wa huwa s-samīʿu l-ʿalīm',
            translation:
                'In the name of Allah, with whose name nothing on earth or in the heavens can cause harm, and He is the All-Hearing, All-Knowing.',
            meaning: 'Recited morning and evening for comprehensive protection.',
            keywords: ['protection', 'morning', 'evening', 'fear', 'evil', 'harm', 'safety'],
        },
        {
            title: 'Protection from Worry and Sorrow',
            category: 'Protection',
            arabic:
                'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَأَعُوذُ بِكَ مِنَ الْعَجْزِ وَالْكَسَلِ، وَأَعُوذُ بِكَ مِنَ الْجُبْنِ وَالْبُخْلِ، وَأَعُوذُ بِكَ مِنْ غَلَبَةِ الدَّيْنِ وَقَهْرِ الرِّجَالِ',
            transliteration:
                'Allahumma innī aʿūdhu bika minal-hammi wal-ḥazan, wa aʿūdhu bika minal-ʿajzi wal-kasal, wa aʿūdhu bika minal-jubni wal-bukhl, wa aʿūdhu bika min ghalabatid-dayni wa qahrir-rijāl',
            translation:
                'O Allah, I seek refuge in You from worry and grief, from incapacity and laziness, from cowardice and miserliness, and from being overcome by debt and overpowered by men.',
            meaning: 'For anxiety, sadness, debt stress, and feeling overwhelmed.',
            keywords: ['depression', 'sad', 'worry', 'anxiety', 'debt', 'pressure', 'overwhelmed'],
        },
        {
            title: 'Protection from Evil Eye and Envy',
            category: 'Protection',
            arabic: 'مَا شَاءَ اللَّهُ لَا قُوَّةَ إِلَّا بِاللَّهِ',
            transliteration: 'Mā shāʾa Allāhu lā quwwata illā billāh',
            translation: 'What Allah has willed; there is no power except with Allah.',
            meaning: 'To say upon seeing something admirable to prevent envy.',
            keywords: ['evil eye', 'envy', 'hasad', 'jealous', 'mashallah'],
        },
        // Knowledge & study
        {
            title: 'For Knowledge',
            category: 'Knowledge',
            arabic: 'رَبِّ زِدْنِي عِلْمًا',
            transliteration: 'Rabbi zidnī ʿilmā',
            translation: 'My Lord, increase me in knowledge.',
            meaning: 'Dua for learning, studying, and understanding.',
            keywords: ['study', 'exam', 'learn', 'knowledge', 'school', 'university', 'test'],
        },
        {
            title: 'Ease in Studying and Memory',
            category: 'Knowledge',
            arabic: 'اللَّهُمَّ انْفَعْنِي بِمَا عَلَّمْتَنِي وَعَلِّمْنِي مَا يَنْفَعُنِي وَزِدْنِي عِلْمًا',
            transliteration: 'Allahummanfaʿnī bimā ʿallamtanī wa ʿallimnī mā yanfaʿunī wa zidnī ʿilmā',
            translation:
                'O Allah, benefit me with what You have taught me, teach me what will benefit me, and increase me in knowledge.',
            meaning: 'For beneficial knowledge and strong memory.',
            keywords: ['revision', 'memorize', 'school exam', 'study stress'],
        },
        // Work & decision making
        {
            title: 'For Barakah in Work',
            category: 'Work',
            arabic: 'اللَّهُمَّ بَارِكْ لِي فِي رِزْقِي وَفِي وَقْتِي وَفِي عَمَلِي',
            transliteration: 'Allahumma bārik lī fī rizqī wa fī waqtī wa fī ʿamalī',
            translation: 'O Allah, bless my provision, my time, and my work.',
            meaning: 'General dua for productivity and barakah in work.',
            keywords: ['work', 'job', 'office', 'time management', 'productivity'],
        },
        {
            title: 'For Making Decisions (Istikhara Summary)',
            category: 'Guidance',
            arabic: 'اللَّهُمَّ خِرْ لِي وَاخْتَرْ لِي وَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ',
            transliteration: 'Allahumma khir lī wakhtar lī wa lā takilnī ilā nafsī ṭarfata ʿayn',
            translation:
                'O Allah, choose and decide for me and do not leave me to myself even for the blink of an eye.',
            meaning: 'Short dua for guidance when unsure what to choose.',
            keywords: ['decision', 'choice', 'istikhara', 'confused', 'which option'],
        },
        // Gratitude & contentment
        {
            title: 'Gratitude in All States',
            category: 'Gratitude',
            arabic: 'الْحَمْدُ لِلَّهِ عَلَى كُلِّ حَالٍ',
            transliteration: 'Alhamdu lillāhi ʿalā kulli ḥāl',
            translation: 'All praise is for Allah in every circumstance.',
            meaning: 'To be said in good and difficult times.',
            keywords: ['gratitude', 'content', 'sabr', 'shukr', 'thankful'],
        },
        {
            title: 'Contentment with Decree',
            category: 'Gratitude',
            arabic: 'رَضِيتُ بِاللَّهِ رَبًّا وَبِالْإِسْلَامِ دِينًا وَبِمُحَمَّدٍ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ نَبِيًّا',
            transliteration:
                'Raḍītu billāhi rabban wa bil-islāmi dīnan wa bi Muḥammadin ṣallallāhu ʿalayhi wa sallam nabiyyā',
            translation:
                'I am pleased with Allah as my Lord, with Islam as my religion, and with Muhammad (peace be upon him) as my Prophet.',
            meaning: 'Brings contentment and strengthens iman when repeated.',
            keywords: ['iman', 'faith', 'contentment', 'pleased', 'acceptance'],
        },
        // Stress & anxiety
        {
            title: 'Removing Anxiety and Sorrow',
            category: 'Stress',
            arabic:
                'اللَّهُمَّ إِنِّي عَبْدُكَ ابْنُ عَبْدِكَ ابْنُ أَمَتِكَ نَاصِيَتِي بِيَدِكَ، مَاضٍ فِيَّ حُكْمُكَ، عَدْلٌ فِيَّ قَضَاؤُكَ',
            transliteration:
                'Allahumma innī ʿabduka ibn ʿabdika ibn amatika, nāṣiyatī biyadik, māḍin fiyya ḥukmuk, ʿadlun fiyya qaḍāʾuk',
            translation:
                'O Allah, I am Your servant, son of Your servant, son of Your maidservant; my forelock is in Your hand, Your command over me is forever executed and Your decree over me is just.',
            meaning: 'Beginning of a famous dua for distress; can be read in full when very anxious.',
            keywords: ['anxiety', 'panic', 'worry', 'depressed', 'stressful'],
        },
        // Safety & travel extensions, more daily scenarios...
        {
            title: 'Entering a New Place',
            category: 'Protection',
            arabic: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ',
            transliteration: 'Aʿūdhu bikalimātillāhit-tāmmāti min sharri mā khalaq',
            translation: 'I seek refuge in the perfect words of Allah from the evil of what He has created.',
            meaning: 'For protection when entering a new house, hotel, forest, or unfamiliar area.',
            keywords: ['new place', 'hotel', 'forest', 'travel safety', 'unknown area'],
        },
        {
            title: 'Dua for Good Character',
            category: 'Character',
            arabic: 'اللَّهُمَّ كَمَا أَحْسَنْتَ خَلْقِي فَحَسِّنْ خُلُقِي',
            transliteration: 'Allahumma kamā aḥsanta khalqī fa ḥassin khuluqī',
            translation: 'O Allah, just as You have made my outward form good, make my character good.',
            meaning: 'For better manners and dealing with people kindly.',
            keywords: ['anger', 'character', 'manners', 'behaviour', 'people'],
        },
        {
            title: 'Dua When Angry',
            category: 'Character',
            arabic: 'أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ',
            transliteration: 'Aʿūdhu billāhi mina sh-shayṭānir-rajīm',
            translation: 'I seek refuge in Allah from the accursed devil.',
            meaning: 'To be said when feeling strong anger.',
            keywords: ['angry', 'rage', 'shout', 'fight', 'argument'],
        },
        {
            title: 'Dua for Visiting the Sick',
            category: 'Health',
            arabic: 'لَا بَأْسَ طَهُورٌ إِنْ شَاءَ اللَّهُ',
            transliteration: 'Lā ba’sa, ṭahūr(in) in shāʾ Allāh',
            translation: 'No harm; it is a purification, if Allah wills.',
            meaning: 'Words of comfort when visiting someone who is unwell.',
            keywords: ['visit sick', 'hospital visit', 'sick friend', 'ill relative'],
        },
        {
            title: 'Dua for Rain and Sustenance',
            category: 'Rizq',
            arabic: 'اللَّهُمَّ اسْقِنَا غَيْثًا مُغِيثًا مَرِيئًا نَافِعًا غَيْرَ ضَارٍّ',
            transliteration: 'Allahumma sqinā ghaythan mughīthan marīʾan nāfiʿan ghayra ḍārr',
            translation: 'O Allah, give us pouring, beneficial, pleasant rain, not harmful.',
            meaning: 'For rain and blessing in livelihood, especially in drought or hardship.',
            keywords: ['rain', 'rizq', 'drought', 'crops', 'business slump'],
        },
        {
            title: 'Dua for Guidance and Steadfastness',
            category: 'Guidance',
            arabic: 'يَا مُقَلِّبَ الْقُلُوبِ ثَبِّتْ قَلْبِي عَلَى دِينِكَ',
            transliteration: 'Yā muqallibal-qulūb, thabbit qalbī ʿalā dīnik',
            translation: 'O Turner of the hearts, keep my heart firm upon Your religion.',
            meaning: 'For strong iman and staying on the straight path.',
            keywords: ['iman', 'faith', 'doubt', 'stay firm', 'deen'],
        },
        {
            title: 'Dua for Relief from Debt',
            category: 'Rizq',
            arabic:
                'اللَّهُمَّ اكْفِنِي بِحَلَالِكَ عَنْ حَرَامِكَ، وَأَغْنِنِي بِفَضْلِكَ عَمَّنْ سِوَاكَ',
            transliteration:
                'Allahumma kfinī biḥalālika ʿan ḥarāmik, wa aghninī bi faḍlika ʿamman siwāk',
            translation:
                'O Allah, suffice me with what You have made lawful instead of what You have made unlawful, and enrich me by Your grace from all besides You.',
            meaning: 'Particularly powerful for debts and financial struggle.',
            keywords: ['loan', 'debt', 'credit card', 'bills', 'money stress'],
        },
        {
            title: 'Dua for Good End (Husn al-Khatimah)',
            category: 'Hereafter',
            arabic: 'اللَّهُمَّ اجْعَلْ خَيْرَ عُمْرِي آخِرَهُ وَخَيْرَ عَمَلِي خَوَاتِيمَهُ',
            transliteration: 'Allahummajʿal khayra ʿumrī ākhirahū wa khayra ʿamalī khawātīmahū',
            translation:
                'O Allah, make the best part of my life the last of it, and the best of my deeds the last of them.',
            meaning: 'For a good ending and best deeds at the end of life.',
            keywords: ['death', 'end of life', 'good end', 'husn al khatimah'],
        },
        // You can keep extending with more daily scenarios as needed
    ];

    const surahQuick = [
        {
            name: 'Al-Fatiha',
            number: 1,
            arabic:
                'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ ۝ الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ ۝ الرَّحْمَٰنِ الرَّحِيمِ ۝ مَالِكِ يَوْمِ الدِّينِ ۝ إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ ۝ اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ ۝ صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ',
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

                // Fallback to keyword/local only (no forced healing default)
                const match = bestKeywordMatch(duaList, text);
                if (match) {
                    renderDua(match);
                } else {
                    renderDua({
                        title: 'General Supplication',
                        category: 'Reminder',
                        arabic: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
                        transliteration: 'Alhamdu lillāhi rabbil-ʿālamīn',
                        translation:
                            'All praise is for Allah, Lord of all worlds. Please try describing your situation with different words for a more specific dua.',
                        meaning:
                            'A general remembrance when no specific dua from the list matches your exact situation.',
                    });
                }
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


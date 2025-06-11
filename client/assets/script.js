const searchBtn = document.getElementById('searchBtn');
const locationInput = document.getElementById('locationInput');
const unitToggle = document.getElementById('unitToggle');
const container = document.getElementById('container');
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('errorMessage');
const currentWeather = document.getElementById('currentWeather');
const cityName = document.getElementById('cityName');
const weatherIcon = document.getElementById('weatherIcon');
const weatherSummary = document.getElementById('weatherSummary');
const temperature = document.getElementById('temperature');
const tempHighLow = document.getElementById('tempHighLow');
const precipitation = document.getElementById('precipitation');
const humidity = document.getElementById('humidity');
const windSpeed = document.getElementById('windSpeed');
const sunrise = document.getElementById('sunrise');
const sunset = document.getElementById('sunset');
const localTime = document.getElementById('localTime');
const hourlyForecastDiv = document.getElementById('hourlyForecast');
const forecastDiv = document.getElementById('forecast');
const searchHistoryDiv = document.getElementById('searchHistory');
const logoIcon = document.getElementById('logoIcon');

let unit = 'metric'; // 'metric' for Celsius, 'imperial' for Fahrenheit
let searchHistory = JSON.parse(localStorage.getItem('searchHistory')) || [];

// Particles.js Initialization
particlesJS('particles-js', {
    particles: {
        number: { value: 80, density: { enable: true, value_area: 800 } },
        color: { value: '#ffffff' },
        shape: { type: 'circle' },
        opacity: { value: 0.5, random: true },
        size: { value: 3, random: true },
        line_linked: { enable: false },
        move: { enable: true, speed: 1, direction: 'none', random: true }
    },
    interactivity: {
        detect_on: 'canvas',
        events: { onhover: { enable: true, mode: 'repulse' }, onclick: { enable: true, mode: 'push' } },
        modes: { repulse: { distance: 100, duration: 0.4 }, push: { particles_nb: 4 } }
    },
    retina_detect: true
});

// Set Logo Icon (Sun)
logoIcon.innerHTML = `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <circle class="sun" cx="50" cy="50" r="20" fill="#facc15"/>
        <line x1="50" y1="10" x2="50" y2="30" stroke="#facc15" stroke-width="4"/>
        <line x1="50" y1="70" x2="50" y2="90" stroke="#facc15" stroke-width="4"/>
        <line x1="10" y1="50" x2="30" y2="50" stroke="#facc15" stroke-width="4"/>
        <line x1="70" y1="50" x2="90" y2="50" stroke="#facc15" stroke-width="4"/>
        <line x1="21.7" y1="21.7" x2="35.3" y2="35.3" stroke="#facc15" stroke-width="4"/>
        <line x1="64.7" y1="64.7" x2="78.3" y2="78.3" stroke="#facc15" stroke-width="4"/>
        <line x1="21.7" y1="78.3" x2="35.3" y2="64.7" stroke="#facc15" stroke-width="4"/>
        <line x1="64.7" y1="35.3" x2="78.3" y2="21.7" stroke="#facc15" stroke-width="4"/>
    </svg>
`;

// Event Listeners
searchBtn.addEventListener('click', fetchWeather);
locationInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') fetchWeather();
});
unitToggle.addEventListener('click', toggleUnit);
searchHistoryDiv.addEventListener('click', (e) => {
    if (e.target.classList.contains('list-group-item')) {
        locationInput.value = e.target.textContent;
        fetchWeather();
    }
});
errorMessage.addEventListener('click', (e) => {
    if (e.target.classList.contains('retry-btn')) {
        fetchWeather();
    }
});

// Autodetect Location on Page Load
document.addEventListener('DOMContentLoaded', () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    console.log(`Fetching location for coordinates: lat=${latitude}, lon=${longitude}`);
                    const response = await fetch(
                        `http://localhost:5000/api/weather/reverse?lat=${latitude}&lon=${longitude}`
                    );
                    if (!response.ok) {
                        console.error(`Reverse geocoding failed with status: ${response.status}`);
                        throw new Error('Failed to fetch location from coordinates.');
                    }
                    const data = await response.json();
                    if (data.error) throw new Error(data.error);
                    const city = data[0]?.name || 'Unknown Location';
                    locationInput.value = city;
                    fetchWeather();
                } catch (error) {
                    console.error('Geolocation fetch error:', error.message);
                    showError('Unable to autodetect location. Please enter a city manually.');
                }
            },
            (error) => {
                console.error('Geolocation error:', error.message);
                showError('Location access denied. Please enter a city manually.');
            }
        );
    } else {
        console.error('Geolocation not supported by browser.');
        showError('Geolocation not supported by your browser. Please enter a city manually.');
    }
});

function toggleUnit() {
    unit = unit === 'metric' ? 'imperial' : 'metric';
    unitToggle.textContent = unit === 'metric' ? '°C' : '°F';
    if (locationInput.value) fetchWeather();
}

async function fetchWeather() {
    const location = locationInput.value.trim();
    if (!location) {
        showError('Please enter a city name or zip code.');
        return;
    }

    searchBtn.disabled = true;
    loading.classList.remove('d-none');
    errorMessage.classList.add('d-none');
    currentWeather.classList.add('d-none');
    hourlyForecastDiv.innerHTML = '';
    forecastDiv.innerHTML = '';

    try {
        // Fetch current weather
        console.log(`Fetching current weather for ${location}...`);
        const weatherResponse = await fetch(
            `http://localhost:5000/api/weather/current?location=${encodeURIComponent(location)}&units=${unit}`
        );
        if (!weatherResponse.ok) {
            console.error(`Current weather fetch failed with status: ${weatherResponse.status}`);
            throw new Error('Failed to fetch current weather data. Please check the server.');
        }
        const weatherData = await weatherResponse.json();
        if (weatherData.error) throw new Error(weatherData.error);

        // Fetch hourly and forecast data
        console.log(`Fetching forecast for ${location}...`);
        const forecastResponse = await fetch(
            `http://localhost:5000/api/weather/forecast?location=${encodeURIComponent(location)}&units=${unit}`
        );
        if (!forecastResponse.ok) {
            console.error(`Forecast fetch failed with status: ${forecastResponse.status}`);
            throw new Error('Failed to fetch forecast data. Please check the server.');
        }
        const forecastData = await forecastResponse.json();
        if (forecastData.error) throw new Error(forecastData.error);

        // Use the first hourly forecast's pop for current weather
        const currentPrecip = forecastData.list[0].pop * 100; // Convert to percentage

        // Calculate high and low for today
        const todayData = getTodayData(forecastData);
        const todayHighLow = calculateHighLow(todayData);

        displayCurrentWeather(weatherData, currentPrecip, todayHighLow);

        // Display hourly forecast for today
        displayHourlyForecast(forecastData);

        // Display 5-day forecast with summary
        displayForecast(forecastData);

        // Add to search history
        if (!searchHistory.includes(location)) {
            searchHistory.unshift(location);
            if (searchHistory.length > 5) searchHistory.pop();
            localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
            updateSearchHistory();
        }

        // Update last updated time
        const now = new Date();
        const options = { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' };
        const timeString = now.toLocaleTimeString('en-IN', options);
        const dateString = now.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
        const lastUpdated = document.createElement('p');
        lastUpdated.className = 'weather-info';
        lastUpdated.textContent = `Last Updated: ${dateString}, ${timeString} IST`;
        currentWeather.querySelector('.card-body').appendChild(lastUpdated);
    } catch (error) {
        console.error('Fetch error:', error.message);
        showError(`${error.message} <button class="btn btn-sm btn-primary retry-btn ms-2">Retry</button>`);
    } finally {
        searchBtn.disabled = false;
        loading.classList.add('d-none');
    }
}

function getTodayData(forecastData) {
    const now = new Date();
    now.setHours(now.getHours() + 5, now.getMinutes() + 30); // Adjust for IST (UTC+5:30)
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999); // End of today

    return forecastData.list.filter(item => {
        const itemDate = new Date(item.dt * 1000);
        return itemDate <= todayEnd;
    });
}

function calculateHighLow(data) {
    const temps = data.map(item => item.main.temp);
    const high = Math.round(Math.max(...temps));
    const low = Math.round(Math.min(...temps));
    return { high, low };
}

function getTimeOfDay() {
    const now = new Date();
    now.setHours(now.getHours() + 5, now.getMinutes() + 30); // Adjust for IST (UTC+5:30)
    const hour = now.getHours();

    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 14) return 'noon';
    if (hour >= 14 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 20) return 'evening';
    return 'night';
}

function isDaytime(dt, sunrise, sunset) {
    const currentTime = new Date(dt * 1000);
    const sunriseTime = new Date(sunrise * 1000);
    const sunsetTime = new Date(sunset * 1000);
    return currentTime >= sunriseTime && currentTime <= sunsetTime;
}

function displayCurrentWeather(data, currentPrecip, todayHighLow) {
    // Determine time-of-day background
    const timeOfDay = getTimeOfDay();
    const weatherCondition = data.weather[0].main.toLowerCase();
    container.className = 'container ' + (timeOfDay + '-bg');

    currentWeather.classList.remove('d-none');
    // Remove previous last updated time and local time if exists
    const existingLastUpdated = currentWeather.querySelector('.card-body > .weather-info:last-child');
    if (existingLastUpdated && existingLastUpdated.textContent.startsWith('Last Updated:')) {
        existingLastUpdated.remove();
    }
    const existingLocalTime = currentWeather.querySelector('.card-body > .weather-info:nth-last-child(2)');
    if (existingLocalTime && existingLocalTime.textContent.startsWith('Local Time:')) {
        existingLocalTime.remove();
    }
    cityName.textContent = data.name;
    weatherIcon.innerHTML = getAnimatedIcon(weatherCondition, data.dt, data.sys.sunrise, data.sys.sunset);
    weatherSummary.textContent = data.weather[0].description.charAt(0).toUpperCase() + data.weather[0].description.slice(1);
    temperature.textContent = `${Math.round(data.main.temp)} ${unit === 'metric' ? '°C' : '°F'}`;
    tempHighLow.textContent = `${todayHighLow.high}/${todayHighLow.low} ${unit === 'metric' ? '°C' : '°F'}`;
    precipitation.textContent = Math.round(currentPrecip);
    humidity.textContent = data.main.humidity;
    windSpeed.textContent = `${Math.round(data.wind.speed)} ${unit === 'metric' ? 'm/s' : 'mph'}`;

    // Display sunrise and sunset times
    const sunriseTime = new Date(data.sys.sunrise * 1000);
    const sunsetTime = new Date(data.sys.sunset * 1000);
    const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' };
    sunrise.textContent = sunriseTime.toLocaleTimeString('en-IN', timeOptions);
    sunset.textContent = sunsetTime.toLocaleTimeString('en-IN', timeOptions);

    // Display local time and timezone
    const timezoneOffsetSeconds = data.timezone; // Offset in seconds
    const now = new Date();
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000); // Convert to UTC
    const localTimeDate = new Date(utcTime + (timezoneOffsetSeconds * 1000));
    const localTimeString = localTimeDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const timezoneOffsetHours = Math.floor(timezoneOffsetSeconds / 3600);
    const timezoneOffsetMinutes = Math.abs((timezoneOffsetSeconds % 3600) / 60);
    const timezoneString = `UTC${timezoneOffsetHours >= 0 ? '+' : ''}${timezoneOffsetHours}:${timezoneOffsetMinutes.toString().padStart(2, '0')}`;
    localTime.textContent = `${localTimeString}, ${timezoneString}`;
}

function displayHourlyForecast(data) {
    const now = new Date();
    now.setHours(now.getHours() + 5, now.getMinutes() + 30); // Adjust for IST (UTC+5:30)
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999); // End of today

    // Filter hourly data for today
    const hourlyData = data.list.filter(item => {
        const itemDate = new Date(item.dt * 1000);
        return itemDate <= todayEnd;
    });

    // Get sunrise and sunset for day/night determination
    const sunriseTime = new Date(data.list[0].sys?.sunrise * 1000 || new Date().setHours(6, 0, 0, 0));
    const sunsetTime = new Date(data.list[0].sys?.sunset * 1000 || new Date().setHours(18, 0, 0, 0));

    // Add "Now" card using the first hourly forecast data
    const nowCard = `
        <div class="hourly-card">
            <p class="hourly-time">Now</p>
            <div class="hourly-icon">${getAnimatedIcon(data.list[0].weather[0].main.toLowerCase(), data.list[0].dt, sunriseTime / 1000, sunsetTime / 1000)}</div>
            <p class="hourly-temp">${Math.round(data.list[0].main.temp)} ${unit === 'metric' ? '°C' : '°F'}</p>
            <p class="hourly-precip">${Math.round(data.list[0].pop * 100)}%</p>
        </div>
    `;
    hourlyForecastDiv.innerHTML += nowCard;

    // Add upcoming hours
    hourlyData.slice(1).forEach((hour, index) => {
        const hourDate = new Date(hour.dt * 1000);
        const hourString = hourDate.toLocaleTimeString('en-IN', { hour: 'numeric', hour12: true });
        const temp = Math.round(hour.main.temp);
        const precip = Math.round(hour.pop * 100);
        const iconSvg = getAnimatedIcon(hour.weather[0].main.toLowerCase(), hour.dt, sunriseTime / 1000, sunsetTime / 1000);

        const hourlyCard = `
            <div class="hourly-card" style="animation-delay: ${index * 100}ms;">
                <p class="hourly-time">${hourString}</p>
                <div class="hourly-icon">${iconSvg}</div>
                <p class="hourly-temp">${temp} ${unit === 'metric' ? '°C' : '°F'}</p>
                <p class="hourly-precip">${precip}%</p>
            </div>
        `;
        hourlyForecastDiv.innerHTML += hourlyCard;
    });

    // Intersection Observer for scrollytelling animations
    const hourlyCards = document.querySelectorAll('.hourly-card');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.3 });

    hourlyCards.forEach(card => observer.observe(card));
}

function displayForecast(data) {
    // Group data by day
    const dailyData = {};
    data.list.forEach(item => {
        const date = new Date(item.dt * 1000);
        const dayKey = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
        if (!dailyData[dayKey]) {
            dailyData[dayKey] = {
                temps: [],
                conditions: [],
                pops: [],
                date: dayKey,
                dts: []
            };
        }
        dailyData[dayKey].temps.push(item.main.temp);
        dailyData[dayKey].conditions.push(item.weather[0].main.toLowerCase());
        dailyData[dayKey].pops.push(item.pop);
        dailyData[dayKey].dts.push(item.dt);
    });

    // Get sunrise and sunset for day/night determination
    const sunriseTime = new Date(data.list[0].sys?.sunrise * 1000 || new Date().setHours(6, 0, 0, 0));
    const sunsetTime = new Date(data.list[0].sys?.sunset * 1000 || new Date().setHours(18, 0, 0, 0));

    // Calculate daily summaries (average temp, high/low, most frequent condition, average precipitation)
    const dailySummaries = Object.values(dailyData).slice(1, 6); // Skip today, take next 5 days
    dailySummaries.forEach((day, index) => {
        const avgTemp = Math.round(day.temps.reduce((a, b) => a + b, 0) / day.temps.length);
        const highLow = calculateHighLow(day.temps.map(temp => ({ main: { temp } })));
        const avgPrecip = Math.round((day.pops.reduce((a, b) => a + b, 0) / day.pops.length) * 100);
        const conditionCounts = {};
        day.conditions.forEach(condition => {
            conditionCounts[condition] = (conditionCounts[condition] || 0) + 1;
        });
        const mainCondition = Object.keys(conditionCounts).reduce((a, b) =>
            conditionCounts[a] > conditionCounts[b] ? a : b
        );
        // Use the first timestamp of the day for day/night determination
        const dayDt = day.dts[0];
        const iconSvg = getAnimatedIcon(mainCondition, dayDt, sunriseTime / 1000, sunsetTime / 1000);

        const forecastCard = `
            <div class="forecast-card" style="animation-delay: ${index * 100}ms;">
                <p class="forecast-date">${day.date}</p>
                <div class="forecast-icon">${iconSvg}</div>
                <p class="forecast-temp">${avgTemp} ${unit === 'metric' ? '°C' : '°F'}</p>
                <p class="forecast-high-low">${highLow.high}/${highLow.low} ${unit === 'metric' ? '°C' : '°F'}</p>
                <p class="forecast-precip">${avgPrecip}%</p>
                <p class="forecast-summary">${mainCondition.charAt(0).toUpperCase() + mainCondition.slice(1)}</p>
            </div>
        `;
        forecastDiv.innerHTML += forecastCard;
    });

    // Intersection Observer for scrollytelling animations
    const forecastCards = document.querySelectorAll('.forecast-card');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.3 });

    forecastCards.forEach(card => observer.observe(card));
}

function showError(message) {
    errorMessage.innerHTML = message;
    errorMessage.classList.remove('d-none');
    container.className = 'container default-bg';
}

function getWeatherBackground(condition) {
    switch (condition) {
        case 'clear':
            return 'clear-bg';
        case 'clouds':
            return 'clouds-bg';
        case 'rain':
        case 'drizzle':
            return 'rain-bg';
        case 'thunderstorm':
            return 'thunderstorm-bg';
        case 'snow':
            return 'snow-bg';
        default:
            return 'default-bg';
    }
}

function getAnimatedIcon(condition, dt, sunrise, sunset) {
    console.log(`Weather condition: ${condition}, dt: ${dt}, sunrise: ${sunrise}, sunset: ${sunset}`);
    const isDay = isDaytime(dt, sunrise, sunset);
    let svgIcon;

    switch (condition.toLowerCase()) {
        case 'clear':
            console.log(`Rendering clear icon, isDay: ${isDay}`);
            if (isDay) {
                svgIcon = `
                    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                        <circle class="sun" cx="50" cy="50" r="20" fill="#facc15"/>
                        <line x1="50" y1="10" x2="50" y2="30" stroke="#facc15" stroke-width="4"/>
                        <line x1="50" y1="70" x2="50" y2="90" stroke="#facc15" stroke-width="4"/>
                        <line x1="10" y1="50" x2="30" y2="50" stroke="#facc15" stroke-width="4"/>
                        <line x1="70" y1="50" x2="90" y2="50" stroke="#facc15" stroke-width="4"/>
                        <line x1="21.7" y1="21.7" x2="35.3" y2="35.3" stroke="#facc15" stroke-width="4"/>
                        <line x1="64.7" y1="64.7" x2="78.3" y2="78.3" stroke="#facc15" stroke-width="4"/>
                        <line x1="21.7" y1="78.3" x2="35.3" y2="64.7" stroke="#facc15" stroke-width="4"/>
                        <line x1="64.7" y1="35.3" x2="78.3" y2="21.7" stroke="#facc15" stroke-width="4"/>
                    </svg>
                `;
            } else {
                svgIcon = `
                    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                        <path class="moon" d="M50 20A30 30 0 0 1 80 50A30 30 0 0 1 50 80A30 30 0 0 0 50 20Z" fill="#e5e7eb"/>
                    </svg>
                `;
            }
            break;
        case 'clouds':
            console.log(`Rendering clouds icon`);
            svgIcon = `
                <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                    <path class="cloud" d="M20 60A20 20 0 0 1 40 40H70A15 15 0 0 1 85 55A15 15 0 0 1 70 70H30A20 20 0 0 1 20 60Z" fill="#94a3b8"/>
                    <path class="cloud" d="M40 40A15 15 0 0 1 55 25A15 15 0 0 1 70 40H55A15 15 0 0 1 40 40Z" fill="#94a3b8"/>
                </svg>
            `;
            break;
        case 'rain':
        case 'drizzle':
        case 'showers':
            svgIcon = `
                <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                    <path class="cloud" d="M20 40A20 20 0 0 1 40 20H70A15 15 0 0 1 85 35A15 15 0 0 1 70 50H30A20 20 0 0 1 20 40Z" fill="#94a3b8"/>
                    <path class="cloud" d="M40 20A15 15 0 0 1 55 5A15 15 0 0 1 70 20H55A15 15 0 0 1 40 20Z" fill="#94a3b8"/>
                    <circle class="raindrop" cx="40" cy="70" r="5" fill="#3b82f6" style="animation-delay: 0s;"/>
                    <circle class="raindrop" cx="50" cy="70" r="5" fill="#3b82f6" style="animation-delay: 0.3s;"/>
                    <circle class="raindrop" cx="60" cy="70" r="5" fill="#3b82f6" style="animation-delay: 0.6s;"/>
                </svg>
            `;
            break;
        case 'thunderstorm':
            svgIcon = `
                <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                    <path class="cloud" d="M20 40A20 20 0 0 1 40 20H70A15 15 0 0 1 85 35A15 15 0 0 1 70 50H30A20 20 0 0 1 20 40Z" fill="#94a3b8"/>
                    <path class="cloud" d="M40 20A15 15 0 0 1 55 5A15 15 0 0 1 70 20H55A15 15 0 0 1 40 20Z" fill="#94a3b8"/>
                    <path class="lightning" d="M50 50L40 70H50L45 90L60 70H50L55 50Z" fill="#facc15"/>
                </svg>
            `;
            break;
        case 'snow':
        case 'sleet':
            svgIcon = `
                <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                    <path class="cloud" d="M20 40A20 20 0 0 1 40 20H70A15 15 0 0 1 85 35A15 15 0 0 1 70 50H30A20 20 0 0 1 20 40Z" fill="#94a3b8"/>
                    <path class="cloud" d="M40 20A15 15 0 0 1 55 5A15 15 0 0 1 70 20H55A15 15 0 0 1 40 20Z" fill="#94a3b8"/>
                    <path class="snowflake" d="M40 70L45 80L40 75L35 80L40 70Z" fill="#ffffff" style="animation-delay: 0s;"/>
                    <path class="snowflake" d="M50 70L55 80L50 75L45 80L50 70Z" fill="#ffffff" style="animation-delay: 0.3s;"/>
                    <path class="snowflake" d="M60 70L65 80L60 75L55 80L60 70Z" fill="#ffffff" style="animation-delay: 0.6s;"/>
                </svg>
            `;
            break;
        case 'mist':
        case 'fog':
        case 'haze':
        case 'smoke':
        case 'dust':
        case 'sand':
        case 'ash':
            svgIcon = `
                <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                    <path class="mist" d="M20 50A20 20 0 0 1 40 30H70A15 15 0 0 1 85 45A15 15 0 0 1 70 60H30A20 20 0 0 1 20 50Z" fill="#94a3b8" fill-opacity="0.5"/>
                    <path class="mist" d="M40 30A15 15 0 0 1 55 15A15 15 0 0 1 70 30H55A15 15 0 0 1 40 30Z" fill="#94a3b8" fill-opacity="0.5"/>
                    <rect class="mist" x="10" y="70" width="80" height="10" fill="#94a3b8" fill-opacity="0.3"/>
                </svg>
            `;
            break;
        case 'squall':
        case 'tornado':
            svgIcon = `
                <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                    <path class="tornado" d="M40 20L60 20L55 40L45 40L50 60L30 60L35 80L65 80L60 100L40 100Z" fill="#94a3b8"/>
                </svg>
            `;
            break;
        default:
            console.log(`Rendering default icon, isDay: ${isDay}`);
            svgIcon = isDay ? `
                <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                    <circle class="sun" cx="50" cy="50" r="20" fill="#facc15"/>
                    <line x1="50" y1="10" x2="50" y2="30" stroke="#facc15" stroke-width="4"/>
                    <line x1="50" y1="70" x2="50" y2="90" stroke="#facc15" stroke-width="4"/>
                    <line x1="10" y1="50" x2="30" y2="50" stroke="#facc15" stroke-width="4"/>
                    <line x1="70" y1="50" x2="90" y2="50" stroke="#facc15" stroke-width="4"/>
                    <line x1="21.7" y1="21.7" x2="35.3" y2="35.3" stroke="#facc15" stroke-width="4"/>
                    <line x1="64.7" y1="64.7" x2="78.3" y2="78.3" stroke="#facc15" stroke-width="4"/>
                    <line x1="21.7" y1="78.3" x2="35.3" y2="64.7" stroke="#facc15" stroke-width="4"/>
                    <line x1="64.7" y1="35.3" x2="78.3" y2="21.7" stroke="#facc15" stroke-width="4"/>
                </svg>
            ` : `
                <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                    <path class="moon" d="M50 20A30 30 0 0 1 80 50A30 30 0 0 1 50 80A30 30 0 0 0 50 20Z" fill="#e5e7eb"/>
                </svg>
            `;
    }
    return svgIcon;
}

function updateSearchHistory() {
    searchHistoryDiv.innerHTML = searchHistory.map(location => `
        <a href="#" class="list-group-item list-group-item-action">${location}</a>
    `).join('');
}

// Load search history on page load
updateSearchHistory();
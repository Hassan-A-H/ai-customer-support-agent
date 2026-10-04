function getWeatherDescription(code) {
  const descriptions = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Slight snow",
    73: "Moderate snow",
    75: "Heavy snow",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
  };

  return descriptions[code] ?? "Unknown weather condition";
}

export async function getWeather(args) {
  const { city } = args;

  // First convert the city name into coordinates.
  const geocodingUrl =
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;

  const geocodingResponse = await fetch(geocodingUrl);

  if (!geocodingResponse.ok) {
    throw new Error("Geocoding API request failed");
  }

  const geocodingData = await geocodingResponse.json();

  if (!geocodingData.results || geocodingData.results.length === 0) {
    throw new Error(`Could not find city: ${city}`);
  }

  const location = geocodingData.results[0];

  // Use the coordinates to retrieve the current weather.
  const weatherUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto`;

  const weatherResponse = await fetch(weatherUrl);

  if (!weatherResponse.ok) {
    throw new Error("Weather API request failed");
  }

  const weatherData = await weatherResponse.json();

  const weatherCode = weatherData.current.weather_code;

  return {
    city: location.name,
    country: location.country,
    temperature: weatherData.current.temperature_2m,
    apparentTemperature: weatherData.current.apparent_temperature,
    condition: getWeatherDescription(weatherCode),
    windSpeed: weatherData.current.wind_speed_10m,
    unit: weatherData.current_units.temperature_2m,
  };
}
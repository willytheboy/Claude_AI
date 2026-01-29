import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Beirut coordinates
const BEIRUT_LAT = 33.8938;
const BEIRUT_LON = 35.5018;

// Simple in-memory cache
let cachedWeather: { data: any; timestamp: number } | null = null;
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check cache
    if (cachedWeather && Date.now() - cachedWeather.timestamp < CACHE_DURATION) {
      return new Response(JSON.stringify(cachedWeather.data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('OPENWEATHER_API_KEY');

    if (!apiKey) {
      // Return default weather if no API key
      const defaultWeather = {
        temperature: 28,
        feels_like: 30,
        conditions: 'Sunny',
        description: 'clear sky',
        icon: '01d',
        humidity: 65,
        wind_speed: 12,
        wind_direction: 270,
        visibility: 10000,
        pressure: 1015,
        sunrise: new Date().setHours(6, 30),
        sunset: new Date().setHours(18, 30),
        location: 'Beirut, Lebanon',
        recommendation: 'Perfect weather for outdoor activities at Sporting Club!',
        cached: false,
        default: true,
      };

      return new Response(JSON.stringify(defaultWeather), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch weather from OpenWeatherMap
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${BEIRUT_LAT}&lon=${BEIRUT_LON}&appid=${apiKey}&units=metric`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`OpenWeatherMap API error: ${response.status}`);
    }

    const data = await response.json();

    // Format response
    const weather = {
      temperature: Math.round(data.main.temp),
      feels_like: Math.round(data.main.feels_like),
      conditions: data.weather[0].main,
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      humidity: data.main.humidity,
      wind_speed: Math.round(data.wind.speed * 3.6), // Convert m/s to km/h
      wind_direction: data.wind.deg,
      visibility: data.visibility,
      pressure: data.main.pressure,
      sunrise: data.sys.sunrise * 1000,
      sunset: data.sys.sunset * 1000,
      location: `${data.name}, ${data.sys.country}`,
      recommendation: getRecommendation(data.weather[0].main, data.main.temp),
      cached: false,
    };

    // Cache the result
    cachedWeather = { data: weather, timestamp: Date.now() };

    return new Response(JSON.stringify(weather), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Weather function error:', error);

    // Return fallback weather on error
    const fallbackWeather = {
      temperature: 27,
      conditions: 'Partly Cloudy',
      icon: '02d',
      humidity: 60,
      wind_speed: 10,
      location: 'Beirut, Lebanon',
      recommendation: 'Great day to visit Sporting Club!',
      error: true,
    };

    return new Response(JSON.stringify(fallbackWeather), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function getRecommendation(conditions: string, temp: number): string {
  const condLower = conditions.toLowerCase();

  if (condLower.includes('rain') || condLower.includes('storm')) {
    return 'Rainy weather - perfect for indoor activities at the club restaurant or spa!';
  }

  if (condLower.includes('cloud')) {
    if (temp > 25) {
      return 'Comfortably cloudy - great for tennis or outdoor dining!';
    }
    return 'Mild weather - enjoy the club facilities without the harsh sun!';
  }

  if (condLower.includes('clear') || condLower.includes('sun')) {
    if (temp > 30) {
      return 'Hot and sunny - the pool is calling! Don\'t forget sunscreen.';
    }
    if (temp > 25) {
      return 'Beautiful sunny day - perfect for the pool, beach, or outdoor sports!';
    }
    return 'Pleasant sunny weather - great for any outdoor activity!';
  }

  if (temp > 30) {
    return 'It\'s warm out there - our pool and beach are perfect for cooling off!';
  }

  return 'Great weather for visiting Sporting Club!';
}

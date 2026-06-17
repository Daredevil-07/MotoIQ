// ══════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  const link = document.querySelector('[data-page="' + id + '"]');
  if (link) link.classList.add('active');
  window.scrollTo(0, 0);

  // Page-specific logic
  if (id === 'safety') fetchWeather();
  if (id === 'nav-page') animateMapRoute();
  if (id === 'group') startGroupAnimation();
}

// ══════════════════════════════════════
// INIT, GSAP & LOADING SCREEN
// ══════════════════════════════════════

// Global Mouse Tracking for Premium Dark Lighting
document.addEventListener('mousemove', (e) => {
  const elements = document.querySelectorAll('.css-hardware');
  elements.forEach(el => {
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    el.style.setProperty('--mouse-x', `${x}px`);
    el.style.setProperty('--mouse-y', `${y}px`);
  });
});

window.addEventListener('load', () => {
  gsap.registerPlugin(ScrollTrigger);
  initScrollytelling();

  setTimeout(() => {
    const el = document.getElementById('loading');
    el.style.opacity = '0';
    el.style.transform = 'scale(1.05)';
    
    setTimeout(() => {
      el.style.display = 'none';
      
      // Hardware Unfold Animation
      gsap.to('.hardware-unfold', {
        rotateX: 0,
        rotateY: 0,
        rotateZ: 0,
        scale: 1,
        y: 0,
        opacity: 1,
        duration: 1.4,
        ease: "power4.out"
      });

      // Stagger stats
      gsap.fromTo('.glass-premium', 
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, stagger: 0.2, ease: "back.out(1.7)", delay: 0.4 }
      );

    }, 500);
  }, 1800);

  // Show notification after 4s
  setTimeout(() => {
    const n = document.getElementById('notif');
    if(n) {
      n.classList.add('show');
      setTimeout(() => n.classList.remove('show'), 5000);
    }
  }, 4000);
});

// ══════════════════════════════════════
// TOAST
// ══════════════════════════════════════
function showToast(msg, icon = '✅') {
  const t = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;
  document.getElementById('toast-icon').textContent = icon;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3500);
}

// ══════════════════════════════════════
// WEATHER — Real API
// ══════════════════════════════════════
async function fetchWeather(cityInput) {
  const city = cityInput || 'Pune';
  const apiKey = '5d39cbabf01adabdc0ccac59d5f43e06';
  
  // Set loading state
  document.getElementById('weather-city').textContent = 'Fetching ' + city + '...';
  
  // Simulate realistic weather (Fallback)
  const weatherData = {
    temp: 31,
    humidity: 58,
    wind: 14,
    visibility: 10,
    desc: 'Partly Cloudy',
    emoji: '⛅',
    rain: false
  };

  try {
    // Try real API
    const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const d = await res.json();
      weatherData.temp = Math.round(d.main.temp);
      weatherData.humidity = d.main.humidity;
      weatherData.wind = Math.round(d.wind.speed * 3.6);
      weatherData.visibility = Math.round(d.visibility / 1000) || 10;
      weatherData.desc = d.weather[0].description;
      
      const mainWeather = d.weather[0].main.toLowerCase();
      if(mainWeather.includes('clear')) weatherData.emoji = '☀️';
      else if(mainWeather.includes('cloud')) weatherData.emoji = '☁️';
      else if(mainWeather.includes('rain')) weatherData.emoji = '🌧';
      else if(mainWeather.includes('snow')) weatherData.emoji = '❄️';
      else if(mainWeather.includes('thunder')) weatherData.emoji = '⛈';
      else weatherData.emoji = '🌤';
      
      showToast('Weather updated for ' + d.name, '⛅');
    } else {
      showToast('City not found. Using fallback.', '⚠️');
    }
  } catch(e) { 
    showToast('API timeout. Using fallback.', '⚠️'); 
  }

  document.getElementById('weather-temp').textContent = weatherData.temp + '°C';
  document.getElementById('weather-city').textContent = city.toUpperCase();
  document.getElementById('weather-desc').textContent = weatherData.desc;
  document.getElementById('weather-emoji').textContent = weatherData.emoji;
  document.getElementById('weather-humidity').textContent = weatherData.humidity + '%';
  document.getElementById('weather-wind').textContent = weatherData.wind + ' km/h';
  document.getElementById('weather-vis').textContent = weatherData.visibility + ' km';

  const wa = document.getElementById('weather-alert');
  if (weatherData.wind > 40 || weatherData.rain || mainWeather?.includes('rain') || mainWeather?.includes('thunder')) {
    wa.style.display = 'block';
    wa.textContent = '⚠️ Bad weather detected. Ride with extra caution.';
  } else {
    wa.style.display = 'none';
  }
}

// ══════════════════════════════════════
// GOOGLE MAPS ROUTING API
// ══════════════════════════════════════
let map, directionsService, directionsRenderer;

window.initMap = function() {
  try {
    const mapStyle = [
      { elementType: "geometry", stylers: [{ color: "#0A1628" }] },
      { elementType: "labels.text.stroke", stylers: [{ color: "#0A1628" }] },
      { elementType: "labels.text.fill", stylers: [{ color: "#8A8FA8" }] },
      { featureType: "road", elementType: "geometry", stylers: [{ color: "#1E293B" }] },
      { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#334155" }] },
      { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#FF5C1A" }] },
      { featureType: "water", elementType: "geometry", stylers: [{ color: "#07080D" }] }
    ];

    const mapDiv = document.getElementById('googleMapDisplay');
    if(!mapDiv) return;

    map = new google.maps.Map(mapDiv, {
      center: { lat: 18.5204, lng: 73.8567 }, // Pune
      zoom: 8,
      styles: mapStyle,
      disableDefaultUI: true,
    });

    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({
      map: map,
      polylineOptions: { strokeColor: '#00D4FF', strokeWeight: 4, strokeOpacity: 0.8 },
      suppressMarkers: false
    });

    new google.maps.places.Autocomplete(document.getElementById('start-location'));
    new google.maps.places.Autocomplete(document.getElementById('end-location'));
  } catch (err) {
    console.error("Google Maps Initialization Error:", err);
    showToast('Failed to initialize Maps API. Check Console.', '⚠️');
  }
};

function simulateRoute() {
  const start = document.getElementById('start-location').value;
  const end = document.getElementById('end-location').value;

  if (!start || !end) {
    showToast('Please enter both Start and Destination', '⚠️');
    return;
  }
  
  if (!directionsService) {
    showToast('Map is still loading, or API disabled (Check Console)', '⚠️');
    return;
  }

  showToast('🗺 Calculating your optimal route...', '🧭');
  document.getElementById('live-route-via').textContent = 'Calculating best path...';

  directionsService.route(
    { origin: start, destination: end, travelMode: 'DRIVING', provideRouteAlternatives: true },
    function (response, status) {
      if (status === 'OK') {
        directionsRenderer.setDirections(response);
        const route = response.routes[0];
        const leg = route.legs[0];

        // Update UI metrics
        document.getElementById('route-result').style.display = 'block';
        document.getElementById('live-distance').innerHTML = leg.distance.text.replace(' km', '<span style="font-size:0.8rem">km</span>');
        document.getElementById('live-duration').textContent = leg.duration.text;
        
        // Update Overlays
        document.getElementById('live-route-title').textContent = `${leg.start_address.split(',')[0]} → ${leg.end_address.split(',')[0]}`;
        document.getElementById('live-route-via').textContent = route.summary ? `via ${route.summary}` : 'Optimal Route';

        showToast(`✅ Route found: ${leg.distance.text} · ${leg.duration.text}`, '🎉');
      } else {
        console.error('Directions request failed due to ' + status);
        showToast('Route Error: ' + status, '❌');
      }
    }
  );
}

function animateMapRoute() {
  // Deprecated: map animations are now handled natively by Google Maps directionsRenderer
}

function selectMode(el) {
  document.querySelectorAll('#page-nav-page .map-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
}

function filterFuel(el, mode) {
  document.querySelectorAll('#page-fuel .map-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  showToast('Filtering fuel stations: ' + mode, '⛽');
}

// ══════════════════════════════════════
// GROUP RIDE ANIMATION
// ══════════════════════════════════════
let groupInterval;
function startGroupAnimation() {
  clearInterval(groupInterval);
  const riders = [
    {id:'r1',id2:'r1p',path:[{x:120,y:258},{x:135,y:248},{x:150,y:238}]},
    {id:'r2',id2:'r2p',path:[{x:200,y:220},{x:215,y:212},{x:230,y:204}]},
    {id:'r3',id2:'r3p',path:[{x:260,y:192},{x:275,y:184},{x:290,y:176}]},
  ];
  let step = 0;
  groupInterval = setInterval(() => {
    step = (step+1)%3;
    riders.forEach(r => {
      const el = document.getElementById(r.id);
      const elp = document.getElementById(r.id2);
      if(!el) return;
      const p = r.path[step];
      el.setAttribute('cx', p.x);
      el.setAttribute('cy', p.y);
      if(elp){elp.setAttribute('cx',p.x);elp.setAttribute('cy',p.y);}
    });
  }, 1500);
}

// ══════════════════════════════════════
// SOS
// ══════════════════════════════════════
function triggerSOS() {
  showToast('🆘 SOS SENT! Emergency contacts notified. Nearest hospital: 2.3km away.', '🆘');
}

// ══════════════════════════════════════
// DIGILOCKER MODAL
// ══════════════════════════════════════
function openDLModal() {
  document.getElementById('dl-modal').classList.add('show');
}
function closeDLModal() {
  document.getElementById('dl-modal').classList.remove('show');
}
function fetchDLDocs() {
  closeDLModal();
  showToast('🔐 Connecting to DigiLocker...', '🔄');
  setTimeout(() => {
    document.getElementById('doc-cards-locked').style.display = 'none';
    document.getElementById('doc-cards-unlocked').style.display = 'block';
    document.getElementById('dl-status').textContent = 'connected';
    showToast('✅ DigiLocker connected! 4 documents fetched.', '🎉');
  }, 2000);
}

// ══════════════════════════════════════
// AI CHAT
// ══════════════════════════════════════
const aiResponses = {
  default: [
    "🗺 Great choice! Based on your preferences, I recommend the **Pune → Tamhini Ghat → Mulshi** route. It's 120km of pure joy with 52 curves, 680m elevation, and a beautiful lake view at the end.",
    "⭐ Route Stats:\n• Distance: 120 km\n• Duration: ~3h 15m\n• Scenic Score: 9.4/10\n• Difficulty: Moderate\n• Best time: 7–10 AM",
    "🛢 Fuel stops: HP Speed at Wakad (0.8km off route), Lonavala pump mid-route\n☕ Recommended café: Green Valley Café, Tamhini — breathtaking view, amazing chai!\n⚠️ Note: Tamhini Ghat can have foggy conditions before 9 AM."
  ]
};

let chatStep = 0;
const rideTypes = {
  scenic: "I recommend the **Pune → Tamhini Ghat → Mulshi** route. 120km, 9.4/10 scenic score, 52 curves.",
  curvy: "For maximum curves, try **Pune → Malshej Ghat → Bhimashankar**! 180km with 90+ curves and incredible forest views.",
  fast: "For speed: **Pune → Mumbai Expressway via Lonavala** — 150km, straight and fast with great ghat views en route.",
  group: "For groups, **Pune → Mahabaleshwar via Panchgani** is perfect — wide roads, clear waypoints, great group stops.",
  sunrise: "For sunrise: **Sinhagad Fort approach** — 24km from Pune centre, arrives at peak viewpoint just in time for 6 AM sunrise. 🌅"
};

async function sendChat() {
  const input = document.getElementById('chat-input');
  const msg = input.value.trim();
  if (!msg) return;
  input.value = '';

  const msgs = document.getElementById('chat-messages');
  
  // User message
  const userDiv = document.createElement('div');
  userDiv.className = 'self-end max-w-[85%] bg-secondary/10 border border-secondary/20 text-white p-4 rounded-2xl rounded-tr-sm text-sm leading-relaxed shadow-sm block';
  userDiv.textContent = msg;
  msgs.appendChild(userDiv);
  msgs.scrollTop = msgs.scrollHeight;

  // Typing indicator
  const typingDiv = document.createElement('div');
  typingDiv.className = 'typing self-start max-w-[85%] bg-[#0f111a] border border-white/10 text-white p-4 rounded-2xl rounded-tl-sm text-sm flex gap-1 items-center';
  typingDiv.innerHTML = '<span class="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"></span><span class="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style="animation-delay:0.2s"></span><span class="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style="animation-delay:0.4s"></span>';
  msgs.appendChild(typingDiv);
  msgs.scrollTop = msgs.scrollHeight;

  // Detect intent
  const lower = msg.toLowerCase();
  let response = "I've generated a personalized route based on your request! Here's what I recommend:\n\n🗺 " + 
    (lower.includes('scenic') || lower.includes('mountain') ? rideTypes.scenic :
     lower.includes('curv') || lower.includes('ghat') ? rideTypes.curvy :
     lower.includes('fast') || lower.includes('quick') ? rideTypes.fast :
     lower.includes('group') ? rideTypes.group :
     lower.includes('sunrise') || lower.includes('morning') ? rideTypes.sunrise :
     "**Pune → Lonavala Scenic Loop** — 148km, 8.4/10 fun score, via Khandala Ghat.");

  await new Promise(r => setTimeout(r, 1200 + Math.random()*800));

  // Remove typing, add response
  typingDiv.remove();
  const aiDiv = document.createElement('div');
  aiDiv.className = 'self-start max-w-[85%] bg-[#0f111a] border border-white/10 text-white p-4 rounded-2xl rounded-tl-sm text-sm leading-relaxed shadow-sm block';
  aiDiv.textContent = response;
  msgs.appendChild(aiDiv);
  msgs.scrollTop = msgs.scrollHeight;

  // Update AI route output
  updateAIRoute(msg, response);
}

function quickPrompt(text) {
  document.getElementById('chat-input').value = text;
  sendChat();
}

function updateAIRoute(prompt, response) {
  document.getElementById('ai-route-output').innerHTML = `
    <div class="mb-4 p-4 bg-success/10 border border-success/30 rounded-xl text-success flex gap-3 text-sm font-medium items-start">
      <div class="text-lg">✅</div>
      <div>
        <div class="font-bold text-white mb-0.5">Route Generated Successfully</div>
        <div class="text-xs text-textMuted">AI analysed 3,412 paths to find your match.</div>
      </div>
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div class="bg-black/40 border border-white/5 rounded-2xl p-4 text-center">
        <div class="font-exo font-black text-primary text-3xl">148<span class="text-sm">km</span></div>
        <div class="text-[10px] text-textMuted font-mono uppercase mt-1">Distance</div>
      </div>
      <div class="bg-black/40 border border-white/5 rounded-2xl p-4 text-center">
        <div class="font-exo font-black text-secondary text-3xl">9.1<span class="text-sm">/10</span></div>
        <div class="text-[10px] text-textMuted font-mono uppercase mt-1">Fun Score</div>
      </div>
    </div>
    <div class="mt-4 p-4 bg-primary/10 border border-primary/20 rounded-xl text-xs text-textMuted leading-relaxed">
      🤖 <strong class="text-primary2 font-exo">AI suggests:</strong> Depart by 7 AM for optimal light conditions and minimal traffic on ghat roads.
    </div>`;
}

// Init map route on load
setTimeout(() => animateMapRoute(), 2000);

// ══════════════════════════════════════
// SCROLLYTELLING CANVAS SEQUENCE
// ══════════════════════════════════════
const frameCount = 112; // 0 to 111
const currentFrame = index => (
  `frame_${index.toString().padStart(3, '0')}_delay-0.071s.png`
);

const images = [];
const imageSeq = { frame: 0 };

// Preload images - skipping every 2nd frame to reduce memory and scroll lag (from 112 down to 56 frames)
const step = 2; // Increase to 3 or 4 if it still lags
for (let i = 0; i < frameCount; i += step) {
  const img = new Image();
  img.src = currentFrame(i);
  images.push(img);
}

function renderCanvas() {
  const canvas = document.getElementById('frameCanvas');
  if(!canvas) return;
  const context = canvas.getContext('2d');
  
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // Use the preloaded array index
  const renderImg = images[imageSeq.frame];
  if(renderImg && renderImg.complete) {
    // Implement object-fit: cover
    const scale = Math.max(canvas.width / renderImg.width, canvas.height / renderImg.height);
    const x = (canvas.width / 2) - (renderImg.width / 2) * scale;
    const y = (canvas.height / 2) - (renderImg.height / 2) * scale;
    
    // Smooth drawing (reduce aliasing artifacts, not 100% motion blur but helps visually)
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(renderImg, x, y, renderImg.width * scale, renderImg.height * scale);
  } else if (renderImg) {
    // If not loaded yet, schedule a render upon load
    renderImg.onload = renderCanvas;
  }
}

window.addEventListener('resize', renderCanvas);

function initScrollytelling() {
  if(!document.querySelector('.scrolly-wrapper')) return;
  
  if(images[0]) {
    if(images[0].complete) renderCanvas();
    else images[0].onload = renderCanvas;
  }

  // Bind to ScrollTrigger for exact frame seeking
  gsap.to(imageSeq, {
    frame: images.length - 1,
    snap: "frame",
    ease: "none",
    scrollTrigger: {
      trigger: ".scrolly-wrapper",
      start: "top top",
      end: "bottom bottom",
      scrub: 0.5, // Reduced scrub delay for more responsive scrolling 
      pin: false 
    },
    onUpdate: renderCanvas
  });

  // Overlays Animations
  // Phase 1 (0–20%)
  gsap.fromTo("#phase1", { opacity: 0, y: 30, scale: 0.95 }, {
    opacity: 1, y: 0, scale: 1.05,
    ease: "power2.out",
    scrollTrigger: {
      trigger: ".scrolly-wrapper", start: "0% 0%", end: "20% 0%", scrub: true
    }
  });
  gsap.to("#phase1", {
    opacity: 0, y: -30, scale: 1.1,
    ease: "power2.in",
    scrollTrigger: {
      trigger: ".scrolly-wrapper", start: "20% 0%", end: "30% 0%", scrub: true
    }
  });

  // Phase 2 (30–50%)
  gsap.fromTo("#phase2", { opacity: 0, y: 30, scale: 0.95 }, {
    opacity: 1, y: 0, scale: 1.05,
    ease: "power2.out",
    scrollTrigger: {
      trigger: ".scrolly-wrapper", start: "30% 0%", end: "50% 0%", scrub: true
    }
  });
  gsap.to("#phase2", {
    opacity: 0, y: -30, scale: 1.1,
    ease: "power2.in",
    scrollTrigger: {
      trigger: ".scrolly-wrapper", start: "50% 0%", end: "60% 0%", scrub: true
    }
  });

  // Phase 3 (60–80%)
  gsap.fromTo("#phase3", { opacity: 0, y: 30, scale: 0.95 }, {
    opacity: 1, y: 0, scale: 1.05,
    ease: "power2.out",
    scrollTrigger: {
      trigger: ".scrolly-wrapper", start: "60% 0%", end: "80% 0%", scrub: true
    }
  });
  gsap.to("#phase3", {
    opacity: 0, y: -30, scale: 1.1,
    ease: "power2.in",
    scrollTrigger: {
      trigger: ".scrolly-wrapper", start: "80% 0%", end: "90% 0%", scrub: true
    }
  });
}
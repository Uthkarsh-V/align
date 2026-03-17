// --- 1. GET HTML ELEMENTS ---
const mainApp = document.getElementById('main-app');
const onboardingModal = document.getElementById('onboarding-modal');
const onboardingForm = document.getElementById('onboarding-form');
const videoElement = document.querySelector('.input_video');
const canvasElement = document.querySelector('.output_canvas');
const canvasCtx = canvasElement.getContext('2d');
const categorySelect = document.getElementById('category-select');
const exerciseSelect = document.getElementById('exercise-select');
const accuracyElement = document.getElementById('accuracy-score');
const stressElement = document.getElementById('stress-score'); // Displays Injury Risk
const feedbackPopup = document.getElementById('feedback-popup');
const feedbackText = document.getElementById('feedback-text');
const angleComparison = document.getElementById('angle-comparison');
const referenceCanvas = document.getElementById('reference-canvas');
const referenceCtx = referenceCanvas.getContext('2d');

// Session & Report Elements
const startSessionBtn = document.getElementById('start-session-btn');
const stopSessionBtn = document.getElementById('stop-session-btn');
const reportModal = document.getElementById('report-modal');
const closeReportBtn = document.getElementById('close-report-btn');
const reportQuote = document.getElementById('report-quote');
const reportChartEl = document.getElementById('report-chart').getContext('2d');
const reportTargetParts = document.getElementById('report-target-parts');
const reportSuggestions = document.getElementById('report-suggestions');
const reportGeneralSuggestion = document.getElementById('report-general-suggestion');
let reportChart;

// --- Voice Feedback State ---
let lastSpokenTime = 0;
let lastPositiveSpokenTime = 0;
let lastSpokenText = "";
const speakCooldown = 12000; // Increased from 5s to 12s
const positiveFeedbackCooldown = 25000; // Increased from 12s to 25s
const synth = window.speechSynthesis;
let voice;

window.speechSynthesis.onvoiceschanged = () => {
  const voices = synth.getVoices();
  voice = voices.find(v => v.lang.includes('en') && v.name.includes('Google'));
  if (!voice) voice = voices.find(v => v.lang.includes('en'));
};

function speak(text, isCorrection = false, force = false) {
  const now = Date.now();

  // High risk alerts should bypass normal cooldowns but still not spam instantly
  if (force) {
    if (now - lastSpokenTime < 5000) return; // 5s absolute minimum for high-risk spam
  } else if (isCorrection) {
    if (now - lastSpokenTime < speakCooldown || synth.speaking) return;
    if (text === lastSpokenText) return; // Don't repeat the exact same correction endlessly
  } else {
    if (now - lastPositiveSpokenTime < positiveFeedbackCooldown || synth.speaking) return;
  }

  if (isCorrection || force) lastSpokenTime = now;
  else lastPositiveSpokenTime = now;

  lastSpokenText = text;

  const utterance = new SpeechSynthesisUtterance(text);
  if (voice) utterance.voice = voice;
  utterance.rate = 1.05; // Slightly slower, more calming

  if (force) synth.cancel(); // Only cancel/interrupt if it's a high-risk alert

  synth.speak(utterance);
}

// --- 2. EXERCISE LIBRARY ---
const EXERCISE_LIBRARY = {
  yoga: {
    warrior_ii: {
      name: 'Warrior II',
      targetParts: 'Quads, Glutes, Shoulders, Core',
      angles: {
        left_knee: { target: 90, weight: 0.4 },
        right_knee: { target: 180, weight: 0.4 },
        left_elbow: { target: 180, weight: 0.1 },
        right_elbow: { target: 180, weight: 0.1 },
      },
      riskRanges: {
        left_knee: { caution: [75, 105], high: [0, 70, 110, 360] },
        right_knee: { caution: [160, 175], high: [0, 155] },
      },
      referencePose: [
        { x: 0.5, y: 0.15, v: 0 }, { x: 0.5, y: 0.1, v: 0 }, { x: 0.5, y: 0.1, v: 0 }, { x: 0.5, y: 0.1, v: 0 }, { x: 0.5, y: 0.1, v: 0 }, { x: 0.5, y: 0.1, v: 0 }, { x: 0.5, y: 0.1, v: 0 }, { x: 0.5, y: 0.15, v: 0 }, { x: 0.5, y: 0.15, v: 0 }, { x: 0.5, y: 0.15, v: 0 }, { x: 0.5, y: 0.15, v: 0 },
        { x: 0.75, y: 0.25, v: 1 }, { x: 0.25, y: 0.25, v: 1 },
        { x: 0.9, y: 0.25, v: 1 }, { x: 0.1, y: 0.25, v: 1 },
        { x: 1.0, y: 0.25, v: 1 }, { x: 0.0, y: 0.25, v: 1 },
        { x: 0.9, y: 0.2, v: 0 }, { x: 0.1, y: 0.2, v: 0 }, { x: 0.9, y: 0.2, v: 0 }, { x: 0.1, y: 0.2, v: 0 }, { x: 0.9, y: 0.2, v: 0 }, { x: 0.1, y: 0.2, v: 0 },
        { x: 0.7, y: 0.5, v: 1 }, { x: 0.3, y: 0.5, v: 1 },
        { x: 0.9, y: 0.65, v: 1 }, { x: 0.3, y: 0.75, v: 1 },
        { x: 1.0, y: 0.8, v: 1 }, { x: 0.3, y: 0.95, v: 1 },
        { x: 1.0, y: 0.85, v: 0 }, { x: 0.3, y: 1.0, v: 0 }, { x: 1.0, y: 0.8, v: 0 }, { x: 0.3, y: 0.95, v: 0 }
      ]
    },
    tree_pose: {
      name: 'Tree Pose',
      targetParts: 'Glutes, Core, Obliques, Thighs',
      angles: {
        left_knee: { target: 180, weight: 0.5 },
        right_knee: { target: 45, weight: 0.5 },
      },
      riskRanges: {
        left_knee: { caution: [160, 175], high: [0, 155] },
      },
      referencePose: [
        { x: 0.5, y: 0.1, v: 0 }, { x: 0.5, y: 0.05, v: 0 }, { x: 0.5, y: 0.05, v: 0 }, { x: 0.5, y: 0.05, v: 0 }, { x: 0.5, y: 0.05, v: 0 }, { x: 0.5, y: 0.05, v: 0 }, { x: 0.5, y: 0.05, v: 0 }, { x: 0.5, y: 0.1, v: 0 }, { x: 0.5, y: 0.1, v: 0 }, { x: 0.5, y: 0.1, v: 0 }, { x: 0.5, y: 0.1, v: 0 },
        { x: 0.6, y: 0.2, v: 1 }, { x: 0.4, y: 0.2, v: 1 },
        { x: 0.6, y: 0.15, v: 1 }, { x: 0.4, y: 0.15, v: 1 },
        { x: 0.5, y: 0.18, v: 1 }, { x: 0.5, y: 0.18, v: 1 },
        { x: 0.5, y: 0.18, v: 0 }, { x: 0.5, y: 0.18, v: 0 }, { x: 0.5, y: 0.18, v: 0 }, { x: 0.5, y: 0.18, v: 0 }, { x: 0.5, y: 0.18, v: 0 }, { x: 0.5, y: 0.18, v: 0 },
        { x: 0.6, y: 0.5, v: 1 }, { x: 0.4, y: 0.5, v: 1 },
        { x: 0.4, y: 0.75, v: 1 }, { x: 0.6, y: 0.55, v: 1 },
        { x: 0.4, y: 0.95, v: 1 }, { x: 0.6, y: 0.6, v: 1 },
        { x: 0.4, y: 1.0, v: 0 }, { x: 0.6, y: 0.65, v: 0 }, { x: 0.4, y: 1.0, v: 0 }, { x: 0.6, y: 0.65, v: 0 }
      ]
    },
  },
  cricket: {
    batting_stance: {
      name: 'Batting Stance',
      targetParts: 'Quads, Glutes, Core, Back',
      angles: {
        left_knee: { target: 135, weight: 0.3 },
        right_knee: { target: 145, weight: 0.3 },
        left_elbow: { target: 150, weight: 0.2 },
        right_elbow: { target: 90, weight: 0.2 },
      },
      riskRanges: {
        left_knee: { caution: [150, 180], high: [0, 110] },
        right_knee: { caution: [160, 180], high: [0, 120] },
      },
      referencePose: [
        { x: 0.5, y: 0.1, v: 0 }, { x: 0.5, y: 0.05, v: 0 }, { x: 0.5, y: 0.05, v: 0 }, { x: 0.5, y: 0.05, v: 0 }, { x: 0.5, y: 0.05, v: 0 }, { x: 0.5, y: 0.05, v: 0 }, { x: 0.5, y: 0.05, v: 0 }, { x: 0.5, y: 0.1, v: 0 }, { x: 0.5, y: 0.1, v: 0 }, { x: 0.5, y: 0.1, v: 0 }, { x: 0.5, y: 0.1, v: 0 },
        { x: 0.6, y: 0.25, v: 1 }, { x: 0.4, y: 0.25, v: 1 },
        { x: 0.65, y: 0.4, v: 1 }, { x: 0.45, y: 0.45, v: 1 },
        { x: 0.6, y: 0.55, v: 1 }, { x: 0.4, y: 0.6, v: 1 },
        { x: 0.6, y: 0.6, v: 0 }, { x: 0.4, y: 0.65, v: 0 }, { x: 0.6, y: 0.6, v: 0 }, { x: 0.4, y: 0.65, v: 0 }, { x: 0.6, y: 0.6, v: 0 }, { x: 0.4, y: 0.65, v: 0 },
        { x: 0.55, y: 0.55, v: 1 }, { x: 0.45, y: 0.55, v: 1 },
        { x: 0.6, y: 0.75, v: 1 }, { x: 0.4, y: 0.75, v: 1 },
        { x: 0.6, y: 0.95, v: 1 }, { x: 0.4, y: 0.95, v: 1 },
        { x: 0.65, y: 1.0, v: 0 }, { x: 0.35, y: 1.0, v: 0 }, { x: 0.6, y: 1.0, v: 0 }, { x: 0.4, y: 1.0, v: 0 }
      ]
    },
    bowling_stride: {
      name: 'Bowling - Delivery Stride',
      targetParts: 'Legs, Core, Shoulder',
      angles: {
        left_knee: { target: 160, weight: 0.4 },
        right_knee: { target: 140, weight: 0.2 },
        right_elbow: { target: 170, weight: 0.3 },
      },
      riskRanges: {
        left_knee: { caution: [130, 150], high: [0, 125] },
        right_elbow: { caution: [140, 160], high: [0, 130] },
      },
      referencePose: [
        { x: 0.5, y: 0.1, v: 0 }, { x: 0.5, y: 0.05, v: 0 }, { x: 0.5, y: 0.05, v: 0 }, { x: 0.5, y: 0.05, v: 0 }, { x: 0.5, y: 0.05, v: 0 }, { x: 0.5, y: 0.05, v: 0 }, { x: 0.5, y: 0.05, v: 0 }, { x: 0.5, y: 0.1, v: 0 }, { x: 0.5, y: 0.1, v: 0 }, { x: 0.5, y: 0.1, v: 0 }, { x: 0.5, y: 0.1, v: 0 },
        { x: 0.6, y: 0.25, v: 1 }, { x: 0.4, y: 0.25, v: 1 },
        { x: 0.8, y: 0.2, v: 1 }, { x: 0.3, y: 0.4, v: 1 },
        { x: 0.95, y: 0.15, v: 1 }, { x: 0.2, y: 0.5, v: 1 },
        { x: 0.9, y: 0.1, v: 0 }, { x: 0.2, y: 0.55, v: 0 }, { x: 0.9, y: 0.1, v: 0 }, { x: 0.2, y: 0.55, v: 0 }, { x: 0.9, y: 0.1, v: 0 }, { x: 0.2, y: 0.55, v: 0 },
        { x: 0.55, y: 0.5, v: 1 }, { x: 0.45, y: 0.5, v: 1 },
        { x: 0.2, y: 0.7, v: 1 }, { x: 0.7, y: 0.65, v: 1 },
        { x: 0.1, y: 0.9, v: 1 }, { x: 0.8, y: 0.8, v: 1 },
        { x: 0.05, y: 0.95, v: 0 }, { x: 0.85, y: 0.85, v: 0 }, { x: 0.05, y: 0.9, v: 0 }, { x: 0.85, y: 0.8, v: 0 }
      ]
    }
  },
  fitness: {
    squat: {
      name: 'Squat',
      targetParts: 'Quads, Glutes, Hamstrings',
      angles: {
        left_knee: { target: 75, weight: 0.4 },
        right_knee: { target: 75, weight: 0.4 },
      },
      riskRanges: {
        left_knee: { caution: [95, 110], high: [0, 60] },
        right_knee: { caution: [95, 110], high: [0, 60] },
      },
      referencePose: [
        { x: 0.5, y: 0.15, v: 0 }, { x: 0.5, y: 0.1, v: 0 }, { x: 0.5, y: 0.1, v: 0 }, { x: 0.5, y: 0.1, v: 0 }, { x: 0.5, y: 0.1, v: 0 }, { x: 0.5, y: 0.1, v: 0 }, { x: 0.5, y: 0.1, v: 0 }, { x: 0.5, y: 0.15, v: 0 }, { x: 0.5, y: 0.15, v: 0 }, { x: 0.5, y: 0.15, v: 0 }, { x: 0.5, y: 0.15, v: 0 },
        { x: 0.7, y: 0.35, v: 1 }, { x: 0.3, y: 0.35, v: 1 },
        { x: 0.75, y: 0.5, v: 1 }, { x: 0.25, y: 0.5, v: 1 },
        { x: 0.8, y: 0.55, v: 1 }, { x: 0.2, y: 0.55, v: 1 },
        { x: 0.8, y: 0.6, v: 0 }, { x: 0.2, y: 0.6, v: 0 }, { x: 0.8, y: 0.6, v: 0 }, { x: 0.2, y: 0.6, v: 0 }, { x: 0.8, y: 0.6, v: 0 }, { x: 0.2, y: 0.6, v: 0 },
        { x: 0.65, y: 0.65, v: 1 }, { x: 0.35, y: 0.65, v: 1 },
        { x: 0.8, y: 0.65, v: 1 }, { x: 0.2, y: 0.65, v: 1 },
        { x: 0.7, y: 0.9, v: 1 }, { x: 0.3, y: 0.9, v: 1 },
        { x: 0.75, y: 0.95, v: 0 }, { x: 0.25, y: 0.95, v: 0 }, { x: 0.7, y: 0.95, v: 0 }, { x: 0.3, y: 0.95, v: 0 }
      ]
    },
    bicep_curl: {
      name: 'Bicep Curl',
      targetParts: 'Biceps, Forearms',
      angles: {
        left_elbow: { target: 30, weight: 0.5 },
        right_elbow: { target: 30, weight: 0.5 },
      },
      riskRanges: {
        left_elbow: { caution: [90, 120], high: [160, 180] },
      },
      referencePose: [
        { x: 0.5, y: 0.1, v: 0 }, { x: 0.5, y: 0.05, v: 0 }, { x: 0.5, y: 0.05, v: 0 }, { x: 0.5, y: 0.05, v: 0 }, { x: 0.5, y: 0.05, v: 0 }, { x: 0.5, y: 0.05, v: 0 }, { x: 0.5, y: 0.05, v: 0 }, { x: 0.5, y: 0.1, v: 0 }, { x: 0.5, y: 0.1, v: 0 }, { x: 0.5, y: 0.1, v: 0 }, { x: 0.5, y: 0.1, v: 0 },
        { x: 0.65, y: 0.2, v: 1 }, { x: 0.35, y: 0.2, v: 1 },
        { x: 0.65, y: 0.45, v: 1 }, { x: 0.35, y: 0.45, v: 1 },
        { x: 0.65, y: 0.25, v: 1 }, { x: 0.35, y: 0.25, v: 1 },
        { x: 0.65, y: 0.2, v: 0 }, { x: 0.35, y: 0.2, v: 0 }, { x: 0.65, y: 0.2, v: 0 }, { x: 0.35, y: 0.2, v: 0 }, { x: 0.65, y: 0.2, v: 0 }, { x: 0.35, y: 0.2, v: 0 },
        { x: 0.6, y: 0.5, v: 1 }, { x: 0.4, y: 0.5, v: 1 },
        { x: 0.6, y: 0.75, v: 1 }, { x: 0.4, y: 0.75, v: 1 },
        { x: 0.6, y: 0.95, v: 1 }, { x: 0.4, y: 0.95, v: 1 },
        { x: 0.65, y: 1.0, v: 0 }, { x: 0.35, y: 1.0, v: 0 }, { x: 0.6, y: 1.0, v: 0 }, { x: 0.4, y: 1.0, v: 0 }
      ]
    }
  }
};

// --- 3. APPLICATION STATE ---
let userData = {};
let currentCategory = "";
let currentExerciseKey = "";
let isSessionRunning = false;
let sessionReports = [];
let bestSessionAccuracy = 0;
let sessionStartTime = 0;
let sessionTimerInterval;
let sessionDurationSeconds = 0;
let caloriesBurned = 0;
let actionCount = 0;
let isCurrentlyPerfect = false;
let isUserActive = false;
let bestPoseDataUrl = "";
const MET_VALUES = { yoga: 3.0, cricket: 4.5, fitness: 5.0 };

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const POSITIVE_FEEDBACK = [
  "Great form!", "Perfect alignment!", "Awesome job!",
  "You've got this!", "Excellent focus!", "Keep that intensity!"
];
const MOTIVATIONAL_QUOTES = [
  "Well done! Every session builds strength and skill.",
  "Fantastic effort! Remember, consistency is your greatest ally.",
  "You crushed it! Take pride in your progress.",
  "Excellent work! Rest, recover, and come back stronger.",
  "Keep pushing your limits safely! Great job today."
];

// --- 3.5 VOICE COMMAND ENGINE ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
let isListening = false;

function initVoiceCommands() {
  if (!SpeechRecognition) {
    console.warn("Speech Recognition not supported in this browser.");
    document.getElementById('voice-status').innerText = "Voice commands unsupported.";
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  const voiceAliases = {
    'warrior': { cat: 'yoga', ex: 'warrior_ii' },
    'tree pose': { cat: 'yoga', ex: 'tree_pose' },
    'tree': { cat: 'yoga', ex: 'tree_pose' },
    'batting': { cat: 'cricket', ex: 'batting_stance' },
    'bowling': { cat: 'cricket', ex: 'bowling_stride' },
    'squat': { cat: 'fitness', ex: 'squat' },
    'curl': { cat: 'fitness', ex: 'bicep_curl' },
    'bicep': { cat: 'fitness', ex: 'bicep_curl' },
    'yoga': { cat: 'yoga', ex: 'warrior_ii' },
    'cricket': { cat: 'cricket', ex: 'batting_stance' },
    'fitness': { cat: 'fitness', ex: 'squat' }
  };

  recognition.onresult = (event) => {
    const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
    console.log("🗣️ Voice Command:", transcript);

    const isCloseCmd = ['close report', 'close', 'dismiss'].some(cmd => transcript.includes(cmd));
    if (isCloseCmd && reportModal.style.display === 'flex') {
      closeReportBtn.click();
      return;
    }

    // Stop and report commands
    const isReportCmd = ['report', 'stop', 'end', 'finish', 'done'].some(cmd => transcript.includes(cmd));
    if (isReportCmd) {
      if (!stopSessionBtn.disabled) {
        stopSessionBtn.click();
      } else {
        if (sessionReports.length === 0) {
          speak("You must finish a session first before I can analyze a report.");
        } else {
          generateReport();
        }
      }
      return;
    }

    // Start commands
    const isStartCmd = ['start', 'begin', 'go'].some(cmd => transcript.includes(cmd));
    if (isStartCmd) {
      if (!startSessionBtn.disabled) {
        startSessionBtn.click();
      } else if (isSessionRunning) {
        speak("A session is already running.");
      }
      return;
    }

    // Dynamic Exercise & Category Switching (works instantly without "change" verb)
    for (const [alias, data] of Object.entries(voiceAliases)) {
      if (transcript.includes(alias)) {
        if (categorySelect.value !== data.cat || exerciseSelect.value !== data.ex) {
          categorySelect.value = data.cat;
          categorySelect.dispatchEvent(new Event('change'));
          exerciseSelect.value = data.ex;
          exerciseSelect.dispatchEvent(new Event('change'));
          // Feedback happens automatically inside the select event listener
        } else {
          speak(`You are already doing ${EXERCISE_LIBRARY[data.cat][data.ex].name}.`);
        }
        return;
      }
    }
  };

  recognition.onend = () => {
    if (isListening) {
      try { recognition.start(); } catch (e) { }
    }
  };

  recognition.onerror = (e) => {
    if (e.error === 'no-speech') return; // Completely normal, ignore
    console.warn("Speech Recognition Error:", e.error);
    if (e.error === 'not-allowed') {
      document.getElementById('voice-status').innerText = "Mic access blocked.";
      isListening = false;
    }
  };
}

// --- 4. ONBOARDING & PERSONALIZATION ---
onboardingForm.addEventListener('submit', (e) => {
  e.preventDefault();
  userData = {
    name: document.getElementById('user-name').value || "User",
    age: document.getElementById('age').value,
    height: document.getElementById('height').value,
    weight: document.getElementById('weight').value,
    referred: document.getElementById('referred').value,
    reason: document.getElementById('reason').value,
    history: document.getElementById('history').value.toLowerCase(),
  };
  onboardingModal.style.display = 'none';
  mainApp.style.display = 'block';

  // Real-time time-of-day greeting
  const hour = new Date().getHours();
  let greeting = "Good evening";
  if (hour < 12) greeting = "Good morning";
  else if (hour < 18) greeting = "Good afternoon";

  speak(`${greeting} ${userData.name}, welcome to ALIGN! Please select a category and an exercise, then click the Start Session button to begin your workout.`);

  // Kickoff hands-free voice engine
  initVoiceCommands();
  if (recognition) {
    isListening = true;
    try { recognition.start(); } catch (e) { console.error(e); }
  }
});

function getPersonalizedTolerance(jointName) {
  const baseTolerance = 15;
  if (userData.history && userData.history.includes(jointName)) {
    return baseTolerance * 1.5;
  }
  return baseTolerance;
}

// --- 5. DYNAMIC UI & SESSION CONTROLS ---
categorySelect.addEventListener('change', () => {
  currentCategory = categorySelect.value;
  exerciseSelect.innerHTML = '<option value="">-- Select Exercise --</option>';
  if (!currentCategory) return;
  const exercises = EXERCISE_LIBRARY[currentCategory];
  for (const key in exercises) {
    const option = document.createElement('option');
    option.value = key;
    option.innerText = exercises[key].name;
    exerciseSelect.appendChild(option);
  }
});

exerciseSelect.addEventListener('change', () => {
  currentExerciseKey = exerciseSelect.value;
  if (!currentExerciseKey) {
    referenceCtx.clearRect(0, 0, referenceCanvas.width, referenceCanvas.height);
    angleComparison.innerHTML = '<p>Select an exercise.</p>';
    return;
  }
  bestSessionAccuracy = 0;
  updateAngleReport(null);

  drawReferencePose(currentExerciseKey);

  speak(`You selected ${EXERCISE_LIBRARY[currentCategory][currentExerciseKey].name}. Please step back so your full body is visible, and click Start Session when you are ready.`);
});

startSessionBtn.addEventListener('click', () => {
  if (!currentExerciseKey) {
    alert("Please select an exercise!");
    return;
  }
  isSessionRunning = true;
  sessionReports = [];
  bestSessionAccuracy = 0;

  // Custom Analytics Init
  bestPoseDataUrl = "";
  sessionDurationSeconds = 0;
  caloriesBurned = 0;
  actionCount = 0;
  isCurrentlyPerfect = false;
  document.getElementById('live-time').innerText = "00:00";
  document.getElementById('live-calories').innerText = "0.0";
  document.getElementById('live-actions').innerText = "0";
  if (document.getElementById('report-best-image')) document.getElementById('report-best-image').style.display = 'none';
  isUserActive = false;

  sessionTimerInterval = setInterval(() => {
    // Only increment stats if the user is actively attempting the pose (>50% accuracy)
    if (isUserActive) {
      sessionDurationSeconds++;
      let met = MET_VALUES[currentCategory] || 4.0;
      let weight = parseFloat(userData.weight) || 70;
      caloriesBurned = met * weight * (sessionDurationSeconds / 3600);
      document.getElementById('live-time').innerText = formatTime(sessionDurationSeconds);
      document.getElementById('live-calories').innerText = caloriesBurned.toFixed(1);
    }
  }, 1000);

  startSessionBtn.disabled = true;
  stopSessionBtn.disabled = false;
  categorySelect.disabled = true;
  exerciseSelect.disabled = true;
  feedbackPopup.className = 'feedback-correct';
  feedbackText.innerText = 'Session Started! Focus on your form.';
  speak(`Starting session for ${EXERCISE_LIBRARY[currentCategory][currentExerciseKey].name}. Let's go, ${userData.name}!`);
});

stopSessionBtn.addEventListener('click', () => {
  clearInterval(sessionTimerInterval);
  isSessionRunning = false;
  startSessionBtn.disabled = false;
  stopSessionBtn.disabled = true;
  categorySelect.disabled = false;
  exerciseSelect.disabled = false;
  feedbackPopup.className = 'feedback-hidden';
  speak("Session ended. Generating your report.");
  generateReport();
});

closeReportBtn.addEventListener('click', () => {
  reportModal.style.display = 'none';
  if (reportChart) reportChart.destroy();
});

// --- Function to draw the reference skeleton ---
function drawReferencePose(poseKey) {
  if (!poseKey || !currentCategory) {
    referenceCtx.clearRect(0, 0, referenceCanvas.width, referenceCanvas.height);
    return;
  }
  const poseData = EXERCISE_LIBRARY[currentCategory]?.[poseKey];
  if (!poseData || !poseData.referencePose) {
    console.warn("No reference pose data for:", poseKey);
    referenceCtx.clearRect(0, 0, referenceCanvas.width, referenceCanvas.height);
    referenceCtx.fillText("No reference available", 10, 50);
    return;
  }
  const w = referenceCanvas.width, h = referenceCanvas.height;
  referenceCtx.clearRect(0, 0, w, h);

  const drawSkel = () => {
    try {
      const scaledLandmarks = poseData.referencePose.map(lm => ({
        x: lm.x, y: lm.y, visibility: lm.v !== undefined ? (lm.v >= 0 ? 1.0 : 0) : 1.0
      }));
      if (typeof drawConnectors === 'function' && typeof drawLandmarks === 'function') {
        // Draw skeleton clearly
        drawConnectors(referenceCtx, scaledLandmarks, POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 3 });
        drawLandmarks(referenceCtx, scaledLandmarks, { color: '#FF0000', radius: 3, visibilityMin: 0.5 });
      }
    } catch (e) { console.error("Could not draw reference skeleton:", e); }
  };

  if (poseData.image) {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      referenceCtx.clearRect(0, 0, w, h);
      const imgAspect = img.width / img.height;
      const canvasAspect = w / h;
      let drawW = w, drawH = h, offX = 0, offY = 0;
      if (imgAspect > canvasAspect) {
        drawW = h * imgAspect;
        offX = (w - drawW) / 2;
      } else {
        drawH = w / imgAspect;
        offY = (h - drawH) / 2;
      }
      referenceCtx.globalAlpha = 0.6;
      referenceCtx.drawImage(img, offX, offY, drawW, drawH);
      referenceCtx.globalAlpha = 1.0;
      drawSkel();
    };
    // Failsafe in case image URL is blocked
    img.onerror = () => { drawSkel(); };
    img.src = poseData.image;
  } else {
    drawSkel();
  }
}

// --- 6. CORE SCORING & FEEDBACK ---
function getHumanFeedback(key, delta) {
  const jointName = key.replace('_', ' ');

  if (key.includes('knee')) {
    if (delta < -15) return `Try straightening your ${jointName} slightly. Repeating this deep bend places severe shearing force on your patellar tendon, leading to chronic Runner's Knee in the future.`;
    if (delta > 15) return `Bend your ${jointName} more and avoid locking it. Locking your joint repeatedly transfers shock directly to your bone, rapidly increasing your risk of cartilage degradation and early osteoarthritis.`;
  }
  if (key.includes('elbow')) {
    if (delta < -15) return `Straighten your ${jointName} a bit more. Bending it too sharply under tension chronically strains your ligaments, risking severe Tennis or Golfer's Elbow over time.`;
    if (delta > 15) return `Do not lock your ${jointName} out completely. Shifting the load away from the active muscle to connective tissues heavily invites joint inflammation and severe ligament sprains.`;
  }

  const directionStr = delta > 0 ? "too far extended" : "too deeply bent";
  return `Adjust your ${jointName} as it is ${directionStr}. Failing to correct this alignment alters your whole kinetic chain, inevitably causing muscular imbalances and future overcompensation injuries.`;
}

function calculateAngle(a, b, c) {
  if (!a || !b || !c || a.visibility < 0.3 || b.visibility < 0.3 || c.visibility < 0.3) {
    return null;
  }
  const ba = { x: a.x - b.x, y: a.y - b.y };
  const bc = { x: c.x - b.x, y: c.y - b.y };
  const dotProduct = ba.x * bc.x + ba.y * bc.y;
  const magBA = Math.sqrt(ba.x * ba.x + ba.y * ba.y);
  const magBC = Math.sqrt(bc.x * bc.x + bc.y * bc.y);
  if (magBA === 0 || magBC === 0) return null;
  let cosTheta = dotProduct / (magBA * magBC);
  cosTheta = Math.max(-1, Math.min(1, cosTheta));
  return Math.acos(cosTheta) * (180 / Math.PI);
}

function calculateUserAngles(landmarks) {
  if (!landmarks) return null;
  if (landmarks.length <= 28) return null;
  try {
    return {
      left_knee: calculateAngle(landmarks[23], landmarks[25], landmarks[27]),
      right_knee: calculateAngle(landmarks[24], landmarks[26], landmarks[28]),
      left_elbow: calculateAngle(landmarks[11], landmarks[13], landmarks[15]),
      right_elbow: calculateAngle(landmarks[12], landmarks[14], landmarks[16]),
    };
  } catch (error) { console.error("Error in calculateUserAngles:", error); return null; }
}

function calculateErgonomicRisk(jointKey, userAngle, riskRanges) {
  if (userAngle === null || !riskRanges || !riskRanges[jointKey]) return 0;
  const ranges = riskRanges[jointKey];
  if (ranges.high) {
    for (let i = 0; i < ranges.high.length; i += 2) {
      if (userAngle >= ranges.high[i] && userAngle <= ranges.high[i + 1]) return 2;
    }
  }
  if (ranges.caution) {
    for (let i = 0; i < ranges.caution.length; i += 2) {
      if (userAngle >= ranges.caution[i] && userAngle <= ranges.caution[i + 1]) return 1;
    }
  }
  return 0;
}

function comparePose(userAngles, targetPose, riskRangesConfig) {
  let results = {
    overallAccuracy: 0, ergonomicRiskLevel: 0, errors: [], jointReports: [], speakableError: null
  };
  if (!userAngles) return results;
  let totalScore = 0, totalWeight = 0, weightedRiskSum = 0;

  for (const [key, value] of Object.entries(targetPose.angles)) {
    const userAngle = userAngles[key];
    const targetAngle = value.target;
    const weight = value.weight;
    const jointRisk = calculateErgonomicRisk(key, userAngle, riskRangesConfig);
    weightedRiskSum += jointRisk * weight;

    if (userAngle === null) {
      results.jointReports.push({ key: key, target: targetAngle, user: null, delta: 0, isCorrect: false, risk: 0 });
      const errorMsg = `${key.replace('_', ' ')} not visible`;
      results.errors.push(errorMsg);
      if (!results.speakableError) results.speakableError = "Please ensure your full body is visible in the frame.";
      continue;
    }

    const tolerance = getPersonalizedTolerance(key.replace('_', ' '));
    const diff = Math.abs(userAngle - targetAngle);
    const delta = userAngle - targetAngle;
    const isCorrect = (diff <= tolerance);
    // Normalize performance scoring against a fixed 90 degree margin for consistency
    let angleScore = Math.max(0, 100 - (diff / 90) * 100);
    totalScore += angleScore * weight;
    totalWeight += weight;

    if (!isCorrect && !results.speakableError) {
      results.speakableError = getHumanFeedback(key, delta);
      results.errors.push(`Fix your ${key.replace('_', ' ')}`);
    }
    results.jointReports.push({ key: key, target: targetAngle, user: userAngle, delta: delta, isCorrect: isCorrect, risk: jointRisk });
  }

  results.overallAccuracy = (totalWeight > 0) ? (totalScore / totalWeight) : 0;
  const averageRisk = (totalWeight > 0) ? (weightedRiskSum / totalWeight) : 0;
  if (averageRisk >= 1.5) results.ergonomicRiskLevel = 2;
  else if (averageRisk >= 0.5) results.ergonomicRiskLevel = 1;
  else results.ergonomicRiskLevel = 0;

  if (results.ergonomicRiskLevel === 2 && !results.speakableError) results.speakableError = "High injury risk detected. Adjust your form immediately.";
  else if (results.ergonomicRiskLevel === 1 && !results.speakableError) results.speakableError = "Moderate injury risk detected. Focus on improving form.";

  return results;
}

// --- 7. UI UPDATE FUNCTIONS ---
function updateUI(report) {
  accuracyElement.innerText = `${report.overallAccuracy.toFixed(0)}%`;
  let riskText = "Low";
  let riskColorClass = "feedback-correct";
  if (report.ergonomicRiskLevel === 1) {
    riskText = "Medium";
    riskColorClass = "feedback-caution";
  }
  if (report.ergonomicRiskLevel === 2) {
    riskText = "High";
    riskColorClass = "feedback-wrong";
  }
  stressElement.innerText = riskText;

  feedbackPopup.classList.remove('feedback-hidden');

  if (report.ergonomicRiskLevel === 2) {
    const errorMsg = `HIGH RISK! ${report.errors[0] || 'Adjust form!'}`;
    feedbackText.innerText = errorMsg;
    feedbackPopup.className = 'feedback-wrong';
    speak(`${userData.name}, ${report.speakableError || "High risk detected!"}`, true, true);
  } else if (report.errors.length > 0) {
    const errorMsg = `Correct: ${report.errors[0] || ''}`;
    feedbackText.innerText = errorMsg;
    feedbackPopup.className = 'feedback-caution';
    speak(`${userData.name}, ${report.speakableError}`, true, false);
  } else {
    feedbackText.innerText = `Great Form! 🔥`;
    feedbackPopup.className = 'feedback-correct';
    const positiveMsg = POSITIVE_FEEDBACK[Math.floor(Math.random() * POSITIVE_FEEDBACK.length)];
    speak(`${positiveMsg}, ${userData.name}!`, false, false);
  }
  updateAngleReport(report.jointReports);
}

function updateAngleReport(jointReports) {
  if (!jointReports) {
    angleComparison.innerHTML = '<p>Select an exercise.</p>';
    return;
  }
  let reportHTML = "";
  jointReports.forEach(joint => {
    let feedback = "";
    let riskIndicator = "";
    let riskClass = "";
    if (joint.risk === 1) { riskIndicator = " (Caution)"; riskClass = "angle-caution"; }
    if (joint.risk === 2) { riskIndicator = " (High Risk)"; riskClass = "angle-incorrect"; }

    if (joint.user === null) feedback = `<b class="angle-incorrect">User(N/A) - Not visible</b>`;
    else if (joint.isCorrect) feedback = `<b class="angle-correct ${riskClass}">User(${joint.user.toFixed(0)}°) - Perfect!${riskIndicator}</b>`;
    else {
      const direction = joint.delta > 0 ? "too high" : "too low";
      feedback = `<b class="angle-incorrect ${riskClass}">User(${joint.user.toFixed(0)}°) - ${Math.abs(joint.delta).toFixed(0)}° ${direction}${riskIndicator}</b>`;
    }
    reportHTML += `<div class="angle-item">${joint.key.replace('_', ' ')}: <span>Target(${joint.target.toFixed(0)}°)</span> ${feedback}</div>`;
  });
  angleComparison.innerHTML = reportHTML;
}

// --- 8. FINAL REPORT GENERATION ---
function generateReport() {
  if (sessionReports.length === 0) {
    speak("Session was too short, no report generated.");
    return;
  }

  // Populate custom stats elements
  document.getElementById('report-duration').innerText = formatTime(sessionDurationSeconds);
  document.getElementById('report-calories').innerText = caloriesBurned.toFixed(1);
  document.getElementById('report-actions').innerText = actionCount;

  if (bestPoseDataUrl) {
    document.getElementById('report-best-image').src = bestPoseDataUrl;
    document.getElementById('report-best-image').style.display = 'block';
  } else {
    document.getElementById('report-best-image').style.display = 'none';
  }

  const quote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
  reportQuote.innerText = `"${quote}" - Great session, ${userData.name}!`;

  const exercise = EXERCISE_LIBRARY[currentCategory][currentExerciseKey];
  reportTargetParts.innerText = exercise.targetParts;

  const labels = sessionReports.map((_, i) => i + 1);
  const accuracyData = sessionReports.map(r => r.overallAccuracy);

  if (reportChart) reportChart.destroy();
  reportChart = new Chart(reportChartEl, {
    type: 'line', data: { labels: labels, datasets: [{ label: 'Accuracy %', data: accuracyData, borderColor: '#007bff', backgroundColor: 'rgba(0, 123, 255, 0.1)', fill: true, tension: 0.1 }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 100 } } }
  });

  const avgDeltas = {}, jointCounts = {}, avgRisk = {};
  let totalOverallAccuracy = 0;
  sessionReports.forEach(report => {
    totalOverallAccuracy += report.overallAccuracy;
    report.jointReports.forEach(joint => {
      if (joint.user !== null) {
        if (!avgDeltas[joint.key]) { avgDeltas[joint.key] = 0; jointCounts[joint.key] = 0; avgRisk[joint.key] = 0; }
        avgDeltas[joint.key] += joint.delta;
        avgRisk[joint.key] += joint.risk;
        jointCounts[joint.key]++;
      }
    });
  });

  reportSuggestions.innerHTML = "";
  let hasSuggestions = false;
  let highestRiskJoint = null;
  let maxAvgRisk = 0;
  for (const key in avgDeltas) {
    const avgDelta = avgDeltas[key] / jointCounts[key];
    const averageJointRisk = avgRisk[key] / jointCounts[key];
    const tolerance = getPersonalizedTolerance(key.replace('_', ' '));
    if (averageJointRisk > maxAvgRisk) { maxAvgRisk = averageJointRisk; highestRiskJoint = key; }
    if (Math.abs(avgDelta) > tolerance || averageJointRisk >= 1) {
      hasSuggestions = true;
      const direction = avgDelta > 0 ? "too high" : "too low";
      const li = document.createElement('li');
      let suggestionText = `Your <strong>${key.replace('_', ' ')}</strong> was often <strong>${Math.abs(avgDelta).toFixed(1)}° ${direction}</strong>. Focus on correcting this.`;
      if (averageJointRisk >= 1.5) suggestionText += ` <strong style="color: red;">(High Injury Risk Area!)</strong>`;
      else if (averageJointRisk >= 0.5) suggestionText += ` <strong style="color: orange;">(Moderate Risk Area)</strong>`;
      li.innerHTML = suggestionText;
      reportSuggestions.appendChild(li);
    }
  }
  if (!hasSuggestions) reportSuggestions.innerHTML = "<li>Your form was excellent! No major corrections needed.</li>";

  const finalAvgAccuracy = totalOverallAccuracy / sessionReports.length;
  document.getElementById('report-total-accuracy').innerText = finalAvgAccuracy.toFixed(0);

  let generalSuggestionText = "";
  if (finalAvgAccuracy > 90) generalSuggestionText = `Fantastic consistency, ${userData.name}! Expert level form.`;
  else if (finalAvgAccuracy > 75) generalSuggestionText = `Great work! Focus on those minor suggestions to hit 90%.`;
  else generalSuggestionText = `Good start, ${userData.name}! Focus on the suggestions above.`;
  if (highestRiskJoint && maxAvgRisk >= 1) generalSuggestionText += ` Pay special attention to your ${highestRiskJoint.replace('_', ' ')} to reduce injury risk.`;
  reportGeneralSuggestion.innerText = generalSuggestionText;

  reportModal.style.display = 'flex';
  speak(`${userData.name}, your session report is ready.`, false, true);
}

// --- 9. INITIALIZE MEDIAPIPE ---
let pose;
let camera;

function initializeMediaPipe() {
  pose = new Pose({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
  });
  pose.setOptions({
    modelComplexity: 1, smoothLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5
  });
  pose.onResults(onResults);

  camera = new Camera(videoElement, {
    onFrame: async () => {
      if (pose) {
        try {
          await pose.send({ image: videoElement });
        } catch (error) {
          console.error("Error sending frame to MediaPipe:", error);
        }
      }
    },
    width: 640, height: 480
  });
  camera.start()
    .then(() => console.log("Camera started successfully."))
    .catch(err => console.error("Error starting camera:", err));
}

// --- 10. ONRESULTS (The Main Loop) ---
function onResults(results) {
  if (!canvasCtx || !results || !results.poseLandmarks) {
    return;
  }

  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

  if (typeof drawConnectors === 'function' && typeof drawLandmarks === 'function') {
    drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 4 });
    drawLandmarks(canvasCtx, results.poseLandmarks, { color: '#FF0000', radius: 2 });
  }

  if (currentCategory && currentExerciseKey) {
    const userAngles = calculateUserAngles(results.poseLandmarks);
    const targetPose = EXERCISE_LIBRARY[currentCategory][currentExerciseKey];
    const riskRangesConfig = targetPose.riskRanges;
    const report = comparePose(userAngles, targetPose, riskRangesConfig);

    // Live on-canvas error highlighting
    report.jointReports.forEach(joint => {
      if (!joint.isCorrect && joint.user !== null) {
        let landmarkIdx = -1;
        if (joint.key === 'left_knee') landmarkIdx = 25;
        if (joint.key === 'right_knee') landmarkIdx = 26;
        if (joint.key === 'left_elbow') landmarkIdx = 13;
        if (joint.key === 'right_elbow') landmarkIdx = 14;

        if (landmarkIdx !== -1) {
          const lm = results.poseLandmarks[landmarkIdx];
          const x = lm.x * canvasElement.width;
          const y = lm.y * canvasElement.height;

          // Red highlight circle
          canvasCtx.beginPath();
          canvasCtx.arc(x, y, 12, 0, 2 * Math.PI);
          canvasCtx.fillStyle = 'rgba(255, 0, 0, 0.7)';
          canvasCtx.fill();
          canvasCtx.lineWidth = 3;
          canvasCtx.strokeStyle = 'white';
          canvasCtx.stroke();

          // Natural language alert (shortened for space)
          const feedbackText = getHumanFeedback(joint.key, joint.delta).split('.')[0];

          canvasCtx.font = "bold 16px Arial";
          const textWidth = canvasCtx.measureText(feedbackText).width;

          // Text background for readability
          canvasCtx.fillStyle = "rgba(0, 0, 0, 0.7)";
          canvasCtx.fillRect(x + 15, y - 18, textWidth + 10, 24);

          canvasCtx.fillStyle = "yellow";
          canvasCtx.fillText(feedbackText, x + 20, y);
        }
      }
    });

    if (isSessionRunning) {
      // Pause clock and calories if user breaks form entirely or isn't trying
      isUserActive = (report.overallAccuracy >= 50);

      updateUI(report);

      if (isUserActive) {
        sessionReports.push(report);
      }

      // Action (Rep) counting
      if (report.overallAccuracy >= 80) {
        if (!isCurrentlyPerfect) {
          isCurrentlyPerfect = true;
          actionCount++;
          document.getElementById('live-actions').innerText = actionCount;
        }
      } else {
        isCurrentlyPerfect = false;
      }

      // Snapshot correct posture
      if (report.overallAccuracy > bestSessionAccuracy && report.overallAccuracy >= 80) {
        bestSessionAccuracy = report.overallAccuracy;

        // Save to bestPoseDataUrl and localStorage
        const snapCanvas = document.createElement('canvas');
        snapCanvas.width = canvasElement.width;
        snapCanvas.height = canvasElement.height;
        const sCtx = snapCanvas.getContext('2d');
        sCtx.drawImage(results.image, 0, 0, snapCanvas.width, snapCanvas.height);
        if (typeof drawConnectors === 'function') {
          drawConnectors(sCtx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 4 });
          drawLandmarks(sCtx, results.poseLandmarks, { color: '#FF0000', radius: 2 });
        }
        bestPoseDataUrl = snapCanvas.toDataURL('image/jpeg', 0.8);
      }
    } else {
      updateAngleReport(report.jointReports);
    }
  }
  canvasCtx.restore();
}

// --- Initialize the app after the DOM is loaded ---
document.addEventListener('DOMContentLoaded', () => {
  if (typeof Pose === 'undefined' || typeof Camera === 'undefined' || typeof drawConnectors === 'undefined') {
    console.error("MediaPipe libraries not fully loaded yet.");
  } else {
    initializeMediaPipe();
  }
});

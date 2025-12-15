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
const speakCooldown = 5000;
const positiveFeedbackCooldown = 12000;
const synth = window.speechSynthesis;
let voice;

window.speechSynthesis.onvoiceschanged = () => {
  const voices = synth.getVoices();
  voice = voices.find(v => v.lang.includes('en') && v.name.includes('Google'));
  if (!voice) voice = voices.find(v => v.lang.includes('en'));
};

function speak(text, isCorrection = false) {
  const now = Date.now();
  if (isCorrection) {
    if (now - lastSpokenTime < speakCooldown || synth.speaking) return;
    lastSpokenTime = now;
  } else {
    if (now - lastPositiveSpokenTime < positiveFeedbackCooldown || synth.speaking) return;
    lastPositiveSpokenTime = now;
  }
  const utterance = new SpeechSynthesisUtterance(text);
  if (voice) utterance.voice = voice;
  utterance.rate = 1.1;
  synth.cancel(); // Cancel previous speech to prioritize new feedback
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
        {x: 0.5, y: 0.15, v: 0}, {x: 0.5, y: 0.1, v: 0}, {x: 0.5, y: 0.1, v: 0}, {x: 0.5, y: 0.1, v: 0}, {x: 0.5, y: 0.1, v: 0}, {x: 0.5, y: 0.1, v: 0}, {x: 0.5, y: 0.1, v: 0}, {x: 0.5, y: 0.15, v: 0}, {x: 0.5, y: 0.15, v: 0}, {x: 0.5, y: 0.15, v: 0}, {x: 0.5, y: 0.15, v: 0},
        {x: 0.75, y: 0.25, v: 1}, {x: 0.25, y: 0.25, v: 1},
        {x: 0.9, y: 0.25, v: 1}, {x: 0.1, y: 0.25, v: 1},
        {x: 1.0, y: 0.25, v: 1}, {x: 0.0, y: 0.25, v: 1},
        {x: 0.9, y: 0.2, v: 0}, {x: 0.1, y: 0.2, v: 0}, {x: 0.9, y: 0.2, v: 0}, {x: 0.1, y: 0.2, v: 0}, {x: 0.9, y: 0.2, v: 0}, {x: 0.1, y: 0.2, v: 0},
        {x: 0.7, y: 0.5, v: 1}, {x: 0.3, y: 0.5, v: 1},
        {x: 0.9, y: 0.65, v: 1}, {x: 0.3, y: 0.75, v: 1},
        {x: 1.0, y: 0.8, v: 1}, {x: 0.3, y: 0.95, v: 1},
        {x: 1.0, y: 0.85, v: 0}, {x: 0.3, y: 1.0, v: 0}, {x: 1.0, y: 0.8, v: 0}, {x: 0.3, y: 0.95, v: 0}
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
        {x: 0.5, y: 0.1, v: 0}, {x: 0.5, y: 0.05, v: 0}, {x: 0.5, y: 0.05, v: 0}, {x: 0.5, y: 0.05, v: 0}, {x: 0.5, y: 0.05, v: 0}, {x: 0.5, y: 0.05, v: 0}, {x: 0.5, y: 0.05, v: 0}, {x: 0.5, y: 0.1, v: 0}, {x: 0.5, y: 0.1, v: 0}, {x: 0.5, y: 0.1, v: 0}, {x: 0.5, y: 0.1, v: 0},
        {x: 0.6, y: 0.2, v: 1}, {x: 0.4, y: 0.2, v: 1},
        {x: 0.6, y: 0.15, v: 1}, {x: 0.4, y: 0.15, v: 1},
        {x: 0.5, y: 0.18, v: 1}, {x: 0.5, y: 0.18, v: 1},
        {x: 0.5, y: 0.18, v: 0}, {x: 0.5, y: 0.18, v: 0}, {x: 0.5, y: 0.18, v: 0}, {x: 0.5, y: 0.18, v: 0}, {x: 0.5, y: 0.18, v: 0}, {x: 0.5, y: 0.18, v: 0},
        {x: 0.6, y: 0.5, v: 1}, {x: 0.4, y: 0.5, v: 1},
        {x: 0.4, y: 0.75, v: 1}, {x: 0.6, y: 0.55, v: 1},
        {x: 0.4, y: 0.95, v: 1}, {x: 0.6, y: 0.6, v: 1},
        {x: 0.4, y: 1.0, v: 0}, {x: 0.6, y: 0.65, v: 0}, {x: 0.4, y: 1.0, v: 0}, {x: 0.6, y: 0.65, v: 0}
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
        {x: 0.5, y: 0.1, v: 0},{x: 0.5, y: 0.05, v: 0},{x: 0.5, y: 0.05, v: 0},{x: 0.5, y: 0.05, v: 0},{x: 0.5, y: 0.05, v: 0},{x: 0.5, y: 0.05, v: 0},{x: 0.5, y: 0.05, v: 0},{x: 0.5, y: 0.1, v: 0},{x: 0.5, y: 0.1, v: 0},{x: 0.5, y: 0.1, v: 0},{x: 0.5, y: 0.1, v: 0},
        {x: 0.6, y: 0.25, v: 1}, {x: 0.4, y: 0.25, v: 1},
        {x: 0.65, y: 0.4, v: 1}, {x: 0.45, y: 0.45, v: 1},
        {x: 0.6, y: 0.55, v: 1}, {x: 0.4, y: 0.6, v: 1},
        {x: 0.6, y: 0.6, v: 0},{x: 0.4, y: 0.65, v: 0},{x: 0.6, y: 0.6, v: 0},{x: 0.4, y: 0.65, v: 0},{x: 0.6, y: 0.6, v: 0},{x: 0.4, y: 0.65, v: 0},
        {x: 0.55, y: 0.55, v: 1}, {x: 0.45, y: 0.55, v: 1},
        {x: 0.6, y: 0.75, v: 1}, {x: 0.4, y: 0.75, v: 1},
        {x: 0.6, y: 0.95, v: 1}, {x: 0.4, y: 0.95, v: 1},
        {x: 0.65, y: 1.0, v: 0},{x: 0.35, y: 1.0, v: 0},{x: 0.6, y: 1.0, v: 0},{x: 0.4, y: 1.0, v: 0}
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
        {x: 0.5, y: 0.1, v: 0},{x: 0.5, y: 0.05, v: 0},{x: 0.5, y: 0.05, v: 0},{x: 0.5, y: 0.05, v: 0},{x: 0.5, y: 0.05, v: 0},{x: 0.5, y: 0.05, v: 0},{x: 0.5, y: 0.05, v: 0},{x: 0.5, y: 0.1, v: 0},{x: 0.5, y: 0.1, v: 0},{x: 0.5, y: 0.1, v: 0},{x: 0.5, y: 0.1, v: 0},
        {x: 0.6, y: 0.25, v: 1}, {x: 0.4, y: 0.25, v: 1},
        {x: 0.8, y: 0.2, v: 1}, {x: 0.3, y: 0.4, v: 1},
        {x: 0.95, y: 0.15, v: 1}, {x: 0.2, y: 0.5, v: 1},
        {x: 0.9, y: 0.1, v: 0},{x: 0.2, y: 0.55, v: 0},{x: 0.9, y: 0.1, v: 0},{x: 0.2, y: 0.55, v: 0},{x: 0.9, y: 0.1, v: 0},{x: 0.2, y: 0.55, v: 0},
        {x: 0.55, y: 0.5, v: 1}, {x: 0.45, y: 0.5, v: 1},
        {x: 0.2, y: 0.7, v: 1}, {x: 0.7, y: 0.65, v: 1},
        {x: 0.1, y: 0.9, v: 1}, {x: 0.8, y: 0.8, v: 1},
        {x: 0.05, y: 0.95, v: 0},{x: 0.85, y: 0.85, v: 0},{x: 0.05, y: 0.9, v: 0},{x: 0.85, y: 0.8, v: 0}
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
        {x: 0.5, y: 0.15, v: 0},{x: 0.5, y: 0.1, v: 0},{x: 0.5, y: 0.1, v: 0},{x: 0.5, y: 0.1, v: 0},{x: 0.5, y: 0.1, v: 0},{x: 0.5, y: 0.1, v: 0},{x: 0.5, y: 0.1, v: 0},{x: 0.5, y: 0.15, v: 0},{x: 0.5, y: 0.15, v: 0},{x: 0.5, y: 0.15, v: 0},{x: 0.5, y: 0.15, v: 0},
        {x: 0.7, y: 0.35, v: 1}, {x: 0.3, y: 0.35, v: 1},
        {x: 0.75, y: 0.5, v: 1}, {x: 0.25, y: 0.5, v: 1},
        {x: 0.8, y: 0.55, v: 1}, {x: 0.2, y: 0.55, v: 1},
        {x: 0.8, y: 0.6, v: 0},{x: 0.2, y: 0.6, v: 0},{x: 0.8, y: 0.6, v: 0},{x: 0.2, y: 0.6, v: 0},{x: 0.8, y: 0.6, v: 0},{x: 0.2, y: 0.6, v: 0},
        {x: 0.65, y: 0.65, v: 1}, {x: 0.35, y: 0.65, v: 1},
        {x: 0.8, y: 0.65, v: 1}, {x: 0.2, y: 0.65, v: 1},
        {x: 0.7, y: 0.9, v: 1}, {x: 0.3, y: 0.9, v: 1},
        {x: 0.75, y: 0.95, v: 0},{x: 0.25, y: 0.95, v: 0},{x: 0.7, y: 0.95, v: 0},{x: 0.3, y: 0.95, v: 0}
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
        {x: 0.5, y: 0.1, v: 0},{x: 0.5, y: 0.05, v: 0},{x: 0.5, y: 0.05, v: 0},{x: 0.5, y: 0.05, v: 0},{x: 0.5, y: 0.05, v: 0},{x: 0.5, y: 0.05, v: 0},{x: 0.5, y: 0.05, v: 0},{x: 0.5, y: 0.1, v: 0},{x: 0.5, y: 0.1, v: 0},{x: 0.5, y: 0.1, v: 0},{x: 0.5, y: 0.1, v: 0},
        {x: 0.65, y: 0.2, v: 1}, {x: 0.35, y: 0.2, v: 1},
        {x: 0.65, y: 0.45, v: 1}, {x: 0.35, y: 0.45, v: 1},
        {x: 0.65, y: 0.25, v: 1}, {x: 0.35, y: 0.25, v: 1},
        {x: 0.65, y: 0.2, v: 0},{x: 0.35, y: 0.2, v: 0},{x: 0.65, y: 0.2, v: 0},{x: 0.35, y: 0.2, v: 0},{x: 0.65, y: 0.2, v: 0},{x: 0.35, y: 0.2, v: 0},
        {x: 0.6, y: 0.5, v: 1}, {x: 0.4, y: 0.5, v: 1},
        {x: 0.6, y: 0.75, v: 1}, {x: 0.4, y: 0.75, v: 1},
        {x: 0.6, y: 0.95, v: 1}, {x: 0.4, y: 0.95, v: 1},
        {x: 0.65, y: 1.0, v: 0},{x: 0.35, y: 1.0, v: 0},{x: 0.6, y: 1.0, v: 0},{x: 0.4, y: 1.0, v: 0}
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
  speak(`Hi ${userData.name}, welcome to ALIGN! Please select an exercise to begin.`);
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
  drawReferencePose(currentExerciseKey);
  updateAngleReport(null);
  speak(`Selected ${EXERCISE_LIBRARY[currentCategory][currentExerciseKey].name}. Click Start Session when ready.`);
});

startSessionBtn.addEventListener('click', () => {
  if (!currentExerciseKey) {
    alert("Please select an exercise!");
    return;
  }
  isSessionRunning = true;
  sessionReports = [];
  startSessionBtn.disabled = true;
  stopSessionBtn.disabled = false;
  categorySelect.disabled = true;
  exerciseSelect.disabled = true;
  feedbackPopup.className = 'feedback-correct';
  feedbackText.innerText = 'Session Started! Focus on your form.';
  speak(`Starting session for ${EXERCISE_LIBRARY[currentCategory][currentExerciseKey].name}. Let's go, ${userData.name}!`);
});

stopSessionBtn.addEventListener('click', () => {
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
  const scaledLandmarks = poseData.referencePose.map(lm => ({
    x: lm.x * w, y: lm.y * h, visibility: lm.v >= 0 ? 1.0 : 0
  }));
  if (typeof drawConnectors === 'function' && typeof drawLandmarks === 'function') {
    drawConnectors(referenceCtx, scaledLandmarks, POSE_CONNECTIONS, { color: '#007bff', lineWidth: 3 });
    drawLandmarks(referenceCtx, scaledLandmarks, { color: '#0056b3', radius: 3, visibilityMin: 0.5 });
  } else {
    console.error("MediaPipe drawing utils not loaded correctly.");
  }
}

// --- 6. CORE SCORING & FEEDBACK ---
function getHumanFeedback(key, delta) {
  const direction = delta > 0 ? "too high, try lowering it" : "too low, try raising it";
  const jointName = key.replace('_', ' ');
  if (key.includes('knee')) {
    if (delta < -15) return `Try straightening your ${jointName} slightly. Bending too much adds stress.`;
    if (delta > 15) return `Bend your ${jointName} a bit more, ${userData.name}. Keep it strong!`;
  }
  if (key.includes('elbow')) {
    if (delta < -15) return `Straighten your ${jointName} slightly. Almost there!`;
    if (delta > 15) return `Bring your ${jointName} in slightly. Great focus, ${userData.name}!`;
  }
  return `Your ${jointName} angle is ${Math.abs(delta).toFixed(0)} degrees ${direction}.`;
}

function calculateAngle(a, b, c) {
  if (!a || !b || !c || a.visibility < 0.3 || b.visibility < 0.3 || c.visibility < 0.3) {
    return null;
  }
  const ab = { x: b.x - a.x, y: b.y - a.y };
  const bc = { x: c.x - b.x, y: c.y - b.y };
  const dotProduct = ab.x * bc.x + ab.y * bc.y;
  const magAB = Math.sqrt(ab.x * ab.x + ab.y * ab.y);
  const magBC = Math.sqrt(bc.x * bc.x + bc.y * bc.y);
  if (magAB === 0 || magBC === 0) return null;
  let cosTheta = dotProduct / (magAB * magBC);
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

    const tolerance = getPersonalizedTolerance(key.split('_')[0]);
    const diff = Math.abs(userAngle - targetAngle);
    const delta = userAngle - targetAngle;
    const isCorrect = (diff <= tolerance);
    let angleScore = Math.max(0, 100 - (diff / targetAngle) * 100);
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
    speak(`${userData.name}, ${report.speakableError || "High risk detected!"}`, true);
  } else if (report.errors.length > 0) {
    const errorMsg = `Correct: ${report.errors[0] || ''}`;
    feedbackText.innerText = errorMsg;
    feedbackPopup.className = 'feedback-caution';
    speak(`${userData.name}, ${report.speakableError}`, true);
  } else {
    feedbackText.innerText = `Great Form! 🔥`;
    feedbackPopup.className = 'feedback-correct';
    const positiveMsg = POSITIVE_FEEDBACK[Math.floor(Math.random() * POSITIVE_FEEDBACK.length)];
    speak(`${positiveMsg}, ${userData.name}!`, false);
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
    const tolerance = getPersonalizedTolerance(key.split('_')[0]);
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
  let generalSuggestionText = "";
  if (finalAvgAccuracy > 90) generalSuggestionText = `Fantastic consistency, ${userData.name}! Expert level form.`;
  else if (finalAvgAccuracy > 75) generalSuggestionText = `Great work! Focus on those minor suggestions to hit 90%.`;
  else generalSuggestionText = `Good start, ${userData.name}! Focus on the suggestions above.`;
  if (highestRiskJoint && maxAvgRisk >= 1) generalSuggestionText += ` Pay special attention to your ${highestRiskJoint.replace('_', ' ')} to reduce injury risk.`;
  reportGeneralSuggestion.innerText = generalSuggestionText;

  reportModal.style.display = 'flex';
  speak(`${userData.name}, your session report is ready. You averaged ${finalAvgAccuracy.toFixed(0)} percent accuracy.`);
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

    if (isSessionRunning) {
      updateUI(report);
      sessionReports.push(report);
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
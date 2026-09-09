<!-- This component was LLM generated -->

<template>
  <div class="wasm-app">
    
    <!-- Status Indicator -->
    <div :class="['custom-block', statusColor]">
      <p class="custom-block-title">System Status</p>
      <p>{{ statusMessage }}</p>
      <p v-if="micError" style="color: var(--vp-c-danger-1); margin-top: 8px;">
        Microphone access denied. Please check your browser permissions.
      </p>
    </div>

    <!-- Controls -->
    <div class="actions">
      <button 
        class="vp-btn brand" 
        :disabled="!wasmReady || isRecording || isAnalyzing" 
        @click="startRecording"
      >
        {{ isRecording ? '🔴 Recording...' : 'Start Recording' }}
      </button>
      <button 
        class="vp-btn alt" 
        :disabled="!isRecording" 
        @click="stopRecording"
      >
        Stop & Analyze
      </button>
    </div>

    <!-- Built-in Playback -->
    <div class="playback-container" v-if="audioUrl">
      <p class="playback-label">Original Audio:</p>
      <audio :src="audioUrl" controls class="tasteful-audio"></audio>
    </div>

    <!-- Plotly Containers -->
    <div class="plot-container" ref="timeDiv" v-show="hasData"></div>
    <div class="plot-container" ref="freqDiv" v-show="hasData" style="margin-top: 20px;"></div>
    <div class="plot-container" ref="stftDiv" v-show="hasData" style="margin-top: 20px;"></div>

  </div>
</template>

<script setup>
import { ref, onMounted, computed, nextTick } from 'vue'

const props = defineProps({
  remoteUrl: { type: String, default: 'https://cdn.jsdelivr.net/gh/sounddrill31/analysis-signalgenerate@main/analyze/' },
  functionName: { type: String, default: 'genAnalysisLogic' }
})

// State
const wasmReady = ref(false)
const isRecording = ref(false)
const isAnalyzing = ref(false)
const hasData = ref(false)
const micError = ref(false)
const audioUrl = ref(null) // Added state for the audio player

// Computed Status
const statusMessage = computed(() => {
  if (!wasmReady.value) return 'Preparing...'
  if (isRecording.value) return '🔴 Recording audio... (Click stop to analyze)'
  if (isAnalyzing.value) return 'Processing data...'
  return 'Ready. Waiting for input'
})
const statusColor = computed(() => {
  if (isRecording.value) return 'danger'
  if (isAnalyzing.value) return 'warning'
  return wasmReady.value ? 'tip' : 'warning'
})

// DOM Refs
const timeDiv = ref(null)
const freqDiv = ref(null)
const stftDiv = ref(null)

// Globals
let mediaRecorder = null
let audioChunks = []
let recordTimeout = null

// Load External JS safely
const loadExternalScript = (url) => {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${url}"]`)) return resolve()
    const script = document.createElement('script')
    script.src = url
    script.onload = resolve
    script.onerror = reject
    document.head.appendChild(script)
  })
}

// Initialization
onMounted(async () => {
  try {
    await loadExternalScript('https://cdn.plot.ly/plotly-2.32.0.min.js')
    await loadExternalScript(props.remoteUrl + 'index.js?t=' + Date.now())
    wasmReady.value = true
  } catch (e) {
    console.error("Engine load failed:", e)
  }
})

const startRecording = async () => {
  micError.value = false
  audioChunks = []
  hasData.value = false
  
  // Clean up old audio URL to prevent memory leaks
  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value)
    audioUrl.value = null
  }
  
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRecorder = new MediaRecorder(stream)

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data)
    }

    mediaRecorder.onstop = async () => {
      isRecording.value = false
      isAnalyzing.value = true
      clearTimeout(recordTimeout)
      stream.getTracks().forEach(track => track.stop())
      await processRecording()
    }

    mediaRecorder.start()
    isRecording.value = true
    // 30 sec auto stop
    // recordTimeout = setTimeout(() => {
    //   if (mediaRecorder.state !== 'inactive') mediaRecorder.stop()
    // }, 30000)

  } catch (err) {
    console.error("Mic access denied:", err)
    micError.value = true
  }
}

const stopRecording = () => {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop() 
  }
}

const processRecording = async () => {
  const audioBlob = new Blob(audioChunks)
  
  // Assign the object URL so the user can play back their recording instantly
  audioUrl.value = URL.createObjectURL(audioBlob)
  
  const arrayBuffer = await audioBlob.arrayBuffer()
  
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 })
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
  
  const rawData = audioBuffer.getChannelData(0)
  const x = new Float64Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) x[i] = rawData[i]

  // Spawn fresh Wasm instance
  const freshWasmInstance = await window.createWasmModule({
    locateFile: (path) => path.endsWith('.wasm') ? props.remoteUrl + path : path
  })

  // Run calculation
  const Fs = audioBuffer.sampleRate
  const res = freshWasmInstance[props.functionName](x, Fs)
  
  // Extract data purely
  const safeData = {
    t: Array.from(res.t),
    freq: Array.from(res.freq),
    fftMagnitude: Array.from(res.fftMagnitude),
    stftTime: Array.from(res.stftTime),
    stftFreq: Array.from(res.stftFreq),
    stftMagnitude: Array.from(res.stftMagnitude)
  }
  const safeX = Array.from(x)

  // Verify data integrity in the console
  console.log("Analysis Output Sizes:", {
    TimeSize: safeData.t.length,
    FreqSize: safeData.freq.length,
    STFTSize: safeData.stftMagnitude.length
  })

  // TRIGGER DOM REVEAL
  isAnalyzing.value = false
  hasData.value = true
  
  // Wait for Vue to mount the divs, then pause 50ms to guarantee CSS paints the height/width
  await nextTick()
  await new Promise(resolve => setTimeout(resolve, 50)) 
  
  updatePlots(safeData, safeX)
  audioCtx.close()
}

const updatePlots = (res, xData) => {
  const isDark = document.documentElement.classList.contains('dark')
  const textColor = isDark ? '#fffff5' : '#3c3c43' 
  const layoutBase = { 
    paper_bgcolor: 'transparent', 
    plot_bgcolor: 'transparent', 
    margin: { t: 30, b: 40, l: 50, r: 20 }, 
    font: { color: textColor } 
  }

  // Thin out time domain to prevent UI lockup
  const step = Math.max(1, Math.ceil(res.t.length / 8000))
  const tSub = res.t.filter((_, i) => i % step === 0)
  const xSub = xData.filter((_, i) => i % step === 0)

  // Use newPlot instead of react to force a hard draw from scratch
  window.Plotly.newPlot(timeDiv.value, [{ x: tSub, y: xSub, type: 'scatter', mode: 'lines', line: { color: 'var(--vp-c-brand-1)' } }], 
    { ...layoutBase, title: 'Time Domain', yaxis: { range: [-1, 1] } },
    { responsive: true }
  )

  window.Plotly.newPlot(freqDiv.value, [{ x: res.freq, y: res.fftMagnitude, type: 'scatter', mode: 'lines', line: { color: 'var(--vp-c-success-1)' } }], 
    { ...layoutBase, title: 'Frequency Domain (FFT)' },
    { responsive: true }
  )

  const zMatrix = []
  const numFreqs = res.stftFreq.length
  const numTimes = res.stftTime.length
  
  for (let f = 0; f < numFreqs; f++) {
    const row = []
    for (let t = 0; t < numTimes; t++) {
      row.push(res.stftMagnitude[f + t * numFreqs])
    }
    zMatrix.push(row)
  }

  window.Plotly.newPlot(stftDiv.value, [{ x: res.stftTime, y: res.stftFreq, z: zMatrix, type: 'heatmap', colorscale: 'Viridis' }], 
    { ...layoutBase, title: 'Short-Time Fourier Transform (STFT)' },
    { responsive: true }
  )
}
</script>

<style scoped>
.wasm-app { margin-top: 16px; }
.actions { display: flex; gap: 12px; margin: 24px 0; }
.vp-btn { display: inline-block; border-radius: 20px; padding: 0 20px; line-height: 38px; font-size: 14px; font-weight: 600; cursor: pointer; transition: color 0.25s, background-color 0.25s; border: 1px solid transparent; }
.vp-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.vp-btn.brand { background-color: var(--vp-button-brand-bg); color: var(--vp-button-brand-text); }
.vp-btn.brand:hover:not(:disabled) { background-color: var(--vp-button-brand-hover-bg); }
.vp-btn.alt { background-color: var(--vp-button-alt-bg); color: var(--vp-button-alt-text); border-color: var(--vp-button-alt-border); }
.vp-btn.alt:hover:not(:disabled) { background-color: var(--vp-button-alt-hover-bg); }

/* Playback Styles */
.playback-container { margin-bottom: 20px; padding: 12px; background-color: var(--vp-c-bg-soft); border-radius: 8px; display: inline-flex; align-items: center; gap: 12px; border: 1px solid var(--vp-c-divider); }
.playback-label { margin: 0; font-size: 14px; font-weight: 600; color: var(--vp-c-text-2); }
.tasteful-audio { height: 36px; outline: none; border-radius: 20px; }

.plot-container { width: 100%; height: 350px; border: 1px solid var(--vp-c-divider); border-radius: 8px; overflow: hidden; background-color: var(--vp-c-bg-soft); }
</style>
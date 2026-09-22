<!-- This component was LLM generated -->

<template>
  <div class="wasm-app">
    
    <div v-if="showStatus" :class="['custom-block', wasmReady ? 'tip' : 'warning']">
      <p class="custom-block-title">Status</p>
      <p>{{ wasmReady ? `${waveName} Module Ready!` : `Downloading ${waveName} WebAssembly...` }}</p>
    </div>

    <div class="params-grid">
      <div class="input-group">
        <label>Amplitude</label>
        <input type="number" v-model.number="amp" step="0.1" max="1.0" min="0.01">
      </div>
      <div class="input-group">
        <label>Start Freq (Hz)</label>
        <input type="number" v-model.number="fStart" step="1">
      </div>
      <div class="input-group">
        <label>End Freq (Hz)</label>
        <input type="number" v-model.number="fEnd" step="1">
      </div>
      <div class="input-group">
        <label>Duration (s)</label>
        <input type="number" v-model.number="dur" step="0.1">
      </div>
      <div class="input-group">
        <label>Sample Rate</label>
        <select v-model.number="fs">
            <option v-for="rate in sampleRates" :key="rate" :value="rate">{{ rate }} Hz</option>
        </select>
      </div>
    </div>

    <div class="actions">
      <button class="vp-btn brand" :disabled="!wasmReady" @click="generateAndPlot">
        Generate & Plot
      </button>
      <button class="vp-btn alt" :disabled="!hasData || isPlaying" @click="playSound">
        {{ isPlaying ? 'Playing...' : 'Play Sound' }}
      </button>
      <button class="vp-btn alt" :disabled="!hasData" @click="downloadWave">
        Download WAV
      </button>
      <button class="vp-btn alt" :disabled="!hasData || !analysisReady" @click="runAnalysis">
        {{ analysisReady ? 'Analyze' : 'Loading Analysis...' }}
      </button>
    </div>

    <div ref="plotDiv" class="plot-container"></div>
    <div ref="freqDiv" class="plot-container" v-show="analyzed" style="margin-top: 20px;"></div>
    <div ref="stftDiv" class="plot-container" v-show="analyzed" style="margin-top: 20px;"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, defineProps } from 'vue'

const props = defineProps({
  remoteUrl: { type: String, required: true },
  functionName: { type: String, required: true },
  waveName: { type: String, default: 'Chirp' },
  sampleRates: { type: Array, default: () => [8000, 16000, 44100] }
})

const wasmReady = ref(false)
const hasData = ref(false)
const showStatus = ref(true) 
const isPlaying = ref(false) 

const analysisReady = ref(false)
let analysisWasm = null

const amp = ref(0.2)
const fStart = ref(200)
const fEnd = ref(800)
const dur = ref(1.0)
const fs = ref(props.sampleRates.includes(44100) ? 44100 : props.sampleRates[0])

let audioData = null
const plotDiv = ref(null)
let Plotly = null

let wasmInstance = null 

const loadWasmScript = (url, cacheKey) => {
  return new Promise((resolve, reject) => {
    window.__WASM_FACTORIES__ = window.__WASM_FACTORIES__ || {}
    
    // If we already loaded this specific WASM in another tab, return it instantly
    if (window.__WASM_FACTORIES__[cacheKey]) {
      return resolve(window.__WASM_FACTORIES__[cacheKey])
    }

    const script = document.createElement('script')
    script.src = url
    script.onload = () => {
      // Save the factory to our safe persistent cache
      window.__WASM_FACTORIES__[cacheKey] = window.createWasmModule
      // Nuke the global so the next script doesn't inherit/collide with it
      window.createWasmModule = undefined 
      resolve(window.__WASM_FACTORIES__[cacheKey])
    }
    script.onerror = reject
    document.body.appendChild(script)
  })
}

// Replace your onMounted with this:
onMounted(async () => {
  Plotly = (await import('plotly.js-dist-min')).default

  try {
    // 1. Fetch/Cache the remote index.js (No more Date.now() bypass)
    const generatorFactory = await loadWasmScript(props.remoteUrl + 'index.js', props.waveName)
    
    // 2. Initialize the isolated Wasm module using the cached factory
    wasmInstance = await generatorFactory({
      locateFile: function(path) {
        if (path.endsWith('.wasm')) return props.remoteUrl + path
        return path
      }
    })

    wasmReady.value = true

    setTimeout(async () => {
      try {
        const url = 'https://cdn.jsdelivr.net/gh/sounddrill31/signalgen-archive@archive/wave/analyze/'
        
        // 3. Fetch/Cache the analysis script
        const analyzerFactory = await loadWasmScript(url + 'index.js', 'analyzer_module')
        
        // 4. Initialize analyzer safely
        analysisWasm = await analyzerFactory({
          locateFile: (path) => path.endsWith('.wasm') ? url + path : path
        })
        analysisReady.value = true
      } catch (err) {
        console.error("Analysis WASM background load failed:", err)
      }
    }, 500)

  } catch (error) {
    console.error(`Failed to load ${props.waveName} WebAssembly:`, error)
  }
})

const generateAndPlot = () => {
  if (!wasmInstance || !wasmInstance[props.functionName]) return

  const result = wasmInstance[props.functionName](amp.value, fStart.value, fEnd.value, dur.value, fs.value)
  
  audioData = new Float64Array(result.x.length)
  for(let i = 0; i < result.x.length; i++) {
      audioData[i] = result.x[i]
  }
  hasData.value = true

  const tView = result.t.slice(0, result.samples)
  const xView = audioData.slice(0, result.samples)

  const isDark = document.documentElement.classList.contains('dark')
  const textColor = isDark ? '#fffff5' : '#3c3c43' 

  Plotly.newPlot(plotDiv.value, [{
      x: tView, y: xView, type: 'scatter', mode: 'lines',
      line: { color: 'var(--vp-c-brand-1)', width: 2 } 
  }], { 
      title: `${props.waveName} (${fStart.value}Hz - ${fEnd.value}Hz)`,
      xaxis: { title: { text: 'Time (s)' }, color: textColor },
      yaxis: { title: { text: 'Amplitude' }, range: [-1.2, 1.2], color: textColor },
      margin: { t: 40, b: 40, l: 50, r: 20 },
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent'
  })
}

const playSound = () => {
  if (!audioData || isPlaying.value) return 
  isPlaying.value = true 

  const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  const buffer = audioCtx.createBuffer(1, audioData.length, fs.value)
  const channelData = buffer.getChannelData(0)
  
  for (let i = 0; i < audioData.length; i++) {
      channelData[i] = audioData[i]
  }
  
  const source = audioCtx.createBufferSource()
  source.buffer = buffer
  source.connect(audioCtx.destination)
  
  source.onended = () => {
    isPlaying.value = false
  }
  
  source.start()
}

const downloadWave = () => {
  if (!audioData) return

  const sampleRate = fs.value
  const numChannels = 1
  const bitsPerSample = 16
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8
  const blockAlign = (numChannels * bitsPerSample) / 8
  const dataSize = audioData.length * numChannels * (bitsPerSample / 8)
  const chunkSize = 36 + dataSize

  const wavBuffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(wavBuffer)

  const writeString = (view, offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i))
    }
  }

  writeString(view, 0, 'RIFF')
  view.setUint32(4, chunkSize, true)
  writeString(view, 8, 'WAVE')

  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitsPerSample, true)

  writeString(view, 36, 'data')
  view.setUint32(40, dataSize, true)

  let offset = 44
  for (let i = 0; i < audioData.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, audioData[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
  }

  const blob = new Blob([view], { type: 'audio/wav' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.style.display = 'none'
  a.href = url
  a.download = `${props.waveName.toLowerCase()}_${fStart.value}_${fEnd.value}hz.wav`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const analyzed = ref(false)
const freqDiv = ref(null)
const stftDiv = ref(null)

const runAnalysis = async () => {
  if (!audioData || !analysisWasm) return
  
  const res = analysisWasm.genAnalysisLogic(audioData, fs.value)
  const isDark = document.documentElement.classList.contains('dark')
  const textColor = isDark ? '#fffff5' : '#3c3c43' 
  const layout = { paper_bgcolor: 'transparent', plot_bgcolor: 'transparent', font: { color: textColor }, margin: { t: 30, b: 40, l: 50, r: 20 } }

  Plotly.newPlot(freqDiv.value, [{ 
    x: Array.from(res.freq), y: Array.from(res.fftMagnitude), type: 'scatter', line: { color: 'var(--vp-c-success-1)' } 
  }], { ...layout, title: 'Frequency Domain (FFT)', xaxis: { title: { text: 'Frequency (Hz)' } }, yaxis: { title: { text: 'Magnitude' } } })

  const zMatrix = []
  const numFreqs = res.stftFreq.length
  const numTimes = res.stftTime.length
  for (let f = 0; f < numFreqs; f++) {
    const row = []
    for (let t = 0; t < numTimes; t++) row.push(res.stftMagnitude[f + t * numFreqs])
    zMatrix.push(row)
  }

  Plotly.newPlot(stftDiv.value, [{ 
    x: Array.from(res.stftTime), y: Array.from(res.stftFreq), z: zMatrix, type: 'heatmap', colorscale: 'Viridis' 
  }], { ...layout, title: 'Short-Time Fourier Transform (STFT)', xaxis: { title: { text: 'Time (s)' } }, yaxis: { title: { text: 'Frequency (Hz)' } } })

  analyzed.value = true
}
</script>

<style scoped>
.wasm-app { margin-top: 16px; }
.params-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; margin: 24px 0; }
.input-group label { display: block; font-size: 14px; font-weight: 500; margin-bottom: 8px; color: var(--vp-c-text-2); }
.input-group input, .input-group select { width: 100%; padding: 8px 12px; border: 1px solid var(--vp-input-border-color); border-radius: 6px; background-color: var(--vp-input-bg-color); color: var(--vp-c-text-1); transition: border-color 0.25s; }
.input-group input:focus, .input-group select:focus { outline: none; border-color: var(--vp-c-brand-1); }
.actions { display: flex; gap: 12px; margin-bottom: 24px; }
.vp-btn { display: inline-block; border-radius: 20px; padding: 0 20px; line-height: 38px; font-size: 14px; font-weight: 600; cursor: pointer; transition: color 0.25s, background-color 0.25s; border: 1px solid transparent; }
.vp-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.vp-btn.brand { background-color: var(--vp-button-brand-bg); color: var(--vp-button-brand-text); }
.vp-btn.brand:hover:not(:disabled) { background-color: var(--vp-button-brand-hover-bg); }
.vp-btn.alt { background-color: var(--vp-button-alt-bg); color: var(--vp-button-alt-text); border-color: var(--vp-button-alt-border); }
.vp-btn.alt:hover:not(:disabled) { background-color: var(--vp-button-alt-hover-bg); }
.plot-container { width: 100%; height: 400px; border: 1px solid var(--vp-c-divider); border-radius: 8px; overflow: hidden; }
</style>
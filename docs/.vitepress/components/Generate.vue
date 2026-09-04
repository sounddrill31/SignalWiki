<!-- This component was LLM generated -->

<template>
  <div class="wasm-app">
    
    <div :class="['custom-block', wasmReady ? 'tip' : 'warning']">
      <p class="custom-block-title">Status</p>
      <p>{{ wasmReady ? `${waveName} Module Ready!` : `Downloading ${waveName} WebAssembly...` }}</p>
    </div>

    <div class="params-grid">
      <div class="input-group">
        <label>Amplitude</label>
        <input type="number" v-model.number="amp" step="0.1" max="1.0" min="0.01">
      </div>
      <div class="input-group">
        <label>Frequency (Hz)</label>
        <input type="number" v-model.number="freq" step="1">
      </div>
      <div class="input-group">
        <label>Duration (s)</label>
        <input type="number" v-model.number="dur" step="0.1">
      </div>
      <div class="input-group">
        <label>Sample Rate</label>
        <select v-model.number="fs">
            <option value="8000">8000 Hz</option>
            <option value="16000">16000 Hz</option>
            <option value="44100">44100 Hz</option>
        </select>
      </div>
    </div>

    <div class="actions">
      <button class="vp-btn brand" :disabled="!wasmReady" @click="generateAndPlot">
        1. Generate & Plot
      </button>
      <button class="vp-btn alt" :disabled="!hasData" @click="playSound">
        2. Play Sound
      </button>
    </div>

    <div ref="plotDiv" class="plot-container"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, defineProps } from 'vue'

const props = defineProps({
  remoteUrl: { type: String, required: true },
  functionName: { type: String, required: true },
  waveName: { type: String, default: 'Wave' }
})

const wasmReady = ref(false)
const hasData = ref(false)
const amp = ref(0.2)
const freq = ref(440)
const dur = ref(1.0)
const fs = ref(44100)

let audioData = null
const plotDiv = ref(null)
let Plotly = null

// Store the isolated Wasm instance locally, NOT on window.Module
let wasmInstance = null 

// Helper function to load the script as a Promise
const loadWasmScript = (url) => {
  return new Promise((resolve, reject) => {
    // If the script is already in the document, resolve immediately
    if (document.querySelector(`script[src="${url}"]`)) {
      return resolve()
    }
    const script = document.createElement('script')
    script.src = url
    script.onload = resolve
    script.onerror = reject
    document.body.appendChild(script)
  })
}

onMounted(async () => {
  Plotly = (await import('plotly.js-dist-min')).default

  try {
    // 1. Fetch the remote index.js
    await loadWasmScript(props.remoteUrl + 'index.js?t=' + Date.now())
    
    // 2. Initialize the isolated Wasm module using the exported function!
    wasmInstance = await window.createWasmModule({
      locateFile: function(path) {
        if (path.endsWith('.wasm')) return props.remoteUrl + path
        return path
      }
    })

    wasmReady.value = true
  } catch (error) {
    console.error(`Failed to load ${props.waveName} WebAssembly:`, error)
  }
})

const generateAndPlot = () => {
  // Use our local wasmInstance instead of window.Module
  if (!wasmInstance || !wasmInstance[props.functionName]) return

  const result = wasmInstance[props.functionName](amp.value, freq.value, dur.value, fs.value)
  
  audioData = new Float64Array(result.x.length)
  for(let i = 0; i < result.x.length; i++) {
      audioData[i] = result.x[i] * amp.value
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
      title: `${props.waveName} (${freq.value} Hz)`,
      xaxis: { title: 'Time (s)', color: textColor },
      yaxis: { title: 'Amplitude', range: [-1.2, 1.2], color: textColor },
      margin: { t: 40, b: 40, l: 50, r: 20 },
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent'
  })
}

const playSound = () => {
  if (!audioData) return
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  const buffer = audioCtx.createBuffer(1, audioData.length, fs.value)
  const channelData = buffer.getChannelData(0)
  
  for (let i = 0; i < audioData.length; i++) {
      channelData[i] = audioData[i]
  }
  
  const source = audioCtx.createBufferSource()
  source.buffer = buffer
  source.connect(audioCtx.destination)
  source.start()
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
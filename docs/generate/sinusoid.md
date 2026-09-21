---
title: Sinusoid Waves Generation
order: 1
---

# Sinusoidal Wave
<!-- LLM assistance used for autowrap.py and the vueJS snippet -->

<script setup>
import Generate from '../.vitepress/components/Generate.vue'
</script>

<Generate 
  remoteUrl="https://cdn.jsdelivr.net/gh/sounddrill31/signalgen-archive@archive/wave/generate/sine/" 
  functionName="genSineLogic"
  waveName="Sine Wave"
  :sampleRates="[8000, 16000, 44100, 192000, 1000000]"
/>

# Core Matlab Function

```Matlab
%% Simple matlab function to generate Sine Wave

%#codegen

function [t,x,samples,cycles] = genSineLogic(A,f,duration,Fs)

% hack to allow memory size of t and x to grow
coder.varsize('t', [1, 2000000], [false, true]);
coder.varsize('x', [1, 2000000], [false, true]);

% We're using the time vector t to generate enough slots, one for each
% sample based on the frequency and duration
t = 0:1/Fs:duration;
t = t(1:end-1);

% Generate the sine wave
x = A*sin(2*pi*f*t);

% Normalize the wave to ensure it fits within the amplitude range
if max(abs(x)) > 0
    x = x/max(abs(x));
    x = A*x;
end

% take samples from first to cycles for initial plotting
cycles = 2;
samples = round(cycles*Fs/f);
samples = min(samples,length(x));

end
```
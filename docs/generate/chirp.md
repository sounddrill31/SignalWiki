---
title: Chirp Waves Generation
order: 5
---

# Chirp Wave
<!-- LLM assistance used for autowrap.py and the vueJS snippet -->

<script setup>
import Generate from '../.vitepress/components/GenerateChirp.vue'
</script>

<Generate 
  remoteUrl="https://cdn.jsdelivr.net/gh/sounddrill31/signalgen-archive@archive/wave/generate/chirp/" 
  functionName="genChirpLogic"
  waveName="Chirp Wave"
  :sampleRates="[8000, 16000, 44100, 192000, 700000]"
/>

<!-- TODO: Expl on how it works-->

# Core Matlab Function

```Matlab
%% Simple matlab function to generate Chirp Wave

%#codegen

function [t,x,samples,cycles] = genChirpLogic(A,fStart,fEnd,duration,Fs)

% hack to allow memory size of t and x to grow
coder.varsize('t', [1, 2000000], [false, true]);
coder.varsize('x', [1, 2000000], [false, true]);

% We're using the time vector t to generate enough slots, one for each
% sample based on the duration
t = 0:1/Fs:duration;
t = t(1:end-1);

% Generate a linear chirp.
% Frequency changes from fStart to fEnd over the duration.
x = A*chirp(t,fStart,duration,fEnd,'linear');

% Normalize the wave to ensure it fits within the amplitude range
if max(abs(x)) > 0
    x = x/max(abs(x));
    x = A*x;
end

% Show approximately the first two seconds/cycles worth of samples.
% A chirp does not have one fixed frequency, so "cycles" is only
% an approximate plotting parameter here.
cycles = 2;
fPlot = max(fStart,1);
samples = round(cycles*Fs/fPlot);
samples = min(samples,length(x));

end
```
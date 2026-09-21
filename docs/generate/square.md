---
title: Square Waves Generation
order: 2
---

# Square Wave
<!-- LLM assistance used for autowrap.py and the vueJS snippet -->

<script setup>
import Generate from '../.vitepress/components/Generate.vue'
</script>

<Generate 
  remoteUrl="https://cdn.jsdelivr.net/gh/sounddrill31/signalgen-archive@archive/wave/generate/square/" 
  functionName="genSquareLogic"
  waveName="Square Wave"
/>

# Core Matlab Function

```Matlab
%% Simple matlab function to generate Square Wave

%#codegen

function [t,x,samples,cycles] = genSquareLogic(A,f,duty,duration,Fs)

% hack to allow memory size of t and x to grow
coder.varsize('t', [1, 2000000], [false, true]);
coder.varsize('x', [1, 2000000], [false, true]);

% We're using the time vector t to generate enough slots, one for each
% sample based on the frequency and duration
t = 0:1/Fs:duration;
t = t(1:end-1);

% Generate the square wave
% MATLAB square() expects duty cycle as a percentage from 0 to 100
x = A*square(2*pi*f*t,duty);

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
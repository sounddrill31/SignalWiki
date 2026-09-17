---
title: Sinc Waves Generation
order: 4
---

# Sinc Wave
<!-- LLM assistance used for autowrap.py and the vueJS snippet -->

<script setup>
import Generate from '../.vitepress/components/Generate.vue'
</script>

<Generate 
  remoteUrl="https://cdn.jsdelivr.net/gh/sounddrill31/signalgen-archive@archive/wave/generate/sinc/" 
  functionName="genSincLogic"
  waveName="Sinc Wave"
/>

<!--TODO: Expl on how it works-->

# Core Matlab Function

```Matlab
%% Simple matlab function to generate Sinc Wave

%#codegen

function [t,x,samples,cycles] = genSincLogic(A,f,duration,Fs)

% hack to allow memory size of t and x to grow
coder.varsize('t', [1, 2000000], [false, true]);
coder.varsize('x', [1, 2000000], [false, true]);

% Create a time vector centered around zero so that the main lobe
% of the sinc function appears near the middle of the plot.
t = -duration/2:1/Fs:duration/2;
t = t(1:end-1);

% MATLAB sinc(z) = sin(pi*z)/(pi*z).
% The factor 2*f controls the spacing of the zero crossings.
x = A*sinc(2*f*t);

% Normalize the wave to ensure it fits within the amplitude range
if max(abs(x)) > 0
    x = x/max(abs(x));
    x = A*x;
end

% "cycles" is not physically meaningful for a sinc wave because
% sinc is not periodic. Keep it as 2 for compatibility with the
% other generator interfaces.
cycles = 2;
samples = min(length(x),round(0.8*length(x)));

end
```

<!-- TODO: Expl-->
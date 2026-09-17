---
order: 2
sidebarTitle: Analyze Signal

---

<script setup>
import MicAnalyzer from '../.vitepress/components/MicAnalyzer.vue'
</script>

<MicAnalyzer 
  remoteUrl="https://cdn.jsdelivr.net/gh/sounddrill31/signalgen-archive@archive/wave/analyze/" 
  functionName="genAnalysisLogic"
/>

<!--
TODO: expl on how it works
-->

# Core Matlab Function

```Matlab
%% Simple matlab function for Audio Signal Analysis

%#codegen
function [t, freq, fftMagnitude, stftTime, stftFreq, stftMagnitude] = genAnalysisLogic(x, Fs)

N = length(x);

% Time domain
t = zeros(1, N);
if N > 0
    t(1, :) = (0:N-1) / Fs; % Mutate in-place
end

% Stateless STFT
windowLength = 1024;
overlap = 512;
hop = windowLength - overlap;


% Calculate exact output dimensions upfront
if N >= windowLength
    numFrames = floor((N - windowLength) / hop) + 1;
else
    numFrames = 0;
end

numBins = (windowLength / 2) + 1;

% Pre-allocate ALL outputs so MATLAB locks the pointers
stftMagnitude = zeros(numBins, numFrames);
stftTime = zeros(1, numFrames);
stftFreq = zeros(numBins, 1);
fftMagnitude = zeros(numBins, 1);
freq = zeros(numBins, 1);

% Write data into the locked memory
stftFreq(:, 1) = Fs * (0:numBins-1)' / windowLength;
win = hamming(windowLength);

for k = 1:numFrames
    startIdx = (k-1)*hop + 1;
    endIdx = startIdx + windowLength - 1;

    % Force column vector and apply window
    segment = x(startIdx:endIdx)' .* win; 
    X_seg = fft(segment);

    stftMagnitude(:, k) = abs(X_seg(1:numBins));
    stftTime(1, k) = (startIdx + windowLength/2) / Fs;
end

% Final Frequency Domain Operation
freq(:, 1) = stftFreq(:, 1);
if numFrames > 0
    fftMagnitude(:, 1) = mean(stftMagnitude, 2);
end

end
```
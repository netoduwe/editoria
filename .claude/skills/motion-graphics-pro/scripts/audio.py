"""Trilha 114 BPM (Ré menor) + SFX posicionados pelos cues exportados do index.html."""
import json, sys, wave
import numpy as np
from scipy.signal import lfilter

SR = 48000
meta = json.load(open('out/cues.json'))
DUR = meta['duration'] + 0.6
N = int(SR * DUR); t = np.arange(N) / SR
B = 60 / meta.get('bpm', 114)
mix = np.zeros((N, 2))
rng = np.random.default_rng(3)

def lp(x, a): return lfilter([a], [1, a - 1], x)          # passa-baixa 1 polo
def hp(x, a): return x - lp(x, a)
def env(n, a, d): k = np.arange(n) / SR; return np.minimum(1, k / max(a, 1e-4)) * np.exp(-k / d)
def put(sig, at, g=1.0, pan=0.0):
    i = int(at * SR); n = min(len(sig), N - i)
    if i < 0 or n <= 0: return
    mix[i:i + n, 0] += sig[:n] * g * (1 - pan * .6); mix[i:i + n, 1] += sig[:n] * g * (1 + pan * .6)
def noise(d): return rng.standard_normal(int(d * SR))
def tone(f, d, wave='sin'):
    k = np.arange(int(d * SR)) / SR; ph = 2 * np.pi * np.cumsum(np.broadcast_to(f, k.shape)) / SR if np.ndim(f) else 2 * np.pi * f * k
    return np.sin(ph) if wave == 'sin' else 2 * ((ph / (2 * np.pi)) % 1) - 1
n2f = lambda m: 440 * 2 ** ((m - 69) / 12)

# ---------------- música ----------------
start_beat = 1                                   # bateria entra junto com o impacto do IMAGINA
prog = [(50, [62, 65, 69]), (46, [58, 62, 65]), (48, [60, 64, 67]), (45, [57, 61, 64])]  # Dm Bb C A
bars = int(DUR / (4 * B)) + 1
# pad
for b in range(bars):
    root, ch = prog[b % 4]; d = 4 * B + .3
    s = sum(tone(n2f(m) * (1 + dt), d, 'saw') for m in ch for dt in (-.004, .004)) * .05
    s = lp(lp(s, .04), .06) * env(len(s), .25, 3.0)
    put(s, b * 4 * B, .9)
# baixo e arpejo
for k in range(int(DUR / (B / 2))):
    at = k * B / 2; b = int(at / (4 * B)); root, ch = prog[b % 4]
    if at >= start_beat * B:
        s = tone(n2f(root - 12), B / 2 * .9, 'saw'); s = lp(s, .03) * env(len(s), .005, .18); put(s, at, .55)
    if at >= 12 * B:
        m = ch[k % 3] + 12 * (k // 3 % 2); s = tone(n2f(m), .2) * env(int(.2 * SR), .002, .07); put(s, at, .12, pan=(-.5 if k % 2 else .5))
# bateria
def kick(g=1):
    d = .5; k = np.arange(int(d * SR)) / SR; f = 45 + 120 * np.exp(-k * 28)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-k * 7) * g
def snare():
    n = noise(.25); return (hp(n, .25) * env(len(n), .001, .07) + tone(190, .25) * env(int(.25 * SR), .001, .05) * .5)
def hat(): n = noise(.05); return hp(n, .6) * env(len(n), .0005, .015)
for bt in range(int(DUR / B)):
    at = bt * B
    if bt < start_beat or at > DUR - 1.2: continue
    put(kick(), at, .9)
    if bt % 2 == 1 and bt >= 12: put(snare(), at, .45)
    put(hat(), at + B / 2, .18, .3)
    if bt >= 20: put(hat(), at + B / 4, .08, -.3); put(hat(), at + 3 * B / 4, .08, -.3)

# --sem-musica: mantém só os SFX (zera a trilha antes de somar os efeitos)
NO_MUSIC = '--sem-musica' in sys.argv
if NO_MUSIC: mix[:] = 0

# ---------------- SFX ----------------
def whoosh(d=.6):
    n = noise(d); u = np.linspace(0, 1, len(n)); e = np.sin(np.pi * u) ** 1.5
    lo = lfilter([.12], [1, -.88], n); hi = hp(n, .5)
    return (lo * (1 - u) + hi * u * .4) * e * 1.4
def impact():
    d = 1.6; k = np.arange(int(d * SR)) / SR
    boom = np.sin(2 * np.pi * np.cumsum(38 + 90 * np.exp(-k * 18)) / SR) * np.exp(-k * 3.2)
    crack = hp(noise(d), .4) * np.exp(-k * 40) * .6; tail = lp(noise(d), .05) * np.exp(-k * 2.5) * .5
    return boom + crack + tail
def riser(d=1.0):
    k = np.arange(int(d * SR)) / SR; u = k / d
    return (tone(200 + 1400 * u ** 2, d) * .25 + hp(noise(d), .3) * .5) * u ** 2.2
def tick(): k = np.arange(int(.06 * SR)) / SR; return np.sin(2 * np.pi * 2600 * k) * np.exp(-k * 110) * .7
def swish(): n = noise(.35); u = np.linspace(0, 1, len(n)); return hp(n, .35) * np.sin(np.pi * u) ** 2 * .6
def ding():
    k = np.arange(int(1.2 * SR)) / SR
    return sum(np.sin(2 * np.pi * f * k) * a for f, a in ((n2f(86), .5), (n2f(93), .3), (n2f(98), .15))) * np.exp(-k * 4)
def odo():
    out = np.zeros(int(.9 * SR))
    for j in range(12):
        at = int((1 - (1 - j / 12) ** 2) * .8 * SR); s = tick() * (.6 - j * .03); out[at:at + len(s)] += s[:len(out) - at]
    return out
def type_():
    out = np.zeros(int(.5 * SR))
    for j in range(16): at = int(j * .025 * SR); s = hp(noise(.02), .5) * env(int(.02 * SR), .0005, .004); out[at:at + len(s)] += s
    return out
def shine():
    k = np.arange(int(.8 * SR)) / SR; return tone(3000 + 3000 * k, .8) * np.sin(np.pi * k / .8) ** 2 * .12 + hp(noise(.8), .7) * np.sin(np.pi * k / .8) ** 2 * .15
def paper(): n = noise(.3); return hp(lp(n, .6), .2) * env(len(n), .01, .08) * 1.2
def flip(): return whoosh(.35) * .8 + np.pad(tick(), (int(.3 * SR), 0))[:int(.35 * SR)]
def pop():
    k = np.arange(int(.25 * SR)) / SR; return np.sin(2 * np.pi * np.cumsum(300 + 900 * np.exp(-k * 30)) / SR) * np.exp(-k * 18) * .8
def click():
    k = np.arange(int(.4 * SR)) / SR; return np.pad(pop(), (0, len(k) - len(pop()))) * .6 + np.sin(2 * np.pi * n2f(81) * k) * np.exp(-k * 9) * .4

LIB = dict(whoosh=(whoosh, -.3), impact=(impact, 0), riser_short=(lambda: riser(1.0), -1.0), riser_half=(lambda: riser(.5), -.5), tick=(tick, 0), swish=(swish, -.1),
           ding=(ding, 0), odo=(odo, 0), type=(type_, 0), shine=(shine, 0), paper=(paper, 0), flip=(flip, -.15), pop=(pop, 0), click=(click, 0))
G = dict(whoosh=.7, impact=.9, riser_short=.5, riser_half=.45, tick=.35, swish=.45, ding=.35, odo=.5, type=.3, shine=.5, paper=.6, flip=.6, pop=.55, click=.7)
for i, c in enumerate(meta['cues']):
    fn, off = LIB[c['type']]
    put(fn(), c['t'] + off, G[c['type']] * c['g'], pan=((i * 37) % 7 - 3) / 6)
# riser antes das grandes viradas
# Risers são declarados na timeline por cues riser_short/riser_half.

# master: fade, saturação suave, normalização
fade = np.clip((DUR - t) / 1.0, 0, 1)[:, None]; mix *= fade
mix = np.tanh(mix * 1.1); mix /= np.abs(mix).max() / .9
with wave.open('out/sfx.wav' if NO_MUSIC else 'out/trilha.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype('<i2').tobytes())
print('ok', DUR)

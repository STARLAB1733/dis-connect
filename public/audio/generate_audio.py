import wave, struct, math, os

SAMPLE_RATE = 44100
OUTPUT_DIR = r'C:\Users\tan_5\Documents\GitHub\dis-connect\public\audio'

def clamp(v, lo=-1.0, hi=1.0):
    return max(lo, min(hi, v))

def write_wav(filename, samples, sr=SAMPLE_RATE):
    path = os.path.join(OUTPUT_DIR, filename)
    with wave.open(path, 'w') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        data = [int(clamp(s)*32767) for s in samples]
        packed = struct.pack('<' + str(len(data)) + 'h', *data)
        wf.writeframes(packed)
    kb = os.path.getsize(path)/1024
    print('  Wrote ' + filename + '  (' + str(round(kb,1)) + ' KB, ' + str(round(len(samples)/sr,2)) + 's)')

def sn(freq, t, ph=0.0):
    return math.sin(2*math.pi*freq*t+ph)

def adsr(t, total, A, D, SL, R):
    se = total - R
    if t < A:
        return t/A if A>0 else 1.0
    elif t < A+D:
        return 1.0-(1.0-SL)*(t-A)/D
    elif t < se:
        return SL
    elif t < total:
        return SL*(1.0-(t-se)/R) if R>0 else 0.0
    return 0.0

def mkhz(midi):
    return 440.0*(2**((midi-69)/12))

def gen_bgm_lobby():
    print('Generating bgm-lobby.wav ...')
    dur = 60.0
    n = int(SAMPLE_RATE*dur)
    samples = [0.0]*n
    drone_freqs = [mkhz(38),mkhz(45),mkhz(50),mkhz(53),mkhz(57),mkhz(62)]
    drone_amps  = [0.18,0.14,0.16,0.12,0.10,0.08]
    arp_midi    = [50,53,57,60,62,60,57,53]
    arp_period  = 1.5
    arp_ndur    = 1.2
    lfo_rate    = 0.15
    beat_p      = 60.0/70.0
    kick_dur    = 0.18
    for i in range(n):
        t = i/SAMPLE_RATE
        s = 0.0
        lfo = 0.6+0.4*(0.5+0.5*sn(lfo_rate,t))
        for f,a in zip(drone_freqs,drone_amps):
            s += a*lfo*(0.7*sn(f,t)+0.3*sn(f*2,t,1.1))
        bp = t % beat_p
        if bp < kick_dur:
            ev = math.exp(-bp*25)
            sf = 55*math.exp(-bp*12)
            s += 0.22*ev*sn(sf,t)
        aidx = int(t/arp_period) % len(arp_midi)
        nt   = t - int(t/arp_period)*arp_period
        if 0 <= nt < arp_ndur:
            ea = adsr(nt,arp_ndur,0.08,0.15,0.55,0.4)
            fa = mkhz(arp_midi[aidx])
            s += 0.13*ea*(sn(fa,t)+0.5*sn(fa*0.5,t)+0.25*sn(fa*2,t))
        slfo = 0.5+0.5*sn(0.22,t,2.3)
        s += 0.04*slfo*sn(mkhz(74),t)
        ang = 2*math.pi*t/dur
        loop_w = 0.90+0.10*(-math.cos(ang)*0.5+0.5)
        samples[i] = s*loop_w
    write_wav('bgm-lobby.wav', samples)

def gen_bgm_game():
    print('Generating bgm-game.wav ...')
    dur = 45.0
    n = int(SAMPLE_RATE*dur)
    samples = [0.0]*n
    BPM = 140
    beat = 60.0/BPM
    s16  = beat/4
    hi_pat = [0,3,7,12,10,7,3,5]
    lo_pat = [0,-5,-3,0,2,0,-3,-5]
    root_hi = 57
    root_lo = 45
    pad_freqs = [mkhz(45),mkhz(48),mkhz(52),mkhz(55),mkhz(57),mkhz(64)]
    pad_amps  = [0.09,0.07,0.08,0.06,0.07,0.05]
    bass_root = mkhz(33)
    for i in range(n):
        t = i/SAMPLE_RATE
        s = 0.0
        lpd = 0.75+0.25*sn(0.8,t)
        for f,a in zip(pad_freqs,pad_amps):
            s += a*lpd*sn(f,t)
        bph = t % beat
        if bph < 0.12:
            eb = math.exp(-bph*40)
            s += 0.20*eb*(sn(bass_root,t)+0.6*sn(bass_root*2,t))
        step  = int(t/s16)
        nph   = t - step*s16
        hioff = hi_pat[step % len(hi_pat)]
        fhi   = mkhz(root_hi+hioff)
        ehi   = adsr(nph,s16,0.005,0.04,0.6,0.05)
        s += 0.14*ehi*(sn(fhi,t)+0.4*sn(fhi*2,t)+0.15*sn(fhi*3,t))
        step8 = int(t/(s16*2))
        nph8  = t - step8*(s16*2)
        looff = lo_pat[step8 % len(lo_pat)]
        flo   = mkhz(root_lo+looff)
        elo   = adsr(nph8,s16*2,0.01,0.08,0.5,0.08)
        s += 0.12*elo*(sn(flo,t)+0.5*sn(flo*2,t))
        bar = beat*4
        pib = t % bar
        for sb in [beat,beat*3]:
            sp = pib-sb
            if 0 <= sp < 0.06:
                es = math.exp(-sp*60)
                s += 0.10*es*(sn(180,t)+sn(220,t)+sn(310,t))/3
        hph = t % s16
        if hph < 0.025:
            eh = math.exp(-hph*120)
            s += 0.04*eh*(sn(8000,t)+sn(10500,t)+sn(13000,t))/3
        ang = 2*math.pi*t/dur
        loop_w = 0.88+0.12*(-math.cos(ang)*0.5+0.5)
        samples[i] = s*loop_w
    write_wav('bgm-game.wav', samples)

def gen_sfx_select():
    print('Generating sfx-select.wav ...')
    dur = 0.20
    n = int(SAMPLE_RATE*dur)
    samples = []
    for i in range(n):
        t = i/SAMPLE_RATE
        env = adsr(t,dur,0.003,0.04,0.3,0.12)
        freq = 900+200*(t/dur)
        s = env*(0.7*sn(freq,t)+0.3*sn(freq*2,t))
        samples.append(s)
    write_wav('sfx-select.wav', samples)

def gen_sfx_success():
    print('Generating sfx-success.wav ...')
    dur = 0.50
    n = int(SAMPLE_RATE*dur)
    samples = []
    nseq = [(mkhz(62),0.00,0.18),(mkhz(66),0.15,0.18),(mkhz(69),0.30,0.20)]
    for i in range(n):
        t = i/SAMPLE_RATE
        s = 0.0
        for freq,ts,nd in nseq:
            nt = t-ts
            if 0 <= nt < nd:
                env = adsr(nt,nd,0.008,0.05,0.5,0.10)
                s += 0.30*env*(sn(freq,t)+0.5*sn(freq*2,t)+0.2*sn(freq*4,t))
        samples.append(s)
    write_wav('sfx-success.wav', samples)

def gen_sfx_advance():
    print('Generating sfx-advance.wav ...')
    dur = 0.80
    n = int(SAMPLE_RATE*dur)
    samples = []
    for i in range(n):
        t = i/SAMPLE_RATE
        freq = 200*math.exp(math.log(10.0)*(t/dur))
        env = adsr(t,dur,0.02,0.30,0.35,0.35)
        s = (0.40*sn(freq,t)
             +0.25*sn(freq*1.5,t,0.7)
             +0.15*sn(freq*2,t,1.4)
             +0.10*sn(freq*3,t,2.1)
             +0.10*sn(freq*0.5,t,0.3))
        am = 0.85+0.15*sn(18+40*t/dur,t)
        samples.append(s*env*am*0.80)
    write_wav('sfx-advance.wav', samples)

def gen_sfx_complete():
    print('Generating sfx-complete.wav ...')
    dur = 1.50
    n = int(SAMPLE_RATE*dur)
    samples = []
    chords = [
        (0.00,0.38,[45,48,52,57]),
        (0.35,0.38,[41,45,48,53]),
        (0.68,0.38,[36,43,48,52]),
        (1.00,0.50,[40,44,47,52,56]),
    ]
    def trump(freq,t,env):
        return env*(0.35*sn(freq,t)+0.30*sn(freq*2,t)
                    +0.20*sn(freq*3,t)+0.10*sn(freq*4,t)+0.05*sn(freq*5,t))
    for i in range(n):
        t = i/SAMPLE_RATE
        s = 0.0
        for cs,cd,notes in chords:
            ct = t-cs
            if 0 <= ct < cd:
                env = adsr(ct,cd,0.04,0.10,0.70,0.18)
                pn  = 0.22/len(notes)
                for midi in notes:
                    s += pn*trump(mkhz(midi),t,env)
        if t < 0.03:
            eh = math.exp(-t*150)
            s += 0.15*eh*(sn(400,t)+sn(800,t))/2
        samples.append(s)
    write_wav('sfx-complete.wav', samples)

if __name__ == '__main__':
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    gen_bgm_lobby()
    gen_bgm_game()
    gen_sfx_select()
    gen_sfx_success()
    gen_sfx_advance()
    gen_sfx_complete()
    print('All audio files generated successfully.')

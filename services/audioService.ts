class AudioService {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private enabled: boolean = true;
  private bgmNodes: AudioNode[] = [];
  private nextNoteTime: number = 0;
  private isPlayingBgm: boolean = false;
  private schedulerTimer: number | null = null;
  private currentNoteIndex: number = 0;

  // Hirajoshi Scale (A Minor Pentatonic-ish: A, B, C, E, F)
  // Low octave for bass, mid for melody
  private melodySequence = [
    440, 0, 493.88, 523.25, 659.25, 698.46, 659.25, 523.25, // Bar 1
    440, 440, 523.25, 493.88, 440, 0, 329.63, 0,           // Bar 2
    698.46, 659.25, 523.25, 493.88, 523.25, 659.25, 440, 0, // Bar 3
    440, 523.25, 493.88, 440, 349.23, 329.63, 440, 440      // Bar 4
  ];
  
  private bassSequence = [
    220, 0, 220, 0, 261.63, 0, 261.63, 0,
    174.61, 0, 174.61, 0, 164.81, 0, 164.81, 0
  ];

  constructor() {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.masterGain.gain.value = 0.3; // Default volume
    } catch (e) {
      console.warn('Web Audio API not supported');
    }
  }

  toggle(on: boolean) {
    this.enabled = on;
    if (this.ctx && this.ctx.state === 'suspended' && on) {
      this.ctx.resume();
    }
    if (on) {
        if (!this.isPlayingBgm) this.startBgm();
    } else {
        this.stopBgm();
    }
  }

  playTone(freq: number, type: OscillatorType, duration: number, fadeOut: boolean = true) {
    if (!this.enabled || !this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    gain.connect(this.masterGain);
    osc.connect(gain);

    osc.start();

    const now = this.ctx.currentTime;
    
    if (fadeOut) {
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
    } else {
      osc.stop(now + duration);
    }
    
    setTimeout(() => {
        osc.disconnect();
        gain.disconnect();
    }, duration * 1000 + 100);
  }

  // --- BGM Sequencer ---
  startBgm() {
    if (!this.enabled || !this.ctx || this.isPlayingBgm) return;
    this.isPlayingBgm = true;
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    this.currentNoteIndex = 0;
    this.schedule();
  }

  stopBgm() {
    this.isPlayingBgm = false;
    if (this.schedulerTimer) {
        window.clearTimeout(this.schedulerTimer);
        this.schedulerTimer = null;
    }
    this.bgmNodes.forEach(node => node.disconnect());
    this.bgmNodes = [];
  }

  private schedule() {
    if (!this.isPlayingBgm || !this.ctx || !this.masterGain) return;
    
    const lookahead = 0.1; // seconds
    const scheduleAheadTime = 0.1; // seconds

    while (this.nextNoteTime < this.ctx.currentTime + scheduleAheadTime) {
      this.playBgmNote(this.nextNoteTime, this.currentNoteIndex);
      this.nextNoteTime += 0.2; // Note duration (tempo)
      this.currentNoteIndex++;
      if (this.currentNoteIndex >= this.melodySequence.length) this.currentNoteIndex = 0;
    }

    this.schedulerTimer = window.setTimeout(() => this.schedule(), lookahead * 1000);
  }

  private playBgmNote(time: number, index: number) {
     if (!this.ctx || !this.masterGain) return;

     // Melody
     const melFreq = this.melodySequence[index % this.melodySequence.length];
     if (melFreq > 0) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = melFreq;
        gain.gain.setValueAtTime(0.1, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(time);
        osc.stop(time + 0.2);
        this.bgmNodes.push(osc);
        this.bgmNodes.push(gain);
     }

     // Bass (Half speed relative to melody logic, 1 note per 2 melody steps)
     if (index % 2 === 0) {
        const bassIndex = (index / 2) % this.bassSequence.length;
        const bassFreq = this.bassSequence[bassIndex];
        if (bassFreq > 0) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.value = bassFreq;
            gain.gain.setValueAtTime(0.2, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.35);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(time);
            osc.stop(time + 0.4);
            this.bgmNodes.push(osc);
            this.bgmNodes.push(gain);
        }
     }

     // Cleanup
     if (this.bgmNodes.length > 50) {
         // Rough cleanup of old nodes
         const old = this.bgmNodes.splice(0, 20);
         old.forEach(n => n.disconnect());
     }
  }

  // --- SFX ---
  playShoot() { this.playTone(400 + Math.random() * 200, 'square', 0.1); }
  
  playSwing() {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.15);
    gain.connect(this.masterGain);
    osc.connect(gain);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.15);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  playHit() { this.playTone(100, 'sawtooth', 0.1); }
  
  playExp() {
    this.playTone(800, 'sine', 0.1);
    setTimeout(() => this.playTone(1200, 'sine', 0.1), 50);
  }

  playLevelUp() {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.setValueAtTime(554, now + 0.1);
    osc.frequency.setValueAtTime(659, now + 0.2);
    osc.frequency.setValueAtTime(880, now + 0.3);
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.8);
    osc.start(now);
    osc.stop(now + 0.8);
  }

  playGameOver() { this.playTone(100, 'sawtooth', 1.0); }

  playDash() {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.2);
    gain.connect(this.masterGain);
    osc.connect(gain);
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.2);
    osc.start(now);
    osc.stop(now + 0.2);
  }
}

export const audioService = new AudioService();
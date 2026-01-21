
class SoundService {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setEnabled(val: boolean) {
    this.enabled = val;
  }

  private playTone(freq: number, type: OscillatorType, duration: number, volume: number = 0.1, decay: boolean = true) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    if (decay) {
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
    }

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playTick() {
    this.playTone(1000, 'square', 0.03, 0.03);
  }

  playStart() {
    const sequence = [
      { f: 523.25, d: 0.1 }, // C5
      { f: 659.25, d: 0.1 }, // E5
      { f: 783.99, d: 0.1 }, // G5
      { f: 1046.50, d: 0.3 } // C6
    ];
    sequence.forEach((note, i) => {
      setTimeout(() => this.playTone(note.f, 'square', note.d, 0.08), i * 100);
    });
  }

  playCorrect() {
    this.playTone(880, 'sine', 0.1, 0.08);
    setTimeout(() => this.playTone(1760, 'sine', 0.15, 0.05), 80);
  }

  playCoin() {
    this.playTone(987.77, 'square', 0.1, 0.08, false);
    setTimeout(() => this.playTone(1318.51, 'square', 0.4, 0.08), 100);
  }

  playWrong() {
    // Brutal low buzz
    this.playTone(200, 'sawtooth', 0.2, 0.15);
    setTimeout(() => {
      this.playTone(100, 'sawtooth', 0.5, 0.2);
    }, 100);
  }

  playCountdown(val: number | string) {
    const freq = typeof val === 'number' ? 440 : 880;
    this.playTone(freq, 'square', 0.1, 0.05);
    if (val === 'GO!') {
      setTimeout(() => this.playTone(1320, 'square', 0.2, 0.05), 50);
    }
  }
}

export const soundService = new SoundService();

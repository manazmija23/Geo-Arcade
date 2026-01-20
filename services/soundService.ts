
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

  private playTone(freq: number, type: OscillatorType, duration: number, volume: number = 0.1) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playTick() {
    this.playTone(800, 'square', 0.05, 0.05);
  }

  playStart() {
    this.playTone(400, 'sawtooth', 0.1, 0.1);
    setTimeout(() => this.playTone(600, 'sawtooth', 0.1, 0.1), 100);
    setTimeout(() => this.playTone(800, 'sawtooth', 0.3, 0.1), 200);
  }

  playCorrect() {
    this.playTone(600, 'sine', 0.1, 0.1);
    setTimeout(() => this.playTone(1200, 'sine', 0.2, 0.1), 50);
  }

  playCoin() {
    // Classic coin sound: B5 then E6
    this.playTone(987.77, 'square', 0.1, 0.1);
    setTimeout(() => this.playTone(1318.51, 'square', 0.4, 0.1), 100);
  }

  playWrong() {
    this.playTone(300, 'triangle', 0.1, 0.2);
    setTimeout(() => this.playTone(150, 'triangle', 0.4, 0.2), 100);
  }

  playCountdown(val: number | string) {
    const freq = typeof val === 'number' ? 440 : 880;
    this.playTone(freq, 'square', 0.2, 0.1);
  }
}

export const soundService = new SoundService();

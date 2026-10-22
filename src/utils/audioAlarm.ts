/**
 * Web Audio API synthesizer for anti-cheat warning alarm
 * Runs purely in the browser with zero external audio assets required.
 */
class AlarmAudioPlayer {
  private ctx: AudioContext | null = null;
  private isAlarmPlaying = false;
  private intervalId: any = null;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public playBeep(freq = 880, durationMs = 300, type: OscillatorType = 'sawtooth') {
    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + durationMs / 1000);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + durationMs / 1000);
    } catch {
      // Audio might be restricted until user gesture
    }
  }

  public startSiren() {
    if (this.isAlarmPlaying) return;
    this.isAlarmPlaying = true;
    this.initCtx();

    let toggle = false;
    const playPulse = () => {
      this.playBeep(toggle ? 960 : 720, 220, 'square');
      toggle = !toggle;
    };

    playPulse();
    this.intervalId = setInterval(playPulse, 260);
  }

  public stopSiren() {
    this.isAlarmPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export const alarmAudio = new AlarmAudioPlayer();

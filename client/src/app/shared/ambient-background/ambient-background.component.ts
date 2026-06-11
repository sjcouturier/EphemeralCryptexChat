import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  inject,
} from '@angular/core';

interface Node {
  baseX: number;
  baseY: number;
  phase: number;
  x: number;
  y: number;
}

interface Ripple {
  x: number;
  y: number;
  start: number;
}

/**
 * Ambient cyberpunk backdrop: a slowly drifting lattice of neon nodes with the
 * occasional circuit trace, plus a neon ripple emitted when a message arrives.
 * Rendered on a fixed full-screen canvas behind the UI.
 */
@Component({
  selector: 'app-ambient-background',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<canvas #canvas class="ambient"></canvas>',
  styles: [
    `
      :host {
        position: fixed;
        inset: 0;
        z-index: -1;
        pointer-events: none;
      }
      .ambient {
        display: block;
        width: 100%;
        height: 100%;
      }
    `,
  ],
})
export class AmbientBackgroundComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private readonly zone = inject(NgZone);
  private ctx!: CanvasRenderingContext2D;
  private nodes: Node[] = [];
  private ripples: Ripple[] = [];
  private rafId: number | null = null;
  private width = 0;
  private height = 0;
  private dpr = 1;
  private readonly spacing = 90;
  private resizeHandler = () => this.resize();

  ngAfterViewInit(): void {
    const ctx = this.canvasRef.nativeElement.getContext('2d');
    if (!ctx) {
      return;
    }
    this.ctx = ctx;
    this.resize();
    window.addEventListener('resize', this.resizeHandler);
    this.zone.runOutsideAngular(() => {
      this.rafId = requestAnimationFrame((t) => this.draw(t));
    });
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.resizeHandler);
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }
  }

  /** Emit a neon ripple, defaulting to a random position. */
  ripple(x?: number, y?: number): void {
    this.ripples.push({
      x: x ?? Math.random() * this.width,
      y: y ?? Math.random() * this.height,
      start: performance.now(),
    });
  }

  private resize(): void {
    const canvas = this.canvasRef.nativeElement;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = canvas.clientWidth;
    this.height = canvas.clientHeight;
    canvas.width = this.width * this.dpr;
    canvas.height = this.height * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.buildNodes();
  }

  private buildNodes(): void {
    this.nodes = [];
    for (let x = 0; x <= this.width + this.spacing; x += this.spacing) {
      for (let y = 0; y <= this.height + this.spacing; y += this.spacing) {
        this.nodes.push({
          baseX: x,
          baseY: y,
          phase: Math.random() * Math.PI * 2,
          x,
          y,
        });
      }
    }
  }

  private draw(time: number): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // Slow drift: ~8s cycle.
    const t = time / 8000;
    for (const node of this.nodes) {
      node.x = node.baseX + Math.sin(t + node.phase) * 10;
      node.y = node.baseY + Math.cos(t * 0.8 + node.phase) * 10;
    }

    // Circuit traces between near neighbours (subtle).
    ctx.lineWidth = 1;
    for (let i = 0; i < this.nodes.length; i++) {
      const a = this.nodes[i];
      for (let j = i + 1; j < this.nodes.length; j++) {
        const b = this.nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.hypot(dx, dy);
        if (dist < this.spacing * 1.05) {
          const alpha = 0.05 + 0.05 * Math.sin(t * 2 + i);
          ctx.strokeStyle = `rgba(0, 255, 0, ${Math.max(alpha, 0.02)})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // Nodes.
    for (const node of this.nodes) {
      const pulse = 0.4 + 0.3 * Math.sin(t * 3 + node.phase);
      ctx.fillStyle = `rgba(0, 255, 0, ${pulse * 0.4})`;
      ctx.beginPath();
      ctx.arc(node.x, node.y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }

    this.drawRipples(time);

    this.rafId = requestAnimationFrame((nt) => this.draw(nt));
  }

  private drawRipples(time: number): void {
    const ctx = this.ctx;
    const duration = 1400;
    this.ripples = this.ripples.filter((r) => time - r.start < duration);
    for (const r of this.ripples) {
      const elapsed = Math.max(0, time - r.start);
      const progress = Math.min(1, elapsed / duration);
      const radius = progress * 220;
      const alpha = (1 - progress) * 0.6;
      ctx.strokeStyle = `rgba(0, 255, 0, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(r.x, r.y, radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(0, 255, 0, ${alpha * 0.7})`;
      ctx.beginPath();
      ctx.arc(r.x, r.y, radius * 0.6, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

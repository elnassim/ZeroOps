import {
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'app-hero-background',
  templateUrl: './hero-background.component.html',
  styleUrls: ['./hero-background.component.scss'],
})
export class HeroBackgroundComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D | null;
  private animationFrameId!: number;
  private particlesArray: Particle[] = [];

  constructor() {}

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d');

    if (!this.ctx) return;

    // Set canvas dimensions
    this.setCanvasDimensions();
    window.addEventListener('resize', this.setCanvasDimensions.bind(this));

    // Create particles
    this.createParticles();

    // Start animation
    this.animate();
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.setCanvasDimensions.bind(this));
    cancelAnimationFrame(this.animationFrameId);
  }

  private setCanvasDimensions(): void {
    const canvas = this.canvasRef.nativeElement;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  private createParticles(): void {
    const canvas = this.canvasRef.nativeElement;
    const numberOfParticles = Math.min(
      100,
      Math.floor((window.innerWidth * window.innerHeight) / 10000)
    );

    this.particlesArray = [];
    for (let i = 0; i < numberOfParticles; i++) {
      this.particlesArray.push(new Particle(canvas.width, canvas.height));
    }
  }

  private animate(): void {
    if (!this.ctx) return;

    const canvas = this.canvasRef.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw gradient background
    const gradient = this.ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, 'rgba(10, 16, 41, 0.8)');
    gradient.addColorStop(1, 'rgba(10, 16, 41, 0.95)');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Update and draw particles
    for (let i = 0; i < this.particlesArray.length; i++) {
      this.particlesArray[i].update(canvas.width, canvas.height);
      this.particlesArray[i].draw(this.ctx);
    }

    // Draw connections
    this.connectParticles();

    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
  }

  private connectParticles(): void {
    if (!this.ctx) return;
    const maxDistance = 150;

    for (let a = 0; a < this.particlesArray.length; a++) {
      for (let b = a; b < this.particlesArray.length; b++) {
        const dx = this.particlesArray[a].x - this.particlesArray[b].x;
        const dy = this.particlesArray[a].y - this.particlesArray[b].y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < maxDistance) {
          const opacity = 1 - distance / maxDistance;
          this.ctx.strokeStyle = `rgba(45, 93, 237, ${opacity * 0.2})`;
          this.ctx.lineWidth = 1;
          this.ctx.beginPath();
          this.ctx.moveTo(this.particlesArray[a].x, this.particlesArray[a].y);
          this.ctx.lineTo(this.particlesArray[b].x, this.particlesArray[b].y);
          this.ctx.stroke();
        }
      }
    }
  }
}

class Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  color: string;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.x = Math.random() * canvasWidth;
    this.y = Math.random() * canvasHeight;
    this.size = Math.random() * 2 + 0.5;
    this.speedX = (Math.random() - 0.5) * 0.5;
    this.speedY = (Math.random() - 0.5) * 0.5;
    this.color = `rgba(45, 93, 237, ${Math.random() * 0.5 + 0.1})`;
  }

  update(canvasWidth: number, canvasHeight: number): void {
    this.x += this.speedX;
    this.y += this.speedY;

    if (this.x < 0 || this.x > canvasWidth) {
      this.speedX = -this.speedX;
    }
    if (this.y < 0 || this.y > canvasHeight) {
      this.speedY = -this.speedY;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

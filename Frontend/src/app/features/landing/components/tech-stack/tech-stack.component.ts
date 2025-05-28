import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';

interface TechLogo {
  name: string;
  logo?: string;
}

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'app-tech-stack',
  templateUrl: './tech-stack.component.html',
  styleUrls: ['./tech-stack.component.scss'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('500ms ease-out', style({ opacity: 1 })),
      ]),
    ]),
  ],
})
export class TechStackComponent {
  techLogos: TechLogo[] = [
    { name: 'Docker' },
    { name: 'Kubernetes' },
    { name: 'AWS' },
    { name: 'Angular' },
    
  ];

  constructor() {}
}

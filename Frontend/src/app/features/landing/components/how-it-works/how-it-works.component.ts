import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  trigger,
  transition,
  style,
  animate,
  stagger,
  query,
} from '@angular/animations';

interface Step {
  icon: string;
  title: string;
  description: string;
}

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'app-how-it-works',
  templateUrl: './how-it-works.component.html',
  styleUrls: ['./how-it-works.component.scss'],
  animations: [
    trigger('staggerFadeIn', [
      transition('* => *', [
        query(
          ':enter',
          [
            style({ opacity: 0, transform: 'translateY(20px)' }),
            stagger(200, [
              animate(
                '500ms ease-out',
                style({ opacity: 1, transform: 'translateY(0)' })
              ),
            ]),
          ],
          { optional: true }
        ),
      ]),
    ]),
  ],
})
export class HowItWorksComponent {
  steps: Step[] = [
    {
      icon: 'github',
      title: 'Connect Repository',
      description: 'Link your GitHub or GitLab repository to ZeroOps.',
    },
    {
      icon: 'code',
      title: 'Configure Settings',
      description: 'Set up your deployment with a simple YAML configuration.',
    },
    {
      icon: 'rocket',
      title: 'Deploy',
      description: 'Click deploy and watch your application go live.',
    },
  ];

  constructor() {}
}

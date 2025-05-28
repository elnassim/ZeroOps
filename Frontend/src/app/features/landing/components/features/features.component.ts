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

interface Feature {
  icon: string;
  title: string;
  description: string;
}

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'app-features',
  templateUrl: './features.component.html',
  styleUrls: ['./features.component.scss'],
  animations: [
    trigger('staggerFadeIn', [
      transition('* => *', [
        query(
          ':enter',
          [
            style({ opacity: 0, transform: 'translateY(20px)' }),
            stagger(100, [
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
export class FeaturesComponent {
  features: Feature[] = [
    {
      icon: 'github',
      title: 'Git-Based Deployment',
      description:
        'Push to deploy with automatic builds from your Git repositories.',
    },
    {
      icon: 'server',
      title: 'Auto-Scaling Infrastructure',
      description:
        "Scale resources automatically based on your application's needs.",
    },
    {
      icon: 'bar-chart-3',
      title: 'Real-Time Monitoring',
      description:
        'Track performance metrics and logs with powerful dashboards.',
    },
    {
      icon: 'users',
      title: 'Team Collaboration',
      description: 'Collaborate seamlessly with role-based access controls.',
    },
  ];

  constructor() {}
}

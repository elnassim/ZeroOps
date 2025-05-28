import { Component } from '@angular/core';
import { FooterComponent } from '../../../../shared/components/footer/footer.component';
import { TechStackComponent } from '../../components/tech-stack/tech-stack.component';
import { FeaturesComponent } from '../../components/features/features.component';
import { CtaSectionComponent } from '../../components/cta-section/cta-section.component';
import { HeroSectionComponent } from '../../components/hero-section/hero-section.component';
import { HowItWorksComponent } from '../../components/how-it-works/how-it-works.component';
import { NavbarComponent } from '../../../../shared/components/navbar/navbar.component';

@Component({
  standalone: true,
  imports: [
    FooterComponent,
    FeaturesComponent,
    CtaSectionComponent,
    HeroSectionComponent,
    HowItWorksComponent,
    NavbarComponent,
    TechStackComponent,
  ],
  selector: 'app-landing-page',
  templateUrl: './landing-page.component.html',
  styleUrls: ['./landing-page.component.scss'],
})
export class LandingPageComponent {
  constructor() {}
}

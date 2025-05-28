import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface FooterColumn {
  title: string;
  links: string[];
}

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
})
export class FooterComponent {
  currentYear = new Date().getFullYear();

  footerColumns: FooterColumn[] = [
    {
      title: 'Product',
      links: ['Features', 'Pricing', 'Documentation', 'Changelog'],
    },
    {
      title: 'Company',
      links: ['About', 'Blog', 'Careers', 'Contact'],
    },
    {
      title: 'Resources',
      links: ['Community', 'Help Center', 'Status', 'Security'],
    },
  ];

  constructor() {}
}

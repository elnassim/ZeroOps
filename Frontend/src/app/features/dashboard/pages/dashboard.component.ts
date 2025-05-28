import { Component, type OnInit } from "@angular/core"
import { CommonModule } from "@angular/common"
import { StatsCardComponent } from "../components/stats-card/stats-card.component"
import { DeploymentsTableComponent } from "../components/deployments-table/deployments-table.component"
import { MetricsPanelComponent } from "../components/metrics-panel/metrics-panel.component"
import { LogsPreviewComponent } from "../components/logs-preview/logs-preview.component"

@Component({
  selector: "app-dashboard",
  standalone: true,
  imports: [CommonModule, StatsCardComponent, DeploymentsTableComponent, MetricsPanelComponent, LogsPreviewComponent],
  templateUrl: "./dashboard.component.html",
  styleUrls: ["./dashboard.component.scss"],
})
export class DashboardComponent implements OnInit {
  constructor() {}

  ngOnInit(): void {}
}

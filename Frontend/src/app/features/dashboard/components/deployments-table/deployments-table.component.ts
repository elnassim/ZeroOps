import { Component } from "@angular/core"
import { CommonModule } from "@angular/common"

interface Deployment {
  id: string
  name: string
  status: "success" | "error" | "building"
  url: string
  lastDeployed: string
}

@Component({
  selector: "app-deployments-table",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./deployments-table.component.html",
  styleUrls: ["./deployments-table.component.scss"],
})
export class DeploymentsTableComponent {
  deployments: Deployment[] = [
    {
      id: "1",
      name: "production-api",
      status: "success",
      url: "api.zeroops.com",
      lastDeployed: "2 hours ago",
    },
    {
      id: "2",
      name: "staging-dashboard",
      status: "building",
      url: "staging.zeroops.com",
      lastDeployed: "15 minutes ago",
    },
    {
      id: "3",
      name: "feature-auth",
      status: "error",
      url: "auth-feature.zeroops.com",
      lastDeployed: "1 day ago",
    },
    {
      id: "4",
      name: "docs-site",
      status: "success",
      url: "docs.zeroops.com",
      lastDeployed: "3 days ago",
    },
    {
      id: "5",
      name: "marketing-site",
      status: "success",
      url: "zeroops.com",
      lastDeployed: "1 week ago",
    },
  ]

  getStatusText(status: string): string {
    switch (status) {
      case "success":
        return "Success"
      case "error":
        return "Failed"
      case "building":
        return "Building"
      default:
        return status
    }
  }
}

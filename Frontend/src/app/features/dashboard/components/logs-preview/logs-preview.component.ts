import { Component, type OnInit } from "@angular/core"
import { CommonModule } from "@angular/common"

interface LogEntry {
  timestamp: string
  level: "info" | "warn" | "error"
  message: string
}

@Component({
  selector: "app-logs-preview",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./logs-preview.component.html",
  styleUrls: ["./logs-preview.component.scss"],
})
export class LogsPreviewComponent implements OnInit {
  logs: LogEntry[] = [
    { timestamp: "2025-05-19 14:32:10", level: "info", message: "Deployment production-api started" },
    { timestamp: "2025-05-19 14:32:15", level: "info", message: "Building project..." },
    { timestamp: "2025-05-19 14:33:01", level: "info", message: "Build completed successfully" },
    { timestamp: "2025-05-19 14:33:05", level: "warn", message: "High memory usage detected on worker-3" },
    { timestamp: "2025-05-19 14:33:10", level: "error", message: "Failed to connect to database: Connection timeout" },
    { timestamp: "2025-05-19 14:33:15", level: "info", message: "Retrying database connection (1/3)" },
    { timestamp: "2025-05-19 14:33:20", level: "info", message: "Database connection established" },
    { timestamp: "2025-05-19 14:33:25", level: "info", message: "Deployment completed successfully" },
  ]

  filteredLogs: LogEntry[] = []
  activeFilter = "all"

  constructor() {}

  ngOnInit(): void {
    this.filteredLogs = [...this.logs]
  }

  setFilter(filter: string): void {
    this.activeFilter = filter

    if (filter === "all") {
      this.filteredLogs = [...this.logs]
    } else {
      this.filteredLogs = this.logs.filter((log) => log.level === filter)
    }
  }
}
